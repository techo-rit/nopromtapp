// src/routes/Home.tsx
import React from "react";
import { TemplateGrid } from "../templates/TemplateGrid";
import { TrendingCarousel } from "../templates/TrendingCarousel";
import { StackGrid } from "../templates/StackGrid";
import { STACKS, TEMPLATES_BY_STACK } from "../../data/constants";
import type { Stack, Template, NavCategory, User } from "../../types";
import { CONFIG } from "../../config";

interface HomeProps {
  activeNav: NavCategory;
  searchQuery: string;
  searchResults: Template[];
  trendingTemplates: Template[];
  onSelectStack: (stack: Stack) => void;
  onSelectTemplate: (template: Template) => void;
  user?: User | null;
  onboardingPercent?: number;
  onOpenOnboarding?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  activeNav,
  searchQuery,
  searchResults,
  trendingTemplates,
  onSelectStack,
  onSelectTemplate,
  user,
  onboardingPercent,
  onOpenOnboarding,
}) => {
  // 1. Search Mode
  if (searchQuery.length > 0) {
    return (
      <div className="w-full h-full bg-[#0a0a0a]">
        {searchResults.length > 0 ? (
          <TemplateGrid templates={searchResults} onSelectTemplate={onSelectTemplate} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b] px-4">
            <p>No templates found.</p>
            <p className="text-sm mt-2">Try searching for "wedding", "office", or "party".</p>
          </div>
        )}
      </div>
    );
  }

  // 2. "Try on" Mode
  if (activeNav === "Try on") {
    // O(1) lookup instead of O(n) filter
    const fititTemplates = TEMPLATES_BY_STACK.get("fitit") ?? [];
    return (
      <div className="w-full h-full bg-[#0a0a0a]">
        <TemplateGrid templates={fititTemplates} onSelectTemplate={onSelectTemplate} />
      </div>
    );
  }

  // 3. Default "Creators" Mode
  const creatorsStackIds = CONFIG.APP.CREATOR_STACKS;
  
  const stacksToShow = creatorsStackIds
    .map((id) => STACKS.find((s) => s.id === id))
    .filter((s): s is Stack => !!s);

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
      <div>
        <TrendingCarousel
          templates={trendingTemplates}
          onSelectTemplate={onSelectTemplate}
        />
      </div>
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-8 pb-6 md:py-8">
        <h2 className="text-[28px] md:text-[40px] lg:text-[48px] font-semibold text-[#f5f5f5] mb-8 pt-4 border-t border-[#2a2a2a] text-left">
          Choose your form
        </h2>
        <StackGrid stacks={stacksToShow} onSelectStack={onSelectStack} />
      </div>
    </div>
  );
};
