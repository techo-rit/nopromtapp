export interface Stack {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Template {
  id: string;
  name: string;
  stackId?: string;
  imageUrl: string;
  prompt: string | Record<string, any>;
  aspectRatio: string;
  keywords?: string[];
  // Enriched from server-side Shopify join
  price?: ShopifyPrice;
  compareAtPrice?: ShopifyPrice;
  availableForSale?: boolean;
  shopifyProduct?: ShopifyProduct;
}

// ==========================================
// SHOPIFY TYPES
// ==========================================

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyPrice {
  amount: string;
  currencyCode: string;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: ShopifyPrice;
  compareAtPrice: ShopifyPrice | null;
  selectedOptions: { name: string; value: string }[];
  image: ShopifyImage | null;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  priceRange: {
    minVariantPrice: ShopifyPrice;
    maxVariantPrice: ShopifyPrice;
  };
  compareAtPriceRange: {
    minVariantPrice: ShopifyPrice;
    maxVariantPrice: ShopifyPrice;
  };
  availableForSale: boolean;
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: {
      title: string;
      handle: string;
      featuredImage: ShopifyImage | null;
    };
    price: ShopifyPrice;
    selectedOptions: { name: string; value: string }[];
  };
  cost: {
    totalAmount: ShopifyPrice;
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    totalAmount: ShopifyPrice;
    subtotalAmount: ShopifyPrice;
  };
  lines: ShopifyCartLine[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  ageRange: string | null;
  colors: string[];
  styles: string[];
  fit: string | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  measurementUnit: string | null;
  bodyType: string | null;
  skinTone: string | null;
  avatarUrl: string | null;
  profilePhotoUrl: string | null;
  isOnboardingComplete: boolean;
  accountType: 'free' | 'essentials' | 'ultimate';
  monthlyQuota: number;
  monthlyUsed: number;
  extraCredits: number;
  creationsLeft: number;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  ageRange: string | null;
  colors: string[];
  styles: string[];
  fit: string | null;
  bust: number | null;
  waist: number | null;
  hip: number | null;
  measurementUnit: string | null;
  bodyType: string | null;
  skinTone: string | null;
  avatarUrl: string | null;
  profilePhotoUrl: string | null;
  isOnboardingComplete: boolean;
  accountType: 'free' | 'essentials' | 'ultimate';
  monthlyQuota: number;
  monthlyUsed: number;
  extraCredits: number;
  creationsLeft: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  addressLine1: string | null;
  addressLine: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
  createdAt: string;
}

// ==========================================
// GENERATED IMAGES GALLERY
// ==========================================

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  templateId: string | null;
  templateName: string | null;
  stackId: string | null;
  mode: 'remix' | 'tryon' | 'carousel_tryon';
  aspectRatio: string | null;
  createdAt: string;
}

// ==========================================
// PAYMENT & SUBSCRIPTION TYPES
// ==========================================

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number; // Price in smallest currency unit (paise for INR)
  displayPrice: string; // Formatted price for display (e.g., "₹129")
  currency: string;
  creations: number;
  accountType: 'essentials' | 'ultimate';
  features: string[];
  isPopular?: boolean;
  badge?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  creationsPurchased: number;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
}

export interface CreateOrderRequest {
  planId: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  prefill?: {
    name: string;
    email: string;
  };
  error?: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscriptionId?: string;
  creationsAdded?: number;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Razorpay global type (loaded via script)
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}


// ─── Personalization Engine Types ─────────────────────────────

export interface FeedItem {
  product_id: string;
  title: string;
  image?: string;
  score: number;
  isExploration: boolean;
  style_tags?: string[];
  color_family?: string[];
  occasion?: string[];
  garment_type?: string;
  min_price?: number;
  max_price?: number;
  is_new_arrival?: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  total: number;
  hasMore: boolean;
}

export type EventType = 'view' | 'try_on' | 'wishlist' | 'cart_add' | 'cart_remove' | 'purchase' | 'skip';

export interface TrackEventPayload {
  events: {
    product_id: string;
    event_type: EventType;
    metadata?: Record<string, unknown>;
  }[];
}


// ─── Wardrobe Types ─────────────────────────────────────────

