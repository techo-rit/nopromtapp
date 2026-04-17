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
        <div className="text-5xl mb-6">👗</div>
        <h2 className="font-['Playfair_Display'] text-2xl text-white mb-3">Your Digital Wardrobe</h2>
        <p className="text-[14px] text-[#777] max-w-[300px] mb-8 leading-relaxed">
          Upload your clothes, get AI-styled outfits, and find what's missing.
        </p>
        <button
          onClick={onLoginRequired}
          className="px-8 py-3 rounded-xl text-[13px] uppercase tracking-[0.15em] font-semibold
            bg-gradient-to-r from-[#c9a962] to-[#d4b872] text-[#0a0a0a]
            hover:from-[#d4b872] hover:to-[#c9a962] active:scale-[0.98] transition-all"
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
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1e1e1e]">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="font-['Playfair_Display'] text-xl text-white">My Closet</h1>
          <div className="flex items-center gap-2">
            {/* Concierge button */}
            <button
              onClick={() => navigate('/chat')}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a962]/20 to-[#d4b872]/10
                border border-[#c9a962]/30 flex items-center justify-center
                hover:border-[#c9a962]/60 transition-colors"
            >
              <span className="text-[14px]">✨</span>
            </button>

            {/* Gaps button */}
            {gaps.length > 0 && (
              <button
                onClick={() => setShowGaps(!showGaps)}
                className="relative w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]
                  flex items-center justify-center hover:border-[#c9a962]/40 transition-colors"
              >
                <span className="text-[14px]">🎯</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#c9a962] rounded-full text-[9px] font-bold text-[#0a0a0a] flex items-center justify-center">
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
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#c9a962] to-[#d4b872] rounded-full transition-all duration-500"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-[#666] shrink-0">{syncMessage}</span>
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
                  ? 'text-[#c9a962] border-[#c9a962]'
                  : 'text-[#555] border-transparent hover:text-[#888]'
              }`}
            >
              {tab === 'sets' ? 'Sets' : 'All Items'}
            </button>
          ))}

          {/* Sync button in tab bar */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-auto pb-2.5 text-[12px] font-semibold tracking-wide text-[#c9a962]
              hover:text-[#d4b872] disabled:opacity-40 transition-colors flex items-center gap-1.5"
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
        <div className="px-4 py-4 space-y-3 border-b border-[#1e1e1e]">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#666] font-semibold">Wardrobe Gaps</h3>
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
          bg-gradient-to-br from-[#c9a962] to-[#d4b872] shadow-lg shadow-[#c9a962]/20
          flex items-center justify-center
          active:scale-90 transition-transform disabled:opacity-50"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round">
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
