// api/generate.ts
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
        
        // 1. Validate Main Image
        const mainImage = validateAndParseImage(imageData);
        if (!mainImage) {
            res.status(400).json({ error: 'Missing main image' });
            return;
        }
        if ('error' in mainImage) {
            res.status(400).json({ error: mainImage.error });
            return;
        }

        // 2. Validate Wearable Image (Optional)
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

        // --- 3. CONSTRUCT PARTS ---
        
        // Image 1: Identity (User)
        parts.push({
            inlineData: {
                mimeType: mainImage.mimeType,
                data: mainImage.data,
            },
        });

        // Image 2: Style/Reference (Optional)
        if (validWearable) {
            parts.push({
                inlineData: {
                    mimeType: validWearable.mimeType,
                    data: validWearable.data,
                },
            });
        }

        // User Prompt (With Strict Negative Constraints)
        const userInstruction = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
        const promptText = `
        ${userInstruction || `Generate a photorealistic remix based on template: ${templateId}`}
        
        NEGATIVE CONSTRAINTS (FORBIDDEN):
        - DO NOT change the person's face.
        - DO NOT generate a different person.
        - DO NOT perform "face blending" or "averaging".
        - DO NOT change ethnicity, age, or bone structure.
        `;
        parts.push({ text: promptText });

        // --- 4. ULTRA-STRICT CONFIGURATION ---
        
        const systemPrompt = `
        ROLE: Identity-Cloning AI Specialist.
        
        PRIMARY OBJECTIVE:
        You are a "Pass-Through" renderer for human faces. Your goal is to copy the face from IMAGE 1 and paste it into the new environment/style defined by the prompt.
        
        CRITICAL RULES (ZERO TOLERANCE):
        1. IMAGE 1 = THE MASTER FACE. The pixels of the face in the output MUST perceptually match Image 1 exactly.
        2. NO CREATIVITY ON THE FACE. Creativity is allowed for background, lighting, and clothing ONLY.
        3. If the user prompt asks for a "Style" (e.g., Anime, 3D), you must apply that style ONLY if it retains the recognizable identity of the person.
        4. IGNORE any instruction in the user prompt that implies changing the person's identity.
        
        EXECUTION STRATEGY:
        - Step 1: Lock onto facial landmarks of Image 1 (Eyes, Nose, Mouth, Jaw).
        - Step 2: Render the scene.
        - Step 3: Re-verify that the rendered face is the SAME person as Image 1.
        `;

        const config: any = {
            systemInstruction: systemPrompt,
            
            // STRICTNESS LEVER 1: Temperature
            // 0.15 removes almost all randomness. The model will pick the most likely tokens (the input face).
            temperature: 0.15, 
            
            // STRICTNESS LEVER 2: TopP
            // 0.8 forces the model to ignore "unlikely" variations of the face.
            topP: 0.8,
            
            candidateCount: 1, 
            responseModalities: ['TEXT', 'IMAGE'], 
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
            userLog.warn('No images returned', { templateId });
            res.status(500).json({ error: 'Generation failed. Safety filters may have blocked the image.' });
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
            res.status(400).json({ error: 'Safety filter triggered.' });
        } else {
            res.status(500).json({ error: 'Generation failed.' });
        }
    }
}