import React, { useState, useEffect } from 'react';

interface GenerationShowcaseProps {
  productImage: string;
  productName: string;
}

const PROGRESS_STAGES = [
  { text: 'Analyzing your features', duration: 6000 },
  { text: 'Matching the garment fit', duration: 7000 },
  { text: 'Tailoring the look', duration: 8000 },
  { text: 'Adding final touches', duration: 10000 },
];

export const GenerationShowcase: React.FC<GenerationShowcaseProps> = ({
  productImage,
  productName,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through stages
  useEffect(() => {
    const stage = PROGRESS_STAGES[stageIndex];
    if (!stage) return;

    const timer = setTimeout(() => {
      if (stageIndex < PROGRESS_STAGES.length - 1) {
        setStageIndex(prev => prev + 1);
      }
    }, stage.duration);

    return () => clearTimeout(timer);
  }, [stageIndex]);

  // Smooth progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Don't go past 95% — actual completion will unmount this component
        if (prev >= 95) return 95;
        return prev + 0.5;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const currentStage = PROGRESS_STAGES[stageIndex] || PROGRESS_STAGES[PROGRESS_STAGES.length - 1];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] px-6">
      {/* Product image showcase */}
      <div className="relative w-64 h-80 mb-10 rounded-2xl overflow-hidden">
        <img
          src={productImage}
          alt={productName}
          className="w-full h-full object-cover animate-showcase-zoom"
        />
        {/* Subtle overlay shimmer */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
        <div className="absolute inset-0 animate-shimmer-sweep" />
      </div>

      {/* Product name */}
      <p className="text-sm font-medium text-[#f5f5f5] mb-6 text-center truncate max-w-[280px]">
        {productName}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c9a962] to-[#d4b872] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage text */}
      <p className="text-sm text-[#a0a0a0] animate-fade-in-up" key={stageIndex}>
        {currentStage.text}
      </p>

      <p className="text-xs text-[#4a4a4a] mt-3">
        This usually takes 20-30 seconds
      </p>

      {/* CSS animations via style tag */}
      <style>{`
        @keyframes showcase-zoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-showcase-zoom {
          animation: showcase-zoom 8s ease-in-out infinite;
        }
        @keyframes shimmer-sweep {
          0% { background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%); background-size: 200% 100%; background-position: 100% 0; }
          100% { background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%); background-size: 200% 100%; background-position: -100% 0; }
        }
        .animate-shimmer-sweep {
          animation: shimmer-sweep 3s ease-in-out infinite;
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};
