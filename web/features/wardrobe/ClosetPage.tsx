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
            bg-gold text-base hover:bg-gold-hover active:scale-[0.97] transition-all
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
    <div className="min-h-screen bg-base pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="font-display text-xl text-primary">My Closet</h1>
          <div className="flex items-center gap-2">
            {/* Concierge button */}
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 rounded-full bg-gold-subtle
                border border-gold/30 flex items-center justify-center
                hover:border-gold/60 transition-colors min-w-[44px] min-h-[44px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-gold)"><path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"/></svg>
            </button>

            {/* Gaps button */}
            {gaps.length > 0 && (
              <button
                onClick={() => setShowGaps(!showGaps)}
                className="relative w-9 h-9 rounded-full bg-surface border border-border
                  flex items-center justify-center hover:border-gold/40 transition-colors min-w-[44px] min-h-[44px]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold rounded-full text-[9px] font-bold text-base flex items-center justify-center">
                  {gaps.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sync bar */}
        {syncing && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-tertiary shrink-0">{syncMessage}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex px-4 gap-6">
          {(['sets', 'all'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-[13px] font-semibold tracking-wide transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-gold border-gold'
                  : 'text-tertiary border-transparent hover:text-secondary'
              }`}
            >
              {tab === 'sets' ? 'Sets' : 'All Items'}
            </button>
          ))}

          {/* Sync button in tab bar */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-auto pb-2.5 text-[12px] font-semibold tracking-wide text-gold
              hover:text-gold-hover disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={syncing ? 'animate-spin' : ''}
            >
              <polyline points="23,4 23,10 17,10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Sync Pairs
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
          <SetsView onTryOn={handleTryOn} refreshTrigger={refreshTrigger} />
        ) : (
          <AllItemsView refreshTrigger={refreshTrigger} onUpload={() => fileInputRef.current?.click()} />
        )}
      </div>

      {/* Upload FAB */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full z-40
          bg-gold shadow-lg shadow-gold/20
          flex items-center justify-center
          active:scale-90 transition-transform disabled:opacity-50"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-base border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-base)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
