import React from 'react';
import type { WardrobeGap } from '../../types';

interface GapCardProps {
  gap: WardrobeGap;
  onShop?: (gap: WardrobeGap) => void;
}

const GAP_ICONS: Record<string, string> = {
  occasion: '🎯',
  aesthetic: '🎨',
  season: '☀️',
  color_palette: '🎨',
  versatility: '🔄',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-[#c9a962]/30 bg-[#c9a962]/5',
  low: 'border-[#333] bg-[#111]',
};

export const GapCard: React.FC<GapCardProps> = ({ gap, onShop }) => {
  const severityLevel = gap.severity >= 0.7 ? 'high' : gap.severity >= 0.4 ? 'medium' : 'low';
  const icon = GAP_ICONS[gap.gap_type] || '✨';

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all duration-200 hover:scale-[1.01] ${SEVERITY_COLORS[severityLevel] || SEVERITY_COLORS.medium}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white leading-tight">
            {gap.headline}
          </h4>
          {gap.description && (
            <p className="text-[12px] text-[#777] mt-1 leading-relaxed">
              {gap.description}
            </p>
          )}
        </div>
      </div>

      {/* Trigger copy */}
      {gap.trigger_copy && (
        <p className="text-[11px] italic text-[#c9a962]/80 pl-9">
          {gap.trigger_copy}
        </p>
      )}


      {onShop && (
        <button
          onClick={() => onShop(gap)}
          className="ml-9 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#c9a962] hover:text-[#d4b872] transition-colors"
        >
          Shop the fix →
        </button>
      )}
    </div>
  );
};
