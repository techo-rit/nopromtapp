import type { Template } from '../../types';

/**
 * Hardcoded try-on template — this is a built-in Changing Room feature,
 * NOT a Supabase template row. Safe to use without any DB lookup.
 */
export const TRYON_TEMPLATE: Template = {
  id: 'fitit_tryon',
  name: 'Try-On',
  stackId: 'fitit',
  imageUrl: '/images/fitit_cover.webp',
  aspectRatio: '3:4',
  prompt: {
    task: 'virtual_try_on_with_body_completion',
    model: 'gemini-3.1-flash-image-preview',
    inputs: {
      person_image: {
        type: 'image',
        description:
          'Input 1: User image (can be selfie, half-body, or full-body). Identity must be preserved.',
      },
      garment_image: {
        type: 'image',
        description: 'Input 2: Garment image to be tried on.',
      },
    },
    instructions: {
      objective:
        'Generate a single, full-body, photorealistic try-on image (front view only) of the user wearing the garment, even if the input person image is not full-body.',
      identity_preservation: [
        "Strictly preserve the user's face, hairstyle, skin tone, and identity",
        'Do not alter facial structure or expression',
      ],
      body_completion: [
        'If the input image is not full-body, intelligently generate the missing body parts',
        'Ensure the generated body is anatomically correct and proportionate to the visible parts',
        'Infer natural pose consistent with the upper body',
        'Maintain realistic human proportions (height, limb ratios)',
      ],
      garment_fitting: [
        'Fit the garment naturally to the generated full body',
        'Ensure proper scaling, alignment, and draping',
        'Preserve garment texture, color, stitching, and design details',
        'Simulate realistic fabric physics (folds, tension, gravity)',
      ],
      consistency_rules: [
        'Match lighting, shadows, and perspective with the original image',
        'Keep background consistent or extend it naturally if needed',
        'Ensure no visible artifacts, distortions, or identity drift',
      ],
      output_style: {
        type: 'photorealistic',
        framing: 'full-body',
        view: 'front-view-only',
        layout: 'single-image',
        quality: 'high-resolution',
      },
    },
    output: {
      type: 'image',
      description:
        'Full-body try-on image of the user wearing the garment with preserved identity',
    },
  },
};
