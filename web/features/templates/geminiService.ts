// services/geminiService.ts
// Backwards-compatible client wrapper.
// Exports two functions:
//  - generateRemixOnServer(imageFile, templateId, templateOptions, wearableFile)
//  - generateImage(template, selfieFile, wearableFile?)  <-- preserves old UI calls

import { CONFIG } from '../../config';

async function fileToDataUrl(file: File | null) {
  if (!file) return null;
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed reading image'));
    reader.readAsDataURL(file);
  });
}

async function urlToDataUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const resolvedUrl = /^https?:\/\//i.test(url)
      ? url
      : new URL(url, window.location.origin).toString();
    const resp = await fetch(resolvedUrl, { credentials: "include" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed reading template reference image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Minimal request shape expected by the server.
 * - imageData: data URL string for the main image (selfie)
 * - wearableData: optional data URL string for the wearable/overlay image
 * - templateReferenceData: optional data URL string for template cover/reference image
 * - templateId: id of the template
 * - templateOptions: other options (prompt, aspectRatio, etc)
 */
export async function generateRemixOnServer(
  imageFile: File,
  templateId: string,
  templateOptions?: Record<string, any>,
  wearableFile?: File | null
) {
  const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
  const url = apiBase ? `${apiBase}/api/generate` : '/api/generate';

  const imageData = await fileToDataUrl(imageFile);
  const wearableData = await fileToDataUrl(wearableFile ?? null);
  const templateReferenceData = await urlToDataUrl(
    templateOptions?.template?.imageUrl ?? templateOptions?.imageUrl
  );

  const payload = {
    imageData,
    wearableData,
    templateReferenceData,
    templateId,
    templateOptions: templateOptions ?? {},
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    // try to give a helpful error
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error ?? `Generation failed (${resp.status})`);
  }

  const { images } = await resp.json();
  return images; // array of data URLs
}

/**
 * Backwards-compatible function: old UI code calls generateImage(template, selfie, wearable)
 * We keep that exact signature and route it to generateRemixOnServer.
 */
export async function generateImage(
  template: any,
  selfieFile: File,
  wearableFile?: File | null
) {
  if (!template || !selfieFile) {
    throw new Error('Missing template or selfie image');
  }

  const templateId = template.id ?? template.templateId ?? String(template);
  const stackId = String(template?.stackId ?? '').toLowerCase();
  const isTryOnTemplate = stackId === 'fitit' || String(templateId).toLowerCase().startsWith('fitit_');
  if (isTryOnTemplate && !wearableFile) {
    throw new Error('Try-on needs two images: a selfie and a wearable image.');
  }

  const templateOptions = {
    // preserve the main prompt and aspectRatio if present
    text: template.prompt ?? template.text ?? '',
    aspectRatio: template.aspectRatio ?? template.aspect_ratio ?? undefined,
    // keep entire template object for server if needed
    template,
  };

  return await generateRemixOnServer(selfieFile, templateId, templateOptions, wearableFile ?? null);
}
