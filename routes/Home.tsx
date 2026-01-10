// src/routes/Home.tsx
import React from "react";
import { TemplateGrid } from "../components/TemplateGrid";
import { TrendingCarousel } from "../components/TrendingCarousel";
import { StackGrid } from "../components/StackGrid";
import { STACKS, TEMPLATES } from "../constants"; // Ensure these exist in your constants file
import type { Stack, Template } from "../types";

interface HomeProps {
  activeNav: string;
  searchQuery: string;
  searchResults: Template[];
  trendingTemplates: Template[];
  onSelectStack: (stack: Stack) => void;
  onSelectTemplate: (template: Template) => void;
}

export const Home: React.FC<HomeProps> = ({
  activeNav,
  searchQuery,
  searchResults,
  trendingTemplates,
  onSelectStack,
  onSelectTemplate,
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
    const fititTemplates = TEMPLATES.filter((t) => t.stackId === "fitit");
    return (
      <div className="w-full h-full bg-[#0a0a0a]">
        <TemplateGrid templates={fititTemplates} onSelectTemplate={onSelectTemplate} />
      </div>
    );
  }

  // 3. Default "Creators" Mode
  const creatorsStackIds = [
    "flex", "aesthetics", "sceneries", "clothes", "monuments", "celebration", "fitit", "animation",
  ];
  
  const stacksToShow = creatorsStackIds
    .map((id) => STACKS.find((s) => s.id === id))
    .filter((s): s is Stack => !!s);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide pb-24 bg-[#0a0a0a]">
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