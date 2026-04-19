// eslint-disable-next-line no-unused-vars
const logger = { warn: console.warn.bind(console), error: console.error.bind(console) };

// Lazy-load sharp and background-removal — server starts even if native binaries unavailable
let _sharp = null;
let _removeBackground = null;

async function getSharp() {
  if (!_sharp) {
    try {
      const mod = await import('sharp');
      _sharp = mod.default;
    } catch (err) {
      logger.warn(`sharp unavailable (${err.message}). Images will be stored as-is.`);
      _sharp = false;
    }
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

  // If sharp is unavailable, return buffer as-is
  if (!sharp) {
    return { cleanBuffer: buffer, originalResized: buffer };
  }

  // Resize original to 1024px max dimension first (reduces bg-removal time)
  const originalResized = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

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

  return { cleanBuffer, originalResized };
}
