// techo-rit/nopromtapp/nopromtapp-main/api/generate.ts

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

        const userInstruction = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
        const aspectRatio = templateOptions?.aspectRatio || '1:1';

        // DYNAMIC PROMPT LOGIC
        let coreInstruction = '';
        
        if (validWearable) {
            coreInstruction = `
            TASK: VIRTUAL TRY-ON (Identity Preserved).
            
            INPUTS:
            - Image 1: "The Subject" (Preserve this person's face and identity exactly).
            - Image 2: "The Garment" (Apply this clothing to the Subject).
            
            INSTRUCTIONS:
            1. Generate a photorealistic image of the person from Image 1 wearing the clothing from Image 2.
            2. CRITICAL: The face in the output MUST match the face in Image 1. 
            3. Adjust the lighting on the clothing to match the Subject's environment.
            `;
        } else {
            // Standard Remix / Style Transfer
            coreInstruction = userInstruction || `Generate a photorealistic remix based on this image. Theme: ${templateId}`;
        }

        const finalPrompt = `
        ${coreInstruction}
        
        STRICT CONSTRAINTS:
        - Maintain the exact facial identity of the person in Image 1.
        - Do not change the person's age, ethnicity, or key facial features.
        - Output Aspect Ratio: ${aspectRatio}
        - Style: Photorealistic, 8k, High Fidelity.
        `;
        
        parts.push({ text: finalPrompt });

        // --- 4. CONFIGURATION ---
        
        // STRONGER SYSTEM PROMPT FOR IDENTITY
        const systemPrompt = `
        You are an advanced AI specialized in photorealistic identity preservation.
        
        PRIMARY DIRECTIVE:
        You must preserve the facial identity of the subject in the first input image.
        The output image must look like a photograph of the SAME PERSON.
        
        QUALITY GUIDELINES:
        - Focus on skin texture, realistic lighting, and natural details.
        - If performing a "Try-On", fit the clothing naturally to the subject's body pose.
        `;

        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ];

        const config: any = {
            systemInstruction: systemPrompt,
            // BALANCED TEMPERATURE:
            // 0.9 = High creativity/texture (Good for clothes/backgrounds).
            // But we use the Prompt Constraints above to "Lock" the face.
            temperature: 0.9, 
            topP: 0.95,
            candidateCount: 1,
            safetySettings: safetySettings,
        };

        if (templateOptions?.aspectRatio) {
            // @ts-ignore
            config.imageConfig = { aspectRatio: templateOptions.aspectRatio };
        }

        const response = await ai.models.generateContent({
            model: GEMINI_CONFIG.MODEL_NAME,
            contents: parts, 
            config,          
        });

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
            res.status(500).json({ error: 'Generation failed. The AI might have blocked the request due to safety filters.' });
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