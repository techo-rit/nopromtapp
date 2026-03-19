import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import { getGenerateRateLimiter, checkRateLimit } from '../lib/ratelimit.js';
import { createLogger, generateRequestId } from '../lib/logger.js';
import { UPLOAD_CONFIG, GEMINI_CONFIG } from '../lib/serverConfig.js';
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';

async function verifyAuthAndCredits(req, res, log) {
  const supabase = createAdminClient();
  if (!supabase) {
    log.error('Server config error: missing Supabase credentials');
    return { error: 'Server configuration error', status: 500 };
  }

  const authResult = await getUserFromRequest(req, res);
  if ('error' in authResult) {
    return { error: authResult.error, status: authResult.status };
  }
  const user = authResult.user;

  const limiter = getGenerateRateLimiter();
  const rateLimitResult = await checkRateLimit(limiter, user.id);
  if (!rateLimitResult.success) {
    return { error: 'Rate limit exceeded. Please wait.', status: 429 };
  }

  const { data: deduction, error: deductError } = await supabase.rpc('deduct_creations', { p_user_id: user.id, p_amount: 1 });
  if (deductError || !deduction?.success) {
    log.error('Creation deduction failed', { error: deductError?.message || deduction?.error });
    const reason = deduction?.error || 'Insufficient creations';
    return { error: reason, status: 403 };
  }

  return { userId: user.id };
}

function validateAndParseImage(dataUrl) {
  if (!dataUrl) return null;
  const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
  if (!m) return { error: 'Invalid image format' };
  return { mimeType: m[1].toLowerCase(), data: m[2] };
}

function sanitizePrompt(text) {
  if (!text) return '';
  return typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
}

