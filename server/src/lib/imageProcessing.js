// eslint-disable-next-line no-unused-vars
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

// Lazy-load sharp and background-removal — server starts even if native binaries unavailable
let _sharp = null;
let _removeBackground = null;

async function getSharp() {
  if (_sharp !== null) return _sharp || null;
  try {
    const mod = await import('sharp');
    const sharpFn = mod.default;
    // Probe with a synthetic 1×1 image — catches GLib/native-binary crashes at startup
    // before any real user request hits the runtime crash.
    await sharpFn({
      create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).jpeg().toBuffer();
    _sharp = sharpFn;
    logger.warn('sharp: native binary OK');
  } catch (err) {
    logger.warn(`sharp unavailable or native crash (${err.message}). Images stored as-is.`);
    _sharp = false;
  }
  return _sharp || null;
}

async function getRemoveBackground() {
  if (!_removeBackground) {
    try {
      const mod = await import('@imgly/background-removal-node');
      _removeBackground = mod.removeBackground;
    } catch (err) {
      logger.warn(`@imgly/background-removal-node unavailable (${err.message}).`);
      _removeBackground = false;
    }
  }
  return _removeBackground || null;
}

/**
 * Process a garment image: background removal → resize → WebP compression.
 * Returns clean WebP buffer + resized original as fallback.
 *
 * @param {Buffer} buffer - Original image buffer
 * @param {string} mimeType - MIME type of the original image
 * @returns {Promise<{ cleanBuffer: Buffer, originalResized: Buffer }>}
 */
export async function processGarmentImage(buffer, mimeType) {
  const sharp = await getSharp();
  const removeBackground = await getRemoveBackground();

  // If sharp is unavailable, return buffer as-is with original mimeType
  if (!sharp) {
    return { cleanBuffer: buffer, originalResized: buffer, actualMimeType: mimeType };
  }

  let originalResized;
  try {
    // Resize original to 1024px max dimension first (reduces bg-removal time)
    originalResized = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (sharpErr) {
    // sharp binary loaded but crashed at runtime (e.g. GLib mismatch on server)
    logger.warn(`sharp runtime error, using original buffer: ${sharpErr.message}`);
    // Invalidate the cached module so future calls skip straight to fallback
    _sharp = false;
    return { cleanBuffer: buffer, originalResized: buffer, actualMimeType: mimeType };
  }

  let cleanBuffer;
  try {
    if (!removeBackground) throw new Error('bg-removal unavailable');

    // Background removal — works on the resized image for speed
    const blob = new Blob([originalResized], { type: 'image/webp' });
    const resultBlob = await removeBackground(blob, {
      output: { format: 'image/png' },
    });
    const arrayBuffer = await resultBlob.arrayBuffer();
    const pngBuffer = Buffer.from(arrayBuffer);

    // Convert bg-removed PNG to WebP
    cleanBuffer = await sharp(pngBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (err) {
    // Fallback: use resized original without bg removal
    logger.warn(`Background removal failed, using fallback: ${err.message}`);
    cleanBuffer = originalResized;
  }

  return { cleanBuffer, originalResized, actualMimeType: 'image/webp' };
}
