// api/generate.ts
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Helper to verify user authentication and check credits
async function verifyAuthAndCredits(req: any): Promise<{ userId: string } | { error: string; status: number }> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Unauthorized - missing auth token', status: 401 };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Server misconfiguration: database not configured', status: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
        return { error: 'Unauthorized - invalid session', status: 401 };
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
        return { error: 'Failed to deduct credits', status: 500 };
    }

    return { userId: user.id };
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

        const apiKey =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            res.status(500).json({
                error: 'Server misconfiguration: missing API key',
            });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const toInline = (dataUrl: string | null | undefined) => {
            if (!dataUrl) return null;
            const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
            if (!m) return null;
            return { mimeType: m[1], data: m[2] };
        };

        const mainInline = toInline(imageData);
        const wearableInline = toInline(wearableData);

        const parts: any[] = [];

        if (mainInline) {
            parts.push({
                type: 'IMAGE',
                inlineData: mainInline,
            });
        }

        if (wearableInline) {
            parts.push({
                type: 'IMAGE',
                inlineData: wearableInline,
            });
        }

       let instructionText = templateOptions?.text || templateOptions?.prompt;

// CRITICAL FIX: Convert JSON objects to strings
// If the prompt is a JSON object (from updated templates), stringify it
if (typeof instructionText === 'object' && instructionText !== null) {
  instructionText = JSON.stringify(instructionText, null, 2);
} else if (!instructionText) {
  instructionText = `Remix the provided image using template ${templateId}`;
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
                error: 'No images generated (empty or blocked response)',
            });
            return;
        }

        res.status(200).json({ images: urls });
    } catch (err: any) {
        console.error('API /api/generate error:', err);
        res.status(500).json({ error: err?.message || 'Unknown error' });
    }
}
