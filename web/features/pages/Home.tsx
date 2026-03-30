// src/routes/Home.tsx
import React from "react";
import { TrendingCarousel } from "../templates/TrendingCarousel";
import { ProductCard } from "../shop/ProductCard";
import { SkeletonCarousel, SkeletonProductGrid } from "../../shared/ui/Skeleton";
import { STACKS } from "../../data/constants";
import type { Stack, Template, User } from "../../types";
import { CONFIG } from "../../config";

interface HomeProps {
  trendingTemplates: Template[];
  templatesByStack: Map<string, Template[]>;
  isLoading?: boolean;
  onSelectTemplate: (template: Template) => void;
  user?: User | null;
  onboardingPercent?: number;
  onOpenOnboarding?: () => void;
  wishlistedIds?: Set<string>;
  onToggleWishlist?: (templateId: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  trendingTemplates,
  templatesByStack,
  isLoading,
  onSelectTemplate,
  user,
  onboardingPercent,
  onOpenOnboarding,
  wishlistedIds,
  onToggleWishlist,
}) => {
  const creatorsStackIds = CONFIG.APP.CREATOR_STACKS;
  const stacksToShow = creatorsStackIds
    .map((id: string) => STACKS.find((s: Stack) => s.id === id))
    .filter((s?: Stack): s is Stack => !!s);

  // Collect "New Arrivals" from trending (first 10)
  const newArrivals = trendingTemplates.slice(0, 10);

  return (
    <div data-home-scroll="true" className="w-full h-full overflow-y-auto scrollbar-hide pb-24 bg-[#0a0a0a]">

      {/* Onboarding Progress Banner */}
      {user && onboardingPercent !== undefined && onboardingPercent < 100 && (
        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-4">
          <button
            onClick={onOpenOnboarding}
            className="w-full p-4 bg-gradient-to-r from-[#c9a962]/10 to-[#c9a962]/5 border border-[#c9a962]/20 rounded-2xl flex items-center gap-4 hover:border-[#c9a962]/40 transition-all group text-left"
          >
            <div className="relative w-12 h-12 shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#1a1a1a]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-[#c9a962]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${onboardingPercent}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#c9a962]">
                {onboardingPercent}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f5f5f5]">
                You've completed {onboardingPercent}% of your onboarding
              </p>
              <p className="text-xs text-[#6b6b6b] mt-0.5">
                Complete your profile for personalized recommendations
              </p>
            </div>
            <svg className="w-5 h-5 text-[#6b6b6b] group-hover:text-[#c9a962] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Hero Carousel — Editorial */}
      {isLoading ? (
        <SkeletonCarousel />
      ) : (
        <TrendingCarousel
          templates={trendingTemplates}
          onSelectTemplate={onSelectTemplate}
        />
      )}

      {/* New Arrivals Section */}
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-8">
        <h2 className="text-xl md:text-2xl font-bold text-[#f5f5f5] mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          New Arrivals
        </h2>
        {isLoading ? (
          <SkeletonProductGrid count={4} />
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {newArrivals.map((t) => (
              <ProductCard
                key={t.id}
                template={t}
                isWishlisted={wishlistedIds?.has(t.id)}
                onToggleWishlist={onToggleWishlist}
                onClick={() => onSelectTemplate(t)}
                className="shrink-0 w-[45vw] md:w-[220px]"
              />
            ))}
          </div>
        )}
      </div>

      {/* Per-Stack Sections */}
      {stacksToShow.map((stack) => {
        const stackTemplates = templatesByStack.get(stack.id) ?? [];
        if (stackTemplates.length === 0 && !isLoading) return null;

        return (
          <div key={stack.id} className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-10">
            <h2 className="text-xl md:text-2xl font-bold text-[#f5f5f5] mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              {stack.name}
            </h2>
            {isLoading ? (
              <SkeletonProductGrid count={4} />
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {stackTemplates.map((t) => (
                  <ProductCard
                    key={t.id}
                    template={t}
                    isWishlisted={wishlistedIds?.has(t.id)}
                    onToggleWishlist={onToggleWishlist}
                    onClick={() => onSelectTemplate(t)}
                    className="shrink-0 w-[45vw] md:w-[220px]"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
