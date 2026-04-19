import React from 'react';
import type { WardrobeGap } from '../../types';

interface GapCardProps {
  gap: WardrobeGap;
  onShop?: (gap: WardrobeGap) => void;
}

const GAP_ICONS: Record<string, string> = {
  occasion: 'calendar',
  aesthetic: 'palette',
  season: 'sun',
  color_palette: 'palette',
  versatility: 'refresh',
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/5',
  medium: 'border-gold/30 bg-gold/5',
  low: 'border-border bg-surface',
};

const GapIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'calendar': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'sun': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
    case 'palette': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="11" r="1.5" fill="currentColor"/><circle cx="10" cy="16" r="1.5" fill="currentColor"/></svg>;
    case 'refresh': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
    default: return <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-gold)"><path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>;
  }
};

export const GapCard: React.FC<GapCardProps> = ({ gap, onShop }) => {
  const severityLevel = gap.severity >= 0.7 ? 'high' : gap.severity >= 0.4 ? 'medium' : 'low';
  const iconType = GAP_ICONS[gap.gap_type] || 'star';

  return (
    <div className={`rounded-[var(--radius-card)] border p-4 space-y-3 transition-all duration-200 hover:scale-[1.01] ${SEVERITY_COLORS[severityLevel] || SEVERITY_COLORS.medium}`}>
      <div className="flex items-start gap-3">
        <span className="text-secondary mt-0.5"><GapIcon type={iconType} /></span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white leading-tight">
            {gap.headline}
          </h4>
          {gap.description && (
            <p className="text-[12px] text-secondary mt-1 leading-relaxed">
              {gap.description}
            </p>
          )}
        </div>
      </div>

      {/* Trigger copy */}
      {gap.trigger_copy && (
        <p className="text-[11px] italic text-gold/80 pl-9">
          {gap.trigger_copy}
        </p>
      )}


      {onShop && (
        <button
          onClick={() => onShop(gap)}
          className="ml-9 text-[11px] uppercase tracking-[0.12em] font-semibold text-gold hover:text-gold-hover transition-colors"
        >
          Shop the fix →
        </button>
      )}
    </div>
  );
};