export interface WardrobeGarment {
  id: string;
  user_id: string;
  image_url: string;
  original_image_url?: string;
  storage_path: string;
  garment_type?: string;
  garment_category?: 'upperwear' | 'lowerwear' | 'fullbody' | 'footwear' | 'accessory' | 'layer';
  primary_color_hex?: string;
  secondary_color_hex?: string;
  color_family?: string;
  color_temperature?: 'warm' | 'cool' | 'neutral';
  color_intensity?: 'pastel' | 'muted' | 'vibrant' | 'neon' | 'earth';
  fit?: 'fitted' | 'regular' | 'relaxed' | 'oversized';
  length?: 'crop' | 'regular' | 'long' | 'ankle' | 'floor';
  waist_position?: 'high' | 'mid' | 'low';
  volume?: 'low' | 'medium' | 'high';
  fabric?: string;
  texture?: string;
  weight?: 'lightweight' | 'midweight' | 'heavyweight';
  stretch?: boolean;
  opacity?: 'opaque' | 'semi-sheer' | 'sheer';
  pattern?: string;
  pattern_scale?: 'small' | 'medium' | 'large';
  neckline?: string;
  sleeve_length?: string;
  embellishment?: string;
  hardware?: boolean;
  formality?: number;
  occasion_tags?: string[];
  aesthetic_tags?: string[];
  season_tags?: string[];
  perceived_quality?: number;
  // 30-dimension classification (aligned with templates)
  style_tags?: string[];
  body_type_fit?: string[];
  skin_tone_complement?: string[];
  age_group?: string[];
  trend_tag?: string[];
  sustainability?: string[];
  fit_silhouette?: string;
  price_tier?: string;
  gender?: string;
  brand_tier?: string;
  layering?: string;
  care_level?: string;
  origin_aesthetic?: string;
  versatility?: string;
  is_analyzed: boolean;
  analysis_failed: boolean;
  created_at: string;
  updated_at: string;
}

export interface WardrobeOutfit {
  id: string;
  user_id: string;
  garment_ids: string[];
  harmony_score: number;
  color_harmony: number;
  silhouette_balance: number;
  occasion_fit: number;
  aesthetic_alignment: number;
  fabric_compatibility: number;
  trend_factor: number;
  practicality: number;
  personalization_score: number;
  display_score: number;
  composite_tags: Record<string, unknown>;
  vibe_title?: string;
  vibe_why?: string;
  vibe_occasions?: string[];
  vibe_accessories?: string[];
  vibe_match_pct?: number;
  is_stale: boolean;
  created_at: string;
  garments?: WardrobeGarment[];
}

export interface WardrobeStyleProfile {
  user_id: string;
  tag_affinities: Record<string, number>;
  category_counts: Record<string, number>;
  total_garments: number;
  identified_gaps: WardrobeGap[];
  updated_at: string;
}

export interface WardrobeGap {
  gap_type: 'occasion' | 'aesthetic' | 'season' | 'color_palette' | 'versatility';
  severity: number;
  headline: string;
  description: string;
  missing_occasions?: string[];
  desired_aesthetic?: string;
  missing_season?: string;
  dominant_color?: string;
  percentage?: number;
  trigger_copy?: string;
}

export interface WardrobeChatSession {
  id: string;
  user_id: string;
  active_filters: Record<string, unknown>;
  messages: ConciergeMessage[];
  created_at: string;
}

export interface ConciergeMessage {
  role: 'user' | 'assistant';
  content: string;
  outfits?: WardrobeOutfit[];
  refinement_buttons?: RefinementButton[];
  stiri_recommendation?: FeedItem;
  timestamp: string;
}

export interface RefinementButton {
  label: string;
  emoji: string;
  filter_patch: Record<string, unknown>;
}

export interface WardrobeGarmentsResponse {
  garments: WardrobeGarment[];
  counts: Record<string, number>;
  total: number;
  cap: number;
}

export interface WardrobeOutfitsResponse {
  outfits: WardrobeOutfit[];
  total: number;
  hasMore: boolean;
}

export interface WardrobeSyncEvent {
  type: 'analyzing' | 'pairing' | 'ranking' | 'complete' | 'error';
  progress?: number;
  message?: string;
  data?: unknown;
}

export interface WardrobeChatRequest {
  message?: string;
  session_id?: string;
  button_filter?: Record<string, unknown>;
}

export interface WardrobeChatResponse {
  session_id: string;
  outfits: WardrobeOutfit[];
  refinement_buttons: RefinementButton[];
  stiri_recommendation?: FeedItem;
  message: string;
}
