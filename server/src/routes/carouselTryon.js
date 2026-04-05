import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import { createAdminClient, getUserFromRequest } from '../lib/auth.js';
import { GEMINI_CONFIG } from '../lib/serverConfig.js';
import { enqueueGeneration } from '../lib/generationQueue.js';

const MIME_TO_EXT = { 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * POST /api/carousel-tryon
 * Body: { templateId, templateImageUrl }
 * 
 * Returns cached result if available, otherwise queues generation.
 * Credits are NOT deducted (system-initiated, source=carousel).
 */
export async function carouselTryOnHandler(req, res) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const authResult = await getUserFromRequest(req, res);
    if ('error' in authResult) return res.status(authResult.status).json({ error: authResult.error });

    const userId = authResult.user.id;
    const { templateId, templateImageUrl } = req.body || {};

    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ error: 'templateId is required' });
    }
    if (!templateImageUrl || typeof templateImageUrl !== 'string') {
      return res.status(400).json({ error: 'templateImageUrl is required' });
    }

    // Check if user has a profile photo
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_photo_url')
      .eq('id', userId)
      .single();

    if (!profile?.profile_photo_url) {
      return res.status(400).json({ error: 'Profile photo required for personalized carousel' });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('generated_images')
      .select('image_url')
      .eq('user_id', userId)
      .eq('template_id', templateId)
      .eq('mode', 'carousel_tryon')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return res.status(200).json({ status: 'cached', imageUrl: cached.image_url });
    }

    // Queue generation
    try {
      const result = await enqueueGeneration(userId, async () => {
        return await generateCarouselTryOn(supabase, userId, profile.profile_photo_url, templateId, templateImageUrl);
      });
      return res.status(200).json({ status: 'generated', imageUrl: result });
    } catch (err) {
      if (err.message?.includes('Daily auto-generation limit')) {
        return res.status(429).json({ error: err.message });
      }
      console.error('Carousel generation failed:', err);
      return res.status(500).json({ error: 'Generation failed' });
    }
  } catch (err) {
    console.error('carouselTryOn error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateCarouselTryOn(supabase, userId, profilePhotoUrl, templateId, templateImageUrl) {
  // Fetch profile photo
  const selfieResp = await fetch(profilePhotoUrl);
  if (!selfieResp.ok) throw new Error('Failed to fetch profile photo');
  const selfieBuffer = Buffer.from(await selfieResp.arrayBuffer());
  const selfieMime = selfieResp.headers.get('content-type') || 'image/jpeg';

  // Fetch template/product image (wearable)
  const wearableResp = await fetch(templateImageUrl);
  if (!wearableResp.ok) throw new Error('Failed to fetch template image');
  const wearableBuffer = Buffer.from(await wearableResp.arrayBuffer());
  const wearableMime = wearableResp.headers.get('content-type') || 'image/jpeg';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const ai = new GoogleGenAI({ apiKey });

  const parts = [
    { inlineData: { mimeType: selfieMime, data: selfieBuffer.toString('base64') } },
    { inlineData: { mimeType: wearableMime, data: wearableBuffer.toString('base64') } },
    { text: 'Perform a photorealistic virtual try-on using the first image as the subject and the second image as the garment.' },
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_CONFIG.MODEL_NAME,
    contents: parts,
    config: {
      temperature: 0.4,
      topP: 0.85,
      candidateCount: 1,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    },
  });

  const candidates = response.candidates || [];
  for (const c of candidates) {
    const part = c?.content?.parts?.find((p) => p.inlineData);
    if (part?.inlineData?.data) {
      const { data: imgData, mimeType: imgMime } = part.inlineData;
      const ext = MIME_TO_EXT[imgMime] || 'png';
      const now = new Date();
      const yyyyMm = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const storagePath = `${userId}/${yyyyMm}/${randomUUID()}.${ext}`;

      const buffer = Buffer.from(imgData, 'base64');
      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(storagePath, buffer, { contentType: imgMime, upsert: false });

      if (uploadError) throw new Error('Failed to store generated image');

      const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Persist to generated_images table
      await supabase.from('generated_images').insert({
        user_id: userId,
        storage_path: storagePath,
        image_url: publicUrl,
        template_id: templateId,
        template_name: null,
        stack_id: 'fitit',
        mode: 'carousel_tryon',
        aspect_ratio: null,
      });

      return publicUrl;
    }
  }

  throw new Error('No image generated');
}