const MIME_TO_EXT = { 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

async function persistGeneratedImage(supabase, userId, base64Data, mimeType, metadata, log) {
  try {
    const ext = MIME_TO_EXT[mimeType] || 'png';
    const now = new Date();
    const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const storagePath = `${userId}/${yyyyMm}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(base64Data, 'base64');
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      log.error('Storage upload failed', { error: uploadError.message });
      return null;
    }

    const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(storagePath);
    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) {
      log.error('Could not get public URL after upload');
      return null;
    }

    const { error: dbError } = await supabase.from('generated_images').insert({
      user_id: userId,
      storage_path: storagePath,
      image_url: imageUrl,
      template_id: metadata.templateId || null,
      template_name: metadata.templateName || null,
      stack_id: metadata.stackId || null,
      mode: metadata.mode,
      aspect_ratio: metadata.aspectRatio || null,
    });

    if (dbError) {
      log.error('DB insert for generated image failed', { error: dbError.message });
      // Image is already in storage — don't remove it, just return URL with no DB record
    }

    return imageUrl;
  } catch (err) {
    log.error('persistGeneratedImage unexpected error', { error: err?.message });
    return null;
  }
}

export async function generateHandler(req, res) {
  const requestId = generateRequestId();
  const log = createLogger(requestId);

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const authResult = await verifyAuthAndCredits(req, res, log);
    if ('error' in authResult) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }

    const { imageData, wearableData, templateReferenceData, templateId, templateOptions } = req.body || {};
    const userLog = createLogger(requestId, authResult.userId);
    const supabase = createAdminClient();
    const requestedStackId = String(templateOptions?.template?.stackId || '').toLowerCase();
    const requestedTemplateId = String(templateId || '').toLowerCase();
    const isTryOnRequest = requestedStackId === 'fitit' || requestedTemplateId.startsWith('fitit_');

    const mainImage = validateAndParseImage(imageData);
    if (!mainImage) {
      res.status(400).json({ error: 'Missing main image' });
      return;
    }
    if ('error' in mainImage) {
      res.status(400).json({ error: mainImage.error });
      return;
    }

    const wearableImage = validateAndParseImage(wearableData);
    let validWearable = null;
    if (wearableImage) {
      if ('error' in wearableImage) {
        res.status(400).json({ error: `Wearable image error: ${wearableImage.error}` });
        return;
      }
      validWearable = wearableImage;
    }

    if (isTryOnRequest && !validWearable) {
      res.status(400).json({
        error: 'Try-on requires two images: your selfie and a wearable image.',
      });
      return;
    }

    const shouldUseTemplateReference = !isTryOnRequest;
    let validTemplateReference = null;
    if (shouldUseTemplateReference) {
      const templateReferenceImage = validateAndParseImage(templateReferenceData);
      if (templateReferenceImage) {
        if ('error' in templateReferenceImage) {
          res.status(400).json({ error: `Template reference image error: ${templateReferenceImage.error}` });
          return;
        }
        validTemplateReference = templateReferenceImage;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server misconfigured: Missing API Key' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts = [];

    parts.push({
      inlineData: {
        mimeType: mainImage.mimeType,
        data: mainImage.data,
      },
    });

    if (validWearable) {
      parts.push({
        inlineData: {
          mimeType: validWearable.mimeType,
          data: validWearable.data,
        },
      });
    }

    if (validTemplateReference) {
      parts.push({
        inlineData: {
          mimeType: validTemplateReference.mimeType,
          data: validTemplateReference.data,
        },
      });
    }

    const userInstruction = sanitizePrompt(templateOptions?.text || templateOptions?.prompt);
    const aspectRatio = templateOptions?.aspectRatio || '1:1';

    let finalPrompt = '';
    let systemPrompt = '';

    if (isTryOnRequest && validWearable) {
      // ── TRY-ON MODE ──
      // Use the template's own detailed prompt (INPUT 1 / INPUT 2 protocol).
      // The fitit templates already contain full virtual try-on instructions
      // with garment-specific handling, step-by-step protocols, and output specs.
      // Only fall back to a generic instruction if no template prompt was provided.

      if (userInstruction && userInstruction.length > 50) {
        // Template has a detailed prompt — use it directly.
        // Prepend a concise image-labelling header so the model knows which image is which.
        finalPrompt = `IMAGE MAPPING:
- The FIRST image provided is INPUT 1 (The User / The Subject). This person's face and identity MUST be preserved with 100% fidelity.
- The SECOND image provided is INPUT 2 (The Garment / The Wearable). ONLY the clothing item from this image should be used. Discard the person, background, and all other elements from this image.
${validTemplateReference ? '- The THIRD image is a style/scene reference only.\n' : ''}
FACE CONSISTENCY RULE (CRITICAL FOR MULTI-VIEW OUTPUT):
If the output contains multiple views/panels/angles of the subject, EVERY SINGLE panel MUST show the EXACT SAME face — the face from INPUT 1. Do NOT generate a different face for different angles. All panels share one identity: the person in INPUT 1. The jawline, chin shape, nose, eyes, eyebrows, hairline, hair texture, hair color, skin tone, and all facial proportions must be pixel-consistent across every panel. If any panel shows a face that looks like a different person, the entire output is a failure.

${userInstruction}

Output Aspect Ratio: ${aspectRatio}`;
      } else {
        // No template prompt — use a robust generic try-on instruction.
        finalPrompt = `TASK: VIRTUAL TRY-ON (Identity Preserved).

IMAGE MAPPING:
- The FIRST image is INPUT 1: "The Subject". This is the ONLY source of identity. Preserve this person's face, hair, skin tone, body shape, and all distinguishing features with 100% fidelity.
- The SECOND image is INPUT 2: "The Garment". Extract ONLY the clothing item from this image. The person wearing it, the background, and all other elements MUST BE COMPLETELY DISCARDED.
${validTemplateReference ? '- The THIRD image is a style/scene reference for composition guidance only.\n' : ''}
EXECUTION PROTOCOL:
1. Mentally isolate the clothing item from INPUT 2. Discard everything else from that image.
2. On the person from INPUT 1, identify the body area covered by their current clothing.
3. Replace that area with the isolated garment from step 1.
4. Warp, resize, and re-light the NEW GARMENT ONLY to naturally fit the subject's exact body shape, size, and pose from INPUT 1. Never alter the subject's body to fit the garment.
5. Verify: the face, hair, skin, and all visible features in the output are identical to INPUT 1. Any influence from the person in INPUT 2 is a critical failure.

OUTPUT:
Generate a single full-body, photorealistic output. Neutral studio background. 8K quality.
Output Aspect Ratio: ${aspectRatio}`;
      }

      systemPrompt = `You are an expert virtual try-on system. Your ONLY task is to dress the person from the FIRST input image in the clothing from the SECOND input image.

ABSOLUTE RULES:
1. The face, hair, skin tone, body shape, and all distinguishing features MUST come exclusively from the FIRST image (the user's selfie). This is non-negotiable.
2. The SECOND image is a garment reference ONLY. The person in the second image does NOT exist — extract the clothing item and discard everything else.
3. Never blend, merge, or average faces between the two images. The output must be recognizably the same person as in the first image.
4. Fit the garment naturally to the subject's body — adjust folds, drape, lighting, and shadows to match the subject's pose and environment.
5. Output must be photorealistic with natural skin texture, realistic lighting, and no AI artifacts.

MULTI-VIEW FACE LOCK (CRITICAL):
When generating multiple views or angles in one image, treat the face from INPUT 1 as a LOCKED REFERENCE ASSET. Every panel/view MUST render the IDENTICAL face — same jawline, same chin, same nose, same eyes, same eyebrows, same hairline, same hair style and color, same skin tone, same facial proportions. Do NOT let the face drift, morph, or vary between panels. Imagine you are copy-pasting the same face onto each angle — only the head rotation changes, never the facial features themselves. Any inconsistency between panels is a critical failure.`;

    } else {
      // ── REMIX / CREATIVE MODE ──
      // Use the template's prompt directly — this is what makes animation, aesthetics, flex work.
      let coreInstruction = userInstruction || `Generate a photorealistic remix based on this image. Theme: ${templateId}`;
      if (validTemplateReference) {
        coreInstruction += '\nUse the template reference image as visual guidance for scene/composition/style.';
      }

      finalPrompt = `${coreInstruction}

STRICT CONSTRAINTS:
- Maintain the exact facial identity of the person in Image 1.
- The face should be clearly recognizable as the same individual, with no alterations to key features.
- Do not change the person's hairstyle, skin tone, or any distinctive marks (e.g., moles, scars).
- Do not add or remove accessories like glasses, earrings, or hats that are present in the original image.
- Do not morph the person's face into another style that makes them unrecognizable.
- Do not change the person's age, ethnicity, or key facial features.
- Output Aspect Ratio: ${aspectRatio}
- Style: Photorealistic, 8k, High Fidelity.`;

      systemPrompt = `You are an advanced AI specialized in photorealistic identity preservation.

PRIMARY DIRECTIVE:
You must preserve the facial identity of the subject in the first input image.
The output image must look like a photograph of the SAME PERSON.

QUALITY GUIDELINES:
- Focus on skin texture, realistic lighting, and natural details.`;
    }

    parts.push({ text: finalPrompt });

    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ];

    // Try-on needs precision (low temperature); creative modes benefit from higher temperature.
    const temperature = (isTryOnRequest && validWearable) ? 0.4 : 0.9;

    const config = {
      systemInstruction: systemPrompt,
      temperature,
      topP: (isTryOnRequest && validWearable) ? 0.85 : 0.95,
      candidateCount: 1,
      safetySettings,
    };

    if (templateOptions?.aspectRatio) {
      config.imageConfig = { aspectRatio: templateOptions.aspectRatio };
    }

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL_NAME,
      contents: parts,
      config,
    });

    userLog.info('Generation request payload summary', {
      templateId: templateId || null,
      stackId: templateOptions?.template?.stackId || null,
      isTryOnRequest,
      hasWearable: Boolean(validWearable),
      hasTemplateReference: Boolean(validTemplateReference),
      partsCount: parts.length,
    });

    const urls = [];
    const candidates = response.candidates || [];

    const imageMetadata = {
      templateId: templateId || null,
      templateName: templateOptions?.template?.name || null,
      stackId: templateOptions?.template?.stackId || null,
      mode: validWearable ? 'tryon' : 'remix',
      aspectRatio: aspectRatio || null,
    };

    for (const c of candidates) {
      const part = c?.content?.parts?.find((p) => p.inlineData);
      if (part?.inlineData?.data) {
        const { data: imgData, mimeType: imgMime } = part.inlineData;
        // Persist to Supabase Storage — fall back to base64 data URL if it fails
        const publicUrl = supabase
          ? await persistGeneratedImage(supabase, authResult.userId, imgData, imgMime, imageMetadata, userLog)
          : null;
        urls.push(publicUrl ?? `data:${imgMime};base64,${imgData}`);
      }
    }

    if (urls.length === 0) {
      userLog.warn('No images returned', { templateId, safetyRatings: candidates[0]?.safetyRatings });
      res.status(500).json({ error: 'Generation failed. The AI might have blocked the request due to safety filters.' });
      return;
    }

    userLog.info('Success', { count: urls.length });
    res.status(200).json({ images: urls });
  } catch (err) {
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
