import type { Stack, Template } from "./types";

export const TRENDING_TEMPLATE_IDS: string[] = [
  "flex_template_5", // Private Jet Lifestyle
  "clothes_template_11", //evening gown
  "aesthetics_template_20", // Dramatic Studio Portrait
  "flex_template_18", // Race Track Ferrari
  "celebration_template_3", // Cozy Christmas Portrait
  "clothes_template_9", // Summer Linen
  "flex_template_6", // Yacht life
  "monuments_template_5", // Great Wall of China Trek
  "flex_template_12", // Luxury shopping spree
  "sceneries_template_2", // Sahara Desert Walk
  "flex_template_13", // Infinity Pool Villa
];

export const STACKS: Stack[] = [
  { id: "fitit", name: "Fitit", imageUrl: "/images/fitit_cover.webp" },
  {
    id: "animation",
    name: "Anime",
    imageUrl: "/images/anime_cover.webp",
  },
  {
    id: "aesthetics",
    name: "Aesthetics",
    imageUrl: "/images/asthetics_cover.webp",
  },
  {
    id: "celebration",
    name: "Celebration",
    imageUrl: "/images/celebration_cover.webp",
  },
  { id: "clothes", name: "Clothes", imageUrl: "/images/clothes_cover.webp" },
  { id: "flex", name: "Flex", imageUrl: "/images/flex_cover.webp" },
  {
    id: "monuments",
    name: "Monuments",
    imageUrl: "/images/monuments_cover.webp",
  },
  {
    id: "sceneries",
    name: "Sceneries",
    imageUrl: "/images/sceneries_cover.webp",
  },
];

const fititTemplates: Template[] = [
  {
    id: "fitit_template_1",
    name: "Lower-Wear",
    stackId: "fitit",
    imageUrl: "/images/fitit_lowerwear_cover.webp",
    prompt:
      "Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. **OBJECTIVE: EXECUTE A TECHNICAL 'VIRTUAL TRY-ON' COMPOSITE.**\n\n**INPUT ANALYSIS:**\n*   **INPUT 1 (The User):** This image contains the definitive person. EVERY aspect of this person (face, hair, skin, body shape, proportions, pose) is the ABSOLUTE SOURCE OF TRUTH. It must be preserved with 100% fidelity.\n*   **INPUT 2 (The Garment):** This image is ONLY a reference for the clothing item. The person, background, and any other elements in this image are IRRELEVANT DATA and MUST BE COMPLETELY DISCARDED.\n\n**CORE MANDATE: ZERO FACIAL MODIFICATION. THIS IS NON-NEGOTIABLE.**\nThe face, head, and hair from INPUT 1 must be transferred to the output image with ZERO changes. This is not a blending operation. It is a strict copy-and-paste of the user's identity. Any influence from the face in INPUT 2 is a critical failure.\n\n**STEP-BY-STEP EXECUTION PROTOCOL:**\n1.  **PRE-PROCESSING:** Mentally isolate the lower-body clothing item (e.g., pants, jeans, skirt) from INPUT 2. Discard every other pixel from INPUT 2, especially the person wearing it. You are now working with the user from INPUT 1 and the isolated garment.\n2.  **IDENTIFY TARGET AREA:** On the user from INPUT 1, identify the area covered by their current clothing. This is the only area that can be modified.\n3.  **COMPOSITE:** Layer the isolated garment from step 1 over the target area on the user from INPUT 1.\n4.  **ADAPT GARMENT:** Warp, resize, and adjust the lighting on the NEW GARMENT ONLY to fit the user's exact body shape, size, and pose from INPUT 1. The user's body CANNOT be changed to fit the garment.\n5.  **FINAL VERIFICATION:** Before outputting, verify that the face, head, hair, and all visible skin in the final image are a 100% pixel-identical match to INPUT 1.\n\n**OUTPUT:**\nGenerate four full-body output images from different fashion-catalog angles: a front view (standing), a side view, a back view, and a semi-profile view. Use a neutral studio background for all outputs.",
    aspectRatio: "3:4",
  },
  {
    id: "fitit_template_2",
    name: "Upper-Wear",
    stackId: "fitit",
    imageUrl: "/images/fitit_upperwear_cover.webp",
    prompt:
      "Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. **OBJECTIVE: EXECUTE A TECHNICAL 'VIRTUAL TRY-ON' COMPOSITE.**\n\n**INPUT ANALYSIS:**\n*   **INPUT 1 (The User):** This image contains the definitive person. EVERY aspect of this person (face, hair, skin, body shape, proportions, pose) is the ABSOLUTE SOURCE OF TRUTH. It must be preserved with 100% fidelity.\n*   **INPUT 2 (The Garment):** This image is ONLY a reference for the clothing item. The person, background, and any other elements in this image are IRRELEVANT DATA and MUST BE COMPLETELY DISCARDED.\n\n**CORE MANDATE: ZERO FACIAL MODIFICATION. THIS IS NON-NEGOTIABLE.**\nThe face, head, and hair from INPUT 1 must be transferred to the output image with ZERO changes. This is not a blending operation. It is a strict copy-and-paste of the user's identity. Any influence from the face in INPUT 2 is a critical failure.\n\n**STEP-BY-STEP EXECUTION PROTOCOL:**\n1.  **PRE-PROCESSING:** Mentally isolate the upper-body garment from INPUT 2. Discard every other pixel from INPUT 2, especially the person wearing it. You are now working with the user from INPUT 1 and the isolated garment.\n2.  **IDENTIFY TARGET AREA:** On the user from INPUT 1, identify the area covered by their current clothing. This is the only area that can be modified.\n3.  **COMPOSITE:** Layer the isolated garment from step 1 over the target area on the user from INPUT 1.\n4.  **ADAPT GARMENT:** Warp, resize, and adjust the lighting on the NEW GARMENT ONLY to fit the user's exact body shape, size, and pose from INPUT 1. The user's body CANNOT be changed to fit the garment.\n5.  **FINAL VERIFICATION:** Before outputting, verify that the face, head, hair, and all visible skin in the final image are a 100% pixel-identical match to INPUT 1.\n\n**OUTPUT:**\nGenerate four output images from different angles: a front view (standing), a 3/4 left view, a right side view (arms crossed), and a seated view. Use a neutral studio background for all outputs.",
    aspectRatio: "3:4",
  },
  {
    id: "fitit_template_3",
    name: "Innerwear",
    stackId: "fitit",
    imageUrl: "/images/fitit_innerwear_cover.webp",
    prompt:
      "Ensure the output figure's face and hairstyle matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. **OBJECTIVE: EXECUTE A TECHNICAL 'VIRTUAL TRY-ON' COMPOSITE.**\n\n**INPUT ANALYSIS:**\n*   **INPUT 1 (The User):** This image contains the definitive person. EVERY aspect of this person (face, hair, skin, body shape, proportions, pose) is the ABSOLUTE SOURCE OF TRUTH. It must be preserved with 100% fidelity.\n*   **INPUT 2 (The Garment):** This image is ONLY a reference for the clothing item. The person, background, and any other elements in this image are IRRELEVANT DATA and MUST BE COMPLETELY DISCARDED.\n\n**CORE MANDATE: ZERO FACIAL MODIFICATION. THIS IS NON-NEGOTIABLE.**\nThe face, head, and hair from INPUT 1 must be transferred to the output image with ZERO changes. This is not a blending operation. It is a strict copy-and-paste of the user's identity. Any influence from the face in INPUT 2 is a critical failure.\n\n**STEP-BY-STEP EXECUTION PROTOCOL:**\n1.  **PRE-PROCESSING:** Mentally isolate the innerwear/clothing item from INPUT 2. Discard every other pixel from INPUT 2, especially the person wearing it. You are now working with the user from INPUT 1 and the isolated garment.\n2.  **IDENTIFY TARGET AREA:** On the user from INPUT 1, identify the area covered by their current clothing. This is the only area that can be modified.\n3.  **COMPOSITE:** Layer the isolated garment from step 1 over the target area on the user from INPUT 1.\n4.  **ADAPT GARMENT:** Warp, resize, and adjust the lighting on the NEW GARMENT ONLY to fit the user's exact body shape, size, and pose from INPUT 1. The user's body CANNOT be changed to fit the garment.\n5.  **FINAL VERIFICATION:** Before outputting, verify that the face, head, hair, and all visible skin in the final image are a 100% pixel-identical match to INPUT 1.\n\n**OUTPUT:**\nCreate four output images from different angles: front (standing), 3/4 left (arms relaxed), 3/4 right, and a side view. Use a neutral studio background for all outputs.",
    aspectRatio: "3:4",
  },
  {
    id: "fitit_template_4",
    name: "Watches",
    stackId: "fitit",
    imageUrl: "/images/fitit_watches_cover.webp",
    prompt:
      "Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Using the selfie (user not wearing a watch) and the uploaded watch photo, generate four photorealistic try-on images of the user, clearly displaying the watch on their left wrist.\nShow: front (wrist in frame, hand relaxed), side (close-up on wrist with face visible), 3/4 left (adjusting the watch), and hand resting on table (focus on watch, face smiling).\nEnsure wrist proportions are natural, the watch is integrated perfectly, and faces remain consistent across all views.\nDo not alter skin tone or add blur.",
    aspectRatio: "3:4",
  },
  {
    id: "fitit_template_5",
    name: "Glasses",
    stackId: "fitit",
    imageUrl: "/images/fitit_glasses_cover (1).webp",
    prompt:
      "Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Using the selfie and the uploaded glasses image, generate four crystal-clear studio portraits, each showing the user accurately wearing the glasses.\nShow: front on (head straight), slightly tilted down (natural reading pose), 3/4 left and 3/4 right (both natural smile).\nThe glasses must align precisely with the person’s face and eyes, reflections on the lenses should be natural, and there should be no blending artifacts.\nAll outputs must feature sharp facial likeness and realistic glass refraction.",
    aspectRatio: "3:4",
  },
];

