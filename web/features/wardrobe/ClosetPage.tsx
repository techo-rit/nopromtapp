import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WardrobeOutfit, WardrobeGap, WardrobeSyncEvent } from '../../types';
import { uploadGarment, startSync, getGaps } from './wardrobeService';
import { SetsView } from './SetsView';
import { AllItemsView } from './AllItemsView';
import { GapCard } from './GapCard';

interface ClosetPageProps {
  user: any;
  onLoginRequired?: () => void;
}

type Tab = 'sets' | 'all';

export const ClosetPage: React.FC<ClosetPageProps> = ({ user, onLoginRequired }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('sets');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [gaps, setGaps] = useState<WardrobeGap[]>([]);
  const [showGaps, setShowGaps] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncAbortRef = useRef<AbortController | null>(null);

  // Auth gate
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"><path d="M20.38 3.46L16 2 12 5.5 8 2 3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47c.06.37.29.7.62.89L8 13v9l4-3 4 3v-9l4.52-2.95c.33-.19.56-.52.62-.89l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>
        </div>
        <h2 className="font-display text-2xl text-primary mb-3">Your Digital Wardrobe</h2>
        <p className="text-[14px] text-secondary max-w-[300px] mb-8 leading-relaxed">
          Upload your clothes, get AI-styled outfits, and find what's missing.
        </p>
        <button
          onClick={onLoginRequired}
          className="px-8 py-3 rounded-[var(--radius-pill)] text-[13px] uppercase tracking-[0.15em] font-semibold
            bg-gold text-[#0a0a0a] hover:bg-gold-hover active:scale-[0.97] transition-all
            shadow-[0_0_24px_-4px_rgba(232,195,125,0.25)]"
          style={{ transitionTimingFunction: 'var(--ease-spring)' }}
        >
          Sign In to Start
        </button>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip data:...;base64,
        };
        reader.readAsDataURL(file);
      });

      await uploadGarment(base64, file.type);
      setRefreshTrigger(prev => prev + 1);
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSync = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Starting sync...');

    syncAbortRef.current = startSync(
      (event: WardrobeSyncEvent) => {
        setSyncMessage(event.message || '');
        if (event.progress != null) setSyncProgress(event.progress);
        if (event.type === 'complete' || event.type === 'error') {
          setSyncing(false);
          if (event.type === 'complete') {
            setRefreshTrigger(prev => prev + 1);
            // Load gaps after sync
            getGaps().then(data => setGaps(data.gaps)).catch(() => {});
          }
        }
      },
      () => {
        setSyncing(false);
        setSyncMessage('Sync failed. Try again.');
      },
      () => setSyncing(false),
    );
  }, [syncing]);

  const handleTryOn = (_outfit: WardrobeOutfit) => {
    // Navigate to changing room with outfit context — future enhancement
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleShopGap = (_gap: WardrobeGap) => {
    // Navigate to shop with gap filters — future enhancement
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-base pb-[120px]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-base/80 backdrop-blur-xl border-b border-white/5">
        <div className="pl-4 pr-3 pt-4 pb-2 flex items-center justify-between">
          <h1 className="font-display text-[22px] tracking-wide text-gold">CLOSET</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wishlist')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-[#0a0a0a] font-medium text-[11px] tracking-wide shadow-[0_4px_14px_rgba(255,255,255,0.08)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              WISHLIST
            </button>
          </div>
        </div>

        {/* Action Row */}
        <div className="px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-[#0a0a0a] active:scale-95 transition-transform"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-base border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2.5 h-11 px-5 rounded-full bg-primary text-[#0a0a0a] font-medium text-[13px] active:scale-95 transition-transform"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {syncing ? 'SYNCING...' : 'BUCKET'}
          </button>
        </div>

        {/* Sync Progress Bar */}
        {syncing && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-tertiary shrink-0 uppercase tracking-wider">{syncMessage}</span>
            </div>
          </div>
        )}

        {/* Tabs - horizontal scrolling */}
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('sets')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-[11px] uppercase tracking-wider font-semibold transition-colors duration-200 ${
              activeTab === 'sets'
                ? 'bg-gold text-[#0a0a0a]'
                : 'bg-elevated border border-white/5 text-tertiary hover:text-secondary'
            }`}
          >
            ALL OUTFITS
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-[11px] uppercase tracking-wider font-semibold transition-colors duration-200 ${
              activeTab === 'all'
                ? 'bg-gold text-[#0a0a0a]'
                : 'bg-elevated border border-white/5 text-tertiary hover:text-secondary'
            }`}
          >
            ALL ITEMS
          </button>
          <button
            disabled
            className="whitespace-nowrap px-5 py-2 rounded-full text-[11px] uppercase tracking-wider font-semibold bg-elevated border border-white/5 text-tertiary opacity-50"
          >
            OUTERWEAR
          </button>
          <button
            disabled
            className="whitespace-nowrap px-5 py-2 rounded-full text-[11px] uppercase tracking-wider font-semibold bg-elevated border border-white/5 text-tertiary opacity-50"
          >
            EVENING
          </button>
        </div>
      </div>

      {/* Gap cards (collapsible) */}
      {showGaps && gaps.length > 0 && (
        <div className="px-4 py-4 space-y-3 border-b border-border">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-tertiary font-semibold">Wardrobe Gaps</h3>
          {gaps.map((gap, i) => (
            <GapCard key={i} gap={gap} onShop={handleShopGap} />
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === 'sets' ? (
          <SetsView onTryOn={handleTryOn} refreshTrigger={refreshTrigger} onUpload={() => fileInputRef.current?.click()} />
        ) : (
          <AllItemsView refreshTrigger={refreshTrigger} onUpload={() => fileInputRef.current?.click()} />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Stylist Concierge Floating Input */}
      <div className="fixed bottom-[88px] inset-x-0 px-4 z-40">
        <button
          onClick={() => navigate('/search')}
          className="w-full h-14 bg-surface/95 backdrop-blur-xl border border-white/5 rounded-full flex items-center px-5 shadow-2xl active:scale-[0.98] transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-gold)" className="mr-3 shrink-0">
            <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/>
          </svg>
          <span className="flex-1 text-left text-[15px] font-medium text-tertiary">
            Ask your stylist...
          </span>
          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};
