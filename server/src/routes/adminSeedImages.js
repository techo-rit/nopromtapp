/**
 * Admin — Seed product images into templates table.
 *
 * POST /api/admin/seed-images
 *   Scans server/public/images/products/, inserts a template row for each image
 *   whose URL (/images/products/<filename>) is not already in the templates table.
 *   Returns { inserted, skipped, files } summary.
 */

import { readdirSync, existsSync } from 'fs';
import { resolve, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createAdminClient, verifyAdmin } from '../lib/auth.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const PRODUCTS_DIR = resolve(__dirname, '..', '..', 'public', 'images', 'products');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

/**
 * POST /api/admin/seed-images
 */
export async function seedImagesHandler(req, res) {
  if (!verifyAdmin(req, res)) return;

  if (!existsSync(PRODUCTS_DIR)) {
    return res.status(404).json({
      error: 'Products image directory not found',
      path: PRODUCTS_DIR,
    });
  }

  let files;
  try {
    files = readdirSync(PRODUCTS_DIR).filter((f) =>
      IMAGE_EXTS.has(extname(f).toLowerCase())
    );
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read image directory', message: err.message });
  }

  if (files.length === 0) {
    return res.json({ ok: true, inserted: 0, skipped: 0, files: [] });
  }

  const supabase = createAdminClient();

  // Fetch all existing image URLs from templates to check for duplicates
  const { data: existing, error: fetchErr } = await supabase
    .from('templates')
    .select('image');

  if (fetchErr) {
    return res.status(500).json({ error: 'Failed to query templates', message: fetchErr.message });
  }

  const existingImages = new Set((existing || []).map((r) => r.image));

  const toInsert = [];
  const skippedFiles = [];

  for (const file of files) {
    const imageUrl = `/images/products/${file}`;
    if (existingImages.has(imageUrl)) {
      skippedFiles.push(file);
      continue;
    }

    const nameWithoutExt = basename(file, extname(file));

    toInsert.push({
      id: nameWithoutExt,
      title: '',
      image: imageUrl,
      aspect_ratio: '3:4',
      is_active: true,
    });
  }

  if (toInsert.length === 0) {
    return res.json({ ok: true, inserted: 0, skipped: skippedFiles.length, files: skippedFiles });
  }

  const { error: insertErr } = await supabase
    .from('templates')
    .insert(toInsert);

  if (insertErr) {
    return res.status(500).json({ error: 'Insert failed', message: insertErr.message });
  }

  return res.json({
    ok: true,
    inserted: toInsert.length,
    skipped: skippedFiles.length,
    insertedFiles: toInsert.map((r) => r.image),
    skippedFiles,
  });
}
