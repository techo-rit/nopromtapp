import type { Stack, Template, PricingPlan } from "../types";

// ==========================================
// PRICING PLANS
// ==========================================
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "essentials",
    name: "Essentials",
    description: "Perfect for getting started",
    price: 12900, // ₹129 in paise
    displayPrice: "₹129",
    currency: "INR",
    creations: 20,
    accountType: "essentials",
    features: [
      "20 one-time AI creations",
      "Keep your monthly free creations",
      "Standard support",
    ],
    isPopular: false,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    description: "For power users",
    price: 74900, // ₹749 in paise
    displayPrice: "₹749",
    currency: "INR",
    creations: 135,
    accountType: "ultimate",
    features: [
      "135 one-time AI creations",
      "Keep your monthly free creations",
      "24/7 priority support",
      "Early access to premium features",
    ],
    isPopular: true,
    badge: "Premium",
  },
];

export const TRENDING_TEMPLATE_IDS: string[] = [
  "aesthetics_template_9",  // Seaside Golden Hour
  "flex_template_10",       // Luxury Hotel Lounge
  "aesthetics_template_14", // Evening Gown Twilight
  "flex_template_6",        // Yacht Life
  "flex_template_1",        // Bugatti Coastal Drive
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
    name: "Try-On",
    stackId: "fitit",
    imageUrl: "/images/fitit_template_1.webp",
    prompt: {
      "task": "virtual_try_on_with_body_completion",
      "model": "gemini-3.1-flash-image-preview",
      "inputs": {
        "person_image": {
          "type": "image",
          "description": "Input 1: User image (can be selfie, half-body, or full-body). Identity must be preserved."
        },
        "garment_image": {
          "type": "image",
          "description": "Input 2: Garment image to be tried on."
        }
      },
      "instructions": {
        "objective": "Generate a single, full-body, photorealistic try-on image (front view only) of the user wearing the garment, even if the input person image is not full-body.",
        
        "identity_preservation": [
          "Strictly preserve the user's face, hairstyle, skin tone, and identity",
          "Do not alter facial structure or expression"
        ],

        "body_completion": [
          "If the input image is not full-body, intelligently generate the missing body parts",
          "Ensure the generated body is anatomically correct and proportionate to the visible parts",
          "Infer natural pose consistent with the upper body",
          "Maintain realistic human proportions (height, limb ratios)"
        ],

        "garment_fitting": [
          "Fit the garment naturally to the generated full body",
          "Ensure proper scaling, alignment, and draping",
          "Preserve garment texture, color, stitching, and design details",
          "Simulate realistic fabric physics (folds, tension, gravity)"
        ],

        "consistency_rules": [
          "Match lighting, shadows, and perspective with the original image",
          "Keep background consistent or extend it naturally if needed",
          "Ensure no visible artifacts, distortions, or identity drift"
        ],

        "output_style": {
          "type": "photorealistic",
          "framing": "full-body",
          "view": "front-view-only",
          "layout": "single-image",
          "quality": "high-resolution"
        }
      },

      "output": {
        "type": "image",
        "description": "Full-body try-on image of the user wearing the garment with preserved identity"
      }
    },
    aspectRatio: "3:4"
  }
];

