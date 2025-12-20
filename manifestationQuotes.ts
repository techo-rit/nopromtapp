export const manifestationQuotes: Record<string, string> = {
  // TRENDING TEMPLATES
  "Private Jet Lifestyle": "This level already recognizes you",
  "Infinity Pool Villa": "Rest comes easily at this height",
  "Dramatic Studio": "You don't disappear when the light sharpens",
  "Race Track Ferrari": "Speed answers when you're ready",
  "Cozy Christmas": "Peace settles where you stand",
  "Summer Linen": "Ease looks natural on you",
  "Sahara Desert Walk": "Silence meets you halfway",

  // FITIT
  "Lower-Wear": "This fit was always meant for you",
  "Upper-Wear": "Nothing here feels forced",
  Innerwear: "Comfort doesn't need permission",
  Watches: "Time aligns when you wear it",
  Glasses: "Clarity follows you",

  // ANIMATION / COSPLAY
  "Monkey D. Luffy": "Freedom answers your name",
  "Son Goku": "Strength rises with effort",
  "Naruto Uzumaki": "You keep moving forward",
  "Usagi Tsukino": "Gentleness holds its own power",
  "Levi Ackerman": "Control stays quiet",
  "Satoru Gojo": "Confidence doesn't explain itself",
  "Pixar 3D Style (Action)": "Your story moves in full color",
  "Chibi Sticker Sheet": "Even your moods have range",

  // AESTHETICS
  "Warm Rustic Interior": "You belong in spaces that breathe",
  "Urban Alleyway": "Edge sharpens you",
  "Vibrant Fabric Market": "Color responds to you",
  "Royal Luxury ": "This authority feels familiar",
  "Forest Sunlight": "Stillness works in your favor",
  "Ancient Monument": "Respect meets you here",
  "Seaside Golden Hour": "Time slows around you",
  "Artistic Studio": "You hold the frame",
  "Elegant Silk Saree": "Grace carries weight",
  "Bohemian Chic": "Nothing about you feels copied",
  "Evening Gown Twilight": "Attention settles without effort",
  "Modern Casual City": "You move easily through noise",
  "Vintage 1950s Style": "Class doesn't expire",
  "Pastel Professional": "Softness doesn't weaken you",
  "Serene Landscape": "Calm keeps pace with you",

  // CELEBRATION
  "Diwali Celebration": "Light finds its way to you",
  "Holi Celebration": "Joy doesn't ask permission",
  "Elegant Eid": "Peace arrives dressed in clarity",

  // CLOTHES
  "Maharaja Majesty": "History feels close to you",
  "Classic Tailored Suit": "Authority sits comfortably",
  "Business Casual": "Competence reads instantly",
  "Modern Festive Kurta": "Tradition adapts to you",
  "Premium Winter Fashion": "Warmth doesn't dull presence",
  "Silk Saree": "Elegance doesn't rush",
  "Evening Gown": "You arrive already noticed",
  "Tailored Blazer": "Structure works with you",
  "Boho Dress": "Freedom wears well on you",
  "Knit Turtleneck": "Quiet confidence stays",
  "Bridal Lehenga": "This moment recognizes you",
  "Pastel Blouse": "Soft power lasts longer",

  // FLEX
  "Bugatti Coastal Drive": "Momentum listens to you",
  "Luxury Superbike": "Control stays steady",
  "Ice Rink Elegance": "Balance comes naturally",
  "Deep Sea Diver": "Depth doesn't intimidate you",
  "Yacht Life": "Calm carries status",
  "City Night Supercar": "The city adjusts",
  "Desert ATV Adventure": "You move where others pause",
  "Sunset Convertible Drive": "Time rides with you",
  "Luxury Hotel Lounge": "Comfort recognizes taste",
  "Premium Wristwatch": "Precision fits you",
  "Luxury Shopping Spree": "Choice comes easily",
  "Morning Coffee & Journal": "Clarity starts early",
  "Modern Gym Session": "Discipline feels steady",
  "Fine Dining Experience": "Refinement doesn't rush",
  "Luxury Hotel Suite": "Rest matches ambition",

  // MONUMENTS
  "Taj Mahal Sunrise": "Some beauty endures",
  "Eiffel Tower Romance": "Belonging travels well",
  "Pyramids of Giza Expedetion": "You stand with history",
  "Statue of Liberty": "Arrival feels earned",
  "Great Wall of China Trek": "You walk paths that outlast time",
  "Colosseum Gladiator Pose": "Strength remembers form",
  "Lotus Temple Sunset": "Calm takes shape",
  "Machu Picchu Sunrise": "You walk above noise",

  // SCENERIES
  "Himalayan Trek": "The climb meets you halfway",
  "Amazon Rainforest": "Life surrounds you",
  "Icelandic Waterfall": "Force moves cleanly",
  "Moroccan Market": "Energy responds to curiosity",
  "Aurora Borealis Night": "Wonder arrives quietly",
};

export const getManifestationQuote = (templateName: string): string => {
  return manifestationQuotes[templateName] || "Your vision awaits";
};
