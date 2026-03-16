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

    const templateReferenceImage = validateAndParseImage(templateReferenceData);
    let validTemplateReference = null;
    if (templateReferenceImage) {
      if ('error' in templateReferenceImage) {
        res.status(400).json({ error: `Template reference image error: ${templateReferenceImage.error}` });
        return;
      }
      validTemplateReference = templateReferenceImage;
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

    let coreInstruction = '';
    if (validWearable) {
      coreInstruction = `
            TASK: VIRTUAL TRY-ON (Identity Preserved).
            
            INPUTS:
            - Image 1: "The Subject" (Preserve this person's face and identity exactly).
            - Image 2: "The Garment" (Apply this clothing to the Subject).
            ${validTemplateReference ? '- Image 3: "Template Reference" (Use this as visual guidance for scene/composition/style only).' : ''}
            
            INSTRUCTIONS:
            1. Generate a photorealistic image of the person from Image 1 wearing the clothing from Image 2.
            2. CRITICAL: The face in the output MUST match the face in Image 1. 
            3. Adjust the lighting on the clothing to match the Subject's environment.
            ${validTemplateReference ? '4. Use Image 3 to guide the background scene, composition, and overall styling, while preserving identity from Image 1.' : ''}
            `;
    } else {
      coreInstruction = userInstruction || `Generate a photorealistic remix based on this image. Theme: ${templateId}`;
      if (validTemplateReference) {
        coreInstruction += '\nUse the template reference image as visual guidance for scene/composition/style.';
      }
    }

    const finalPrompt = `
        ${coreInstruction}
        
        STRICT CONSTRAINTS:
        - Maintain the exact facial identity of the person in Image 1.
        - The face should be clearly recognizable as the same individual, with no alterations to key features.
        - Do not change the person's hairstyle, skin tone, or any distinctive marks (e.g., moles, scars).
        - Do not add or remove accessories like glasses, earrings, or hats that are present in the original image.
        - Do not alter the person's expression in a way that changes their identity (e.g., from smiling to frowning).
        - Do not change the background in a way that obscures the person's identity (e.g., adding heavy filters or effects).
        - Do not morph the person's face into another style (e.g., cartoon, painting) that makes them unrecognizable.
        - Do not change the person's age, ethnicity, or key facial features.
        - Output Aspect Ratio: ${aspectRatio}
        - Style: Photorealistic, 8k, High Fidelity.
        `;

    parts.push({ text: finalPrompt });

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

    const config = {
      systemInstruction: systemPrompt,
      temperature: 0.9,
      topP: 0.95,
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
