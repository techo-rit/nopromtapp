// api/generate.ts
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
    const AI_MODEL = 'gemini-2.5-flash-image';

    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

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
