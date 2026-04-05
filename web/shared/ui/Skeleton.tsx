import React from 'react';

const shimmer = 'animate-pulse bg-[#1a1a1a]';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-2xl overflow-hidden border border-[#1f1f1f] ${className}`}>
    <div className={`aspect-[3/4] ${shimmer}`} />
    <div className="p-3 space-y-2 bg-[#141414]">
      <div className={`h-4 w-3/4 rounded ${shimmer}`} />
      <div className="flex items-center gap-2">
        <div className={`h-4 w-16 rounded ${shimmer}`} />
        <div className={`h-3 w-12 rounded ${shimmer}`} />
      </div>
    </div>
  </div>
);

export const SkeletonCarousel: React.FC = () => (
  <div className="pt-12 pb-6 md:py-16">
    <div className="flex gap-4 md:gap-8 px-[7.5vw] overflow-hidden">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`shrink-0 w-[85vw] md:w-[85vw] max-w-[1600px] aspect-[4/5] md:aspect-[16/9] rounded-[24px] md:rounded-[40px] border border-[#1f1f1f] ${shimmer}`}
        />
      ))}
    </div>
  </div>
);

export const SkeletonProductGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} className="shrink-0 w-[45vw] md:w-[220px]" />
    ))}
  </div>
);

export const SkeletonProductPage: React.FC = () => (
  <div className="w-full h-full overflow-y-auto bg-[#0a0a0a]">
    {/* Hero image */}
    <div className={`w-full aspect-[3/4] md:aspect-[4/3] ${shimmer}`} />
    {/* Content */}
    <div className="px-5 py-6 space-y-4">
      <div className={`h-7 w-2/3 rounded ${shimmer}`} />
      <div className="flex gap-3">
        <div className={`h-6 w-20 rounded ${shimmer}`} />
        <div className={`h-5 w-16 rounded ${shimmer}`} />
      </div>
      <div className="flex gap-2 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-10 w-14 rounded-lg ${shimmer}`} />
        ))}
      </div>
      <div className="flex gap-3 pt-4">
        <div className={`h-14 flex-1 rounded-xl ${shimmer}`} />
        <div className={`h-14 flex-1 rounded-xl ${shimmer}`} />
      </div>
      <div className={`h-4 w-full rounded mt-6 ${shimmer}`} />
      <div className={`h-4 w-5/6 rounded ${shimmer}`} />
      <div className={`h-4 w-4/6 rounded ${shimmer}`} />
    </div>
  </div>
);