const aestheticsTemplates: Template[] = [
  {
    id: "aesthetics_template_2",
    name: "Warm Rustic Interior",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_2.webp",
    prompt:
    {
      task: "identity_fused_aesthetic_medium_shot_generation",

      identity_strategy: {
        mode: "embedding_reconstruction",
        identity_source: "input_image",
        face_identity_strength: 0.955,
        facial_structure_lock: true,
        proportions_lock: true,
        skin_detail_preservation: true,
        avoid_face_overlay: true,
        rebuild_face_from_latent_identity: true
      },

      rendering_pipeline: [
        "identity_embedding_extraction",
        "latent_face_reconstruction",
        "pose_scale_alignment",
        "medium_shot_scene_projection",
        "wardrobe_contextual_redesign",
        "fabric_physics_simulation",
        "interactive_environment_contact",
        "global_lighting_simulation",
        "material_physics_unification",
        "cinematic_color_grading",
        "contact_shadow_generation",
        "aesthetic_composition_pass",
        "micro_imperfection_injection",
        "final_photographic_finish"
      ],

      scene: {
        theme: "warm_rustic_interior",
        environment_type: "cozy rustic indoor space",
        interaction_context: [
          "subject casually leaning near wooden wall or furniture",
          "one hand resting on natural wood surface",
          "upper body relaxed, comfortable posture"
        ],
        materials: [
          "natural aged wood",
          "exposed wooden beams",
          "stone or brick accent wall",
          "linen and wool fabrics"
        ],
        elements: [
          "warm table lamps",
          "soft pendant lights",
          "indoor plants",
          "ceramic pottery",
          "wooden shelves"
        ],
        color_palette: [
          "warm brown",
          "soft beige",
          "earthy terracotta",
          "muted olive",
          "amber highlights"
        ]
      },

      wardrobe: {
        style: "warm_rustic_casual",
        outfit_type: "cozy_editorial",
        upper_wear: [
          "linen shirt",
          "soft cotton shirt",
          "light knit sweater",
          "rustic flannel"
        ],
        layers_optional: [
          "neutral-toned cardigan",
          "textured overshirt"
        ],
        fabric_properties: [
          "natural fibers",
          "soft weave",
          "matte texture",
          "subtle wrinkles"
        ],
        color_palette: [
          "cream",
          "warm beige",
          "olive green",
          "rust brown",
          "muted charcoal"
        ],
        fit: "relaxed but well-fitted",
        avoid: [
          "streetwear",
          "synthetic shine",
          "logos",
          "formal suits",
          "bright neon colors"
        ]
      },

      lighting: {
        lighting_model: "cinematic_warm_interior_soft",
        key_light: "diffused window light",
        fill_light: "warm ambient bounce",
        rim_light: "gentle warm edge separation",
        color_temperature: "3200K–3800K",
        light_wrap: true,
        face_environment_light_match: true,
        shadow_falloff: "soft_natural"
      },

      subject_integration: {
        interaction_type: "casual_physical_contact",
        scale_match: true,
        contact_shadows: true,
        ambient_occlusion: true,
        environment_color_reflection_on_skin: true,
        fabric_light_response: "soft_natural",
        fabric_color_bleed: true,
        no_cutout_edges: true
      },

      camera: {
        shot_type: "medium",
        framing: "chest_up",
        lens: "35mm",
        aperture: "f/2.8",
        focus_point: "face",
        depth_of_field: "cinematic_but_realistic",
        composition: "rule_of_thirds",
        perspective_consistency: true
      },

      style: {
        aesthetic: "editorial warm interior portrait",
        mood: "cozy, refined, natural",
        realism_level: "high",
        contrast: "soft",
        grain: "subtle_film"
      },

      constraints: {
        no_pasted_look: true,
        no_halo_edges: true,
        no_studio_flash: true,
        no_over_smoothing: true,
        no_anime_or_cgi: true
      },

      negative_prompt: [
        "face cutout",
        "identity drift",
        "synthetic clothing",
        "shiny fabric",
        "logos",
        "flat lighting",
        "plastic skin",
        "floating hands"
      ],

      output: {
        resolution: "high",
        coherence: "single unified warm rustic interior photograph",
        final_validation:
          "exact face preserved, clothing matches rustic aesthetic, natural blend"
      }
    },
    aspectRatio: "3:4",
    keywords: [
      "rustic", "interior", "home", "warm", "cozy", "wooden", "ghar",
      "kamra", "room", "vintage", "cabin", "indoor", "sofa", "relax",
      "living room", "sundar ghar", "lakdi", "shanti", "aesthetic", "brown"
    ]
  },
  {
    id: "aesthetics_template_3",
    name: "Urban Alleyway",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_3.webp",
    prompt:
    {
      task: "identity_fused_aesthetic_medium_shot_generation",

      identity_strategy: {
        mode: "embedding_reconstruction",
        identity_source: "input_image",
        face_identity_strength: 0.955,
        facial_structure_lock: true,
        proportions_lock: true,
        skin_detail_preservation: true,
        avoid_face_overlay: true,
        rebuild_face_from_latent_identity: true
      },

      rendering_pipeline: [
        "identity_embedding_extraction",
        "latent_face_reconstruction",
        "pose_scale_alignment",
        "medium_shot_scene_projection",
        "interactive_environment_contact",
        "global_lighting_simulation",
        "material_physics_unification",
        "cinematic_color_grading",
        "contact_shadow_generation",
        "aesthetic_composition_pass",
        "micro_imperfection_injection",
        "final_photographic_finish"
      ],

      scene: {
        theme: "urban_alleyway",
        environment_type: "cinematic city alley",
        interaction_context: [
          "subject casually leaning near brick wall",
          "one hand resting on textured surface",
          "upper body relaxed, natural posture"
        ],
        materials: [
          "aged brick",
          "layered graffiti",
          "weathered concrete",
          "rusted metal details"
        ],
        elements: [
          "soft neon glow",
          "posters and stickers",
          "fire escape shadows",
          "subtle ground reflections"
        ],
        color_palette: [
          "muted teal",
          "cool gray",
          "deep blue shadows",
          "warm amber highlights"
        ]
      },

      lighting: {
        lighting_model: "cinematic_urban_soft",
        key_light: "diffused streetlight or neon bounce",
        fill_light: "soft ambient city bounce",
        rim_light: "gentle edge separation",
        color_temperature: "4200K–4800K",
        light_wrap: true,
        face_environment_light_match: true,
        shadow_falloff: "soft_natural"
      },

      subject_integration: {
        interaction_type: "casual_physical_contact",
        scale_match: true,
        contact_shadows: true,
        ambient_occlusion: true,
        environment_color_reflection_on_skin: true,
        fabric_light_response: "natural",
        no_cutout_edges: true
      },

      camera: {
        shot_type: "medium",
        framing: "chest_up",
        lens: "35mm",
        aperture: "f/2.8",
        focus_point: "face",
        depth_of_field: "cinematic_but_realistic",
        composition: "rule_of_thirds",
        perspective_consistency: true
      },

      style: {
        aesthetic: "editorial urban portrait",
        mood: "stylish, calm, cinematic",
        realism_level: "high",
        contrast: "soft",
        grain: "subtle_film"
      },

      constraints: {
        no_pasted_look: true,
        no_halo_edges: true,
        no_studio_lighting: true,
        no_over_smoothing: true,
        no_anime_or_cgi: true
      },

      negative_prompt: [
        "face cutout",
        "identity drift",
        "flat lighting",
        "harsh flash",
        "fake blur",
        "over sharpened skin",
        "floating limbs"
      ],

      output: {
        resolution: "high",
        coherence: "single unified aesthetic urban photograph",
        final_validation:
          "exact face preserved, medium distance, aesthetic blend"
      }
    },
    aspectRatio: "3:4",
    keywords: [
      "urban", "alley", "street", "city", "cool", "dark", "grungy",
      "rasta", "gali", "neon", "night", "road", "backstreet", "gangster",
      "vibe", "andhera", "light", "underground"
    ]
  },
  {
    id: "aesthetics_template_4",
    name: "Vibrant Fabric Market",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_4.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding.  {input person} sitting inside a vibrant fabric market filled with colorful textiles, patterned cloth rolls, and detailed handmade materials, wearing realistic casual matching travel clothing that fits their body naturally, warm ambient lighting, rich textures, and lively market depth, captured in clean street-photography style.no altered face,no fatty face, no altered jawline, no change in hairstyle, no pasted clothes, no blur background, no cartoon colors, adjust body posture and hand gestures naturally for a market visitor",
    aspectRatio: "3:4",
    keywords: [
      "market", "fabric", "colorful", "bazar", "bazaar", "cloth",
      "textile", "shopping", "desi", "street", "indian market", "dukaan",
      "shop", "bheed", "crowd", "rang biranga", "travel", "culture"
    ]
  },
  {
    id: "aesthetics_template_5",
    name: "Royal Luxury ",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_5.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} wearing regal attire that perfectly complements the elegant royal surroundings — marble floors, velvet drapes, gold accents, graceful posture, classic Raymond luxury portrait style. bend the person and the background perfectly\nno fantasy castle, no cartoon gold, no bright glare, no blur. no change in hairstyle, no background blur.",
    aspectRatio: "3:4",
    keywords: [
      "royal", "luxury", "king", "queen", "palace", "mahal", "rich",
      "gold", "elegant", "rajwada", "shahi", "expensive", "ameer",
      "classy", "rajkumar", "rajkumari", "fort", "kila", "heritage"
    ]
  },
  {
    id: "aesthetics_template_6",
    name: "Forest Sunlight",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_6.webp",
    prompt:
    {
      task: "identity_locked_real_world_close_up_photography",
      theme: "forest_sunlight_with_stream_and_mulberry",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          face_asymmetry: "preserved",
          head_shape: "locked"
        },
        forbid: [
          "face morphing",
          "beautification",
          "facial idealization",
          "AI facial averaging"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "physical_light_solution",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "natural forest edge with shallow flowing water stream",
        background_layering: {
          midground: "water stream and rocks around subject",
          background: "mulberry tree grove positioned several meters behind the subject"
        },
        mulberry_grove_details: {
          tree_type: "mulberry",
          distance_from_subject: "5–8 meters behind",
          leaf_character: "broad, matte green leaves",
          branch_structure: "slightly irregular, natural spacing",
          ground_cover: "fallen mulberry leaves and twigs",
          visibility: "clearly recognizable, not blurred out"
        },
        time_of_day: "late morning",
        lighting: {
          source: "pure sunlight",
          behavior:
            "sunlight filtering through mulberry leaves and forest canopy, unevenly illuminating face, clothes, water",
          shadow_behavior: "broken and organic",
          avoid: [
            "cinematic beams",
            "volumetric glow",
            "fantasy haze"
          ]
        },
        elements: [
          "slow-moving water stream",
          "wet stones and pebbles",
          "moss-covered rocks",
          "floating leaves",
          "natural forest clutter"
        ]
      },

      camera_simulation: {
        camera_type: "professional mirrorless camera",
        focal_length_mm: 50,
        aperture: "f/4",
        iso: 200,
        shutter_speed: "1/320",
        focus_behavior:
          "real optical depth falloff, background still readable",
        lens_characteristics: [
          "natural edge softness",
          "minor focus breathing",
          "no portrait mode blur"
        ]
      },

      subject: {
        identity: "exact match to input image",
        framing: "close-up to medium close-up",
        pose: "sitting comfortably on a flat rock near the stream",
        body_language: "relaxed shoulders, slight forward lean",
        interaction: [
          "one hand resting in or just above flowing water",
          "fingers touching wet stones",
          "other arm resting casually on knee"
        ],
        expression: "calm, natural, unposed",
        occlusion: "light foliage overlap without covering face"
      },

      wardrobe_and_accessories: {
        design_level: "professionally designed",
        style: "forest-appropriate luxury utility wear",
        materials: [
          "natural linen blend",
          "matte cotton",
          "soft wool accents"
        ],
        colors: [
          "olive green",
          "earth brown",
          "muted beige",
          "washed charcoal"
        ],
        fit: "tailored but relaxed",
        accessories: [
          "minimal leather strap watch",
          "subtle metal ring",
          "canvas utility sling or belt pouch"
        ],
        fabric_behavior: [
          "wrinkling from sitting",
          "natural folds at elbows and waist",
          "gentle movement from breeze"
        ]
      },

      color_science: {
        profile: "neutral real-world camera color response",
        saturation: "slightly muted",
        white_balance:
          "mixed daylight with green foliage cast from mulberry leaves",
        avoid: [
          "cinematic grading",
          "teal-orange",
          "over-saturation"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "controlled",
        symmetry_breaking: true,
        imperfection_level: "subtle"
      },

      noise_and_texture: {
        sensor_noise: "subtle ISO grain",
        grain: "fine organic texture"
      },

      post_processing_constraints: {
        remove: [
          "beauty filters",
          "face reshaping",
          "skin smoothing",
          "edge halos"
        ],
        apply: [
          "minor contrast roll-off",
          "tiny exposure inconsistency"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no portrait mode",
        "no cinematic lighting",
        "no fantasy effects",
        "no stylized blur",
        "no symmetry enforcement"
      ],

      output_goal:
        "a realistic yet aesthetic close-up forest photograph where the exact input face is preserved, the person sits comfortably by a sunlit water stream, and a mulberry tree grove appears naturally in the background at a short distance"
    },
    aspectRatio: "3:4",
    keywords: [
      "forest", "nature", "sunlight", "green", "trees", "jungle",
      "woods", "ped", "prakriti", "outdoor", "wild", "morning",
      "dhup", "sukoon", "peace", "natural", "trek", "calm"
    ]
  },
  {
    id: "aesthetics_template_8",
    name: "Ancient Monument",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_8.webp",
    prompt:
    {
      task: "identity_locked_real_world_close_up_photography",
      theme: "ancient_monument",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          face_asymmetry: "preserved",
          head_shape: "locked"
        },
        forbid: [
          "face morphing",
          "beautification",
          "facial idealization",
          "AI facial averaging"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "physical_light_solution",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "ancient stone monument complex",
        architecture_style: "weathered heritage stone architecture",
        background_layering: {
          midground: "stone steps and carved walls near subject",
          background: "large ancient monument structures several meters behind the subject"
        },
        material_details: [
          "aged stone blocks",
          "hand-carved reliefs",
          "eroded edges",
          "surface cracks and discoloration"
        ],
        time_of_day: "early morning or late afternoon",
        lighting: {
          source: "natural sunlight only",
          behavior:
            "angled sunlight grazing stone surfaces, unevenly illuminating subject",
          shadow_behavior: "hard-to-soft mixed shadows, non-dramatic",
          avoid: [
            "cinematic rim light",
            "volumetric haze",
            "dramatic sun flares"
          ]
        },
        atmosphere: "dry air, subtle dust presence, no fog"
      },

      camera_simulation: {
        camera_type: "professional mirrorless camera",
        focal_length_mm: 50,
        aperture: "f/4",
        iso: 100,
        shutter_speed: "1/400",
        focus_behavior:
          "natural optical depth with monument clearly readable",
        lens_characteristics: [
          "minor edge softness",
          "real contrast falloff",
          "no portrait mode"
        ]
      },

      subject: {
        identity: "exact match to input image",
        framing: "close-up to medium close-up",
        pose: "sitting comfortably on ancient stone steps or ledge",
        body_language: "relaxed posture, slight forward lean",
        interaction: [
          "one hand resting on textured stone surface",
          "fingers feeling carved grooves or worn edges",
          "other arm resting casually on knee"
        ],
        expression: "calm, contemplative, unposed",
        occlusion:
          "architectural elements partially framing subject, no face obstruction"
      },

      wardrobe_and_accessories: {
        design_level: "professionally designed heritage-adaptive clothing",
        style: "modern silhouettes with historical material influence",
        materials: [
          "raw linen",
          "handwoven cotton",
          "light wool blends"
        ],
        colors: [
          "sand beige",
          "stone grey",
          "muted rust",
          "weathered brown"
        ],
        fit: "tailored but relaxed",
        accessories: [
          "minimal leather strap watch",
          "subtle metal ring with matte finish",
          "simple leather crossbody or satchel"
        ],
        fabric_behavior: [
          "natural creases from sitting",
          "slight dust contact near edges",
          "matte texture under sunlight"
        ],
        avoid: [
          "logos",
          "modern graphics",
          "synthetic shine"
        ]
      },

      color_science: {
        profile: "neutral real-world camera profile",
        saturation: "slightly muted",
        white_balance:
          "warm daylight reflecting off stone surfaces",
        avoid: [
          "teal-orange grading",
          "cinematic LUTs",
          "over-contrast"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "controlled",
        symmetry_breaking: true,
        imperfection_level: "subtle",
        details: [
          "uneven sunlight on face",
          "minor exposure imbalance",
          "stone dust texture preserved"
        ]
      },

      noise_and_texture: {
        sensor_noise: "very subtle ISO grain",
        grain: "fine organic grain",
        stone_texture:
          "high-frequency surface detail without sharpening"
      },

      post_processing_constraints: {
        remove: [
          "skin smoothing",
          "face reshaping",
          "beauty filters",
          "edge halos"
        ],
        apply: [
          "minor contrast roll-off",
          "tiny highlight clipping on stone",
          "realistic tonal compression"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no portrait mode",
        "no cinematic lighting",
        "no fantasy atmosphere",
        "no stylized blur",
        "no symmetry enforcement",
        "no modern props"
      ],

      output_goal:
        "a realistic yet aesthetic close-up photograph where the exact input face is preserved, the person sits comfortably within an ancient monument environment, and interacts naturally with weathered stone architecture"
    },
    aspectRatio: "3:4",
    keywords: [
      "monument", "ancient", "history", "old", "stone", "ruins",
      "travel", "purana", "place", "tourism", "itihas", "patthar",
      "building", "ghumna", "trip", "heritage", "archaeology"
    ]
  },
  {
    id: "aesthetics_template_9",
    name: "Seaside Golden Hour",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_9.webp",
    prompt: {
      task: "identity_locked_virtual_tryon_with_static_face_composite_and_environment_interaction",

      priority_stack: [
        "face_identity_absolute",
        "body_identity",
        "clothing",
        "interaction",
        "environment"
      ],

      identity_priority: "absolute_maximum",

      input_sources: {
        identity_image: "{input_person}",
        clothing_reference: "{second_input_image}"
      },

      face_handling_mode: "foreign_static_face_layer",

      face_authority: {
        source: "identity_image",
        authority_level: "pixel_absolute",
        treat_as_external_asset: true,
        exclude_from_diffusion_graph: true
      },

      face_masking: {
        enable: true,
        mask_source: "identity_image",
        mask_region: "entire_face_forehead_to_chin_ear_to_ear_including_hairline",
        mask_type: "hard_mask_binary",

        mask_behavior: "direct_pixel_transfer",

        generation_inside_mask: "disabled",
        diffusion_inside_mask: "disabled",
        style_transfer_inside_mask: "disabled",
        geometry_adjustment_inside_mask: "disabled",

        lighting_adjustment_inside_mask: "minimal_photometric_alignment_only",
        color_adjustment_inside_mask: "minimal_photometric_alignment_only",

        edge_handling: {
          blend_mode: "poisson_seamless_clone",
          edge_color_matching: true,
          edge_luminance_matching: true,
          no_face_blur: true,
          no_face_smoothing: true
        }
      },

      identity_constraints: {
        face_identity_lock: true,
        face_source_of_truth: "identity_image",

        render_order: [
          "render_full_scene_without_face",
          "insert_face_pixels_exactly",
          "seam_align_face_edges",
          "lock_face_layer"
        ],

        rules: {
          do_not_modify_face_pixels: true,
          do_not_regenerate_face: true,
          do_not_change_face_geometry: true,
          do_not_change_face_expression: true,
          do_not_symmetrize_face: true
        },

        visibility_rules: {
          full_face_visibility: true,
          no_face_occlusion: true
        },

        failure_condition: {
          type: "pixel_integrity_check",
          rule: "If any face pixel differs from identity_image, output is invalid."
        }
      },

      clothing_constraints: {
        extract_clothing_only: true,
        ignore_product_model_identity: true,
        re_render_clothing: true,
        no_clothing_paste: true
      },

      pose_and_body: {
        pose: "standing or walking calmly along a seaside or cliffside boardwalk",
        body_orientation: "natural_three_quarter",
        neck_alignment: "match_identity_image",
        head_rotation: "match_identity_image",
        facial_expression: "exact_from_identity_image"
      },

      interaction_layer: {
        interaction_priority: "secondary_to_identity",

        interaction_scenarios: [
          {
            type: "coastal_interaction",
            description: "hands resting naturally at sides or lightly touching railing, posture relaxed against ocean breeze",
            rules: {
              natural_weight_distribution: true,
              no_pose_stiffness: true,
              no_hand_object_merging: true
            }
          }
        ],

        environment_response: {
          object_contact_feedback: {
            enable: true,
            water_reflection_integration: "reflects_environment_and_body_only",
            shadow_contact: "body_only"
          }
        }
      },

      camera_and_framing: {
        camera_angle: "eye_level",
        focal_length: "cinematic_travel_photography",
        distance: "medium_full_body",
        no_wide_angle: true,
        no_perspective_warp_on_face: true
      },

      scene_composition: {
        environment: "seaside or cliffside boardwalk at golden hour",
        background_elements: [
          "textured wooden boardwalk",
          "ocean water with reflective highlights",
          "distant cliffs or coastline",
          "detailed dynamic sky with depth",
          "clean horizon line"
        ],
        lighting: "soft golden-hour sunlight with balanced cinematic tones",
        background_visibility: "fully_sharp_and_detailed",
        background_blur: "disabled",
        depth_of_field: "deep_focus",
        atmosphere_rules: {
          no_flat_sky: true,
          no_digital_artifacts: true,
          no_over_bright_waves: true,
          no_harsh_shadows: true
        }
      },

      rendering_rules: {
        photorealistic: true,
        identity_layer_locked: true,
        sharp_focus_everywhere: true,
        no_postprocessing_on_face: true
      },

      negative_prompt: [
        "background blur",
        "portrait mode blur",
        "depth blur",
        "flat sky",
        "digital artifacts",
        "over bright waves",
        "harsh shadows",
        "face regeneration",
        "approximate face",
        "beautified face",
        "AI face"
      ]
    },
    aspectRatio: "3:4",
    keywords: [
      "sea", "ocean", "beach", "sunset", "golden hour", "water",
      "samundar", "kinara", "waves", "holiday", "vacation", "sham",
      "lehren", "goa", "maldives", "blue", "sun", "sunlight"
    ]
  },
  {
    id: "aesthetics_template_10",
    name: "Artistic Studio",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_10.webp",
    prompt:
    {
      task: "identity_locked_real_world_close_up_photography",
      theme: "artistic_studio",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          face_asymmetry: "preserved",
          head_shape: "locked"
        },
        forbid: [
          "face morphing",
          "beautification",
          "facial idealization",
          "AI facial averaging"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "physical_light_solution",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "working artistic studio",
        studio_type: "painter / sculptor / mixed-media workspace",
        background_layering: {
          midground: "worktable, stools, unfinished artworks",
          background: "studio walls with paint marks, shelves, and hanging canvases"
        },
        elements: [
          "easel with partially completed canvas",
          "paint-splattered floor",
          "jars with brushes and tools",
          "rolled sketches and papers",
          "raw wooden furniture"
        ],
        lighting: {
          primary_source: "large north-facing window",
          secondary_source: "single practical studio lamp",
          behavior:
            "soft directional daylight mixed with warm practical light",
          shadow_behavior: "uneven, layered, non-dramatic",
          avoid: [
            "studio beauty lighting",
            "cinematic rim lights",
            "perfect symmetry"
          ]
        },
        atmosphere: "slightly dusty air, lived-in workspace"
      },

      camera_simulation: {
        camera_type: "professional mirrorless camera",
        focal_length_mm: 50,
        aperture: "f/4",
        iso: 320,
        shutter_speed: "1/250",
        focus_behavior: "natural optical depth, background readable",
        lens_characteristics: [
          "minor edge softness",
          "natural contrast roll-off",
          "no portrait mode"
        ]
      },

      subject: {
        identity: "exact match to input image",
        framing: "close-up to medium close-up",
        pose: "sitting comfortably on a wooden stool or chair",
        body_language: "relaxed posture, slight forward lean",
        interaction: [
          "one hand holding a paintbrush or sculpting tool",
          "other hand resting on knee or worktable",
          "subtle paint marks on fingers or sleeve"
        ],
        expression: "focused, calm, unposed",
        occlusion:
          "tools or canvas partially framing subject, face fully visible"
      },

      wardrobe_and_accessories: {
        design_level: "professionally designed creative wear",
        style: "functional artistic studio attire",
        materials: [
          "heavy cotton",
          "raw linen",
          "canvas fabric"
        ],
        colors: [
          "off-white",
          "charcoal",
          "muted navy",
          "washed olive"
        ],
        fit: "relaxed and practical",
        accessories: [
          "simple apron or canvas overshirt",
          "leather strap watch",
          "subtle metal ring"
        ],
        fabric_behavior: [
          "natural creases from sitting",
          "minor paint smudges",
          "matte texture under soft light"
        ],
        avoid: [
          "logos",
          "fashion exaggeration",
          "synthetic shine"
        ]
      },

      color_science: {
        profile: "neutral real-world camera profile",
        saturation: "controlled, slightly muted",
        white_balance: "mixed daylight and warm practical light",
        avoid: [
          "cinematic grading",
          "teal-orange",
          "over-saturation"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "controlled",
        symmetry_breaking: true,
        imperfection_level: "subtle",
        details: [
          "uneven light on face",
          "minor exposure imbalance",
          "real skin texture preserved"
        ]
      },

      noise_and_texture: {
        sensor_noise: "subtle ISO grain",
        grain: "fine organic texture",
        surface_detail:
          "visible canvas and wood texture without sharpening"
      },

      post_processing_constraints: {
        remove: [
          "skin smoothing",
          "face reshaping",
          "beauty filters",
          "edge halos"
        ],
        apply: [
          "slight contrast roll-off",
          "minor highlight clipping on bright surfaces",
          "realistic tonal compression"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no portrait mode",
        "no studio beauty lighting",
        "no cinematic effects",
        "no stylized blur",
        "no symmetry enforcement",
        "no artificial props"
      ],

      output_goal:
        "a realistic yet aesthetic close-up photograph where the exact input face is preserved, the person sits comfortably inside a working artistic studio, and interacts naturally with creative tools and environment"
    },
    aspectRatio: "3:4",
    keywords: [
      "art", "studio", "creative", "paint", "painter", "artist",
      "easel", "canvas", "workshop", "drawing", "kala", "rang",
      "brush", "tasveer", "chitrakar", "painting", "messy"
    ]
  },
  {
    id: "aesthetics_template_11",
    name: "Elegant Silk Saree",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_11.webp",
    prompt:
    {
      task: "identity_locked_cultural_editorial_photography",
      theme: "elegant_silk_saree",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          head_shape: "locked",
          face_asymmetry: "preserved"
        },
        forbid: [
          "face morphing",
          "beautification",
          "AI facial averaging",
          "symmetry correction",
          "bridal face stylization"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "natural_light_with_reflective_textile_handling",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "silk_fabric_physics_simulation",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "heritage-inspired real-world setting",
        environment_style: "elegant, calm, culturally grounded",
        spatial_layers: {
          foreground: [
            "stone step edge",
            "wooden pillar detail",
            "saree pallu partially crossing frame"
          ],
          midground: [
            "subject seated or standing gracefully"
          ],
          background: [
            "heritage wall",
            "arched doorway",
            "soft courtyard depth"
          ]
        },
        architectural_elements: [
          "natural stone",
          "carved wood",
          "traditional columns or arches"
        ],
        lighting: {
          source: "natural daylight",
          time_of_day: "late morning or soft afternoon",
          quality: "diffused, directional, calm",
          shadow_behavior: "soft with textile-defined contrast",
          avoid: [
            "golden wedding glow",
            "cinematic haze",
            "spotlight lighting"
          ]
        },
        atmosphere: "graceful, composed, timeless"
      },

      camera_simulation: {
        camera_type: "professional editorial fashion camera",
        focal_length_mm: 50,
        aperture: "f/8",
        iso: 100,
        shutter_speed: "1/250",
        focus_behavior:
          "deep focus preserving fabric and environment detail",
        lens_characteristics: [
          "natural contrast",
          "controlled highlights for silk",
          "no portrait mode blur"
        ]
      },

      subject: {
        identity: "exact input image face",
        framing: "medium shot to medium close-up",
        pose: "graceful, relaxed, culturally natural",
        interaction: [
          "one hand gently holding or adjusting saree pallu",
          "fingers lightly touching silk pleats",
          "body angled naturally toward light source"
        ],
        body_language: "elegant, composed, grounded",
        expression: "soft confidence, calm presence",
        occlusion: [
          "saree fabric framing lower edge",
          "architectural foreground element partially visible"
        ]
      },

      wardrobe_and_accessories: {
        design_level: "luxury handcrafted silk saree",
        saree_style: "traditional elegance with editorial restraint",
        saree_material: [
          "pure silk (Kanchipuram / Banarasi / Tussar-inspired)",
          "authentic weave texture visible"
        ],
        colors: [
          "rich emerald",
          "deep maroon",
          "royal blue",
          "warm gold accents"
        ],
        border_detail:
          "subtle zari or woven border, not oversized",
        fabric_behavior: [
          "natural silk sheen",
          "heavy drape with gravity",
          "soft creases and folds",
          "light reflection varying by angle"
        ],
        blouse: {
          design: "tailored, minimal, elegant",
          material: "silk or raw silk",
          fit: "structured but comfortable"
        },
        accessories: [
          "traditional gold or antique-finish earrings",
          "minimal bangle or bracelet",
          "subtle ring",
          "small bindi (optional, restrained)"
        ],
        interaction_with_clothing: [
          "pallu adjusted naturally",
          "pleats resting on lap or leg",
          "fabric brushing stone or step"
        ],
        avoid: [
          "heavy bridal jewelry",
          "excessive embroidery",
          "plastic shine",
          "costume styling"
        ]
      },

      color_science: {
        profile: "neutral daylight textile-accurate profile",
        contrast: "moderate, fabric-led",
        saturation: "rich but controlled",
        white_balance: "true daylight",
        avoid: [
          "wedding color grading",
          "over-warming",
          "cinematic saturation"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "moderate",
        symmetry_breaking: true,
        imperfection_level: "natural",
        details: [
          "minor silk wrinkles",
          "uneven zari reflection",
          "natural skin texture preserved"
        ]
      },

      noise_and_texture: {
        sensor_noise: "very subtle",
        grain: "fine organic",
        textile_texture:
          "silk weave and zari detail preserved"
      },

      post_processing_constraints: {
        remove: [
          "beauty filters",
          "skin smoothing",
          "face reshaping",
          "glow effects",
          "plastic fabric finish"
        ],
        apply: [
          "textile-accurate contrast",
          "natural highlight roll-off on silk",
          "balanced skin tones"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no beautification",
        "no bridal glow",
        "no cinematic haze",
        "no portrait mode blur",
        "no costume-like styling",
        "no artificial silk shine"
      ],

      output_goal:
        "an elegant, realistic editorial photograph where the exact face identity is preserved, a luxurious silk saree behaves authentically with weight and sheen, accessories remain refined and traditional, the subject gently interacts with fabric and architecture, and the overall image feels timeless, graceful, and genuinely real"
    },
    aspectRatio: "3:4",
    keywords: [
      "saree", "sari", "silk", "traditional", "indian", "ethnic",
      "elegant", "woman", "desi", "festival", "wedding guest", "aurat",
      "ladki", "ma", "mom", "bahu", "shadi wear", "kanjivaram", "pattu"
    ]
  },

  {
    id: "aesthetics_template_13",
    name: "Bohemian Chic",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_13.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in layered bohemian fabrics and patterns, soft evening sunlight, textured studio or artistic street market setting, natural smile, free-spirited hyper realistic image.\nno neon tones, no clutter, no artificial blur, no plastic texture , no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
    keywords: [
      "boho", "bohemian", "chic", "hippie", "free", "travel",
      "colorful", "gypsy", "festival", "nature", "banjara",
      "phool", "flowers", "artsy", "indie", "music festival",
    ]
  },
  {
    id: "aesthetics_template_14",
    name: "Evening Gown Twilight",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_14.webp",
    prompt: {
      task: "identity_locked_virtual_tryon_with_static_face_composite_and_environment_interaction",

      priority_stack: [
        "face_identity_absolute",
        "body_identity",
        "clothing",
        "interaction",
        "environment"
      ],

      identity_priority: "absolute_maximum",

      input_sources: {
        identity_image: "{input_person}",
        clothing_reference: "{second_input_image}"
      },

      face_handling_mode: "foreign_static_face_layer",

      face_authority: {
        source: "identity_image",
        authority_level: "pixel_absolute",
        treat_as_external_asset: true,
        exclude_from_diffusion_graph: true
      },

      face_masking: {
        enable: true,
        mask_source: "identity_image",
        mask_region: "entire_face_forehead_to_chin_ear_to_ear_including_hairline",
        mask_type: "hard_mask_binary",

        mask_behavior: "direct_pixel_transfer",

        generation_inside_mask: "disabled",
        diffusion_inside_mask: "disabled",
        style_transfer_inside_mask: "disabled",
        geometry_adjustment_inside_mask: "disabled",

        lighting_adjustment_inside_mask: "minimal_photometric_alignment_only",
        color_adjustment_inside_mask: "minimal_photometric_alignment_only",

        edge_handling: {
          blend_mode: "poisson_seamless_clone",
          edge_color_matching: true,
          edge_luminance_matching: true,
          no_face_blur: true,
          no_face_smoothing: true
        }
      },

      identity_constraints: {
        face_identity_lock: true,
        face_source_of_truth: "identity_image",

        render_order: [
          "render_full_scene_without_face",
          "insert_face_pixels_exactly",
          "seam_align_face_edges",
          "lock_face_layer"
        ],

        rules: {
          do_not_modify_face_pixels: true,
          do_not_regenerate_face: true,
          do_not_change_face_geometry: true,
          do_not_change_face_expression: true,
          do_not_symmetrize_face: true
        },

        failure_condition: {
          type: "pixel_integrity_check",
          rule: "If any face pixel differs from identity_image, output is invalid."
        }
      },

      clothing_constraints: {
        extract_clothing_only: true,
        ignore_product_model_identity: true,
        re_render_clothing: true,
        no_clothing_paste: true
      },

      pose_and_body: {
        pose: "standing elegantly inside a softly lit ballroom or on a terrace at twilight",
        body_orientation: "graceful_three_quarter",
        neck_alignment: "match_identity_image",
        head_rotation: "match_identity_image",
        facial_expression: "exact_from_identity_image"
      },

      interaction_layer: {
        interaction_priority: "secondary_to_identity",

        interaction_scenarios: [
          {
            type: "elegant_environment_interaction",
            description: "one hand resting naturally on a railing, column, or at the side depending on setting",
            rules: {
              natural_weight_distribution: true,
              no_pose_stiffness: true,
              no_hand_object_merging: true
            }
          }
        ],

        environment_response: {
          object_contact_feedback: {
            enable: true,
            reflection_integration: "subtle_floor_or_surface_reflection_body_only",
            shadow_contact: "body_only"
          }
        }
      },

      camera_and_framing: {
        camera_angle: "eye_level",
        focal_length: "high_end_fashion_photography",
        distance: "medium_full_body",
        no_wide_angle: true,
        no_perspective_warp_on_face: true
      },

      scene_composition: {
        environment: "luxury ballroom interior or terrace at twilight",
        background_elements: [
          "architectural columns or railings",
          "polished marble or stone flooring",
          "warm ambient twilight sky if terrace",
          "subtle surface reflections",
          "rich color contrast lighting"
        ],
        lighting: "soft twilight ambient light with balanced cinematic tones",
        background_visibility: "fully_sharp_and_detailed",
        background_blur: "disabled",
        depth_of_field: "deep_focus",
        atmosphere_rules: {
          no_glare: true,
          no_fantasy_glow: true,
          no_over_saturation: true,
          no_distorted_proportions: true
        }
      },

      rendering_rules: {
        photorealistic: true,
        identity_layer_locked: true,
        sharp_focus_everywhere: true,
        no_postprocessing_on_face: true
      },

      negative_prompt: [
        "background blur",
        "portrait mode blur",
        "depth blur",
        "glare",
        "fantasy glow",
        "over saturation",
        "cartoon look",
        "face regeneration",
        "approximate face",
        "beautified face",
        "AI face",
        "hairstyle change"
      ]
    },
    aspectRatio: "3:4",
    keywords: [
      "gown", "evening", "party", "dress", "elegant", "night",
      "twilight", "fancy", "prom", "ball", "rich", "lamba dress",
      "sundar", "beautiful", "pari", "model", "fashion", "luxury"
    ]
  },
  {
    id: "aesthetics_template_15",
    name: "Modern Casual City",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_15.webp",
    prompt: {
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
          "overall_face_geometry",
        ],
        expression_lock: "calm_confident_editorial",
        symmetry_enforcement: "natural",
        skin_tone_consistency: "exact",
      },

      eyewear_control: {
        state: "single_item_only",
        type: "optical_glasses_or_sunglasses",
        position: "on_face_only",
        duplicate_prevention: "strict",
        interaction_with_eyewear: "none",
      },

      composition: {
        style: "single_continuous_scene",
        camera_position: "front_facing_subject",
        camera_distance: "medium_shot",
        framing: "upper_body_to_thighs",
        camera_angle: "eye_level",
        lens_feel: "environmental_editorial",
        depth_of_field: "infinite_focus_full_scene_sharp",
        focus_plane: "entire_frame",
      },

      subject: {
        presence: "confident_refined_modern",
        posture: "upright_balanced",
        pose: "still_editorial_stance",
        body_orientation: "facing_camera",
        head_position: "neutral_slight_elegant_tilt",
        gaze: "direct_soft_eye_contact",
        hair: "professionally_styled", // I also fixed the typo "m." to something safe
      },
    },
    aspectRatio: "3:4",
    keywords: [
      "city", "casual", "modern", "street", "urban", "daily",
      "lifestyle", "smart", "cool", "outdoor", "sheher", "buildings",
      "busy", "road", "walk", "candid", "coffee run"
    ]
  },
  {
    id: "aesthetics_template_16",
    name: "Vintage 1950s Style",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_16.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a 1950s-inspired dress, vintage car or old café in background, warm muted tones, nostalgic mood, hyper-realistic Raymond heritage tone.\nno digital artifacts, no bright neon, no blur, no modern elements. no background blur, change the hand gestures according to the background, no change in hairstyle.",
    aspectRatio: "3:4",
    keywords: [
      "vintage", "1950s", "retro", "classic", "old", "car",
      "dress", "fashion", "nostalgia", "timeless", "purana",
      "zamana", "retro look", "old school", "antique", "heritage", "retro", "1950s", "old school", "classic", "purana",
      "black and white", "nostalgia", "fashion", "purana zamana",
      "old is gold", "heroine", "actress", "old movie", "cinema"
    ]
  },

  {
    id: "aesthetics_template_18",
    name: "Pastel Professional",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_18.webp",
    prompt:
    {
      task: "identity_locked_high_aesthetic_professional_photography",
      theme: "pastel_professional_enhanced",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          head_shape: "locked",
          face_asymmetry: "preserved"
        },
        forbid: [
          "face morphing",
          "beautification",
          "AI facial averaging",
          "symmetry correction"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "architectural_daylight_simulation",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "fabric_physics_simulation",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "high-end modern professional interior",
        environment_style: "pastel architectural, minimal luxury",
        spatial_layers: {
          foreground: [
            "matte desk surface",
            "architectural edge or railing"
          ],
          midground: [
            "subject seated or standing near workspace"
          ],
          background: [
            "pastel-toned walls",
            "large glass panels",
            "soft geometric architectural forms"
          ]
        },
        design_elements: [
          "rounded pastel columns",
          "muted terrazzo or stone flooring",
          "natural wood accents"
        ],
        lighting: {
          source: "natural daylight",
          entry: "large windows or skylight",
          quality: "soft, even, diffused",
          shadow_behavior: "gentle, realistic",
          avoid: [
            "corporate stock lighting",
            "beauty glow",
            "cinematic contrast"
          ]
        },
        atmosphere: "calm, refined, confident"
      },

      camera_simulation: {
        camera_type: "professional editorial camera",
        focal_length_mm: 50,
        aperture: "f/7.1",
        iso: 100,
        shutter_speed: "1/200",
        focus_behavior: "clean focus with spatial clarity",
        lens_characteristics: [
          "neutral contrast",
          "natural sharpness",
          "no artificial blur"
        ]
      },

      subject: {
        identity: "exact input image face",
        framing: "medium shot",
        pose: "upright, relaxed, composed",
        interaction: [
          "one hand resting on matte desk or railing",
          "other hand adjusting blazer or holding notebook",
          "subtle lean into architectural element"
        ],
        body_language: "confident, approachable, natural",
        expression: "focused, calm, professional",
        occlusion: [
          "foreground desk or railing partially framing subject"
        ]
      },

      wardrobe_and_accessories: {
        design_level: "luxury contemporary designer tailoring",
        styling_concept: "pastel power dressing, understated elegance",
        clothing_layers: [
          "relaxed-structure pastel blazer",
          "fine knit or silk-blend inner top",
          "tailored trousers with soft pleats"
        ],
        materials: [
          "fine wool",
          "matte silk blend",
          "structured cotton twill"
        ],
        colors: [
          "powder blue",
          "soft lilac",
          "pale sage",
          "warm ivory",
          "light stone"
        ],
        fabric_behavior: [
          "clean drape",
          "soft folds at joints",
          "subtle texture visible in light"
        ],
        accessories: [
          "minimal luxury wristwatch",
          "slim metal rings",
          "structured leather portfolio or bag",
          "clean leather belt or subtle chain detail"
        ],
        interaction_with_clothing: [
          "jacket slightly open mid-movement",
          "sleeves gently creased",
          "fabric responding naturally to posture"
        ],
        avoid: [
          "fast-fashion cuts",
          "bold patterns",
          "glossy fabrics",
          "heavy jewelry"
        ]
      },

      color_science: {
        profile: "neutral professional daylight profile",
        contrast: "low to moderate",
        saturation: "soft pastel, controlled",
        white_balance: "true daylight",
        avoid: [
          "over-saturation",
          "stock-photo grading",
          "cinematic palettes"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "moderate",
        symmetry_breaking: true,
        imperfection_level: "subtle and natural",
        details: [
          "uneven wall tones",
          "minor exposure variation",
          "natural skin texture preserved"
        ]
      },

      noise_and_texture: {
        sensor_noise: "very subtle",
        grain: "fine organic",
        surface_texture: "fabric, stone, wood preserved"
      },

      post_processing_constraints: {
        remove: [
          "beauty filters",
          "skin smoothing",
          "face reshaping",
          "glow",
          "over-sharpening"
        ],
        apply: [
          "clean tonal balance",
          "gentle contrast shaping",
          "natural highlight roll-off"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no beautification",
        "no cinematic lighting",
        "no portrait mode blur",
        "no fantasy colors",
        "no stock-photo look"
      ],

      output_goal:
        "a high-aesthetic yet realistic pastel professional portrait where the exact face identity is preserved, designer pastel tailoring and refined accessories elevate the look, the subject interacts naturally with a modern architectural environment, and the image conveys quiet confidence and contemporary professionalism"
    },
    aspectRatio: "3:4",
    keywords: [
      "professional", "office", "business", "casual", "modern",
      "pastel", "smart", "work", "lifestyle", "corporate",
      "daftar", "meeting", "executive", "formal", "career",
      "startup", "entrepreneur", "professional", "office", "work", "pastel", "soft", "clean",
      "corporate", "job", "business", "naukri", "formal", "kaam",
      "boss", "interview", "light color", "elegant", "ceo"
    ]
  },
  {
    id: "aesthetics_template_19",
    name: "Serene Landscape",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_19.webp",
    prompt:
    {
      task: "identity_locked_editorial_environmental_photography",
      theme: "serene_landscape_enhanced",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          head_shape: "locked",
          face_asymmetry: "preserved"
        },
        forbid: [
          "face morphing",
          "beautification",
          "AI facial averaging",
          "symmetry correction"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "natural_light_simulation",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "fabric_physics_simulation",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "open serene natural landscape",
        landscape_layers: {
          foreground: [
            "soft grass",
            "small stones",
            "wild plants brushing frame edge"
          ],
          midground: [
            "person seated near shallow water stream",
            "flat rock or wooden log partially touching water"
          ],
          background: [
            "gentle rolling hills",
            "sparse trees",
            "soft sky gradient"
          ]
        },
        water_element: {
          type: "shallow natural stream",
          behavior: "slow moving, reflective highlights",
          interaction: "water touching hand or feet lightly"
        },
        lighting: {
          source: "natural sunlight",
          time_of_day: "early morning or late afternoon",
          quality: "soft, diffused, clean",
          shadow_behavior: "soft-edged, realistic",
          avoid: [
            "over-glow",
            "cinematic haze",
            "fantasy light rays"
          ]
        },
        atmosphere: "open, breathable, calm"
      },

      camera_simulation: {
        camera_type: "professional outdoor photography camera",
        focal_length_mm: 50,
        aperture: "f/8",
        iso: 100,
        shutter_speed: "1/320",
        focus_behavior: "deep focus with environmental clarity",
        lens_characteristics: [
          "neutral contrast",
          "natural edge softness",
          "no artificial blur"
        ]
      },

      subject: {
        identity: "exact input image face",
        framing: "medium shot",
        pose: "seated comfortably and naturally",
        interaction: [
          "one hand resting in flowing stream",
          "other hand supporting body on rock or grass",
          "bare feet or shoes touching ground naturally"
        ],
        body_language: "relaxed, grounded, open posture",
        expression: "calm, thoughtful, peaceful",
        occlusion: [
          "natural foliage partially crossing foreground",
          "fabric edges overlapping frame naturally"
        ]
      },

      wardrobe_and_accessories: {
        design_level: "high-end minimalist designer wear",
        styling_concept: "quiet luxury, nature-aligned",
        clothing_layers: [
          "lightweight linen overshirt or long tunic",
          "inner soft cotton or silk-blend top",
          "relaxed tailored trousers with natural drape"
        ],
        materials: [
          "washed linen",
          "organic cotton",
          "soft wool blend",
          "raw silk accents"
        ],
        colors: [
          "ivory",
          "sage green",
          "warm beige",
          "muted clay"
        ],
        fabric_behavior: [
          "gentle movement in breeze",
          "soft folds catching sunlight",
          "natural wrinkling and texture"
        ],
        accessories: [
          "handcrafted leather strap watch",
          "minimal metal ring",
          "natural stone or wooden bracelet",
          "soft leather sandals or barefoot feel"
        ],
        interaction_with_clothing: [
          "sleeves loosely rolled",
          "fabric touching water edge",
          "trouser hems brushing grass or stone"
        ],
        avoid: [
          "bold logos",
          "high-gloss finishes",
          "heavy jewelry",
          "urban fashion elements"
        ]
      },

      color_science: {
        profile: "neutral daylight camera profile",
        contrast: "low to moderate",
        saturation: "soft and muted",
        white_balance: "true daylight",
        avoid: [
          "cinematic grading",
          "over-warming",
          "pastel exaggeration"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "moderate",
        symmetry_breaking: true,
        imperfection_level: "natural",
        details: [
          "uneven sunlight patches on fabric",
          "minor exposure variation",
          "natural skin texture retained"
        ]
      },

      noise_and_texture: {
        sensor_noise: "very subtle",
        grain: "fine organic",
        environmental_texture: "grass, stone, water detail preserved"
      },

      post_processing_constraints: {
        remove: [
          "beauty filters",
          "skin smoothing",
          "face reshaping",
          "glow effects",
          "artificial sharpness"
        ],
        apply: [
          "natural tonal balance",
          "gentle contrast shaping",
          "realistic highlight roll-off"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no beautification",
        "no cinematic haze",
        "no dramatic lighting",
        "no portrait mode blur",
        "no stylized fantasy colors",
        "no artificial environment"
      ],

      output_goal:
        "a refined, aesthetically elevated yet realistic serene landscape photograph where the exact face identity is preserved, the subject gently interacts with water and terrain, designer clothing blends naturally with the environment, and the overall image feels calm, breathable, and quietly luxurious"
    },
    aspectRatio: "3:4",
    keywords: [
      "landscape", "nature", "serene", "calm", "outdoor",
      "scenic", "peaceful", "environment", "pahad", "nadi",
      "jungle", "hariyali", "shanti", "tranquil", "natural",
      "open", "fresh air", "hills", "river", "woods", "trees", "landscape", "nature", "serene", "calm", "peace", "sukoon",
      "view", "scenery", "outdoor", "quiet", "pahad", "nadi",
      "river", "hills", "relax", "meditation", "wide shot"
    ]
  },
  {
    id: "aesthetics_template_20",
    name: "Dramatic Studio",
    stackId: "aesthetics",
    imageUrl: "/images/aesthetics_template_20.webp",
    prompt:
    {
      task: "identity_locked_editorial_close_up_photography",
      theme: "dramatic_studio_enhanced",

      identity_control: {
        source: "input_person_image",
        identity_lock: true,
        identity_priority: "absolute",
        identity_weight: 0.95,
        style_weight: 0.05,
        face_recognition_enforced: true,
        facial_landmark_constraints: {
          jawline: "locked",
          chin_shape: "locked",
          eye_distance: "locked",
          nose_width: "locked",
          lip_ratio: "locked",
          head_shape: "locked",
          face_asymmetry: "preserved"
        },
        forbid: [
          "face morphing",
          "beautification",
          "AI face averaging",
          "symmetry correction"
        ]
      },

      rendering_pipeline: [
        "environment_render_first",
        "physical_light_blocking",
        "contrast_sculpting",
        "camera_optics_simulation",
        "identity_projection",
        "subject_environment_interaction",
        "fabric_physics_simulation",
        "micro_imperfection_injection",
        "post_generation_realism_pass"
      ],

      environment: {
        location: "editorial fashion studio",
        studio_character: "dark, textured, dramatic but real",
        spatial_elements: [
          "large fabric backdrops",
          "raw concrete walls",
          "metal stands",
          "wooden blocks or low platforms"
        ],
        background_layers: {
          foreground: "fabric folds or studio prop edges",
          midground: "subject interacting with props",
          background: "textured wall or layered cloth backdrop"
        },
        lighting: {
          primary_source: "directional studio key light",
          light_position: "side or top-side angle",
          secondary_source: "weak bounce or flag-controlled fill",
          shadow_behavior: "hard edges with gradual falloff",
          avoid: [
            "rim glow",
            "beauty dish softness",
            "cinematic haze",
            "perfect symmetry lighting"
          ]
        },
        atmosphere: "tense, quiet, editorial intensity"
      },

      camera_simulation: {
        camera_type: "full-frame professional camera",
        focal_length_mm: 50,
        aperture: "f/5.6",
        iso: 200,
        shutter_speed: "1/250",
        focus_behavior: "sharp face, natural depth falloff",
        lens_characteristics: [
          "high micro-contrast",
          "natural edge softness",
          "no artificial blur"
        ]
      },

      subject: {
        identity: "exact input image face",
        framing: "tight close-up to medium close-up",
        pose: "grounded, asymmetric, deliberate",
        interaction: [
          "one hand gripping heavy fabric",
          "fingers pressing into garment folds",
          "leaning slightly against a studio prop",
          "forearm resting on knee or platform"
        ],
        body_language: "controlled tension, natural weight shift",
        expression: "serious, focused, introspective",
        occlusion: [
          "partial shadow sculpting face",
          "fabric crossing lower frame edge"
        ]
      },

      wardrobe_and_accessories: {
        design_level: "high-fashion editorial, custom-designed",
        clothing_layers: [
          "structured long coat or oversized blazer",
          "inner textured garment with deep folds",
          "tailored trousers or heavy draped fabric"
        ],
        materials: [
          "heavy wool",
          "raw silk",
          "dense cotton twill",
          "leather accents"
        ],
        colors: [
          "deep black",
          "charcoal",
          "dark olive",
          "burnt umber"
        ],
        fabric_behavior: [
          "visible weight and gravity",
          "sharp folds catching directional light",
          "deep shadows inside creases"
        ],
        accessories: [
          "bold metal rings",
          "thick leather cuff or bracelet",
          "statement chain (matte, non-reflective)",
          "structured belt or harness-style element"
        ],
        interaction_with_clothing: [
          "fabric being pulled or compressed by hand",
          "collar adjusted mid-motion",
          "sleeves partially rolled or folded"
        ],
        avoid: [
          "logos",
          "glossy finishes",
          "decorative excess",
          "runway fantasy elements"
        ]
      },

      color_science: {
        profile: "neutral professional camera profile",
        contrast: "moderate-high but controlled",
        saturation: "low",
        white_balance: "neutral to slightly cool",
        avoid: [
          "cinematic grading",
          "teal-orange",
          "over-crushed blacks"
        ]
      },

      realism_enforcement: {
        anti_aesthetic_bias: "moderate-high",
        symmetry_breaking: true,
        imperfection_level: "intentional but subtle",
        details: [
          "uneven shadow edges",
          "minor exposure imbalance",
          "natural skin texture retained"
        ]
      },

      noise_and_texture: {
        sensor_noise: "subtle real ISO grain",
        grain: "fine organic",
        compression_artifacts: "very minimal"
      },

      post_processing_constraints: {
        remove: [
          "beauty filters",
          "skin smoothing",
          "face reshaping",
          "glow",
          "perfect edges"
        ],
        apply: [
          "contrast shaping only",
          "shadow detail preservation",
          "natural highlight roll-off"
        ]
      },

      hard_negative_constraints: [
        "no face change",
        "no beautification",
        "no cinematic haze",
        "no rim glow",
        "no portrait mode",
        "no stylized blur",
        "no fantasy lighting",
        "no symmetry enforcement"
      ],

      output_goal:
        "a high-drama editorial studio photograph where the exact face identity is preserved, the clothing and accessories carry visual weight, the subject physically interacts with fabric and space, and realism is maintained through controlled light, texture, and imperfection"
    },
    aspectRatio: "3:4",
    keywords: [
      "dramatic", "studio", "portrait", "fashion", "editorial",
      "dark", "intense", "serious", "model", "photoshoot",
      "glamour", "high fashion", "moody", "artistic", "professional",
      "lighting", "camera", "photoshoot", "modeling", "studio", "portrait", "dramatic", "intense", "fashion",
      "glamour", "photoshoot", "moody", "artistic", "professional",
      "model", "camera", "lighting", "dramatic", "studio", "dark", "moody", "portrait", "model",
      "photoshoot", "fashion", "cool", "intense", "serious", "gussa",
      "attitude", "shadow", "black", "artistic", "portfolio"
    ]
  },
];

const flexTemplates: Template[] = [
  {
    id: "flex_template_1",
    name: "Bugatti Coastal Drive",
    stackId: "flex",
    imageUrl: "/images/flex_template_1.webp",
    prompt: {
      task: "identity_locked_virtual_tryon_with_static_face_composite_and_environment_interaction",

      priority_stack: [
        "face_identity_absolute",
        "body_identity",
        "clothing",
        "interaction",
        "environment"
      ],

      identity_priority: "absolute_maximum",

      input_sources: {
        identity_image: "{input_person}",
        clothing_reference: "{second_input_image}"
      },

      face_handling_mode: "foreign_static_face_layer",

      face_authority: {
        source: "identity_image",
        authority_level: "pixel_absolute",
        treat_as_external_asset: true,
        exclude_from_diffusion_graph: true
      },

      face_masking: {
        enable: true,
        mask_source: "identity_image",
        mask_region: "entire_face_forehead_to_chin_ear_to_ear_including_hairline",
        mask_type: "hard_mask_binary",

        mask_behavior: "direct_pixel_transfer",

        generation_inside_mask: "disabled",
        diffusion_inside_mask: "disabled",
        style_transfer_inside_mask: "disabled",
        geometry_adjustment_inside_mask: "disabled",

        lighting_adjustment_inside_mask: "minimal_photometric_alignment_only",
        color_adjustment_inside_mask: "minimal_photometric_alignment_only",

        edge_handling: {
          blend_mode: "poisson_seamless_clone",
          edge_color_matching: true,
          edge_luminance_matching: true,
          no_face_blur: true,
          no_face_smoothing: true
        }
      },

      identity_constraints: {
        face_identity_lock: true,
        face_source_of_truth: "identity_image",

        render_order: [
          "render_full_scene_without_face",
          "insert_face_pixels_exactly",
          "seam_align_face_edges",
          "lock_face_layer"
        ],

        rules: {
          do_not_modify_face_pixels: true,
          do_not_regenerate_face: true,
          do_not_change_face_geometry: true,
          do_not_change_face_expression: true,
          do_not_symmetrize_face: true
        },

        failure_condition: {
          type: "pixel_integrity_check",
          rule: "If any face pixel differs from identity_image, output is invalid."
        }
      },

      clothing_constraints: {
        extract_clothing_only: true,
        ignore_product_model_identity: true,
        re_render_clothing: true,
        no_clothing_paste: true
      },

      pose_and_body: {
        pose: "standing beside or seated inside a Bugatti on a scenic coastal highway",
        body_orientation: "confident_three_quarter",
        neck_alignment: "match_identity_image",
        head_rotation: "match_identity_image",
        facial_expression: "exact_from_identity_image"
      },

      interaction_layer: {
        interaction_priority: "secondary_to_identity",

        interaction_scenarios: [
          {
            type: "luxury_vehicle_interaction",
            description: "one hand resting on the Bugatti door, steering wheel, or roofline, the other relaxed or adjusting suit jacket",
            rules: {
              natural_weight_distribution: true,
              no_hand_object_merging: true,
              no_pose_stiffness: true
            }
          }
        ],

        environment_response: {
          object_contact_feedback: {
            enable: true,
            car_reflection_integration: "reflects_environment_and_body_only",
            shadow_contact: "body_and_vehicle_only"
          }
        }
      },

      camera_and_framing: {
        camera_angle: "eye_level",
        focal_length: "standard_automotive_photography",
        distance: "medium_full_body",
        no_wide_angle: true,
        no_perspective_warp_on_face: true
      },

      scene_composition: {
        environment: "scenic coastal highway",
        hero_object: "Bugatti hypercar",
        background_elements: [
          "coastal cliffs",
          "ocean visible in distance",
          "winding asphalt road",
          "guardrails and road markings",
          "clear horizon line"
        ],
        lighting: "natural sunlight with clean reflections on polished metal",
        background_visibility: "fully_sharp_and_detailed",
        background_blur: "disabled",
        depth_of_field: "deep_focus",
        atmosphere_rules: {
          no_motion_blur: true,
          no_fantasy_reflections: true,
          no_cartoon_look: true,
          no_harsh_shadows: true
        }
      },

      rendering_rules: {
        photorealistic: true,
        identity_layer_locked: true,
        sharp_focus_everywhere: true,
        no_postprocessing_on_face: true
      },

      negative_prompt: [
        "motion blur",
        "fantasy reflections",
        "cartoon style",
        "harsh shadows",
        "blurred background",
        "portrait mode blur",
        "depth blur",
        "face regeneration",
        "approximate face",
        "beautified face",
        "AI face"
      ]
    },
    aspectRatio: "3:4",
    keywords: [
      "bugatti", "car", "supercar", "rich", "luxury", "drive", "gadi",
      "expensive", "flex", "money", "blue car", "fast", "road", "trip",
      "speed", "billionaire"
    ]
  },
  {
    id: "flex_template_2",
    name: "Luxury Superbike",
    stackId: "flex",
    imageUrl: "/images/flex_template_2.webp",
    prompt:
    {
      task: "absolute_identity_and_body_locked_real_world_editorial_photography",
      theme: "luxury_superbike_high_flex_final_locked_halfbody",

      global_lock_policy: {
        lock_everything_except_person: true,
        person_is_only_dynamic_element: true
      },

      identity_and_body_control: {
        source: "input_person_image",
        priority_order: [
          "face_identity",
          "facial_structure",
          "micro_facial_features",
          "body_structure",
          "natural_pose"
        ],

        face_identity_lock: {
          enabled: true,
          identity_weight: 0.98,
          style_weight: 0.02,
          face_recognition_enforced: true,
          facial_landmark_constraints: "absolute_hard_lock",
          preserve_asymmetry: true,
          forbid: [
            "beautification",
            "symmetry_correction",
            "feature_enhancement",
            "face_morphing",
            "skin_smoothing"
          ]
        },

        body_structure_analysis: {
          derive_from_input: true,
          calculate: [
            "shoulder_width",
            "torso_length",
            "arm_length",
            "neck_length",
            "posture_bias"
          ],
          respect_real_proportions: true,
          no_model_scaling: true,
          no_body_retargeting: true
        }
      },

      accessory_consistency_control: {
        derive_from_input_image: true,
        eyewear_policy: {
          if_input_has_glasses: {
            preserve_exact_glasses: true,
            do_not_add_new_glasses: true,
            do_not_replace_style: true
          },
          if_input_has_no_glasses: {
            do_not_add_glasses: true
          }
        },
        hard_prevent: [
          "duplicate_eyewear",
          "ai_invented_frames",
          "lens_tint_changes"
        ]
      },

      rendering_pipeline: [
        "environment_render_first_locked",
        "real_world_light_solution_locked",
        "camera_physics_simulation",
        "identity_projection_strict",
        "micro_facial_detail_preservation",
        "body_structure_projection",
        "subject_vehicle_environment_interaction",
        "fabric_physics_realistic",
        "imperfection_pass",
        "minimal_post_processing"
      ],

      environment: {
        lock: true,
        location: "elite urban-superbike zone",
        style: "ultra-luxury automotive editorial realism",
        architectural_elements: [
          "modern glass-and-concrete building",
          "polished stone plaza",
          "minimal metal railings"
        ],
        color_palette_lock: [
          "charcoal",
          "stone grey",
          "matte black",
          "steel silver"
        ],
        background_behavior: {
          clearly_visible: true,
          no_fake_blur: true,
          scale_and_perspective_correct: true
        },
        details: {
          ground: "clean stone or asphalt with subtle texture",
          reflections: "soft architectural reflections",
          depth: "visible layers of urban space"
        }
      },

      vehicle: {
        lock: true,
        type: "luxury superbike",
        style_lock: true,
        color_lock: "factory_original_only",
        finish_lock: "real_paint_and_metal_only",
        state: "parked prominently",
        visibility: "entire bike visible in frame",
        details: [
          "exposed engine components",
          "precision-machined metal parts",
          "real brake discs and calipers",
          "authentic tire tread"
        ],
        avoid: [
          "concept_bike_design",
          "cgi_gloss",
          "color_changes",
          "aftermarket_visual_mods"
        ]
      },

      camera_simulation: {
        camera_type: "real full-frame camera",
        focal_length_mm: 35,
        aperture: "f/8",
        iso: 100,
        shutter_speed: "1/400",

        framing: {
          shot_type: "half_body",
          composition: "person_and_superbike_balanced",
          subject_height_in_frame: "50_to_65_percent",
          face_clearly_visible: true,
          eye_level: true
        },

        field_of_view_behavior: {
          wide_but_natural: true,
          no_face_distortion: true,
          no_body_warping: true
        },

        behavior: [
          "sharp facial plane",
          "entire bike readable",
          "environment fully visible",
          "no portrait_mode_blur"
        ]
      },

      subject: {
        identity: "exact input face",
        pose: "confident half-body stance or seated sideways on bike",
        interaction: [
          "one hand gripping handlebar or resting firmly on fuel tank",
          "other hand adjusting glove, jacket cuff, or watch",
          "body leaning naturally into bike with real weight transfer",
          "foot grounded with realistic stance width"
        ],
        expression: "calm dominance, unforced confidence",
        gaze: "direct or slightly off-axis",
        micro_details: [
          "natural skin texture",
          "real eye size",
          "no facial exaggeration"
        ]
      },

      wardrobe_and_accessories: {
        lock_style: true,
        lock_color_palette: true,
        style: "high-flex luxury riding editorial",
        clothing_layers: [
          "statement luxury leather or technical riding jacket",
          "designer inner layer (silk-knit or premium tee)",
          "tailored riding trousers or premium denim"
        ],
        materials: [
          "full-grain leather",
          "technical performance fabric",
          "matte metal hardware"
        ],
        behavior: [
          "natural leather creasing",
          "jacket tension at shoulders and elbows",
          "minor wind interaction"
        ],
        accessories: {
          watch: "high-end luxury watch (preserve if present)",
          gloves: "premium riding gloves (only if present in input)",
          helmet: "present only if present in input image"
        },
        avoid: [
          "random_accessory_addition",
          "style_drift",
          "cheap_shine",
          "overdesigned_race_costume"
        ]
      },

      color_science: {
        lock: true,
        profile: "neutral daylight",
        contrast: "moderate-high but controlled",
        saturation: "realistic with luxury depth",
        skin_tone_policy: "match_input_exactly"
      },

      imperfection_pass: {
        add: [
          "minor exposure imbalance",
          "non-perfect reflections on metal surfaces",
          "natural shadow transitions",
          "real skin micro-texture"
        ]
      },

      post_processing_constraints: {
        remove: [
          "beauty_filters",
          "face_reshaping",
          "over_sharpening",
          "glow"
        ]
      },

      hard_negative_constraints: [
        "NO_face_change",
        "NO_facial_feature_change",
        "NO_beautification",
        "NO_body_change",
        "NO_environment_change",
        "NO_vehicle_change",
        "NO_ai_polish"
      ],

      output_goal:
        "a high-flex, half-body luxury superbike editorial photograph where the face is clearly visible and instantly recognizable as the same person from the input image, designer clothing and accessories amplify power and status, the subject physically interacts with the superbike and environment, and everything except the person remains fully locked in color, style, and structure"
    }
    ,
    aspectRatio: "3:4",
    keywords: [
      "luxury", "superbike", "editorial", "fashion", "motorcycle",
      "leather", "riding gear", "power", "status", "confidence", "bike", "superbike", "motorcycle", "rider", "helmet", "race",
      "fast", "cool", "biker", "sports bike", "ducati", "kawasaki",
      "hayabusa", "bhagana", "road trip", "jacket", "speed", "racing"
    ]
  },
  {
    id: "flex_template_3",
    name: "Ice Rink Elegance",
    stackId: "flex",
    imageUrl: "/images/flex_template_3.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects, ensure the output figure’s face matches sharply with the input figure’s face while preserving the exact chin shape and jawline without rounding, ultra-realistic photo of the person from the input image gliding across a real indoor or outdoor ice rink while wearing a stylish winter outfit, the person looks toward the camera with the same facial structure and same hairstyle as the input image including accurate jawline, identical eyes, nose, lips, eyebrows, identical hairline, identical hair length, identical hair density, identical parting, natural flyaways, and natural skin texture, the hairstyle must not be changed, replaced, stylized, or idealized in any way, bring the person slightly closer to the camera, the background MUST NOT be blurry and must show the ice rink boards, railings, seating, lights, architectural structure, and distant skaters clearly and sharply with no portrait-mode bokeh, ensure every object in the environment is crisp, detailed, and fully visible, soft white winter lighting with realistic reflections on the ice surface that are even, natural, and physically consistent across the person and the environment with clean and controlled reflections and no overexposure or artificial glow, the person interacts naturally with the scene with balanced skating posture, knees slightly bent, arms positioned realistically for glide and stability, and appropriate hand gestures that are not posed or static, clothing is realistic winter wear including a wool coat, gloves, scarf, and layered fabrics with visible texture and subtle frost consistent with cold conditions, hyperrealistic lifestyle photography with a serene and elegant mood, 8k details, and no distortions, NEGATIVES: no blurry background, no portrait mode blur, no depth blur, no bokeh, no soft focus, no blurry objects, no unclear environment, no out-of-focus areas, no low resolution, no low quality, no noise, no pixelation, no warped background, no distortions, no stretched objects, no incorrect scale, no bad proportions, no broken anatomy, no inaccurate facial structure, no rounding of the jawline, no wrong jawline, no warped eyes, no mismatched eyes, no deformed nose, no incorrect lips, no plastic skin, no overly smoothed skin, no artificial texture, no altered face, no face morphing, no hairstyle change, no hair replacement, no fantasy snow, no exaggerated frost, no messy reflections, no extra fingers, no missing fingers, no fused hands, no duplicate limbs, no hand deformations, no finger artifacts, no AI artifacts, no jpeg artifacts, no halo, no glow outline, no bad mask, no chromatic aberration, no inconsistent lighting, no overexposed, no underexposed, no harsh shadows, no lighting mismatch, no cartoon style, no 3d render look, no waxy skin, no fake smile, no dead eyes, no glowing eyes, no asymmetrical eyes, no duplicate face, no merged face, no misaligned face, no floating objects, no object clipping, no misplaced shadows, no repeated textures, no fabric distortions, no clothing artifacts, no watermark, no text, no signature, no logo, no overlays, no UI elements, no nsfw, no nudity, no gore, no horror elements.",    aspectRatio: "3:4",
    keywords: [
      "ice rink", "skating", "winter", "elegance", "grace", "cold",
      "fashion", "coat", "scarf", "gloves", "frost", "snow", "chill",
      "style", "figure skating", "ice", "skate", "winter", "rink", "cold", "snow", "luxury",
      "sport", "fun", "barf", "holiday", "skating", "white",
      "frozen", "dance"
    ]

  },
  {
    id: "flex_template_4",
    name: "Deep Sea Diver",
    stackId: "flex",
    imageUrl: "/images/flex_template_4.webp",
    prompt:
    {
      task: "absolute_identity_and_body_locked_real_world_editorial_photography",
      theme: "deep_sea_diver_elite_flex_final_locked_halfbody",

      global_lock_policy: {
        lock_everything_except_person: true,
        person_is_only_dynamic_element: true
      },

      identity_and_body_control: {
        source: "input_person_image",
        priority_order: [
          "face_identity",
          "facial_structure",
          "micro_facial_features",
          "body_structure",
          "natural_pose"
        ],

        face_identity_lock: {
          enabled: true,
          identity_weight: 0.99,
          style_weight: 0.01,
          face_recognition_enforced: true,
          facial_landmark_constraints: "absolute_hard_lock",
          preserve_asymmetry: true,
          forbid: [
            "beautification",
            "symmetry_correction",
            "feature_enhancement",
            "face_morphing",
            "skin_smoothing"
          ]
        },

        body_structure_analysis: {
          derive_from_input: true,
          calculate: [
            "shoulder_width",
            "torso_length",
            "arm_length",
            "neck_length",
            "posture_bias"
          ],
          respect_real_proportions: true,
          no_model_scaling: true,
          no_body_retargeting: true
        }
      },

      accessory_consistency_control: {
        derive_from_input_image: true,
        hard_prevent: [
          "duplicate_masks",
          "ai_invented_facegear",
          "lens_shape_changes"
        ]
      },

      rendering_pipeline: [
        "environment_render_first_locked",
        "deep_ocean_light_physics_solution",
        "underwater_camera_physics",
        "identity_projection_strict",
        "micro_facial_detail_preservation",
        "body_structure_projection",
        "subject_environment_interaction",
        "fluid_dynamics_and_gear_physics",
        "imperfection_pass",
        "minimal_post_processing"
      ],

      environment: {
        lock: true,
        location: "elite deep-sea expedition zone",
        style: "real deep ocean exploration realism",
        depth_level: "advanced human-accessible depth",
        environment_flex_elements: [
          "research submersible partially visible",
          "deep-sea lighting rig mounted on structure",
          "anchored exploration cables"
        ],
        color_palette_lock: [
          "deep ocean blue",
          "pressure-dark teal",
          "steel grey",
          "subtle cyan highlights"
        ],
        details: {
          water: "dense particulate matter, plankton, micro debris",
          light: "focused exploration lamps cutting through darkness",
          seafloor: "rocky formations, sediment clouds, metal structures",
          scale: "vast depth visible beyond subject"
        }
      },

      camera_simulation: {
        camera_type: "professional deep-sea underwater camera housing",
        focal_length_mm: 35,
        aperture: "f/8",
        iso: 500,
        shutter_speed: "1/250",

        framing: {
          shot_type: "half_body",
          composition: "diver_dominant_with_massive_environment",
          subject_height_in_frame: "55_to_70_percent",
          face_clearly_visible: true,
          eye_level: true
        },

        behavior: [
          "natural underwater softness",
          "sharp face through mask",
          "depth falloff due to water density",
          "no artificial blur"
        ]
      },

      subject: {
        identity: "exact input face visible through high-end mask",
        pose: "controlled neutral-buoyancy posture",
        interaction: [
          "one hand gripping reinforced dive cable or structure",
          "other hand adjusting advanced wrist-mounted dive computer",
          "subtle fin movement maintaining position",
          "air bubbles escaping naturally from regulator"
        ],
        expression: "focused, calm, elite professionalism",
        gaze: "forward or toward exploration equipment"
      },

      wardrobe_and_accessories: {
        lock_style: true,
        lock_color_palette: true,
        style: "elite expedition-grade diving system",
        clothing_layers: [
          "custom professional deep-sea diving suit",
          "reinforced thermal underlayer",
          "advanced buoyancy control vest"
        ],
        materials: [
          "high-density neoprene",
          "carbon-reinforced composite panels",
          "brushed titanium fittings"
        ],
        flex_accessories: [
          "high-end dive computer with glowing data",
          "titanium pressure-rated oxygen system",
          "precision depth gauge",
          "integrated helmet lighting module"
        ],
        behavior: [
          "hoses floating naturally",
          "fabric tension responding to pressure",
          "metal surfaces slightly dulled by seawater"
        ],
        avoid: [
          "sci_fi_designs",
          "fantasy_suits",
          "neon_colors",
          "overstyled_costumes"
        ]
      },

      color_science: {
        lock: true,
        profile: "deep_water_corrected_neutral",
        contrast: "moderate",
        saturation: "depth-accurate",
        skin_tone_policy: "match_input_with_underwater_absorption"
      },

      imperfection_pass: {
        add: [
          "backscatter particles",
          "non-uniform lamp falloff",
          "sediment movement",
          "minor color absorption artifacts"
        ]
      },

      post_processing_constraints: {
        remove: [
          "beauty_filters",
          "face_reshaping",
          "over_sharpening",
          "cinematic_glow"
        ]
      },

      hard_negative_constraints: [
        "NO_face_change",
        "NO_facial_feature_change",
        "NO_beautification",
        "NO_body_change",
        "NO_environment_change",
        "NO_fantasy_elements",
        "NO_ai_polish"
      ],

      output_goal:
        "a high-flex, half-body deep-sea diver editorial photograph where the face is unmistakably the same as the input person, elite expedition-grade gear and instruments signal extreme status, the subject physically interacts with cables, equipment, and water physics, the environment conveys immense depth and pressure, and the image feels like a real elite exploration photograph—not an AI fantasy"
    }
    ,
    aspectRatio: "3:4",
    keywords: [
      "diver", "deep sea", "ocean", "underwater", "exploration",
      "adventure", "scuba", "marine", "dive gear", "submarine",
      "aquatic", "water", "diving", "coral reef", "sea life",
      "underwater photography", "freediving", "snorkeling",
      "deep dive", "ocean life", "diver", "ocean", "sea", "underwater", "scuba", "swim", "water",
      "paani", "adventure", "deep", "tairna", "fish", "explore",
      "samundar ke niche", "oxygen", "marine"
    ]
  },
  {
    id: "flex_template_5",
    name: "Private Jet Lifestyle",
    stackId: "flex",
    imageUrl: "/images/flex_template_5.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing next to a private jet door and leaning back slightly, one hand in pocket, dressed in formal-casual attire — blazer and sunglasses, golden sunset light, tarmac reflections, refined Raymond elegance and cinematic composition, background objects should be clearly visible with no blurness(most important). no glare, no distorted jet, no cartoon tones, no excessive brightness.no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
    keywords: [
      "private jet", "luxury", "travel", "wealth", "rich", "expensive",
      "lifestyle", "aviation", "pilot", "airplane", "flight", "sky",
      "business", "success", "billionaire", "jet", "plane", "aircraft",
      "fly", "travel", "luxury", "rich", "wealth", "business",
      "expensive", "first class", "pilot", "sky", "airline",
      "boarding", "takeoff", "landing", "jet", "private jet", "plane", "flight", "luxury", "rich", "travel",
      "airport", "ameer", "business", "hawai jahaz", "udna", "fly", "vip",
      "ceo", "trip", "vacation", "millionaire"
    ]
  },
  {
    id: "flex_template_6",
    name: "Yacht Life",
    stackId: "flex",
    imageUrl: "/images/flex_template_6.webp",
    prompt: {
      task: "identity_locked_virtual_tryon_with_static_face_composite_and_environment_interaction",

      priority_stack: [
        "face_identity_absolute",
        "body_identity",
        "clothing",
        "interaction",
        "environment"
      ],

      identity_priority: "absolute_maximum",

      input_sources: {
        identity_image: "{input_person}",
        clothing_reference: "{second_input_image}"
      },

      face_handling_mode: "foreign_static_face_layer",

      face_authority: {
        source: "identity_image",
        authority_level: "pixel_absolute",
        treat_as_external_asset: true,
        exclude_from_diffusion_graph: true
      },

      face_masking: {
        enable: true,
        mask_source: "identity_image",
        mask_region: "entire_face_forehead_to_chin_ear_to_ear_including_hairline",
        mask_type: "hard_mask_binary",

        mask_behavior: "direct_pixel_transfer",

        generation_inside_mask: "disabled",
        diffusion_inside_mask: "disabled",
        style_transfer_inside_mask: "disabled",
        geometry_adjustment_inside_mask: "disabled",

        lighting_adjustment_inside_mask: "minimal_photometric_alignment_only",
        color_adjustment_inside_mask: "minimal_photometric_alignment_only",

        edge_handling: {
          blend_mode: "poisson_seamless_clone",
          edge_color_matching: true,
          edge_luminance_matching: true,
          no_face_blur: true,
          no_face_smoothing: true
        }
      },

      identity_constraints: {
        face_identity_lock: true,
        face_source_of_truth: "identity_image",

        render_order: [
          "render_full_scene_without_face",
          "insert_face_pixels_exactly",
          "seam_align_face_edges",
          "lock_face_layer"
        ],

        rules: {
          do_not_modify_face_pixels: true,
          do_not_regenerate_face: true,
          do_not_change_face_geometry: true,
          do_not_change_face_expression: true,
          do_not_symmetrize_face: true
        },

        failure_condition: {
          type: "pixel_integrity_check",
          rule: "If any face pixel differs from identity_image, output is invalid."
        }
      },

      clothing_constraints: {
        extract_clothing_only: true,
        ignore_product_model_identity: true,
        re_render_clothing: true,
        no_clothing_paste: true
      },

      pose_and_body: {
        pose: "standing relaxed on a luxury yacht deck",
        body_orientation: "natural_three_quarter",
        neck_alignment: "match_identity_image",
        head_rotation: "match_identity_image",
        facial_expression: "exact_from_identity_image"
      },

      interaction_layer: {
        interaction_priority: "secondary_to_identity",

        interaction_scenarios: [
          {
            type: "yacht_interaction",
            description: "one hand resting casually on the yacht railing or deck surface, the other naturally positioned or lightly adjusting linen shirt or summer blazer",
            rules: {
              natural_weight_distribution: true,
              no_hand_object_merging: true,
              no_pose_stiffness: true
            }
          }
        ],

        environment_response: {
          object_contact_feedback: {
            enable: true,
            water_reflection_integration: "reflects_environment_and_body_only",
            shadow_contact: "body_and_deck_only"
          }
        }
      },

      camera_and_framing: {
        camera_angle: "eye_level",
        focal_length: "85mm_portrait_equivalent",
        distance: "medium_full_body",
        no_wide_angle: true,
        no_perspective_warp_on_face: true
      },

      scene_composition: {
        environment: "luxury yacht deck in open ocean",
        hero_object: "luxury yacht structure",
        background_elements: [
          "calm blue ocean",
          "clear horizon line",
          "sunlight reflections on water",
          "white yacht surfaces",
          "teak deck textures"
        ],
        lighting: "natural sunlight with clean cinematic tones",
        background_visibility: "fully_sharp_and_detailed",
        background_blur: "disabled",
        depth_of_field: "deep_focus",
        atmosphere_rules: {
          no_haze: true,
          no_overexposure: true,
          no_unrealistic_waves: true
        }
      },

      rendering_rules: {
        photorealistic: true,
        identity_layer_locked: true,
        sharp_focus_everywhere: true,
        no_postprocessing_on_face: true
      },

      negative_prompt: [
        "haze",
        "overexposure",
        "blurred background",
        "portrait mode blur",
        "depth blur",
        "unrealistic waves",
        "hairstyle change",
        "face regeneration",
        "approximate face",
        "beautified face",
        "AI face"
      ]
    },
    aspectRatio: "3:4",
    keywords: [
      "yacht", "boat", "ocean", "sea", "luxury", "travel", "wealth",
      "rich", "expensive", "lifestyle", "sailing", "vacation", "cruise",
      "sunshine", "blue water", "yacht", "boat", "sea", "ocean",
      "luxury", "travel", "rich", "wealth", "expensive", "lifestyle",
      "sailing", "vacation", "cruise", "sun", "blue water",
      "adventure", "island", "holiday", "sail", "deck", "marine", "yacht", "boat", "ship", "sea", "ocean", "luxury", "rich", "party",
      "vacation", "cruise", "paani", "samundar", "holiday", "sailing",
      "captain", "deck", "summer"
    ]
  },
  {
    id: "flex_template_7",
    name: "City Night Supercar",
    stackId: "flex",
    imageUrl: "/images/flex_template_7.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} in a black or navy blazer, leaning on a Lamborghini or McLaren under neon city lights which are clearly visible, cinematic reflections on car surfaces, confident luxury tone, editorial realism. no cartoon neon, no fantasy lighting, no distortion, no change in hairstyle , no blur background, change the hand gestures accordingly",
    aspectRatio: "3:4",
    keywords: [
      "supercar", "lamborghini", "mclaren", "car", "night", "city",
      "neon", "luxury", "wealth", "rich", "expensive", "lifestyle",
      "drive", "speed", "fast", "urban", "flex", "supercar", "car", "lamborghini",
      "mclaren", "night", "city", "neon", "luxury", "rich",
      "wealth", "expensive", "lifestyle", "drive", "speed",
      "fast", "urban", "flex", "road", "ride", "travel",
      "automobile", "gadi", "race", "power", "status", "supercar", "car", "lamborghini", "night", "city", "neon", "drive",
      "gadi", "fast", "cool", "tashan", "club", "party", "long drive",
      "rich boy", "sports car"
    ]
  },
  {
    id: "flex_template_8",
    name: "Desert ATV Adventure",
    stackId: "flex",
    imageUrl: "/images/flex_template_8.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} sitting inside an ATV across a wide desert landscape, wearing realistic outdoor adventure clothing (without helmet) that fits their body naturally, sharp sunlight, sand trails, heat shimmer,clearly visible dunes in the background, captured in static real photography style.no altered face, no change in hairstyle, no pasted clothes, no blur background, no oversaturated colors, adjust body posture and hand gestures naturally for an ATV rider.",
    aspectRatio: "3:4",
    keywords: [
      "ATV", "desert", "adventure", "offroad", "vehicle", "sand",
      "outdoors", "exploration", "ride", "travel", "fun", "sport",
      "dunes", "sunshine", "atv", "desert", "offroad", "vehicle",
      "sand", "outdoors", "adventure", "exploration", "ride",
      "travel", "fun", "sport", "dunes", "sunshine", "4x4",
      "all terrain", "quad bike", "mud", "trail", "nature",
      "wilderness", "explore", "atv", "desert", "sand", "offroad",
      "vehicle", "adventure", "travel", "fun", "ride", "explore",
      "dunes", "sun", "outdoors", "nature", "quad bike",
      "all terrain vehicle", "atv", "quad bike", "desert", "sand", "offroad", "adventure",
      "safari", "dubai", "ride", "ret", "jeep", "4x4", "action",
      "dunes", "biking"
    ]
  },
  {
    id: "flex_template_9",
    name: "Sunset Convertible Drive",
    stackId: "flex",
    imageUrl: "/images/flex_template_9.webp",
    prompt:
    {
      task: "absolute_identity_and_body_locked_real_world_editorial_photography",
      theme: "sunset_convertible_parked_ultra_max_flex_final_locked_halfbody_face_to_camera",

      global_lock_policy: {
        lock_everything_except_person: true,
        person_is_only_dynamic_element: true
      },

      identity_and_body_control: {
        source: "input_person_image",
        priority_order: [
          "face_identity",
          "facial_structure",
          "micro_facial_features",
          "body_structure",
          "natural_pose"
        ],
        face_identity_lock: {
          enabled: true,
          identity_weight: 0.995,
          style_weight: 0.005,
          face_recognition_enforced: true,
          facial_landmark_constraints: "absolute_hard_lock",
          preserve_asymmetry: true,
          forbid: [
            "beautification",
            "symmetry_correction",
            "feature_enhancement",
            "face_morphing",
            "skin_smoothing"
          ]
        },
        body_structure_analysis: {
          derive_from_input: true,
          respect_real_proportions: true,
          no_model_scaling: true,
          no_body_retargeting: true
        }
      },

      accessory_consistency_control: {
        derive_from_input_image: true,
        eyewear_policy: {
          if_input_has_eyewear: {
            preserve_exact_eyewear: true,
            do_not_add_new_eyewear: true,
            do_not_replace_style: true
          },
          if_input_has_no_eyewear: {
            do_not_add_eyewear: true
          }
        },
        hard_prevent: [
          "duplicate_eyewear",
          "ai_invented_frames",
          "lens_tint_changes"
        ]
      },

      rendering_pipeline: [
        "environment_render_first_locked",
        "sunset_golden_hour_light_physics_locked",
        "camera_physics_simulation",
        "identity_projection_strict",
        "micro_facial_detail_preservation",
        "body_structure_projection",
        "subject_vehicle_environment_interaction",
        "wind_motion_and_fabric_dynamics",
        "imperfection_pass",
        "minimal_post_processing"
      ],

      environment: {
        lock: true,
        location: "exclusive coastal cliffside road turnout",
        style: "ultra-elite golden-hour roadside lifestyle",
        environment_layers: {
          foreground: [
            "parked convertible aligned parallel to road edge",
            "painted road shoulder line",
            "low stone barrier or guardrail"
          ],
          midground: [
            "luxury convertible parked at roadside",
            "subject positioned in or beside the parked car"
          ],
          background: [
            "open ocean horizon",
            "coastal cliffs and winding road",
            "setting sun partially below horizon",
            "soft marine haze catching light"
          ]
        },
        color_palette_lock: [
          "sunset amber",
          "burnt gold",
          "soft rose",
          "deep navy shadows",
          "metallic car tones"
        ],
        lighting: {
          source: "natural golden-hour sunlight",
          time_of_day: "sunset",
          behavior:
            "low-angle warm light with long shadows and natural flare",
          avoid: [
            "hdr skies",
            "cinematic glow",
            "artificial grading"
          ]
        }
      },

      vehicle: {
        lock: true,
        type: "ultra-luxury convertible grand tourer",
        style_lock: true,
        color_lock: "factory_original_only",
        finish_lock: "real_paint_leather_metal_only",
        roof_state: "fully_open",
        vehicle_state: "parked_engine_off",
        details: [
          "front wheels turned slightly toward curb",
          "hand-stitched leather interior visible",
          "brushed metal controls catching sunset light",
          "subtle road dust on lower panels"
        ],
        avoid: [
          "concept_designs",
          "aftermarket_bodykits",
          "cgi_gloss",
          "fantasy_reflections"
        ]
      },

      camera_simulation: {
        camera_type: "real high-end lifestyle editorial camera",
        focal_length_mm: 35,
        aperture: "f/8",
        iso: 100,
        shutter_speed: "1/500",
        framing: {
          shot_type: "half_body_with_parked_convertible",
          composition: "subject_car_sunset_roadside_balance",
          subject_height_in_frame: "55_to_65_percent",
          vehicle_visibility: "full_side_and_cabin_visible",
          face_clearly_visible: true,
          eye_level: true
        },
        behavior: [
          "sharp facial plane",
          "parked car clearly readable",
          "natural optical depth",
          "no portrait_mode_blur"
        ]
      },

      subject: {
        identity: "exact input face",
        pose: "relaxed roadside luxury posture",
        interaction: [
          "one arm resting on open door or windshield frame",
          "other hand adjusting luxury watch or collar",
          "body leaning comfortably against parked car",
          "hair and fabric moving gently in coastal breeze",
          "weight shifted casually onto one leg"
        ],
        expression: "calm confidence, composed presence",
        gaze:
          "directly toward camera (face squarely oriented, eyes clearly visible)"
      },

      wardrobe_and_accessories: {
        lock_style: true,
        lock_color_palette: true,
        style: "ultra-max-flex sunset roadside couture",
        clothing_layers: [
          "tailored lightweight blazer or silk jacket",
          "designer silk shirt or fine-knit polo",
          "precision-tailored trousers or premium denim"
        ],
        materials: [
          "Italian silk",
          "linen-silk blend",
          "lightweight cashmere",
          "soft leather accents"
        ],
        accessories: [
          "high-complication luxury wristwatch",
          "designer sunglasses only if present in input",
          "minimal high-jewelry ring or chain"
        ]
      },

      color_science: {
        lock: true,
        profile: "true golden-hour daylight",
        contrast: "moderate",
        saturation: "warm yet restrained",
        skin_tone_policy: "match_input_exactly"
      },

      imperfection_pass: {
        add: [
          "natural lens flare from low sun angle",
          "minor exposure imbalance due to backlighting",
          "non-perfect paint reflections",
          "real skin texture under warm light"
        ]
      },

      post_processing_constraints: {
        remove: [
          "beauty_filters",
          "face_reshaping",
          "over_sharpening",
          "cinematic_effects"
        ]
      },

      hard_negative_constraints: [
        "NO_face_change",
        "NO_facial_feature_change",
        "NO_beautification",
        "NO_body_change",
        "NO_environment_change",
        "NO_vehicle_change",
        "NO_ai_polish"
      ],

      output_goal:
        "an ultra-maximum-flex sunset convertible roadside editorial photograph with the car parked at the side of the road, the subject facing directly toward the camera so the identity is unmistakable, luxury fashion and accessories elevated, natural interaction with the parked convertible and coastal environment, and a result that looks like a real high-end golden-hour lifestyle photograph"
    }
    ,
    aspectRatio: "3:4",
    keywords: [
      "convertible", "sunset", "drive", "car", "luxury", "travel",
      "wealth", "rich", "expensive", "lifestyle", "roadside",
      "coastal", "ocean", "fashion", "convertible", "car", "sunset",
      "drive", "luxury", "rich", "wealth", "expensive", "lifestyle",
      "roadside", "coastal", "ocean", "fashion", "travel",
      "automobile", "ride", "cruise", "scenic", "freedom",
      "adventure", "holiday", "vacation", "speed", "open top",
      "gadi", "beach", "nature", "explore", "convertible", "car", "sunset", "drive", "luxury", "travel", "rich", "wealth", "expensive", "lifestyle",
      "roadside", "coastal", "ocean", "fashion", "gadi", "ride",
      "cruise", "holiday", "vacation", "open top", "freedom", "convertible", "car", "drive", "sunset", "road", "open roof",
      "luxury", "gadi", "travel", "khuli chhat", "style", "hawa",
      "sham", "long drive", "highway", "golden hour"
    ]
  },
  {
    id: "flex_template_10",
    name: "Luxury Hotel Lounge",
    stackId: "flex",
    imageUrl: "/images/flex_template_10.webp",
    prompt: {
      task: "identity_locked_virtual_tryon_with_static_face_composite_and_environment_interaction",

      priority_stack: [
        "face_identity_absolute",
        "body_identity",
        "clothing",
        "interaction",
        "environment"
      ],

      identity_priority: "absolute_maximum",

      input_sources: {
        identity_image: "{input_person}",
        clothing_reference: "{second_input_image}"
      },

      face_handling_mode: "foreign_static_face_layer",

      face_authority: {
        source: "identity_image",
        authority_level: "pixel_absolute",
        treat_as_external_asset: true,
        exclude_from_diffusion_graph: true
      },

      face_masking: {
        enable: true,
        mask_source: "identity_image",
        mask_region: "entire_face_forehead_to_chin_ear_to_ear_including_hairline",
        mask_type: "hard_mask_binary",

        mask_behavior: "direct_pixel_transfer",

        generation_inside_mask: "disabled",
        diffusion_inside_mask: "disabled",
        style_transfer_inside_mask: "disabled",
        geometry_adjustment_inside_mask: "disabled",

        lighting_adjustment_inside_mask: "minimal_photometric_alignment_only",
        color_adjustment_inside_mask: "minimal_photometric_alignment_only",

        edge_handling: {
          blend_mode: "poisson_seamless_clone",
          edge_color_matching: true,
          edge_luminance_matching: true,
          no_face_blur: true,
          no_face_smoothing: true
        }
      },

      identity_constraints: {
        face_identity_lock: true,
        face_source_of_truth: "identity_image",

        render_order: [
          "render_full_scene_without_face",
          "insert_face_pixels_exactly",
          "seam_align_face_edges",
          "lock_face_layer"
        ],

        rules: {
          do_not_modify_face_pixels: true,
          do_not_regenerate_face: true,
          do_not_change_face_geometry: true,
          do_not_change_face_expression: true,
          do_not_symmetrize_face: true
        },

        visibility_rules: {
          full_face_visibility: true,
          no_face_occlusion: true
        },

        failure_condition: {
          type: "pixel_integrity_check",
          rule: "If any face pixel differs from identity_image, output is invalid."
        }
      },

      clothing_constraints: {
        extract_clothing_only: true,
        ignore_product_model_identity: true,
        re_render_clothing: true,
        no_clothing_paste: true
      },

      pose_and_body: {
        pose: "seated gracefully in a sharply visible luxurious korean hotel lounge",
        body_orientation: "natural_seated_three_quarter",
        neck_alignment: "match_identity_image",
        head_rotation: "match_identity_image",
        facial_expression: "exact_from_identity_image"
      },

      interaction_layer: {
        interaction_priority: "secondary_to_identity",

        interaction_scenarios: [
          {
            type: "lounge_interaction",
            description: "hands resting naturally on lap, armrest, or lightly placed on marble table surface",
            rules: {
              natural_weight_distribution: true,
              no_pose_stiffness: true,
              no_hand_object_merging: true
            }
          }
        ],

        environment_response: {
          object_contact_feedback: {
            enable: true,
            surface_reflection_integration: "subtle_table_and_floor_reflection_body_only",
            shadow_contact: "body_and_seating_only"
          }
        }
      },

      camera_and_framing: {
        camera_angle: "eye_level",
        focal_length: "luxury_lifestyle_photography",
        distance: "medium_full_body",
        no_wide_angle: true,
        no_perspective_warp_on_face: true
      },

      scene_composition: {
        environment: "luxurious hotel lounge interior",
        background_elements: [
          "marble tables",
          "plush seating",
          "warm ambient lighting",
          "golden interior tones",
          "refined architectural detailing"
        ],
        lighting: "soft warm ambient lighting with balanced cinematic tones",
        background_visibility: "fully_sharp_and_detailed",
        background_blur: "disabled",
        depth_of_field: "deep_focus",
        atmosphere_rules: {
          no_harsh_light: true,
          no_busy_crowd: true,
          no_cartoon_textures: true
        }
      },

      rendering_rules: {
        photorealistic: true,
        identity_layer_locked: true,
        sharp_focus_everywhere: true,
        no_postprocessing_on_face: true
      },

      negative_prompt: [
        "background blur",
        "portrait mode blur",
        "depth blur",
        "harsh light",
        "busy crowd",
        "cartoon textures",
        "face regeneration",
        "approximate face",
        "beautified face",
        "AI face",
        "hairstyle change"
      ]
    },
    aspectRatio: "3:4",
    keywords: [
      "luxury", "hotel", "lounge", "formal", "blazer", "elegant", "dress",
      "warm lighting", "marble", "golden tones", "cinematic", "Raymond",
      "grace", "poise", "no harsh light", "no blur", "no busy crowd", "hotel", "lounge", "luxury", "rich", "waiting", "lobby", "classy",
      "expensive", "suit", "baithna", "coffee", "meeting", "5 star",
      "vip", "business"

    ]
  },
  {
    id: "flex_template_11",
    name: "Premium Wristwatch",
    stackId: "flex",
    imageUrl: "/images/flex_template_11.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} adjusting a premium wristwatch (Rolex, Omega, etc.), wearing a fitted suit, soft golden light highlighting metallic reflections, focus on texture and class, Raymond editorial clarity.\nno overexposure, no fingerprints glare, no blur, no fantasy glow.no change in hairstyle , no  background blur, change the hand gestures accordingly. whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "wristwatch", "luxury", "premium", "rolex", "omega", "suit",
      "golden light", "metallic", "texture", "class", "Raymond",
      "editorial", "clarity", "wristwatch", "watch", "luxury",
      "premium", "rolex", "omega", "suit", "golden light",
      "metallic", "texture", "class", "elegance", "style",
      "timepiece", "accessory", "fashion", "status", "wealth",
      "rich", "expensive", "gadi", "bracelet", "dial", "mechanical",
      "automatic", "chronograph", "wrist", "band", "designer",
      "limited edition", "collectible", "investment", "watchmaking", "watch", "wristwatch", "rolex", "luxury", "time", "ghadi",
      "expensive", "hand", "accessory", "gold watch", "omega",
      "businessman", "show off", "flex", "jewellery"
    ]
  },
  {
    id: "flex_template_12",
    name: "Luxury Shopping Spree",
    stackId: "flex",
    imageUrl: "/images/flex_template_12.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} walking through a luxury shopping district or high-end boutique, holding branded shopping bags, stylish modern outfit, cinematic natural lighting and color realism.\nno crowd, no harsh neon, no motion blur, no washed tones. no change in hairstyle , no  background blur, change the hand gestures accordingly. whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "shopping", "luxury", "boutique", "branded bags", "fashion",
      "style", "wealth", "rich", "expensive", "lifestyle", "district",
      "modern outfit", "shopping", "luxury", "boutique",
      "branded bags", "fashion", "style", "wealth", "rich",
      "expensive", "lifestyle", "district", "modern outfit",
      "retail therapy", "mall", "designer", "clothes",
      "accessories", "shopping spree", "high end", "exclusive",
      "vip", "shopaholic", "gadi", "shopping bags", "store",
      "fashionista", "style", "trend", "urban", "city",
      "downtown", "luxury shopping", "shopping", "boutique", "luxury", "fashion", "style", "rich", "expensive",
      "lifestyle", "branded bags", "mall", "retail therapy",
      "designer", "clothes", "accessories", "vip", "shopaholic",
      "shopping bags", "store", "trend", "urban", "shopping", "bags", "mall", "luxury", "brand", "rich", "buy",
      "kharcha", "money", "gucci", "prada", "louis vuitton",
      "fashion", "market", "kharidna", "retail therapy"
    ]
  },
  {
    id: "flex_template_13",
    name: "Infinity Pool Villa",
    stackId: "flex",
    imageUrl: "/images/flex_template_13.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} relaxing in a private villa terrace with infinity pool, wearing casual linen attire, golden sunlight reflecting on water, serene Raymond lifestyle tone, high-end vacation realism ,8k quality image .\nno unrealistic sky, no blur, no fantasy pool reflection, no saturation spike. no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "infinity pool", "villa", "luxury", "relaxing", "linen attire",
      "golden sunlight", "water reflection",
      "vacation", "realism", "infinity pool", "villa", "luxury",
      "relaxing", "linen attire", "golden sunlight",
      "water reflection", "Raymond lifestyle", "vacation",
      "realism", "swimming pool", "resort", "tropical", "pool", "swimming", "villa", "luxury", "vacation", "water",
      "relax", "holiday", "rich", "hotel", "resort", "nahana",
      "paani", "view", "bali", "maldives", "summer"
    ]
  },
  {
    id: "flex_template_14",
    name: "Morning Coffee & Journal",
    stackId: "flex",
    imageUrl: "/images/flex_template_14.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} sitting beside a wooden table with a coffee cup and leather journal, warm morning light streaming in, casual yet refined outfit, Raymond editorial lifestyle clarity.\nno low-light noise, no over-bright mug, no harsh shadows, no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "coffee", "journal", "morning light", "wooden table", "casual",
      "refined outfit", "Raymond", "editorial", "lifestyle", "clarity",
      "coffee", "journal", "morning light", "wooden table",
      "casual", "refined outfit", "Raymond", "editorial",
      "coffee", "morning", "journal", "diary", "cafe", "relax",
      "breakfast", "chai", "peace", "subah", "nashta", "read",
      "book", "start day", "aesthetic", "work"
    ]
  },
  {
    id: "flex_template_15",
    name: "Modern Gym Session",
    stackId: "flex",
    imageUrl: "/images/flex_template_15.webp",
    prompt:
    {
      task: "absolute_identity_and_body_locked_real_world_editorial_photography",
      theme: "modern_gym_session_ultra_elite_signature_max_flex_plus_final",

      global_lock_policy: {
        lock_everything_except_person: true,
        person_is_only_dynamic_element: true
      },

      identity_and_body_control: {
        source: "input_person_image",
        priority_order: [
          "face_identity",
          "facial_structure",
          "micro_facial_features",
          "body_structure",
          "elite_training_body_language_accuracy"
        ],

        face_identity_lock: {
          enabled: true,
          identity_weight: 0.997,
          style_weight: 0.003,
          face_recognition_enforced: true,
          facial_landmark_constraints: "absolute_hard_lock",
          preserve_asymmetry: true,
          forbid: [
            "beautification",
            "symmetry_correction",
            "feature_enhancement",
            "face_morphing",
            "skin_smoothing"
          ]
        },

        body_structure_analysis: {
          derive_from_input: true,
          respect_real_proportions: true,
          no_model_scaling: true,
          no_body_retargeting: true
        }
      },

      pose_and_interaction: {
        orientation: "mid_set_or_between_sets_slight_angle_to_camera",
        body_posture: {
          stance: "stable_power_position",
          spine: "neutral_with_core_engaged",
          shoulders: "set_and_controlled",
          hips: "balanced_under_load",
          legs: [
            "feet_planted_shoulder_width",
            "or_split_stance_for_balance"
          ],
          overall_energy: "quiet_intensity_and_control"
        },
        arm_and_hand_interaction: {
          primary_actions: [
            "gripping_heavy_dumbbells_or_barbell_mid_set",
            "hands_resting_on_thighs_or_knees_between_sets"
          ],
          secondary_actions: [
            "tightening_lifting_straps_or_wraps",
            "chalk_residue_visible_on_palms_and_knuckles",
            "towel_wiped_across_forehead_or_neck"
          ],
          interaction_physics: [
            "visible_forearm_and_hand_tension",
            "muscle_engagement_under_load",
            "micro_shake_from_weight_resistance",
            "fabric_stretch_and_sweat_absorption"
          ]
        },
        expression: {
          mood: "focused_dominance",
          emotion: "discipline_and_control",
          jaw: "lightly_set_not_clenched",
          gaze: "toward_weight_or_soft_camera_glance_between_sets"
        }
      },

      environment: {
        lock: true,
        location: "private_ultra_luxury_modern_gym_or_penthouse_training_suite",
        style: "ultra_high_net_worth_fitness_architecture_realism",
        environment_layers: {
          foreground: [
            "premium_free_weights_with_brushed_metal_finish",
            "training_bench_or_power_rack_in_matte_black",
            "rubberized_or_polished_concrete_floor"
          ],
          midground: [
            "subject_centered_with_space_around",
            "mirrored_or_textured_concrete_wall",
            "minimal_equipment_layout_with_intentional_spacing"
          ],
          background: [
            "architectural_gym_design_in_steel_wood_and_glass",
            "large_windows_or_frosted_glass_panels",
            "soft_indirect_ceiling_lighting"
          ]
        },
        elite_context_elements: [
          "private_training_zone_no_public_presence",
          "designer_equipment_branding_subtle",
          "clean_high_value_materials",
          "controlled_acoustics_and_light"
        ],
        color_palette_lock: [
          "matte_black",
          "charcoal_grey",
          "brushed_steel",
          "warm_wood",
          "neutral_concrete"
        ]
      },

      wardrobe_and_style: {
        lock_style: true,
        overall_style: "ultra_signature_designer_athletic_couture",
        upper_body: [
          "precision_fitted_high_end_performance_top",
          "or_sleeveless_technical_layer_with_clean_edges",
          "optional_lightweight_designer_training_jacket_unzipped"
        ],
        lower_body: [
          "tailored_performance_training_pants_or_premium_shorts"
        ],
        footwear: [
          "elite_training_shoes_with_sculpted_silhouette"
        ],
        materials: [
          "advanced_moisture_wicking_fabrics",
          "compression_panels",
          "laser_cut_mesh"
        ],
        flex_accessories: [
          "minimal_luxury_wristwatch_only_if_training_realistic",
          "leather_or_technical_gym_bag_nearby",
          "high_end_water_bottle_in_brushed_metal_or_glass",
          "designer_towel_with_subtle_texture"
        ]
      },

      camera_simulation: {
        camera_type: "real_high_end_fitness_editorial_camera",
        focal_length_mm: 35,
        aperture: "f/8",
        iso: 400,
        shutter_speed: "1/1000",
        framing: {
          shot_type: "half_body_or_three_quarter",
          composition: "subject_weight_environment_power_balance",
          face_clearly_visible: true,
          muscle_engagement_readable: true,
          eye_level_or_slight_low_angle: true
        }
      },

      lighting: {
        type: "architectural_gym_lighting",
        behavior: "directional_top_and_side_light_sculpting_form_without_glow",
        avoid: [
          "neon_colors",
          "cinematic_rim_glow",
          "over_hdr"
        ]
      },

      color_science: {
        lock: true,
        profile: "luxury_fitness_editorial_neutral",
        contrast: "moderate",
        saturation: "controlled_and_real",
        skin_tone_policy: "match_input_exactly"
      },

      imperfection_pass: {
        add: [
          "light_sweat_sheen_not_glossy",
          "chalk_dust_on_hands_and_equipment",
          "fabric_wrinkles_from_motion",
          "authentic_skin_texture"
        ]
      },

      hard_negative_constraints: [
        "NO_bodybuilding_pose",
        "NO_mirror_selfie",
        "NO_face_change",
        "NO_body_change",
        "NO_beautification",
        "NO_public_gym_clutter",
        "NO_ai_polish"
      ],

      output_goal:
        "an ultra-elite modern gym session editorial photograph where the subject’s face is unmistakably identical to the input person, designer athletic wear and premium accessories elevate status, the private gym environment signals extreme wealth, the subject actively interacts with heavy equipment mid-session, and the image feels like a real high-net-worth training moment captured by a professional editorial photographer"
    }
    ,
    aspectRatio: "3:4",
    keywords: [
      "gym", "fitness", "workout", "luxury", "training", "health",
      "wealth", "rich", "expensive", "lifestyle", "exercise",
      "muscle", "strength", "gym", "fitness", "workout",
      "luxury", "training", "health", "wealth", "rich",
      "expensive", "lifestyle", "exercise", "muscle",
      "strength", "bodybuilding", "personal trainer",
      "high-end", "wellness", "active", "fit", "gym",
      "fitness", "workout", "luxury", "training", "gym", "workout", "fitness", "body", "muscle", "exercise",
      "training", "weights", "dumbbells", "dole", "bodybuilder",
      "kasrat", "sehat", "fit", "strong", "gym shark"
    ]
  },
  {
    id: "flex_template_16",
    name: "Fine Dining Experience",
    stackId: "flex",
    imageUrl: "/images/flex_template_16.webp",
    prompt:
    {
      task: "absolute_identity_and_body_locked_real_world_editorial_photography",
      theme: "fine_dining_experience_ultra_signature_max_flex_aesthetic_refined_final",

      global_lock_policy: {
        lock_everything_except_person: true,
        person_is_only_dynamic_element: true
      },

      identity_and_body_control: {
        source: "input_person_image",
        priority_order: [
          "face_identity",
          "facial_structure",
          "micro_facial_features",
          "body_structure",
          "refined_dining_body_language_accuracy"
        ],
        face_identity_lock: {
          enabled: true,
          identity_weight: 0.997,
          style_weight: 0.003,
          face_recognition_enforced: true,
          facial_landmark_constraints: "absolute_hard_lock",
          preserve_asymmetry: true,
          forbid: [
            "beautification",
            "symmetry_correction",
            "feature_enhancement",
            "face_morphing",
            "skin_smoothing"
          ]
        }
      },

      pose_and_interaction: {
        orientation: "seated_at_private_fine_dining_table_slight_diagonal",
        body_posture: {
          torso: "upright_with_soft_forward_engagement",
          shoulders: "relaxed_and_open",
          overall_energy: "quiet_confident_refinement"
        },
        arm_and_hand_interaction: {
          primary_actions: [
            "one_hand_holding_crystal_stemware_by_the_stem",
            "other_hand_using_cutlery_mid-course_or_paused_above_plate"
          ],
          secondary_actions: [
            "lightly_adjusting_jacket_cuff_or_watch",
            "placing_cutlery_down_between_bites"
          ],
          interaction_physics: [
            "gentle_glass_weight_and_refraction",
            "micro_angle_changes_of_cutlery",
            "fabric_tension_at_cuffs"
          ]
        },
        expression: {
          mood: "refined_appreciation",
          gaze: "soft_camera_or_plate_focus"
        }
      },

      environment: {
        lock: true,
        location: "private_chef_table_or_secluded_michelin_star_dining_room",
        style: "ultra_high_net_worth_culinary_artistry_realism",

        table_aesthetics: {
          table_linen:
            "custom_bone_white_or_champagne_linen_with_soft_texture",
          place_setting:
            "perfectly_spaced_minimalist_high_fine_dining_layout",
          table_geometry: "clean_edges_generous_negative_space"
        },

        food_presentation: {
          plating_style: "modern_michelin_fine_art_plating",
          dish_characteristics: [
            "sculptural_composition",
            "negative_space_plating",
            "precision_sauce_brush_strokes",
            "microgreens_and_edible_flower_accents",
            "clean_height_and_geometry"
          ],
          plate_materials: [
            "handcrafted_ceramic",
            "stoneware_with_matte_finish",
            "subtle_irregular_edges"
          ]
        },

        cutlery_and_glassware: {
          cutlery: [
            "bespoke_slim_profile_silverware",
            "soft_brushed_or_mirror_polish",
            "perfect_alignment_parallel_to_plate"
          ],
          glassware: [
            "ultra_thin_crystal_stemware",
            "precise_bowl_shape_for_wine_or_water",
            "subtle_light_refraction_no_glare"
          ]
        },

        environment_layers: {
          foreground: [
            "artfully_plated_course",
            "aligned_cutlery_and_stemware",
            "linen_napkin_folded_with_intent"
          ],
          midground: [
            "subject_seated_in_upholstered_chair",
            "bread_service_with_sculpted_butter",
            "minimal_candle_or_table_lamp"
          ],
          background: [
            "rich_textured_walls_or_wood_panels",
            "abstract_or_classic_artwork",
            "discreet_service_movement_far_depth"
          ]
        }
      },

      lighting: {
        type: "fine_dining_architectural_lighting",
        key_light:
          "soft_directional_warm_key_focused_on_face_and_plate",
        table_light:
          "low_level_table_or_candle_light_for_food_highlights",
        ambient_light:
          "warm_layered_fill_with_soft_falloff",
        behavior: [
          "gentle_specular_highlights_on_glass_and_cutlery",
          "no_hard_shadows",
          "no_hdr_or_glow_effects"
        ],
        color_temperature: "2800K_to_3200K"
      },

      wardrobe_and_style: {
        lock_style: true,
        overall_style: "ultra_signature_evening_dining_couture",
        flex_accessories: [
          "high_complication_luxury_wristwatch",
          "minimal_high_jewelry_ring_or_cufflink",
          "discreet_pocket_square_or_chain"
        ]
      },

      camera_simulation: {
        camera_type: "high_end_culinary_editorial_camera",
        focal_length_mm: 50,
        aperture: "f/8",
        iso: 400,
        shutter_speed: "1/200",
        framing: {
          shot_type: "half_body_seated_with_table_focus",
          face_clearly_visible: true,
          food_and_hands_prominent: true
        }
      },

      color_science: {
        lock: true,
        profile: "warm_fine_dining_editorial",
        contrast: "moderate",
        saturation: "rich_but_restrained"
      },

      imperfection_pass: {
        add: [
          "subtle_linen_fold_variation",
          "non_perfect_candle_flicker",
          "natural_glass_reflections",
          "authentic_skin_texture"
        ]
      },

      hard_negative_constraints: [
        "NO_over_stylized_food",
        "NO_fake_glow",
        "NO_plastic_food_textures",
        "NO_face_change",
        "NO_beautification",
        "NO_ai_polish"
      ],

      output_goal:
        "an ultra-signature fine dining editorial photograph where the food presentation, cutlery, tableware, and lighting reach Michelin-level aesthetic refinement, the subject interacts naturally mid-course, the environment feels intimate and elite, and the entire scene looks indistinguishable from a real chef’s-table dining photograph captured by a world-class culinary editorial photographer"
    }
    ,
    aspectRatio: "3:4",
    keywords: [
      "fine dining", "luxury", "restaurant", "gourmet", "elegant",
      "refined", "culinary", "wealth", "rich", "expensive",
      "lifestyle", "Michelin", "fine dining", "luxury",
      "restaurant", "gourmet", "elegant", "refined", "dinner", "dining", "restaurant", "food", "luxury", "date",
      "wine", "eating", "hotel", "party", "khana", "candle light",
      "mehenga", "romantic", "chef", "gourmet"
    ]
  },
  {
    id: "flex_template_17",
    name: "Luxury Hotel Suite",
    stackId: "flex",
    imageUrl: "/images/flex_template_17.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} relaxing or preparing in a high-end suite, elegant interior textures, soft lamp light and silk bedding, refined comfort and subtle cinematic warmth, Raymond-class composition.\nno harsh lighting, no blur, no fake props, no color imbalance.no change in hairstyle , no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "luxury", "hotel", "suite", "elegant", "interior", "silk",
      "bedding", "refined", "comfort", "cinematic", "hotel", "suite", "room", "luxury", "bed", "rich", "stay",
      "vacation", "classy", "kamra", "sona", "sleep", "bedroom",
      "5 star", "comfort", "presidential"
    ]
  },
  {
    id: "flex_template_18",
    name: "Race Track Ferrari",
    stackId: "flex",
    imageUrl: "/images/flex_template_18.webp",
    prompt:
      "Make sure the background of the output image is not blurry and the output image has clearly visible background objects. Ensure the output figure's face matches sharply with the input figure's face, preserving the exact chin shape and jawline without rounding. {input person} standing beside a red Ferrari in a race track pit wearing a tailored race suit, dynamic composition, crisp sunlight, polished reflections, hyper-realistic fashion-meets-speed vibe, Raymond luxury tone.\nno lens distortion, no cartoon color, no blur, no empty background, no plastic reflections..no  background blur, change the hand gestures accordingly . whole face should be visible .",
    aspectRatio: "3:4",
    keywords: [
      "car", "race track", "Ferrari", "luxury", "speed", "fashion",
      "sunlight", "reflections", "dynamic", "tailored", "race suit",
      "hyper-realistic", "Raymond", "luxury tone", "pit stop", "motorsport", "ferrari", "race", "car", "track", "fast", "red car", "speed",
      "sport", "f1", "laal gadi", "tez", "driver", "helmet", "circuit",
      "racing", "formula 1"
    ]
  },
];

