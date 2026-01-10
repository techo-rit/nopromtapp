// api/generate.ts
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
// FIXED: Added .js extension for ESM compatibility
import { getGenerateRateLimiter, checkRateLimit } from './_lib/ratelimit.js';
import { createLogger, generateRequestId, type Logger } from './_lib/logger.js';
import { UPLOAD_CONFIG, GEMINI_CONFIG } from './_lib/serverConfig.js';

// Helper to verify user authentication and check credits
async function verifyAuthAndCredits(req: any, log: Logger): Promise<{ userId: string } | { error: string; status: number }> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        log.warn('Auth failed: missing token');
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

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
        log.warn('Auth failed: invalid session');
        return { error: 'Unauthorized - invalid session', status: 401 };
    }

    // SECURITY: Redis-backed rate limit check (persists across serverless instances)
    const rateLimitResult = await checkRateLimit(getGenerateRateLimiter(), user.id);
    if (!rateLimitResult.success) {
        log.warn('Rate limit exceeded', { userId: user.id, remaining: rateLimitResult.remaining });
        return { error: 'Rate limit exceeded. Please wait before generating more images.', status: 429 };
    }

    // Check user has credits
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        log.warn('Profile not found', { userId: user.id });
        return { error: 'User profile not found', status: 404 };
    }

    if (profile.credits < 1) {
        log.info('Insufficient credits', { userId: user.id, credits: profile.credits });
        return { error: 'Insufficient credits', status: 403 };
    }

    // Deduct credit before generation
    const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: 1
    });

    if (deductError) {
        log.error('Credit deduction failed', { userId: user.id, error: deductError.message });
        return { error: 'Failed to process request', status: 500 };
    }

    log.info('Credit deducted', { userId: user.id, action: 'credit_deducted', creditsRemaining: profile.credits - 1 });
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
    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.has(mimeType)) {
        return { error: `Unsupported image type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF` };
    }
    
    // Check size limit
    if (base64Data.length > UPLOAD_CONFIG.MAX_BASE64_LENGTH) {
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
    if (prompt.length > GEMINI_CONFIG.MAX_PROMPT_LENGTH) {
        prompt = prompt.substring(0, GEMINI_CONFIG.MAX_PROMPT_LENGTH);
    }
    
    return prompt;
}

export default async function handler(req: any, res: any) {
    const requestId = generateRequestId();
    const log = createLogger(requestId);

    try {
        if (req.method !== 'POST') {
            log.warn('Method not allowed', { method: req.method });
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        log.info('Generation request started');

        // SECURITY: Verify authentication and deduct credits BEFORE processing
        const authResult = await verifyAuthAndCredits(req, log);
        if ('error' in authResult) {
            res.status(authResult.status).json({ error: authResult.error });
            return;
        }
        
        // Rebind logger with userId for remaining logs
        const userLog = createLogger(requestId, authResult.userId);

        const body = req.body || {};
        const { imageData, wearableData, templateId, templateOptions } = body;

        userLog.info('Processing generation request', { 
            templateId, 
            hasWearable: !!wearableData,
            aspectRatio: templateOptions?.aspectRatio 
        });

        if (!imageData) {
            userLog.warn('Missing imageData');
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

        // Add main image part with correct structure (no 'type' field)
        if (mainImageResult && !('error' in mainImageResult)) {
            parts.push({
                inlineData: {
                    mimeType: mainImageResult.mimeType,
                    data: mainImageResult.data,
                },
            });
        }

        // Add wearable image part with correct structure
        if (wearableImageResult && !('error' in wearableImageResult)) {
            parts.push({
                inlineData: {
                    mimeType: wearableImageResult.mimeType,
                    data: wearableImageResult.data,
                },
            });
        }

        // SECURITY: Sanitize prompt text
        let instructionText = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
        
        if (!instructionText) {
            instructionText = `Remix the provided image using template ${templateId || 'default'}`;
        }

        // Add text part with correct structure (no 'type' field)
        parts.push({ text: instructionText });

        // Build config with responseModalities for image generation
        const config: any = {
            responseModalities: ['TEXT', 'IMAGE'],
        };

        // Add aspect ratio if provided
        if (templateOptions?.aspectRatio) {
            config.imageConfig = {
                aspectRatio: templateOptions.aspectRatio,
            };
        }

        const response = await ai.models.generateContent({
            model: GEMINI_CONFIG.MODEL_NAME,
            contents: parts,
            config,
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
            userLog.warn('Generation returned no images', { templateId });
            res.status(500).json({
                error: 'Generation failed. The image may have been blocked by safety filters. Please try a different image.',
            });
            return;
        }

        // METRIC: Log successful generation with latency
        userLog.withDuration('info', 'Generation completed', { 
            templateId, 
            imagesGenerated: urls.length,
            action: 'generation_success'
        });

        res.status(200).json({ images: urls });
    } catch (err: any) {
        // SECURITY: Log full error server-side but return sanitized message to client
        const errorMessage = (err?.message || '').toLowerCase();
        
        // Categorize errors for better client feedback
        const errorType = errorMessage.includes('safety') ? 'safety_block'
            : errorMessage.includes('quota') || errorMessage.includes('rate') ? 'rate_limit'
            : errorMessage.includes('invalid') && errorMessage.includes('image') ? 'invalid_image'
            : errorMessage.includes('not found') || errorMessage.includes('404') ? 'model_not_found' // NEW: Catch model errors
            : 'unknown';

        // Use top-level log since userLog may not be defined if error occurred before auth
        const errorLog = createLogger(requestId);
        
        // Helpful dev log
        console.error('API Error:', err); 

        errorLog.error('Generation failed', { 
            errorType,
            errorMessage: err?.message,
            action: 'generation_error'
        });
        
        if (errorType === 'safety_block') {
            res.status(400).json({ error: 'Image generation blocked by safety filters. Please try a different image or prompt.' });
        } else if (errorType === 'rate_limit') {
            res.status(429).json({ error: 'Service temporarily busy. Please try again in a few moments.' });
        } else if (errorType === 'invalid_image') {
            res.status(400).json({ error: 'Invalid image format. Please upload a valid JPEG, PNG, or WebP image.' });
        } else if (errorType === 'model_not_found') {
            res.status(500).json({ error: `Server Configuration Error: Model '${GEMINI_CONFIG.MODEL_NAME}' not found. Please check your API key and access.` });
        } else {
            // Generic error - don't leak internal details
            res.status(500).json({ error: 'Image generation failed. Please try again.' });
        }
    }
}