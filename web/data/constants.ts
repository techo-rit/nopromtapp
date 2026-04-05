import type { Stack, PricingPlan } from "../types";

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
