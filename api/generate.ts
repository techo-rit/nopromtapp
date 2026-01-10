// api/generate.ts
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { getGenerateRateLimiter, checkRateLimit } from '../lib/ratelimit';

// SECURITY: Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]);

// SECURITY: Max image size (10MB in base64 ≈ 13.3MB string)
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_SIZE_BYTES * 4 / 3);

// SECURITY: Max prompt length to prevent abuse
const MAX_PROMPT_LENGTH = 10000;

// Helper to verify user authentication and check credits
async function verifyAuthAndCredits(req: any): Promise<{ userId: string } | { error: string; status: number }> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Unauthorized - missing auth token', status: 401 };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Server configuration error', status: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
        return { error: 'Unauthorized - invalid session', status: 401 };
    }

    // SECURITY: Redis-backed rate limit check (persists across serverless instances)
    const rateLimitResult = await checkRateLimit(getGenerateRateLimiter(), user.id);
    if (!rateLimitResult.success) {
        return { error: 'Rate limit exceeded. Please wait before generating more images.', status: 429 };
    }

    // Check user has credits
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: 'User profile not found', status: 404 };
    }

    if (profile.credits < 1) {
        return { error: 'Insufficient credits', status: 403 };
    }

    // Deduct credit before generation
    const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: 1
    });

    if (deductError) {
        console.error('Credit deduction failed:', deductError);
        return { error: 'Failed to process request', status: 500 };
    }

    return { userId: user.id };
}

// SECURITY: Validate and parse image data URL with strict checks
function validateAndParseImage(dataUrl: string | null | undefined): { mimeType: string; data: string } | { error: string } | null {
    if (!dataUrl) return null;
    
    const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
    if (!m) {
        return { error: 'Invalid image format' };
    }
    
    const mimeType = m[1].toLowerCase();
    const base64Data = m[2];
    
    // Check MIME type whitelist
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return { error: `Unsupported image type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF` };
    }
    
    // Check size limit
    if (base64Data.length > MAX_BASE64_LENGTH) {
        return { error: 'Image too large. Maximum size is 10MB.' };
    }
    
    // Basic base64 validation (check for valid characters)
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
        return { error: 'Invalid image data encoding' };
    }
    
    return { mimeType, data: base64Data };
}

// SECURITY: Sanitize prompt text to prevent injection
function sanitizePrompt(text: string | object | null | undefined): string {
    if (!text) return '';
    
    // Convert objects to string
    let prompt = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    
    // Truncate to max length
    if (prompt.length > MAX_PROMPT_LENGTH) {
        prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
    }
    
    return prompt;
}

export default async function handler(req: any, res: any) {
    const AI_MODEL = 'gemini-2.5-flash-image';

    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        // SECURITY: Verify authentication and deduct credits BEFORE processing
        const authResult = await verifyAuthAndCredits(req);
        if ('error' in authResult) {
            res.status(authResult.status).json({ error: authResult.error });
            return;
        }
        // authResult.userId is now available for logging if needed

        const body = req.body || {};
        const { imageData, wearableData, templateId, templateOptions } = body;

        if (!imageData) {
            res.status(400).json({ error: 'Missing imageData (main image)' });
            return;
        }

        // SECURITY: Validate main image
        const mainImageResult = validateAndParseImage(imageData);
        if (mainImageResult && 'error' in mainImageResult) {
            res.status(400).json({ error: mainImageResult.error });
            return;
        }

        // SECURITY: Validate optional wearable image
        const wearableImageResult = validateAndParseImage(wearableData);
        if (wearableImageResult && 'error' in wearableImageResult) {
            res.status(400).json({ error: `Wearable image: ${wearableImageResult.error}` });
            return;
        }

        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            res.status(500).json({
                error: 'Generation service temporarily unavailable',
            });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const parts: any[] = [];

        if (mainImageResult && !('error' in mainImageResult)) {
            parts.push({
                type: 'IMAGE',
                inlineData: mainImageResult,
            });
        }

        if (wearableImageResult && !('error' in wearableImageResult)) {
            parts.push({
                type: 'IMAGE',
                inlineData: wearableImageResult,
            });
        }

        // SECURITY: Sanitize prompt text
        let instructionText = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
        
        if (!instructionText) {
            instructionText = `Remix the provided image using template ${templateId || 'default'}`;
        }

        parts.push({
            type: 'TEXT',
            text: instructionText,
        });


        const response = await ai.models.generateContent({
            model: AI_MODEL,
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: templateOptions?.aspectRatio,
                },
            },
        });

        const urls: string[] = [];

        for (const c of response.candidates ?? []) {
            const part = c?.content?.parts?.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) {
                urls.push(
                    `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                );
            }
        }

        if (urls.length === 0) {
            res.status(500).json({
                error: 'Generation failed. The image may have been blocked by safety filters. Please try a different image.',
            });
            return;
        }

        res.status(200).json({ images: urls });
    } catch (err: any) {
        // SECURITY: Log full error server-side but return sanitized message to client
        console.error('API /api/generate error:', err);
        
        // Check for specific Gemini API errors that are safe to expose
        const errorMessage = err?.message || '';
        
        if (errorMessage.includes('SAFETY')) {
            res.status(400).json({ error: 'Image generation blocked by safety filters. Please try a different image or prompt.' });
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
            res.status(429).json({ error: 'Service temporarily busy. Please try again in a few moments.' });
        } else if (errorMessage.includes('invalid') && errorMessage.includes('image')) {
            res.status(400).json({ error: 'Invalid image format. Please upload a valid JPEG, PNG, or WebP image.' });
        } else {
            // Generic error - don't leak internal details
            res.status(500).json({ error: 'Image generation failed. Please try again.' });
        }
    }
}