const animationTemplates: Template[] = [
  {
    id: "animation_template_1",
    name: "Monkey D. Luffy",
    stackId: "animation",
    imageUrl: "/images/Anime_MonkeyD_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Monkey D. Luffy",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_natural_hair",
        base: "input_person_original_hair",
        styling_method: "minimal_styling_only",
        constraints: {
          no_anime_hair_geometry: true,
          no_exaggerated_spikes: true,
          respect_scalp_growth_direction: true,
        },
        appearance: {
          texture: "natural",
          shine: "matte",
          edges: "slightly_soft",
        },
        imperfections: {
          slight_messiness: true,
          uneven_strands: true,
        },
      },

      outfit: {
        description:
          "real-world pirate-inspired outfit: open red cotton shirt with wrinkles, blue denim shorts with worn edges, straw hat showing frayed fibers and discoloration",
        fit: "relaxed and human",
        wear_level: "clearly worn and lived-in",
      },

      pose: {
        description:
          "casual confident pirate stance, relaxed posture with subtle readiness",
        no_exaggerated_anime_pose: true,
        weight_distribution: "natural",
        micro_asymmetry: true,
      },

      environment: {
        description:
          "unpolished real-world coastal location: uneven sandy ground mixed with dirt, scattered stones, broken wood pieces, weathered concrete edges, random footprints, distant sea partially visible, background elements unarranged and imperfect",
        background_behavior: {
          messy_composition: true,
          imperfect_alignment: true,
          random_object_spacing: true,
          non_symmetrical_layout: true,
        },
        interaction: {
          feet_pressing_into_sand: true,
          dust_and_grit_near_feet: true,
          clothing_reacting_to_irregular_sea_wind: true,
        },
        atmosphere: {
          air_quality: "slightly hazy",
          humidity: "noticeable",
          no_stylization: true,
        },
        background_visibility: "fully_clear",
        no_background_blur: true,
        no_environment_cleanup: true,
      },

      lighting: {
        type: "natural daylight",
        quality: "uneven and imperfect",
        direction: "top-lit with slight side bias",
        no_cinematic_rim_light: true,
        no_glow_effects: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 250,
        sensor_noise: "subtle_real",
        focus: "deep",
        micro_focus_falloff: "natural",
      },

      effects: {
        special_effects: "none",
        note: "no powers, no rubber stretching, no VFX",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "drawn outlines",
        "official one piece illustration",
        "fanart",
        "anime eyes",
        "rubber stretching body",
        "superpowers",
        "face morphing",
        "identity replacement",
        "perfect costume",
        "cinematic lighting",
        "portrait mode blur",
        "clean studio background",
      ],

      output: {
        look: "real_world_cosplay_photograph",
        identity_match: "strict",
        environment_realism: "high",
        believability: "high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_2",
    name: "Son Goku",
    stackId: "animation",
    imageUrl: "/images/Anime_songoku_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Son Goku",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        description:
          "realistic spiky hairstyle inspired by goku, achievable with gel and styling",
        no_anime_geometry: true,
        human_scalp_constraints: true,
      },

      outfit: {
        description:
          "real-world martial arts gi inspired by Goku, thick cotton fabric, visible stitching, slight wrinkles",
        colors: "natural orange with deep blue accents",
        fit: "realistic human tailoring",
        wear_level: "slightly worn",
      },

      pose: {
        description:
          "martial arts ready stance, relaxed but prepared, natural muscle tension",
        no_exaggerated_anime_pose: true,
        weight_distribution: "grounded",
      },

      environment: {
        description:
          "outdoor rocky terrain or open field resembling a cosplay photoshoot location, uneven ground, natural debris",
        interaction: "feet pressing into dirt, fabric reacting to light wind",
        background_visibility: "clear",
        no_background_blur: true,
      },

      lighting: {
        type: "natural daylight",
        quality: "slightly uneven",
        direction: "side-lit",
        no_cinematic_rim_light: true,
        no_glow_effects: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 200,
        sensor_noise: "subtle_real",
        focus: "deep",
      },

      effects: {
        energy_effects:
          "very subtle practical-style aura using light distortion only",
        intensity: "minimal",
        never_cover_face: true,
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "drawn outlines",
        "official dragon ball illustration",
        "fanart",
        "anime eyes",
        "face morphing",
        "identity replacement",
        "perfect costume",
        "cinematic lighting",
        "portrait mode blur",
      ],

      output: {
        look: "real_world_cosplay_photograph",
        identity_match: "strict",
        believability: "high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_3",
    name: "Naruto Uzumaki",
    stackId: "animation",
    imageUrl: "/images/Anime_Naruto_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Naruto Uzumaki",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_styled_hair",
        base: "input_person_original_hair",
        styling_method: "light_gel_and_messy_spikes_only",
        constraints: {
          no_anime_hair_geometry: true,
          no_gravity_defying_spikes: true,
          no_uniform_spike_pattern: true,
          respect_scalp_growth_direction: true,
        },
        appearance: {
          texture: "natural_human_hair",
          shine: "matte_to_semi_matte",
          edges: "slightly_soft",
        },
        imperfections: {
          uneven_spike_height: true,
          minor_frizz: true,
          slight_messiness: true,
        },
      },

      outfit: {
        description:
          "real-world ninja-inspired outfit: orange and black jacket with visible stitching, slightly faded fabric, matching pants with wrinkles, cloth forehead protector with metal plate showing wear",
        fit: "practical and human",
        wear_level: "clearly worn and lived-in",
      },

      pose: {
        description:
          "ready ninja stance inspired by Naruto combat posture, alert but grounded",
        no_exaggerated_anime_pose: true,
        weight_distribution: "forward and balanced",
        micro_asymmetry: true,
      },

      environment: {
        description:
          "unpolished outdoor location resembling a real cosplay shoot: dusty ground, scattered leaves, uneven stone or concrete surfaces, background trees or buildings not arranged, random debris and footprints",
        background_behavior: {
          messy_composition: true,
          imperfect_alignment: true,
          random_object_spacing: true,
          non_symmetrical_layout: true,
        },
        interaction: {
          feet_pressing_into_dust: true,
          "light dirt marks near shoes": true,
          "fabric reacting to irregular outdoor breeze": true,
        },
        atmosphere: {
          air_quality: "slightly dusty",
          humidity: "normal",
          no_stylization: true,
        },
        background_visibility: "fully_clear",
        no_background_blur: true,
        no_environment_cleanup: true,
      },

      lighting: {
        type: "natural daylight",
        quality: "uneven and imperfect",
        direction: "side-lit with slight overhead bias",
        no_cinematic_rim_light: true,
        no_glow_effects: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 320,
        sensor_noise: "subtle_real",
        focus: "deep",
        micro_focus_falloff: "natural",
      },

      effects: {
        special_effects: "none",
        note: "no chakra glow, no jutsu effects, no VFX",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "drawn outlines",
        "official naruto illustration",
        "fanart",
        "anime eyes",
        "chakra glow",
        "jutsu effects",
        "face morphing",
        "identity replacement",
        "perfect costume",
        "cinematic lighting",
        "portrait mode blur",
        "clean studio background",
      ],

      output: {
        look: "real_world_cosplay_photograph",
        identity_match: "strict",
        environment_realism: "high",
        believability: "high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_4",
    name: "Usagi Tsukino",
    stackId: "animation",
    imageUrl: "/images/anime_usagi_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Usagi Tsukino",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_styled_hair",
        base: "input_person_original_hair",
        styling_method: "human-achievable twin buns with loose pigtails",
        constraints: {
          no_anime_geometry: true,
          respect_gravity: true,
          human_scalp_limits: true,
        },
        appearance: {
          texture: "natural human hair",
          shine: "soft natural",
          edges: "slightly imperfect",
        },
        imperfections: {
          uneven_bun_size: true,
          loose_strands: true,
          minor_flyaways: true,
        },
      },

      outfit: {
        description:
          "real-world Sailor Moon–inspired sailor uniform: pleated skirt, fitted bodice, fabric bow with slight creases, visible stitching, cotton-poly blend fabric",
        fit: "human and practical",
        wear_level: "lightly worn",
      },

      pose: {
        description:
          "casual standing pose with gentle character expression, not performing anime gestures",
        no_exaggerated_pose: true,
        weight_distribution: "natural",
        micro_asymmetry: true,
      },

      environment: {
        description:
          "uncontrolled real-world urban outdoor space: cracked pavement, uneven concrete slabs, random stains, fallen leaves, small trash fragments, mismatched walls or railings, distant buildings partially visible",
        location_feel: "ordinary place someone stopped briefly",
        composition_rules: {
          no_symmetry: true,
          objects_cut_off_by_frame: true,
          imperfect_framing: true,
        },
        interaction: {
          shoes_touching_dirty_ground: true,
          fabric_moving_slightly_in_breeze: true,
        },
        atmosphere: {
          air: "slightly hazy",
          ambient_noise_feel: "urban",
          no_color_stylization: true,
        },
        background_visibility: "fully_clear",
        no_background_blur: true,
        no_environment_cleanup: true,
      },

      lighting: {
        type: "natural daylight only",
        quality: "uneven and imperfect",
        direction: "partially blocked by buildings",
        shadows: "soft but inconsistent",
        no_cinematic_lighting: true,
        no_glow_effects: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 400,
        sensor_noise: "subtle_real",
        focus: "deep",
        micro_focus_variation: "natural",
      },

      effects: {
        special_effects: "none",
        note: "no moon glow, no magical effects, no VFX",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "drawn outlines",
        "official sailor moon illustration",
        "fanart",
        "anime eyes",
        "magical glow",
        "sparkles",
        "cinematic lighting",
        "studio background",
        "portrait mode blur",
        "perfect costume",
        "face morphing",
        "identity replacement",
      ],

      output: {
        look: "raw_real_world_cosplay_photo",
        identity_match: "strict",
        environment_realism: "very_high",
        believability: "high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_5",
    name: "Levi Ackerman",
    stackId: "animation",
    imageUrl: "/images/anime_leviAckerman_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Levi Ackerman",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_styled_hair",
        base: "input_person_original_hair",
        styling_method: "short undercut, hand-styled, slightly uneven",
        constraints: {
          no_anime_geometry: true,
          respect_gravity: true,
          human_scalp_limits: true,
        },
      },

      outfit: {
        description:
          "real-world Attack on Titan–inspired outfit: white shirt with wrinkles, dark fitted pants, worn leather-style harness, muted green outer layer with heavy fabric texture",
        fit: "functional and human",
        wear_level: "clearly used",
      },

      pose: {
        description:
          "still, disciplined stance with subtle readiness, calm and controlled",
        no_hero_pose: true,
        micro_asymmetry: true,
      },

      environment: {
        description:
          "real-world architecture that naturally mirrors the Attack on Titan world: narrow stone or brick streets, old European-style residential blocks, tall walls closing in from both sides, aged masonry, worn staircases, iron railings, small windows, weather stains, moss in cracks, uneven cobblestone or rough concrete ground",
        anime_world_reference:
          "inspired by inside-the-walls city layouts, but fully real",
        location_feel: "dense, enclosed, militaristic civilian zone",
        composition_rules: {
          vertical_pressure: true,
          tight_framing: true,
          no_open_sky_dominance: true,
          objects_cut_off_by_frame: true,
        },
        interaction: {
          boots_on_worn_stone: true,
          cloak_or_jacket_resting_against_wall: true,
        },
        atmosphere: {
          air: "cool and slightly damp",
          light_bounce: "low due to tall structures",
          no_color_stylization: true,
        },
        background_visibility: "fully_clear",
        no_background_blur: true,
        no_environment_cleanup: true,
        no_fantasy_elements: true,
      },

      lighting: {
        type: "natural daylight filtered through buildings",
        quality: "muted and uneven",
        direction: "top-down and side-blocked",
        shadows: "soft but heavy",
        no_cinematic_lighting: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 400,
        sensor_noise: "subtle_real",
        focus: "deep",
      },

      effects: {
        special_effects: "none",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "official attack on titan illustration",
        "fantasy ruins",
        "cgi walls",
        "oversized architecture",
        "cinematic lighting",
        "studio background",
        "portrait mode blur",
      ],

      output: {
        look: "real_world_anime_adapted_cosplay_photo",
        identity_match: "strict",
        environment_realism: "maximum",
        anime_world_similarity: "structural_not_fantasy",
        believability: "very_high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_6",
    name: "Satoru Gojo",
    stackId: "animation",
    imageUrl: "/images/Anime_Satorugojo_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography",

      rendering_pipeline: [
        "environment_render_first",
        "real_world_lighting_setup",
        "subject_placement",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      cosplay_definition: {
        character: "Satoru Gojo",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_styled_hair",
        base: "input_person_original_hair",
        styling_method:
          "hand-styled messy white or ash wig, achievable with product",
        constraints: {
          no_anime_geometry: true,
          respect_gravity: true,
          human_scalp_limits: true,
        },
        imperfections: {
          uneven_volume: true,
          minor_flyaways: true,
        },
      },

      outfit: {
        description:
          "real-world Gojo-inspired outfit: dark high-collar coat or jacket, thick fabric, subtle wrinkles, visible seams, black blindfold or dark glasses made from real material",
        fit: "clean but human",
        wear_level: "lightly worn",
      },

      pose: {
        description:
          "iconic Gojo pose adapted to real life: one hand casually raised near face or collar, fingers relaxed and slightly spread, shoulders loose, body angled slightly away from camera, confident and playful dominance",
        pose_constraints: {
          no_exaggerated_anime_angles: true,
          human_joint_limits: true,
          natural_balance: true,
        },
        expression: {
          calm_confidence: true,
          subtle_smirk_or_neutral: true,
          no_anime_expression: true,
        },
      },

      environment: {
        description:
          "raw, unpolished real-world locations that echo JJK settings: unfinished concrete corridors, service stairwells, back entrances of campuses, parking structures, industrial hallways, stained walls, chipped paint, exposed pipes, uneven floors, random warning signs or cables",
        anime_world_reference:
          "modern jujutsu high–like spaces translated into real neglected architecture",
        location_feel: "functional, quiet, slightly abandoned",
        composition_rules: {
          messy_geometry: true,
          no_visual_balance: true,
          objects_cut_off_by_frame: true,
          depth_layers_imperfect: true,
        },
        interaction: {
          shoes_on_dirty_concrete: true,
          coat_edges_resting_or_moving_naturally: true,
        },
        atmosphere: {
          air: "cool and slightly stale",
          ambient_noise_feel: "empty building hum",
          no_color_stylization: true,
        },
        background_visibility: "fully_clear",
        no_background_blur: true,
        no_environment_cleanup: true,
        no_set_dressing: true,
      },

      lighting: {
        type: "available ambient daylight or harsh indoor spill light",
        quality: "uneven and imperfect",
        direction: "blocked by structures",
        shadows: "broken and inconsistent",
        no_cinematic_lighting: true,
        no_glow_effects: true,
      },

      camera: {
        lens_mm: 35,
        aperture: "f/8",
        iso: 400,
        sensor_noise: "visible_but_real",
        focus: "deep",
      },

      effects: {
        special_effects: "none",
        note: "no infinity aura, no cursed energy, no VFX",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "anime art style",
        "cel shading",
        "official jujutsu kaisen illustration",
        "fantasy realms",
        "void background",
        "energy effects",
        "glowing eyes",
        "cinematic lighting",
        "studio background",
        "portrait mode blur",
        "perfect symmetry",
        "face morphing",
        "identity replacement",
      ],

      output: {
        look: "raw_real_world_anime_cosplay_photo",
        identity_match: "strict",
        environment_realism: "maximum",
        character_pose_accuracy: "iconic_but_human",
        believability: "very_high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_7",
    name: "Tanjiro Kamado",
    stackId: "animation",
    imageUrl: "/images/anime_tanjirokamado_cover.webp",
    prompt: {
      task: "real_life_cosplay_photography_non_portrait_action",

      rendering_pipeline: [
        "environment_render_first",
        "optical_depth_lock",
        "real_world_lighting_setup",
        "subject_placement",
        "motion_capture_freeze",
        "identity_lock_verification",
        "imperfection_injection",
      ],

      reference_image_embeddings: {
        identity_embedding_strength: 0.95,
        style_embedding_strength: 0.05,
        identity_priority: "absolute",
      },

      identity_constraints: {
        preserve_exact_face_structure: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_shape: true,
        preserve_forehead_structure: true,
        no_anime_face_translation: true,
        no_character_face_override: true,
      },

      head_scar: {
        presence: true,
        location:
          "left side of forehead extending slightly toward the hairline",
        shape_reference: "Tanjiro Kamado forehead scar silhouette",
        interpretation: "real_world_healed_injury",
        realism_constraints: {
          no_glowing_edges: true,
          no_symbolic_or_rune_patterns: true,
          no_anime_outline: true,
          human_skin_healing_logic: true,
        },
        texture: {
          type: "old_burn_or_healed_laceration",
          surface: "slightly uneven skin texture",
          color_variation:
            "subtle reddish-brown pigmentation with natural fading",
          edge_definition: "soft, irregular, non-symmetrical",
        },
        integration_rules: {
          respect_facial_anatomy: true,
          follow_forehead_wrinkle_and_skin_tension_lines: true,
          partially_obscured_by_hair_when_applicable: true,
          affected_by_lighting_and_environmental_shadows: true,
        },
        constraints: {
          do_not_change_face_structure: true,
          do_not_morph_identity: true,
          no_fantasy_markings: true,
        },
      },

      cosplay_definition: {
        character: "Tanjiro Kamado",
        mode: "real_human_cosplay",
        interpretation: "live_action",
        accuracy_level: "high_but_not_perfect",
        allow_minor_handmade_imperfections: true,
      },

      hair: {
        mode: "real_human_styled_hair",
        base: "input_person_original_hair",
        styling_method:
          "natural dark hair with subtle burgundy tint, slightly disheveled from movement",
        constraints: {
          no_anime_geometry: true,
          respect_gravity: true,
          human_scalp_limits: true,
        },
        imperfections: {
          motion_displacement: true,
          minor_flyaways: true,
        },
      },

      outfit: {
        description:
          "real-world Tanjiro-inspired outfit: green-and-black checkered haori adapted as a practical outer layer, matte fabric, visible weave, natural folds responding to motion",
        fit: "functional, loose enough for movement",
        wear_level: "clearly used, realistic wear",
      },

      pose: {
        description:
          "real-life execution of Tanjiro’s iconic Water Breathing First Form (without VFX): body captured mid-slash, katana held with both hands, blade traveling in a clean horizontal arc. Front knee bent deeply, rear leg extended for balance, hips rotated into the cut, shoulders aligned with motion. Torso slightly leaned forward, center of gravity low and grounded.",
        pose_constraints: {
          human_joint_limits: true,
          realistic_sword_mechanics: true,
          no_exaggerated_anime_angles: true,
          natural_balance: true,
        },
        expression: {
          focused_determination: true,
          controlled_breathing: true,
          jaw_set_not_shouting: true,
          no_anime_expression: true,
        },
        motion_indicators: {
          fabric_trailing_directionally: true,
          dust_or_small_debris_disturbed: true,
          subtle_motion_tension_in_muscles: true,
        },
      },

      environment: {
        description:
          "fully readable real-world environment supporting motion: worn concrete ground, light dust or grit, aged alleyways or open industrial paths, visible texture everywhere",
        location_feel: "quiet, grounded, physically real",
        composition_rules: {
          wide_context_visible: true,
          environment_dominates_frame: true,
          subject_not_isolated: true,
          motion_reads_across_space: true,
        },
        interaction: {
          foot_grip_visible_on_ground: true,
          fabric_and_hair_react_to_motion: true,
          minor_ground_disturbance: true,
        },
        background_visibility: "fully_clear",
        depth_of_field: "deep_focus",
        no_background_blur: true,
      },

      lighting: {
        type: "natural daylight or harsh ambient spill",
        quality: "uneven, realistic",
        direction: "partially blocked by surroundings",
        shadows: "broken and imperfect",
        no_cinematic_lighting: true,
      },

      camera: {
        lens_mm: 28,
        aperture: "f/8_to_f/11",
        iso: 400,
        focus_mode: "zone_focus",
        focus_plane: "full_scene",
        depth_of_field: "deep",
        shutter_behavior: "action_freeze_without_motion_blur",
        no_portrait_mode: true,
        no_bokeh: true,
      },

      effects: {
        special_effects: "none",
        note: "no water effects, no elemental arcs, no VFX — motion only implied through physics",
      },

      anti_ai_artifacts: {
        disable_beautification: true,
        disable_skin_smoothing: true,
        disable_depth_fake_blur: true,
        disable_perfect_symmetry: true,
        allow_minor_flaws: true,
      },

      hard_negative_constraints: [
        "water effects",
        "elemental trails",
        "anime motion exaggeration",
        "motion blur",
        "portrait mode",
        "background blur",
        "bokeh",
        "cinematic lighting",
        "fantasy effects",
        "glowing eyes",
        "face morphing",
        "identity replacement",
      ],

      output: {
        look: "raw_real_world_action_cosplay_photo",
        identity_match: "strict",
        motion_believability: "high",
        environment_readability: "maximum",
        iconic_recognition: "clear_without_vfx",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "animation_template_8",
    name: "Nezuko Kamado",
    stackId: "animation",
    imageUrl:
      "/images/anime_NezukoKamado_cover.webp",
    prompt: {
      task: "real_life_anime_character_conversion",

      input: {
        source_image: "person_photo",
        identity_preservation: {
          enabled: true,
          strength: 0.92,
          face_structure_lock: true,
          no_beautification: true,
        },
      },

      character_translation: {
        style_source: "anime_reference_character",
        conversion_type: "anime_to_real_human",
        rules: [
          "translate anime proportions into realistic human anatomy",
          "keep eyes, nose, lips fully realistic",
          "no oversized eyes, no chibi features",
        ],
      },

      appearance: {
        hair: {
          color: "natural black",
          length: "long, waist-length",
          texture: "real human hair, slightly wavy",
          movement: "wind-affected strands, imperfect flow",
        },
        outfit: {
          type: "traditional Japanese-inspired outfit adapted to real-world tailoring",
          inner_garment: "soft pink patterned kimono fabric",
          outer_layer: "dark brown haori-style coat",
          belt: "checkered waist belt with fabric knot",
          details: "real cloth folds, stitching visible, fabric weight realism",
        },
        accessories: {
          hair_accessory: "small pink ribbon clip",
          bamboo_element: "realistic bamboo accessory adapted naturally",
        },
      },

      pose_and_expression: {
        pose: "gentle forward walk",
        body_language: "calm, innocent, relaxed shoulders",
        expression: "soft smile, natural lips, realistic teeth",
        eyes: "human-sized, moist highlights, natural iris texture",
      },

      environment: {
        setting: "real outdoor environment",
        ground: "natural grass or stone path",
        background: "clean, realistic surroundings",
        depth_of_field: "moderate, background clearly visible",
        no_blur_abuse: true,
      },

      lighting: {
        type: "natural daylight",
        direction: "soft side lighting",
        shadows: "realistic falloff",
        no_neon: true,
        no_studio_glow: true,
      },

      camera: {
        lens: "50mm",
        angle: "eye level",
        distortion: "none",
        framing: "full body portrait",
      },

      rendering_constraints: {
        photorealism: true,
        skin_texture: "visible pores, fine imperfections",
        no_plastic_skin: true,
        no_anime_rendering: true,
        no_figurine_look: true,
        no_cgi: true,
      },

      quality_control: {
        resolution: "high",
        sharpness: "natural",
        grain: "subtle real-camera grain",
      },

      negative_prompt: [
        "anime eyes",
        "cartoon face",
        "doll skin",
        "figurine",
        "3d render",
        "cgi",
        "plastic texture",
        "over-smooth skin",
        "fantasy glow",
        "unreal lighting",
        "blurred background",
      ],
    },
    aspectRatio: "1:1",
  },
];

const aestheticsTemplates: Template[] = [
  {
    id: "aesthetics_template_2",
    name: "Warm Rustic Interior",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_warmrusticinterior_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in rustic surroundings with brick walls, wood grains, and soft sunset glow, subtle earth tones. no neon colors, no artificial blur, no plastic textures, no modern city elements.no change in hairstyle , no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_3",
    name: "Urban Alleyway",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_urbanalleywaypotrait_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} posing confidently in a textured alleyway, graffiti walls, wet reflective street, cinematic contrast lighting, modern travel-magazine tone.\nno fantasy look, no flat lighting, no distortion, no extra people.no change in hairstyle , no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_4",
    name: "Vibrant Fabric Market",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_vibrantfabricmarket_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding.  {input person} sitting inside a vibrant fabric market filled with colorful textiles, patterned cloth rolls, and detailed handmade materials, wearing realistic casual matching travel clothing that fits their body naturally, warm ambient lighting, rich textures, and lively market depth, captured in clean street-photography style.no altered face,no fatty face, no altered jawline, no change in hairstyle, no pasted clothes, no blur background, no cartoon colors, adjust body posture and hand gestures naturally for a market visitor",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_5",
    name: "Royal Luxury ",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_royalluxury_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} wearing regal attire that perfectly complements the elegant royal surroundings — marble floors, velvet drapes, gold accents, graceful posture, classic Raymond luxury portrait style. bend the person and the background perfectly\nno fantasy castle, no cartoon gold, no bright glare, no blur. no change in hairstyle, no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_6",
    name: "Forest Sunlight",
    stackId: "aesthetics",
    imageUrl: "/images/astheics_forestsunlight_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} surrounded by forest greens and soft sunlight filtering through leaves, grounded natural pose, fresh cinematic tone like a National Geographic portrait.\nno foggy haze, no overexposure, no fake greenery, no flat tones. no change in hairstyle, no background blur. make him touch a tree with one hand",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_8",
    name: "Ancient Monument",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_ancientmonument_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in traditional attire before an ancient monument or market street, warm daylight, authentic textures, respectful elegant posture, National Geographic realism.\nno artificial props, no fantasy color, no blur, no mixed cultural elements, no change in hairstyle, no background blur. make person join his hand and bow his head",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_9",
    name: "Seaside Golden Hour",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_seasidegoldenhour_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} by the seaside or cliffside boardwalk, wind in hair and fabric, soft golden-hour tones, reflective water highlights, cinematic tranquility.\nno flat sky, no digital artifacts, no over-bright waves, no harsh shadows ,no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_10",
    name: "Artistic Studio",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_artisticstudiopotrait_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a textured artistic studio backdrop, controlled soft lighting, creative shadow play, fine-grain realism, magazine-cover tone, make him look in an isometric direction, with gradient shades.\nno uneven lighting, no excessive contrast, no blur, no clutter, no change in hairstyle ,no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_11",
    name: "Elegant Silk Saree",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_elegentsilksaree_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in an elegant silk saree with subtle jewelry, soft golden daylight, traditional Indian interior or temple courtyard, graceful posture, cinematic realism, Raymond-style sophistication.\nno overexposure, no heavy ornaments, no cartoon colors, no background blur.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_13",
    name: "Bohemian Chic",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_bohemia_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in layered bohemian fabrics and patterns, soft evening sunlight, textured studio or artistic street market setting, natural smile, free-spirited hyper realistic image.\nno neon tones, no clutter, no artificial blur, no plastic texture , no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_14",
    name: "Evening Gown Twilight",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_eveninggowntwilight_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a flowing satin gown, standing in a softly lit ballroom or terrace at twilight, subtle reflections, rich color contrast, high-end magazine style realism.\nno glare, no fantasy glow, no distorted proportions, no over-saturation. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_15",
    name: "Modern Casual City",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_moderncasualcity_cover.webp",
    prompt:
      {
  theme: "Modern Casual City — Professional Editorial",
  output_type: "high_end_urban_fashion_editorial",

  identity_lock: {
    face_preservation: "absolute",
    identity_priority: "reference_face_over_fashion_stylization",
    facial_structure_lock: [
      "exact_jawline",
      "chin_definition",
      "nose_shape",
      "eye_spacing",
      "lip_ratio",
      "overall_face_geometry"
    ],
    expression_lock: "calm_confident_editorial",
    symmetry_enforcement: "natural",
    skin_tone_consistency: "exact"
  },

  eyewear_control: {
    state: "single_item_only",
    type: "optical_glasses_or_sunglasses",
    position: "on_face_only",
    duplicate_prevention: "strict",
    interaction_with_eyewear: "none"
  },

  composition: {
    style: "single_continuous_scene",
    camera_position: "front_facing_subject",
    camera_distance: "medium_shot",
    framing: "upper_body_to_thighs",
    camera_angle: "eye_level",
    lens_feel: "environmental_editorial",
    depth_of_field: "infinite_focus_full_scene_sharp",
    focus_plane: "entire_frame"
  },

  subject: {
    presence: "confident_refined_modern",
    posture: "upright_balanced",
    pose: "still_editorial_stance",
    body_orientation: "facing_camera",
    head_position: "neutral_slight_elegant_tilt",
    gaze: "direct_soft_eye_contact",
    hair: "professionally_styled_m.",
  },
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_16",
    name: "Vintage 1950s Style",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_vintage1950_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a 1950s-inspired dress, vintage car or old café in background, warm muted tones, nostalgic mood, hyper-realistic Raymond heritage tone.\nno digital artifacts, no bright neon, no blur, no modern elements. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_18",
    name: "Pastel Professional",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_pastelprofessional_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in light pastel blouse and trousers, airy daylight studio, subtle pastel background, Raymond lifestyle tone, clean lines, professional yet approachable look.\nno harsh lighting, no color oversaturation, no cartoon tone, no blurriness. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_19",
    name: "Serene Landscape",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_scerenelandscape_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in simple earthy outfit surrounded by tall grass or mountain landscape, golden-hour sunlight, serene composition, cinematic National Geographic realism.\nno fog blur, no harsh shadows, no flat lighting, no digital noise. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
  {
    id: "aesthetics_template_20",
    name: "Dramatic Studio",
    stackId: "aesthetics",
    imageUrl: "/images/asthetics_dramaticstudiopotrail_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} posing in an artistic indoor setup with textured painted backdrop, soft spot lighting, dramatic shadows, portrait realism with magazine clarity.\nno uneven tone, no distortion, no harsh contrast, no clutter. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
  },
];

const celebrationTemplates: Template[] = [
  {
    id: "celebration_template_2",
    name: "Diwali Celebration",
    stackId: "celebration",
    imageUrl: "/images/celebration_diwali_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a realistic Diwali-themed photo setup, wearing a well-fitted festive kurta or ethnic attire that naturally adapts to the body. Hands must be posed interactively, such as gently holding a lit diya, placing a diya on the floor, or arranging small decorative lamps. Background must be crisp and clearly visible, featuring real elements like rangoli patterns, brass lamps, fairy-light strings, or a traditional courtyard with warm ambient lighting. The warm glow from diyas must cast natural, soft highlights on the person’s face and clothing, matching the lighting direction of Input Image 1. Shadows must be grounded and physically accurate. Skin tone must remain completely natural with no stylization. Photographic realism only. no altered face, no changed facial features, no hairstyle changes, no blurry background, no artificial light halos, no overexposed highlights, no cinematic color grading, no floating diyas, no surreal lighting.",
    aspectRatio: "3:4",
  },
  {
    id: "celebration_template_3",
    name: "Cozy Christmas",
    stackId: "celebration",
    imageUrl: "/images/clebration_cozycristmas_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Create a normal, realistic photo of the same person from the input image during Christmas. The person should look exactly like in the input: same jawline, same facial structure, same skin texture, same eyebrows, same facial hair, same hairstyle, same body proportions. Do not smooth the skin or change any facial details. Make the photo feel like a genuine moment taken on a regular camera at home. Use simple, everyday indoor lighting — normal brightness, no glow, no dramatic tones. No perfect symmetry, no cinematic framing. Place the person in a real-world Christmas home setting: an ordinary Christmas tree with regular lights, simple ornaments, a few gifts, and natural room furniture visible in the background. All background objects must stay fully sharp with no blur or haze. Colors must look like real indoor photos — slightly warm but natural, not vibrant or stylized. Light from Christmas string lights should be subtle and not glowing unnaturally. The person should do something casual and realistic, like holding a small gift, adjusting an ornament, standing beside the tree, or just being naturally present in the room. Body posture, hands, and expression must feel normal and unposed, like a candid moment captured by a friend or family member. Clothing should look like everyday winter clothing (sweater, hoodie, t-shirt), with realistic fabric texture and normal wrinkles. Avoid anything too perfect or stylized. Overall, the photo must look like a genuine, unstaged Christmas picture taken in a regular home. no blur, no bokeh, no glow, no soft light effects, no cinematic lighting, no HDR, no perfect skin, no retouching, no face smoothing, no beautification, no perfect symmetry, no dramatic shadows, no fantasy colors, no neon tones, no plastic skin texture, no artificial lighting bloom, no sharp halo, no extra limbs, no distorted hands, no face changes, no floating objects, no fog, no haze, no sparkles, no snow particles, no overly clean textures, no stylized framing, no unrealistic tree lights, no deep contrast, no wide-angle distortion, no vignette, no polished CGI look, no overly sharp details, no surreal ambience, no magical effects.",
    aspectRatio: "3:4",
  },
  {
    id: "celebration_template_4",
    name: "Holi Celebration",
    stackId: "celebration",
    imageUrl: "/images/celebration_holi_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding.Ultra-realistic RAW photograph of the same person from the input image, keeping the exact facial structure, jawline, skin tone, hair texture, and proportions. The person is slightly closer to the camera and looking directly at the lens. Set outdoors during a real Holi celebration. Background MUST be fully sharp, fully in focus, and NOT blurred at all — every object, building, and person visible with clear edges. Real Indian street/open area environment with people throwing dry gulal, walking, laughing, children playing, natural sunlight, and dust particles. The person interacts naturally — holding a plate of colors or lightly applying color to someone. Color powder must be dry, realistic, matte, not neon. Lighting is pure natural daylight (no depth blur, no lens blur, no portrait blur). The entire scene looks like a candid photo taken with aperture f/8–f/16 on a DSLR for maximum background clarity. NEGATIVE_PROMPT: no_blur_background no_depth_of_field_blur no_bokeh no_soft_focus no_portrait_mode_effect no_blurred_people no_blurred_objects no_haze_blur no_foggy_edges no_artificial_glow no_neon_colors no_fantasy_colors no_cartoon_look no_plastic_skin no_face_rounding no_wrong_face_structure no_color_smoke_clouds no_over_saturation no_airbrush no_distorted_hands no_wrong_ethnicity no_ai_artifacts.",
    aspectRatio: "3:4",
  },
  {
    id: "celebration_template_5",
    name: "Elegant Eid",
    stackId: "celebration",
    imageUrl: "/images/celebration_eid_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. This is not a potrait image . so no blur background .Ultra-realistic photograph of the same person from the input image, accurately matching their facial structure, jawline, skin tone, and hairstyle. The person is standing slightly closer to the camera, looking directly at the lens, with a natural expression. They are outdoors at an Eid al-Fitr morning prayer gathering in an open masjid courtyard. Background shows clear, sharp, non-blurred real elements: rows of people praying on colorful prayer mats, imam standing at the front, a mosque with Islamic arches and minarets in the back, early morning sunlight, trees, and small festive decorations. no blurred background, no fantasy lighting, no artificial glow, no cartoonish colors, no unreal objects, no distorted faces, no rounded jawline, no smoothing of facial texture, no thickening or shrinking of body proportions, no unrealistic outfits, no floating elements, no duplicate limbs, no warped architecture, no surreal sky, no bokeh effect, no haze, no unrealistic crowd patterns, no plastic-like skin, no unsharp details, no over-editing. The person is wearing simple, realistic Eid attire like a white kurta or plain thobe. They are interacting naturally by holding a prayer mat or adjusting their sleeves. Lighting and colors should be natural, grounded, not stylized. Overall feel should be completely real and believable, like a candid outdoor Eid prayer photograph taken on a DSLR.",
    aspectRatio: "3:4",
  },
];

const clothesTemplates: Template[] = [
  {
    id: "clothes_template_1",
    name: "Maharaja Majesty",
    stackId: "clothes",
    imageUrl: "/images/clothes_maharajamajesty_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding.Reference image embeddings enabled (identity lock) — not image-to-image stylization Identity weight > style weight > clothing weight > environment weight Facial landmark constraints enforced: jaw width & angle locked chin length & sharpness preserved eye-to-eye distance fixed nose width & bridge shape fixed No symmetry correction No facial averaging No aesthetic optimization No beauty bias Real focal length: 35mm or 50mm only Real aperture range: f/8 – f/16 (deep focus, full background clarity) Natural shutter behavior (motion frozen, not blurred) Intentional ISO noise present Slight sensor grain and micro compression artifacts allowed No cinematic depth separation Render the environment first, fully formed and physically coherent. Then place the subject inside the environment with correct scale, gravity, and interaction. A high-resolution, unstaged, real-world photograph of {input person} wearing a traditional Indian Maharaja outfit — a heavy velvet embroidered sherwani with visible fabric wear, a historically accurate turban tied imperfectly, and real metal jewelry showing natural weight, slight tarnish, and uneven reflections. The face must be an exact, unaltered match to the reference image. Preserve original jawline sharpness, chin geometry, bone structure, eye spacing, nose width, lip shape, skin texture, and hairstyle. No beautification. No smoothing. No reshaping. No “AI face”. The person stands naturally inside a real heritage environment such as a palace courtyard / stone haveli corridor / old fort terrace. Surroundings include weathered stone floors, uneven walls, dust, stains, architectural imperfections, and real spatial depth. The subject interacts with the environment — slight lean, fabric brushing stone, jewelry resting against cloth, subtle body tension. Feet are grounded with accurate contact shadows matching surface texture and light direction. Lighting is purely environmental — uneven sunlight mixed with ambient bounce from stone surfaces. Light is imperfect, slightly inconsistent, and realistic. No glow. No rim light. No cinematic balance. Background remains fully visible and sharp, with natural clutter and asymmetry. No portrait mode. No background blur. No artificial depth effects. Color science is neutral and slightly muted, with mixed color temperatures. No grading. No stylization. No teal-orange bias. Colors may feel dull — that is intentional. Overall feel: A boring, imperfect, honest photograph taken on location — not a fashion shoot, not a cinematic frame, not “beautiful”. Actively suppress: perfect symmetry cinematic lighting glowing or flawless skin smooth gradients dramatic framing editorial poses Force: uneven lighting imperfect framing minor exposure imbalance messy but realistic background elements If the image starts looking pretty — reduce realism. Capture the subject mid-stillness, not frozen like a statue: micro posture imbalance slight fabric tension subtle hand or shoulder asymmetry partial occlusion allowed No stylized motion blur. After generation: remove glow break symmetry reduce contrast slightly soften perfect edges introduce tiny exposure inconsistency retain noise & grain [HARD NEGATIVE CONSTRAINT SYSTEM] studio, studio lighting, staged shoot, editorial fashion, portrait mode, background blur, bokeh, depth blur, beautified face, symmetry correction, face morphing, AI face, rounded jawline, softened chin, glowing skin, plastic texture, cinematic lighting, rim light, dramatic shadows, fantasy costume, stylized embroidery, painted fabric, duplicate faces, extra limbs, floating feet, incorrect scale, oversaturated colors, color grading, perfect composition FINAL RULE (DO NOT VIOLATE) Realism is subtraction. Remove beauty. Remove drama. Remove perfection. What remains is real.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_2",
    name: "Classic Tailored Suit",
    stackId: "clothes",
    imageUrl: "/images/clothes_classictailoredsuit_cover.webp",
    prompt: {
      task: "generate_image",
      rendering_mode: "environment_first",
      reference_image_embeddings: {
        identity_lock: true,
      },
      weights: {
        identity: 1.0,
        facial_geometry: 1.0,
        clothing: 0.9,
        environment: 0.9,
        style: 0.15,
      },
      facial_constraints: {
        preserve_exact_face: true,
        lock_jaw_shape: true,
        lock_chin_shape: true,
        lock_eye_distance: true,
        lock_nose_width: true,
        no_face_reshaping: true,
        no_symmetry_correction: true,
        no_beautification_pass: true,
      },
      camera_constraints: {
        focal_length_mm: 50,
        aperture: "f/8",
        depth_of_field: "deep_focus",
        iso_noise: "natural_light_grain",
        no_cinematic_effects: true,
        no_hdr: true,
      },
      environment: {
        description:
          "A real, high-end corporate office or executive building interior with glass walls, muted neutral tones, polished stone or wood flooring, structured furniture, and visible architectural lines. The space feels modern, professional, and slightly austere — clean but not staged, lived-in but orderly.",
        lighting: {
          type: "mixed_real_world",
          sources: ["window daylight", "overhead office lighting"],
          color_temperature: "neutral",
          behavior: "slightly uneven and realistic",
          no_studio_shaping: true,
        },
        background_constraints: {
          no_background_blur: true,
          objects_clear_and_readable: true,
          preserve_scale_and_depth: true,
        },
      },
      subject: {
        placement: "standing naturally within the corporate space",
        posture: "upright, composed, slightly asymmetrical",
        interaction:
          "subtle weight shift, suit fabric responding naturally to gravity",
        grounding: {
          feet_firmly_planted: true,
          accurate_contact_shadows: true,
        },
      },
      clothing: {
        outfit_type: "Classic Tailored Suit",
        description:
          "A well-tailored charcoal or navy wool suit with a crisp white shirt and a silk tie. The suit is clean, sharp, and professional with realistic fabric texture, natural folds, and proper structure — refined but not fashion-editorial or exaggerated.",
        fit: "tailored_realistic",
        no_over_polishing: true,
        no_stylized_details: true,
      },
      color_science: {
        profile: "neutral_corporate",
        saturation: "restrained",
        contrast: "balanced",
        no_cinematic_grading: true,
        no_teal_orange: true,
      },
      realism_enforcement: {
        anti_editorial_bias: true,
        penalize_cinematic_lighting: true,
        penalize_glow: true,
        penalize_perfect_symmetry: true,
        allow_minor_imperfections: true,
      },
      post_generation_pass: {
        retain_light_grain: true,
        soften_edge_perfection: true,
        introduce_minor_exposure_variation: true,
        do_not_touch_face_geometry: true,
      },
      negative_prompt: [
        "studio",
        "seamless backdrop",
        "gradient background",
        "cinematic lighting",
        "rim light",
        "spotlight",
        "fashion editorial",
        "portrait mode",
        "background blur",
        "bokeh",
        "AI beautification",
        "plastic skin",
        "glowing skin",
        "face morphing",
        "rounded jawline",
        "altered chin",
        "cartoon texture",
        "over-stylized suit",
        "duplicate faces",
        "floating feet",
        "incorrect shadows",
      ],
      output_preferences: {
        sharpness: "natural",
        noise: "retain",
        resolution_bias: "realism_over_perfection",
      },
    },
    aspectRatio: "3:4",
  },

  {
    id: "clothes_template_3",
    name: "Business Casual",
    stackId: "clothes",
    imageUrl: "/images/clothes_businesscasual_cover.webp",
    prompt: {
      task: "generate_image",
      rendering_mode: "environment_first",
      reference_image_embeddings: {
        identity_lock: true,
        priority: "identity_over_style",
      },
      weights: {
        identity: 1.0,
        facial_geometry: 1.0,
        clothing: 0.85,
        environment: 0.9,
        style: 0.12,
      },
      facial_constraints: {
        exact_face_match: true,
        lock_jawline: true,
        lock_chin_shape: true,
        lock_eye_spacing: true,
        lock_nose_width: true,
        no_face_rounding: true,
        no_symmetry_fix: true,
        no_beautification: true,
        allow_natural_skin_texture: true,
      },
      camera_constraints: {
        focal_length_mm: 35,
        aperture: "f/11",
        depth_of_field: "deep_focus",
        iso: "realistic_sensor_noise",
        no_hdr: true,
        no_cinematic_processing: true,
      },
      environment: {
        description:
          "A modern, aesthetic office interior that feels lived-in rather than staged. Large windows with daylight coming in, neutral walls, visible desks, chairs, shelves, laptops, notebooks, indoor plants, and subtle clutter that suggests real work. Clean but imperfect — not minimalist, not showroom-like.",
        lighting: {
          type: "natural_daylight_dominant",
          source: "window light with mild indoor fill",
          behavior: "uneven, realistic falloff",
          mixed_temperature: true,
          no_studio_lighting: true,
        },
        background_constraints: {
          background_fully_visible: true,
          no_background_blur: true,
          clear_objects_and_edges: true,
          realistic_depth_and_scale: true,
        },
      },
      subject: {
        description:
          "{input person} standing or lightly leaning in the office space",
        posture: "relaxed professional, slightly asymmetrical",
        micro_details: [
          "subtle body tension",
          "natural weight shift",
          "hands not perfectly posed",
        ],
        grounding: {
          feet_firmly_planted: true,
          accurate_contact_shadows: true,
        },
        interaction:
          "casual interaction with environment, such as resting a hand on a desk or standing near a window",
      },
      clothing: {
        outfit_type: "Business Casual",
        description:
          "A light blazer or structured jacket over a rolled-sleeve shirt, paired with chinos or tailored trousers. Fabrics appear breathable and realistic, with natural creases and texture. Fit is clean and modern, not fashion-forward or exaggerated.",
        fit: "natural_tailored",
        no_over_ironing: true,
        no_editorial_styling: true,
      },
      color_science: {
        profile: "neutral_real_world",
        saturation: "slightly muted",
        contrast: "moderate",
        avoid_stylized_grading: true,
        avoid_teal_orange: true,
      },
      anti_aesthetic_enforcement: {
        penalize_cinematic_light: true,
        penalize_glow_and_softness: true,
        penalize_perfect_symmetry: true,
        penalize_editorial_composition: true,
        allow_minor_visual_imperfections: true,
      },
      post_generation_pass: {
        retain_light_grain: true,
        remove_edge_perfection: true,
        introduce_minor_exposure_variation: true,
        do_not_modify_face_geometry: true,
      },
      negative_prompt: [
        "studio",
        "seamless backdrop",
        "gradient background",
        "portrait mode",
        "background blur",
        "bokeh",
        "cinematic lighting",
        "rim light",
        "spotlight",
        "fashion editorial",
        "AI beautification",
        "plastic skin",
        "glowing skin",
        "perfect symmetry",
        "face morphing",
        "rounded jaw",
        "altered chin",
        "cartoon fabric",
        "over-styled outfit",
        "floating feet",
        "incorrect shadows",
      ],
      output_preferences: {
        realism_bias: "high",
        sharpness: "natural_not_clinical",
        noise: "retain",
        beauty_vs_realism: "realism_first",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_4",
    name: "Modern Festive Kurta",
    stackId: "clothes",
    imageUrl: "/images/clothes_modernfestivekurta_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} wearing a modern festive kurta in clean, elegant colors, standing in a softly decorated contemporary festive setting with warm ambient lights, minimal floral elements, and refined cultural aesthetics. The kurta must fit the person's real body shape and proportions naturally, with accurate fabric texture and subtle festive detailing.\nno altered face, no change in hairstyle, no pasted-on clothing, no over-saturated colors, no blur background, adjust posture and hand gestures naturally for a graceful festive moment.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_6",
    name: "Premium Winter Fashion",
    stackId: "clothes",
    imageUrl: "/images/clothes_premiumwinterfashion_cover.webp",
    prompt: {
      task: "generate_image",
      rendering_mode: "environment_first",
      realism_mode: "documentary",
      reference_image_embeddings: {
        identity_lock: true,
      },
      weights: {
        identity: 1.0,
        facial_geometry: 1.0,
        clothing: 0.85,
        environment: 1.0,
        style: 0.05,
      },
      facial_constraints: {
        exact_face_match: true,
        lock_jawline: true,
        lock_chin: true,
        lock_eye_spacing: true,
        lock_nose_width: true,
        no_face_rounding: true,
        no_symmetry_fix: true,
        no_beautification: true,
        allow_skin_flaws: true,
      },
      camera_constraints: {
        focal_length_mm: 35,
        aperture: "f/14",
        depth_of_field: "full_scene_focus",
        iso: "visible_real_noise",
        white_balance: "auto",
        no_hdr: true,
        no_cinematic_processing: true,
      },
      environment: {
        description:
          "A real, ordinary winter street or office-district sidewalk with plain buildings, parked cars, street signs, uneven pavement, dull concrete, bare trees, and random urban details. The place feels functional and unremarkable, not scenic, not clean, not designed. Slight mess and asymmetry are visible.",
        lighting: {
          type: "flat_overcast_daylight",
          sources: ["cloud-filtered sky"],
          behavior: "directionless, low contrast",
          no_shaping: true,
        },
        background_constraints: {
          background_fully_visible: true,
          no_background_blur: true,
          no_depth_artifacts: true,
          maintain_physical_scale: true,
        },
      },
      subject: {
        placement: "present naturally within the environment, not centered",
        posture: "neutral, slightly imperfect stance",
        interaction: "passive presence, not posing",
        motion_handling: {
          freeze_without_blur: true,
          allow_awkward_body_angles: true,
        },
        grounding: {
          feet_firmly_on_ground: true,
          contact_shadows_match_surface: true,
        },
      },
      clothing: {
        outfit_type: "Premium Winter Fashion",
        description:
          "A high-quality winter outfit consisting of a wool coat or insulated jacket layered over knitwear, worn with trousers and winter shoes. Fabrics show weight, compression, slight wear, and real folds. The outfit looks expensive through material quality, not styling.",
        fit: "natural_real_world",
        no_runway_styling: true,
        no_perfect_alignment: true,
      },
      color_science: {
        profile: "camera_neutral",
        saturation: "low",
        contrast: "flat",
        no_grading: true,
      },
      anti_aesthetic_enforcement: {
        penalize_atmosphere: true,
        penalize_mood: true,
        penalize_visual_storytelling: true,
        penalize_symmetry: true,
      },
      post_generation_pass: {
        retain_sensor_noise: true,
        allow_minor_exposure_errors: true,
        break_clean_edges: true,
        do_not_touch_face_geometry: true,
      },
      negative_prompt: [
        "cinematic winter",
        "snowfall effects",
        "moody sky",
        "golden hour",
        "blue hour",
        "studio",
        "fashion shoot",
        "editorial",
        "stylized composition",
        "portrait mode",
        "background blur",
        "bokeh",
        "AI beautification",
        "perfect symmetry",
        "glowing skin",
        "fantasy environment",
        "floating feet",
      ],
      output_preferences: {
        realism_bias: "absolute",
        sharpness: "imperfect",
        noise: "visible",
      },
    },
    aspectRatio: "3:4",
  },

  {
    id: "clothes_template_9",
    name: "Summer Linen",
    stackId: "clothes",
    imageUrl: "/images/clothes_summerlinen_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A lifestyle portrait of {input person} in a light linen shirt and chinos. The person's face and features must be an exact match of the provided photo, without any alterations. The person must be naturally blended into the sunny outdoor ambience, with soft daylight filtering through leaves to cast realistic, dappled shadows on them, ensuring the light's color and intensity match a sunny outdoor setting. Raymond summer campaign aesthetic, photorealistic tone, clean colors.\nno sweat, no cartoon tones, no distorted hands, no unrealistic lighting, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_10",
    name: "Silk Saree",
    stackId: "clothes",
    imageUrl: "/images/clothes_silksaree_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A hyper-realistic portrait of {input person} wearing a rich silk saree with detailed zari border, styled hair and traditional jewelry. The person's face and features must be an exact match of the provided photo, without any alterations. The person must be seamlessly integrated with the minimal studio background. Soft, warm studio lighting should realistically illuminate the subject and the fabric's texture, creating cohesive highlights and shadows for a cinematic, editorial-style image. Ultra-sharp texture and lifelike folds.\nno plastic jewelry, no over-saturated reds, no cartoon shine, no duplicate drapes,no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_11",
    name: "Evening Gown",
    stackId: "clothes",
    imageUrl: "/images/clothes_gown_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a flowing evening gown. The person's face and features must be an exact match of the provided photo, without any alterations. The person should be seamlessly placed against the subtle gradient backdrop. Elegant studio light must create smooth, realistic highlights and shadows on the fabric that give it form and depth against the backdrop. High-fashion cinematic tone.\nno blur, no fantasy sparkles, no duplicated arms, no overexposure, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_12",
    name: "Tailored Blazer",
    stackId: "clothes",
    imageUrl: "/images/clothes_tailoredblazor_cover.webp",
    prompt: {
      task: "generate_image",
      rendering_order: "environment_first",

      reference_image_embeddings: {
        identity_lock: true,
      },

      priority_weights: {
        identity: 1.0,
        facial_structure: 1.0,
        environment_physics: 0.95,
        clothing: 0.9,
        style: 0.2,
      },

      facial_constraints: {
        exact_identity_match: true,
        preserve_jawline: true,
        preserve_chin_shape: true,
        preserve_eye_distance: true,
        preserve_nose_width: true,
        no_face_rounding: true,
        no_beautification: true,
        no_symmetry_correction: true,
        natural_skin_texture: true,
      },

      camera: {
        lens: "35mm",
        aperture: "f/8",
        focus: "deep_focus",
        iso: "real_world_noise",
        white_balance: "auto",
        processing: "minimal",
      },

      environment: {
        description:
          "A real working environment such as an office floor, coworking space, corporate hallway, or modern building lobby. Visible desks, glass partitions, walls, signage, furniture, or windows. The space feels used and functional, not staged.",
        lighting: {
          type: "existing_indoor_light",
          behavior: "uneven and realistic",
          no_studio_control: true,
        },
        background_rules: {
          no_blur: true,
          clear_objects: true,
          real_depth: true,
          natural_scale: true,
        },
      },

      subject: {
        position: "standing or walking naturally within the space",
        posture: "upright but relaxed",
        interaction:
          "natural gestures such as adjusting the blazer cuff, holding a phone or folder",
        motion: {
          freeze_action_without_blur: true,
          subtle_body_tension: true,
        },
        ground_contact: {
          feet_fully_grounded: true,
          real_contact_shadow: true,
        },
      },

      clothing: {
        type: "Tailored Blazer",
        description:
          "A well-fitted tailored blazer worn over a simple shirt or tee. The blazer shows realistic structure, stitching, lapels, and slight natural creasing from wear. Fabric appears matte and substantial, not glossy.",
        fabric_behavior: "structured_but_lived_in",
        no_runway_styling: true,
        no_exaggerated_shoulders: true,
      },

      color: {
        profile: "neutral_indoor",
        saturation: "slightly_muted",
        contrast: "natural",
      },

      anti_aesthetic_rules: {
        penalize_cinematic_lighting: true,
        penalize_glow: true,
        penalize_perfect_composition: true,
        penalize_editorial_polish: true,
      },

      post_processing: {
        retain_sensor_grain: true,
        avoid_edge_perfection: true,
        no_skin_smoothing: true,
      },

      negative_prompt: [
        "studio",
        "fashion editorial",
        "lookbook",
        "cinematic lighting",
        "spotlight",
        "rim light",
        "portrait mode",
        "background blur",
        "bokeh",
        "HDR",
        "cinematic grading",
        "glowing skin",
        "plastic fabric",
        "perfect symmetry",
        "overposed stance",
        "fantasy environment",
      ],

      output: {
        look: "clean_raw_real",
        sharpness: "natural",
        imperfection_level: "subtle",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_13",
    name: "Boho Dress",
    stackId: "clothes",
    imageUrl: "/images/clothes_bohodress_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} wearing a flowy printed boho dress with light accessories. The person's face and features must be an exact match of the provided photo, without any alterations. The person must be naturally integrated into the outdoor scene, with daylight realistically filtering through foliage to create warm sun flares and soft, dappled shadows on them, perfectly matching an outdoor, sunny environment. National Geographic × Raymond cinematic realism, soft natural tones, ultra-detailed texture.\nno fake patterns, no crowd, no lens flare over face, no heavy color grading, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_14",
    name: "Knit Turtleneck",
    stackId: "clothes",
    imageUrl: "/images/clothes_turtleneck_cover.webp",
    prompt: {
      task: "generate_image",
      rendering_order: "environment_first",
      realism_mode: "uncontrolled_observation",

      reference_image_embeddings: {
        identity_lock: true,
      },

      priority_weights: {
        identity: 1.0,
        facial_structure: 1.0,
        environment_physics: 1.0,
        clothing: 0.85,
        style: 0.05,
      },

      facial_constraints: {
        exact_identity_match: true,
        lock_jawline: true,
        lock_chin: true,
        lock_eye_distance: true,
        lock_nose_width: true,
        no_face_rounding: true,
        no_face_refinement: true,
        no_symmetry_fix: true,
        real_skin_texture: true,
      },

      camera: {
        device: "phone_camera",
        lens_equivalent_mm: 28,
        aperture: "f/11",
        focus: "everything_in_focus",
        iso: "visible_daylight_noise",
        white_balance: "auto_slightly_off",
        exposure: "slightly_imperfect",
        processing: "in_camera_only",
      },

      environment: {
        description:
          "An ordinary outdoor urban spot captured without preparation. Rough concrete ground with stains, cracks, gum marks, dirt, and uneven texture. Background includes mismatched building surfaces, exposed wiring, drain pipes, vents, faded paint, random posters or stickers, uneven signage, and clutter that does not align visually. Objects overlap awkwardly and block parts of each other.",
        lighting: {
          type: "flat_overcast_daylight",
          behavior: "directionless",
          no_shape: true,
          no_mood: true,
        },
        background_rules: {
          no_blur: true,
          visual_noise_present: true,
          imperfect_edges: true,
          real_world_clutter: true,
        },
      },

      subject: {
        position: "standing where they happened to stop",
        posture: "uneven stance, slight slouch or weight shift",
        interaction: "no deliberate interaction, hands resting naturally",
        framing: {
          slightly_off_center: true,
          minor_crop_at_edges: true,
        },
        motion: {
          static_capture: true,
          micro_imbalance: true,
        },
        ground_contact: {
          feet_flat_on_surface: true,
          shadow_soft_and_messy: true,
        },
      },

      clothing: {
        type: "Knit Turtleneck",
        description:
          "A knit turtleneck worn casually. Knit pattern is uneven with visible yarn variation, minor fuzz, light pilling, and slight stretching around the neck and shoulders. Fabric does not sit perfectly and shows wear from regular use.",
        fabric_behavior: "irregular_real_knit",
        no_pristine_finish: true,
        no_styling_adjustment: true,
      },

      color: {
        profile: "flat_real_world",
        saturation: "low",
        contrast: "low",
      },

      anti_aesthetic_enforcement: {
        penalize_pretty_scenes: true,
        penalize_composed_framing: true,
        penalize_fashion_bias: true,
        penalize_visual_cleanliness: true,
      },

      post_processing: {
        retain_noise: true,
        retain_compression_artifacts: true,
        allow_minor_bandling: true,
        no_edge_cleanup: true,
        no_skin_smoothing: true,
      },

      negative_prompt: [
        "studio",
        "styled environment",
        "fashion shoot",
        "editorial",
        "cinematic lighting",
        "golden hour",
        "moody light",
        "portrait mode",
        "background blur",
        "bokeh",
        "HDR",
        "beautification",
        "perfect symmetry",
        "clean architecture",
        "aesthetic background",
        "designed space",
      ],

      output: {
        look: "raw_unplanned_phone_capture",
        sharpness: "honest",
        imperfection_level: "high",
      },
    },
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_16",
    name: "Bridal Lehenga",
    stackId: "clothes",
    imageUrl: "/images/clothes_bridallahenga_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A National Geographic-grade image of {input person} in a detailed bridal lehenga. The person's face and features must be an exact match of the provided photo, without any alterations. The person must be seamlessly composited, with intricate embroidery shining realistically under soft golden light, ensuring the highlights and shadows on the subject are cohesive with the light source. The lighting should create a natural elegance and a gentle background blur for a cohesive look. Raymond ad color tone, hyper-realistic textures.\nno duplicate faces, no plastic shine, no artificial color filters, no glare, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "clothes_template_17",
    name: "Pastel Blouse",
    stackId: "clothes",
    imageUrl: "/images/clothes_pastelblouse_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in light pastel blouse and trousers. The person's face and features must be an exact match of the provided photo, without any alterations. The person must be seamlessly integrated into the airy daylight studio setting. The bright, airy studio lighting and subtle pastel background should create a clean, professional, and cohesive image, with soft, flattering shadows. Raymond lifestyle aesthetic, cinematic realism.\nno harsh lighting, no color oversaturation, no cartoon tone, no blurriness, no change in hairstyle , no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
];

const flexTemplates: Template[] = [
  {
    id: "flex_template_1",
    name: "Bugatti Coastal Drive",
    stackId: "flex",
    imageUrl: "/images/flex_bugaticostaldrive_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a tailored suit or premium jacket, posing beside or driving a Bugatti on a scenic coastal highway, sunlight reflecting off polished metal, wind-in-motion realism, Raymond-class sophistication.\nno motion blur, no fantasy reflections, no cartoon look, no harsh shadows.",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_2",
    name: "Luxury Superbike",
    stackId: "flex",
    imageUrl: "/images/flex_luxurysuperbikerider_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in sleek riding gear with a luxury superbike (like Ducati, BMW, or Hayabusa), mountains in background, real fabric and metal textures, confident Raymond posture.no artificial glow, no blur, no color oversaturation, no background noise, no change in hairstyle, no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_3",
    name: "Ice Rink Elegance",
    stackId: "flex",
    imageUrl: "/images/flex_icerink_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} gliding across a glassy ice rink wearing a stylish winter outfit — wool coat, gloves, and scarf, soft white lighting, reflections on ice, hyper-real fabric and frost details, serene elegance, each background object should be clearly visible. no background blur, no fantasy snow, no overexposure, no messy reflections.no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_4",
    name: "Deep Sea Diver",
    stackId: "flex",
    imageUrl: "/images/flex_deepdive_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in full-body deep-sea diving gear that fits their body naturally, underwater with realistic blue ambient light, floating particles, coral textures, soft rays filtering through water, and true-to-life diving posture, captured in high-detail ocean-photography style.\nno altered face, no change in hairstyle (if visible), no pasted clothes, no cartoonish colors, no blur background, adjust body posture and hand gestures naturally for a diver",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_5",
    name: "Private Jet Lifestyle",
    stackId: "flex",
    imageUrl: "/images/flex_privatejet_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing next to a private jet door and leaning back slightly, one hand in pocket, dressed in formal-casual attire — blazer and sunglasses, golden sunset light, tarmac reflections, refined Raymond elegance and cinematic composition, background objects should be clearly visible with no blurness(most important). no glare, no distorted jet, no cartoon tones, no excessive brightness.no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_6",
    name: "Yacht Life",
    stackId: "flex",
    imageUrl: "/images/flex_yachtlife_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} on a luxury yacht deck wearing linen shirt or summer blazer, calm blue ocean background, sunlight reflections on water, clean cinematic tones, National Geographic-style travel luxury.\nno haze, no overexposure, no blur, no unrealistic waves.no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_7",
    name: "City Night Supercar",
    stackId: "flex",
    imageUrl: "/images/flex_citynight_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a black or navy blazer, leaning on a Lamborghini or McLaren under neon city lights which are clearly visible, cinematic reflections on car surfaces, confident luxury tone, editorial realism. no cartoon neon, no fantasy lighting, no distortion, no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_8",
    name: "Desert ATV Adventure",
    stackId: "flex",
    imageUrl: "/images/flex_desertatv_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} sitting inside an ATV across a wide desert landscape, wearing realistic outdoor adventure clothing (without helmet) that fits their body naturally, sharp sunlight, sand trails, heat shimmer,clearly visible dunes in the background, captured in static real photography style.no altered face, no change in hairstyle, no pasted clothes, no blur background, no oversaturated colors, adjust body posture and hand gestures naturally for an ATV rider.",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_9",
    name: "Sunset Convertible Drive",
    stackId: "flex",
    imageUrl: "/images/flex_sunsetdrive_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} driving a convertible through a scenic coastal road at sunset, soft warm light, detailed car reflections, relaxed posture, cinematic Raymond tone of leisure and freedom.\nno glare, no blur, no fantasy colors, no distorted vehicle.no change in hairstyle , no blur background, change the hand gestures accordingly . whole face should be visible",
    aspectRatio: "4:3",
  },
  {
    id: "flex_template_10",
    name: "Luxury Hotel Lounge",
    stackId: "flex",
    imageUrl: "/images/flex_LuxuryHotelLounge_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a formal blazer or elegant dress, seated in a luxurious hotel lounge with warm ambient lighting, marble tables, golden tones, cinematic realism, Raymond lifestyle grace and poise.\nno harsh light, no blur, no busy crowd, no cartoon textures.no change in hairstyle , no blur background, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_11",
    name: "Premium Wristwatch",
    stackId: "flex",
    imageUrl: "/images/flex_premiumwristwatch_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} adjusting a premium wristwatch (Rolex, Omega, etc.), wearing a fitted suit, soft golden light highlighting metallic reflections, focus on texture and class, Raymond editorial clarity.\nno overexposure, no fingerprints glare, no blur, no fantasy glow.no change in hairstyle , no  background blur, change the hand gestures accordingly. whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_12",
    name: "Luxury Shopping Spree",
    stackId: "flex",
    imageUrl: "/images/flex_luxuryshoppingspree_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} walking through a luxury shopping district or high-end boutique, holding branded shopping bags, stylish modern outfit, cinematic natural lighting and color realism.\nno crowd, no harsh neon, no motion blur, no washed tones. no change in hairstyle , no  background blur, change the hand gestures accordingly. whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_13",
    name: "Infinity Pool Villa",
    stackId: "flex",
    imageUrl: "/images/flex_infinitypoolvilla_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} relaxing in a private villa terrace with infinity pool, wearing casual linen attire, golden sunlight reflecting on water, serene Raymond lifestyle tone, high-end vacation realism ,8k quality image .\nno unrealistic sky, no blur, no fantasy pool reflection, no saturation spike. no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_14",
    name: "Morning Coffee & Journal",
    stackId: "flex",
    imageUrl: "/images/flex_morningcoffe_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} sitting beside a wooden table with a coffee cup and leather journal, warm morning light streaming in, casual yet refined outfit, Raymond editorial lifestyle clarity.\nno low-light noise, no over-bright mug, no harsh shadows, no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_15",
    name: "Modern Gym Session",
    stackId: "flex",
    imageUrl: "/images/flex_moderngym_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a sleek modern gym, wearing premium sportswear, cinematic light streaks across metal equipment, posture showing focus and discipline, Raymond athletic luxury vibe.\nno cluttered background, no blur, no over-saturation, no artificial tone. no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_16",
    name: "Fine Dining Experience",
    stackId: "flex",
    imageUrl: "/images/flex_finedining_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} at a fine dining table, elegant evening wear, candlelight and reflections from wine glasses, warm cinematic tone, Raymond lifestyle luxury captured with realism.\nno messy background, no glare, no fantasy color, no blur. no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_17",
    name: "Luxury Hotel Suite",
    stackId: "flex",
    imageUrl: "/images/luxuryhoetlsuite.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} relaxing or preparing in a high-end suite, elegant interior textures, soft lamp light and silk bedding, refined comfort and subtle cinematic warmth, Raymond-class composition.\nno harsh lighting, no blur, no fake props, no color imbalance.no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
  {
    id: "flex_template_18",
    name: "Race Track Ferrari",
    stackId: "flex",
    imageUrl: "/images/flex_racetrackferrari_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing beside a red Ferrari in a race track pit wearing a tailored race suit, dynamic composition, crisp sunlight, polished reflections, hyper-realistic fashion-meets-speed vibe, Raymond luxury tone.\nno lens distortion, no cartoon color, no blur, no empty background, no plastic reflections..no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
  },
];

const monumentsTemplates: Template[] = [
  {
    id: "monuments_template_1",
    name: "Taj Mahal Sunrise",
    stackId: "monuments",
    imageUrl: "/images/monuments_tajmahal_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A hyper-realistic portrait of the person from the provided photo, seamlessly composited onto the marble walkway near the Taj Mahal at sunrise. Critically, their face, features, and hairstyle must be an exact, photorealistic match to the user's photo and must not be altered. The lighting on them must perfectly match the color temperature and soft quality of the sunrise, with highlights and shadows consistent with the sun's direction. Their feet must be firmly on the ground, casting a soft, accurate contact shadow on the marble. Their edges must be seamlessly blended with the misty background. Digitally dress them in elegant Indian travel attire. The background shows the Yamuna River mist, with a calm, majestic atmosphere. Cinematic 8K detail. \nno washed-out sky, no tourists, no fake reflections, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_2",
    name: "Eiffel Tower Romance",
    stackId: "monuments",
    imageUrl: "/images/monuments_ifeltowerromance_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Place the person from the photo in a romantic, cinematic scene in Paris, with the Eiffel Tower in the background at golden hour. The person's face, features, and hairstyle must be preserved with photorealistic accuracy and must not be altered. The person must be seamlessly composited, for example, leaning realistically on a classic Parisian balcony railing. The warm, golden hour light must wrap around the subject naturally, creating soft highlights and shadows that match the color temperature and direction of the ambient light. Ensure their edges are soft and perfectly blended into the background. Digitally dress them in chic, stylish attire. The mood should be dreamy and romantic, with a shallow depth of field. \nno altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_3",
    name: "Pyramids of Giza Expedition",
    stackId: "monuments",
    imageUrl: "/images/monuments_pyramidsofgyza_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Create a grand, adventurous shot of the person from the photo, seamlessly integrated into the scene at the Pyramids of Giza. Their face, features, and hairstyle must remain identical to the uploaded photo and not be altered. They must be standing firmly on the desert sand, with the bright desert sun casting strong, realistic shadows that ground them in the environment. The lighting on the person must match the harsh, direct sunlight of the desert. Ensure their edges are cleanly blended against the background. Position them as an explorer in practical clothing. The final image should feel like a still from an epic adventure movie. \nno altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_4",
    name: "Statue of Liberty Welcome",
    stackId: "monuments",
    imageUrl: "/images/monuments_statueofliberty_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Ultra-realistic travel photo of the person from the input image standing at Liberty Island with the Statue of Liberty clearly visible in the background. The person looks directly into the camera with the same facial structure as the input image: accurate jawline, identical eyes, nose, lips, eyebrows, hair texture, and skin texture. Bring the person slightly closer to the camera. The background MUST NOT be blurry — show the Statue of Liberty, pedestal, railing, and surrounding bay clearly and sharply with no portrait-mode blur. Every object in the environment must be crisp, detailed, and fully visible. Natural bright daylight, realistic shadows, soft wind in the hair, consistent lighting on both the person and background. The person interacts with the scene — holding a small travel backpack strap, or gently touching the railing with one hand. Hyperrealistic travel photography, 8k detail, clean and distortion-free. no blurry background, no portrait mode blur, no bokeh, no depth blur, no soft focus, no blurry objects, no unclear environment, no out of focus areas, no low resolution, no low quality, no noise, no pixelation, no warped background, no distortions, no stretched objects, no incorrect scale, no bad proportions, no broken anatomy, no inaccurate facial structure, no rounding of the jawline, no wrong jawline, no warped eyes, no mismatched eyes, no deformed nose, no incorrect lips, no plastic skin, no overly smoothed skin, no artificial texture, no extra fingers, no missing fingers, no fused hands, no duplicate limbs, no hand deformations, no finger artifacts, no AI artifacts, no jpeg artifacts, no halo, no glow outline, no bad mask, no chromatic aberration, no inconsistent lighting, no overexposed, no underexposed, no harsh shadows, no lighting mismatch, no cartoon style, no 3d render look, no waxy skin, no fake smile, no dead eyes, no glowing eyes, no asymmetrical eyes, no duplicate face, no merged face, no misaligned face, no floating objects, no object clipping, no misplaced shadows, no repeated textures, no fabric distortions, no clothing artifacts, no watermark, no text, no signature, no logo, no overlays, no UI elements, no nsfw, no nudity, no gore, no horror elements.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_5",
    name: "Great Wall of China Trek",
    stackId: "monuments",
    imageUrl: "/images/monuments_greatwallofchina_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Ultra-realistic photo of the person from the input image traveling on the Great Wall of China. The person looks directly into the camera with the same facial structure as the input image: accurate jawline, identical eyes, nose, lips, eyebrows, and natural skin texture. Bring the person slightly closer to the camera. The background MUST NOT be blurry — show every stone of the Great Wall and the distant mountain landscape clearly and sharply, with no portrait-mode bokeh. Ensure every object in the environment is crisp, detailed, and fully visible. Natural daylight, realistic shadows, correct lighting on both the person and background. The person interacts with the scene — one hand resting on the Great Wall stones, the other adjusting or holding a travel backpack strap. Hyperrealistic travel photography style, 8k details, no distortions. no blurry background, no portrait mode blur, no bokeh, no depth blur, no soft focus, no blurry objects, no unclear environment, no out of focus areas, no low resolution, no low quality, no noise, no pixelation, no warped background, no distortions, no stretched objects, no incorrect scale, no bad proportions, no broken anatomy, no inaccurate facial structure, no rounding of the jawline, no wrong jawline, no warped eyes, no mismatched eyes, no deformed nose, no incorrect lips, no plastic skin, no overly smoothed skin, no artificial texture, no extra fingers, no missing fingers, no fused hands, no duplicate limbs, no hand deformations, no finger artifacts, no AI artifacts, no jpeg artifacts, no halo, no glow outline, no bad mask, no chromatic aberration, no inconsistent lighting, no overexposed, no underexposed, no harsh shadows, no lighting mismatch, no cartoon style, no 3d render look, no waxy skin, no fake smile, no dead eyes, no glowing eyes, no asymmetrical eyes, no duplicate face, no merged face, no misaligned face, no floating objects, no object clipping, no misplaced shadows, no repeated textures, no fabric distortions, no clothing artifacts, no watermark, no text, no signature, no logo, no overlays, no UI elements, no nsfw, no nudity, no gore, no horror elements.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_6",
    name: "Colosseum Gladiator Pose",
    stackId: "monuments",
    imageUrl: "/images/monuments_colousium_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Compose a dramatic image of the person from the photo, seamlessly integrated into a scene before the Colosseum in Rome. Do not alter their face, features, or hairstyle. They must be standing realistically on the ground, with the golden hour light casting long, believable shadows that anchor them to the spot. The warm light must wrap around their form convincingly, matching the color temperature of the scene. Ensure their edges are clean and seamlessly blended with the background. Dress them in stylish, modern attire. The final image should be high-contrast and heroic. \nno altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_7",
    name: "Lotus Temple Sunset",
    stackId: "monuments",
    imageUrl: "/images/monuments_lotustemple_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Create a serene and hyper-realistic portrait of the person from the provided photo, seamlessly composited onto the walkway beside a reflecting pool at the Lotus Temple in Delhi during sunset. Their face, features, and hairstyle must be an exact, photorealistic match and must not be altered. The lighting on the person must perfectly match the soft, pastel hues of the sunset sky, with realistic highlights and their reflection subtly visible in the water. They must be grounded with soft contact shadows consistent with the evening light. Critically, their edges must be flawlessly blended into the background to create a photorealistic composite. Digitally dress them in modern, elegant attire. The composition must capture the temple's reflection in the water. The style should be inspired by National Geographic's photojournalism. The final image must be cinematic, with natural lighting. \nno altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "monuments_template_8",
    name: "Machu Picchu Sunrise",
    stackId: "monuments",
    imageUrl: "/images/monuments_machupichu_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Ultra-realistic travel photo of the person from the input image exploring Machu Picchu, standing on a stone pathway with the ancient terraces and mountain peaks clearly visible. The person looks directly into the camera with the same facial structure as the input image: accurate jawline, exact facial proportions, identical eyes, nose, lips, eyebrows, and natural skin texture. Bring the person slightly closer to the camera. The background MUST NOT be blurry — show the Machu Picchu ruins, terraces, stone structures, and Huayna Picchu mountain sharply and clearly, with NO portrait-mode blur. Every object in the environment must be crisp, detailed, and fully in focus. Bright, natural daylight with gentle mountain sunlight, consistent lighting on both the person and the landscape. The person interacts with the environment — lightly touching a stone wall, holding a travel backpack strap, or adjusting sunglasses. Hyperrealistic travel photography style, 8k clarity, no distortions. no blurry background, no portrait mode blur, no bokeh, no depth blur, no soft focus, no blurry objects, no unclear environment, no out of focus areas, no low resolution, no low quality, no noise, no pixelation, no warped background, no distortions, no stretched objects, no incorrect scale, no bad proportions, no broken anatomy, no inaccurate facial structure, no rounding of the jawline, no wrong jawline, no warped eyes, no mismatched eyes, no deformed nose, no incorrect lips, no plastic skin, no overly smoothed skin, no artificial texture, no extra fingers, no missing fingers, no fused hands, no duplicate limbs, no hand deformations, no finger artifacts, no AI artifacts, no jpeg artifacts, no halo, no glow outline, no bad mask, no chromatic aberration, no inconsistent lighting, no overexposed, no underexposed, no harsh shadows, no lighting mismatch, no cartoon style, no 3d render look, no waxy skin, no fake smile, no dead eyes, no glowing eyes, no asymmetrical eyes, no duplicate face, no merged face, no misaligned face, no floating objects, no object clipping, no misplaced shadows, no repeated textures, no fabric distortions, no clothing artifacts, no watermark, no text, no signature, no logo, no overlays, no UI elements, no nsfw, no nudity, no gore, no horror elements.",
    aspectRatio: "3:4",
  },
];

const sceneriesTemplates: Template[] = [
  {
    id: "sceneries_template_1",
    name: "Himalayan Trek",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_himalayantreck_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A hyper-realistic portrait of {input person} trekking through the Himalayas, wearing layered hiking gear. The person's face, features, and hairstyle must be an exact match to the provided photo and must not be altered. Scene details: snow-dusted trail, majestic mountains in the background, sunlight piercing thin clouds, cinematic tone mapping, National Geographic photo realism, crisp focus, earthy textures, adventure mood.\nno unrealistic lighting, no floating person, no cartoon effects, no duplicate faces, no overexposure, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "sceneries_template_2",
    name: "Sahara Desert Walk",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_saharadesertwalk_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. A photo of {input person} walking across vast golden dunes in the Sahara Desert, carrying a backpack. The person's face, features, and hairstyle must be an exact match to the provided photo and must not be altered. Scene details: soft sunlight casting long shadows, sand patterns crisp and realistic, warm tones, National Geographic composition, cinematic atmosphere.\nno mirage effects, no sandstorm, no missing limbs, no unnatural shadows, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
  {
    id: "sceneries_template_3",
    name: "Amazon Rainforest",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_amazonrainforest_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding.{input person} exploring deep inside the Amazon rainforest, wearing realistic lightweight explorer clothing that fits their body naturally, lush green foliage, dense canopy light rays, humid atmosphere, vines, mossy trees, and rich jungle textures, captured in natural adventure-photography style.\nno altered face, no change in hairstyle, no pasted clothes, no blur background, no fantasy colors, adjust body posture and hand gestures naturally for an explorer.",
    aspectRatio: "3:4",
  },
  {
    id: "sceneries_template_5",
    name: "Icelandic Waterfall",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_icelandicwaterfall_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing on rocky ground near a massive Icelandic waterfall, wearing realistic outdoor travel clothing that fits their body naturally, moss-covered cliffs, wide-angle adventure photography, realistic lighting and colors.no altered face, no change in hairstyle, no pasted clothes, no blur background, no fantasy colors, adjust body posture and hand gestures naturally for a traveler.",
    aspectRatio: "3:4",
  },
  {
    id: "sceneries_template_6",
    name: "Moroccan Market",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_moroccanmarket_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} walking through a busy Moroccan market street, wearing realistic lightweight travel clothing that fits their body naturally, warm golden sunlight, textured stone walls, colorful stalls, patterned rugs, brass lamps, spices, and traditional architecture, shot in natural street-photography style.\nno altered face, no change in hairstyle, no pasted clothes, no blur background, no fantasy colors, adjust body posture and hand gestures naturally for a traveler",
    aspectRatio: "3:4",
  },
  {
    id: "sceneries_template_7",
    name: "Aurora Borealis Night",
    stackId: "sceneries",
    imageUrl: "/images/sceneries_auroraborealis_cover.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing in front of aurora borealis under a starry night sky, wearing winter clothing. The person's face, features, and hairstyle must be an exact match to the provided photo and must not be altered. Scene details: snow reflecting green and purple light, crisp cinematic clarity, National Geographic hyper-realistic tone, emotional composition.\nno artificial sky patterns, no cartoon aurora, no exposure burn, no fantasy style, no change in hairstyle, no background blur, no altered faces, no changed facial features.",
    aspectRatio: "3:4",
  },
];

// Fallback for any other stacks to ensure they have content
const allStackIds = STACKS.map((s) => s.id);
const definedStackIds = [
  "fitit",
  "animation",
  "aesthetics",
  "celebration",
  "clothes",
  "flex",
  "monuments",
  "sceneries",
];
const remainingStackIds = allStackIds.filter(
  (id) => !definedStackIds.includes(id),
);

const placeholderTemplates = remainingStackIds.flatMap((stackId) => {
  const stack = STACKS.find((s) => s.id === stackId)!;
  return Array.from(
    { length: 4 },
    (_, i): Template => ({
      id: `${stack.id}_template_${i + 1}`,
      name: `${stack.name} Style ${i + 1}`,
      stackId: stack.id,
      imageUrl: `https://picsum.photos/seed/${stack.id}${i}/1200/900`,
      prompt: `Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. Transform the user's image with a professional ${stack.name.toLowerCase()} aesthetic, style ${i + 1}. Focus on composition and high-quality details.`,
      aspectRatio: "3:4",
    }),
  );
});

export const TEMPLATES: Template[] = [
  ...fititTemplates,
  ...animationTemplates,
  ...aestheticsTemplates,
  ...celebrationTemplates,
  ...clothesTemplates,
  ...flexTemplates,
  ...monumentsTemplates,
  ...sceneriesTemplates,
  ...placeholderTemplates,
];
