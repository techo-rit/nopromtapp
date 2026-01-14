import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { getGenerateRateLimiter, checkRateLimit } from './_lib/ratelimit.js';
import { createLogger, generateRequestId, type Logger } from './_lib/logger.js';
import { UPLOAD_CONFIG, GEMINI_CONFIG } from './_lib/serverConfig.js';

// --- 1. HELPER FUNCTIONS ---

async function verifyAuthAndCredits(req: any, log: Logger): Promise<{ userId: string } | { error: string; status: number }> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Unauthorized - missing auth token', status: 401 };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        log.error('Server config error: missing Supabase credentials');
        return { error: 'Server configuration error', status: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
        return { error: 'Unauthorized - invalid session', status: 401 };
    }

    // Rate Limit Check
    const limiter = getGenerateRateLimiter();
    const rateLimitResult = await checkRateLimit(limiter, user.id);
    if (!rateLimitResult.success) {
        return { error: 'Rate limit exceeded. Please wait.', status: 429 };
    }

    // Credit Check
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    if (!profile || profile.credits < 1) {
        return { error: 'Insufficient credits', status: 403 };
    }

    // Deduct Credit
    const { error: deductError } = await supabase.rpc('deduct_credits', { p_user_id: user.id, p_amount: 1 });
    if (deductError) {
        log.error('Credit deduction failed', { error: deductError.message });
        return { error: 'Failed to process request', status: 500 };
    }

    return { userId: user.id };
}

function validateAndParseImage(dataUrl: string | null | undefined): { mimeType: string; data: string } | { error: string } | null {
    if (!dataUrl) return null;
    const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
    if (!m) return { error: 'Invalid image format' };
    return { mimeType: m[1].toLowerCase(), data: m[2] };
}

function sanitizePrompt(text: string | object | null | undefined): string {
    if (!text) return '';
    return typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
}

// --- 2. MAIN HANDLER ---