// Fallback for stacks that truly do not have any templates.
// This avoids generating duplicate IDs (for example fitit_template_1) that can
// override real templates and surface incorrect names/images.
const allStackIds = STACKS.map((s) => s.id);
const stackIdsWithDefinedTemplates = new Set<string>([
  ...fititTemplates,
  ...aestheticsTemplates,
  ...flexTemplates,
].map((template) => template.stackId));
const remainingStackIds = allStackIds.filter(
  (id) => !stackIdsWithDefinedTemplates.has(id),
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
  ...aestheticsTemplates,
  ...flexTemplates,
  ...placeholderTemplates,
];

// ==========================================
// PRE-INDEXED TEMPLATE LOOKUPS (Performance optimization)
// Use these instead of .find() / .filter() on TEMPLATES array
// ==========================================

/** O(1) lookup by template ID */
export const TEMPLATES_BY_ID = new Map<string, Template>(
  TEMPLATES.map(t => [t.id, t])
);

/** O(1) lookup by stack ID - returns array of templates for that stack */
export const TEMPLATES_BY_STACK = TEMPLATES.reduce((acc, t) => {
  if (!acc.has(t.stackId)) {
    acc.set(t.stackId, []);
  }
  acc.get(t.stackId)!.push(t);
  return acc;
}, new Map<string, Template[]>());