export default async function handler(req: any, res: any) {
    const requestId = generateRequestId();
    const log = createLogger(requestId);

    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const authResult = await verifyAuthAndCredits(req, log);
        if ('error' in authResult) {
            res.status(authResult.status).json({ error: authResult.error });
            return;
        }

        const { imageData, wearableData, templateId, templateOptions } = req.body || {};
        const userLog = createLogger(requestId, authResult.userId);

        // --- VALIDATION ---
        
        // 1. Validate Main Image (The User/Model)
        const mainImage = validateAndParseImage(imageData);
        if (!mainImage) {
            res.status(400).json({ error: 'Missing main image' });
            return;
        }
        if ('error' in mainImage) {
            res.status(400).json({ error: mainImage.error });
            return;
        }

        // 2. Validate Wearable Image (The Cloth/Accessory)
        const wearableImage = validateAndParseImage(wearableData);
        let validWearable = null;
        if (wearableImage) {
            if ('error' in wearableImage) {
                res.status(400).json({ error: `Wearable image error: ${wearableImage.error}` });
                return;
            }
            validWearable = wearableImage;
        }

        // API Setup
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: 'Server misconfigured: Missing API Key' });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];

        // --- 3. CONSTRUCT PARTS & PROMPT ---
        
        // Image 1: Identity (User)
        parts.push({
            inlineData: {
                mimeType: mainImage.mimeType,
                data: mainImage.data,
            },
        });

        // Image 2: Style/Reference (Wearable)
        if (validWearable) {
            parts.push({
                inlineData: {
                    mimeType: validWearable.mimeType,
                    data: validWearable.data,
                },
            });
        }

        // Extract the specific prompt defined in constants.ts
        const userInstruction = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
        
        // DYNAMIC PROMPT LOGIC
        let coreInstruction = '';
        
        if (validWearable) {
            // FIX APPLIED HERE:
            // Priority 1: Use the highly specific studio prompt from constants.ts if available.
            // Priority 2: Fallback to generic Try-On instruction if no prompt is provided.
            if (userInstruction && userInstruction.trim().length > 10) {
                // The templates in constants.ts are self-contained (they describe Input 1 vs Input 2),
                // so we use them directly.
                coreInstruction = userInstruction;
            } else {
                coreInstruction = `
                TASK: VIRTUAL TRY-ON (CLOTHING TRANSFER).
                
                INPUTS:
                - IMAGE 1: The model/person (Reference Identity).
                - IMAGE 2: The garment/clothing (Reference Style).
                
                INSTRUCTIONS:
                1. Generate an image of the PERSON from Image 1 wearing the CLOTHING from Image 2.
                2. RETAIN the face, hair, and body proportions of the person in Image 1 exactly.
                3. RETAIN the texture, color, and design of the clothing in Image 2 exactly.
                4. Merge them realistically. The lighting on the clothes should match the person's environment.
                `;
            }
        } else {
            // Standard Remix / Style Transfer (Non-Wearable)
            coreInstruction = userInstruction || `Generate a photorealistic remix based on template: ${templateId}`;
        }

        const finalPrompt = `
        ${coreInstruction}
        
        NEGATIVE CONSTRAINTS (FORBIDDEN):
        - DO NOT change the person's face identity.
        - DO NOT generate a different person.
        - DO NOT perform "face blending" or "averaging".
        - DO NOT distort facial features.
        - DO NOT create nudity or compromised anatomy.
        `;
        
        parts.push({ text: finalPrompt });

        // --- 4. CONFIGURATION ---
        
        const systemPrompt = `
        ROLE: Expert Identity-Cloning & Fashion AI.
        
        PRIMARY OBJECTIVE:
        You are a high-fidelity image renderer. Your absolute priority is PRESERVING THE IDENTITY of the person in IMAGE 1.
        
        CRITICAL RULES:
        1. FACE LOCK: The face in the output MUST be perceptually identical to Image 1.
        2. IF WEARABLE (Image 2) IS PROVIDED: Replace the clothing of the person in Image 1 with the item in Image 2. Do not change the person's pose unless necessary for the fit.
        3. REALISM: Output must be photorealistic, 8k resolution, high texture quality.
        4. SAFETY: Do not generate NSFW content. If the request implies nudity, clothe the person appropriately.
        `;

        // Safety Settings
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ];

        const config: any = {
            systemInstruction: systemPrompt,
            temperature: 0.15, // Low temperature for identity retention
            topP: 0.8,
            candidateCount: 1,
            safetySettings: safetySettings, 
        };

        if (templateOptions?.aspectRatio) {
            // @ts-ignore
            config.imageConfig = { aspectRatio: templateOptions.aspectRatio };
        }

        // Generate
        const response = await ai.models.generateContent({
            model: GEMINI_CONFIG.MODEL_NAME,
            contents: parts, 
            config,          
        });

        // Extract Results
        const urls: string[] = [];
        const candidates = response.candidates || [];
        
        for (const c of candidates) {
            const part = c?.content?.parts?.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) {
                urls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
        }

        if (urls.length === 0) {
            userLog.warn('No images returned', { templateId, safetyRatings: candidates[0]?.safetyRatings });
            res.status(500).json({ error: 'Generation failed. The AI might have blocked the request due to safety filters on the body/clothing.' });
            return;
        }

        userLog.info('Success', { count: urls.length });
        res.status(200).json({ images: urls });

    } catch (err: any) {
        console.error('API Error:', err);
        const msg = (err?.message || '').toLowerCase();
        
        if (msg.includes('quota') || msg.includes('429')) {
            res.status(429).json({ error: 'Server busy. Please try again.' });
        } else if (msg.includes('safety')) {
            res.status(400).json({ error: 'Safety filter triggered. Please try a different image.' });
        } else {
            res.status(500).json({ error: 'Generation failed.' });
        }
    }
}