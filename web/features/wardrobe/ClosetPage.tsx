import React, { useState, useRef, useCallback, useEffect } from 'react';
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

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

type Tab = 'sets' | 'all';
type SyncResult = { type: 'success' | 'error' | 'info'; message: string } | null;

export const ClosetPage: React.FC<ClosetPageProps> = ({ user, onLoginRequired }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('sets');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [gaps, setGaps] = useState<WardrobeGap[]>([]);
  const [showGaps, setShowGaps] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss upload sheet after all done
  useEffect(() => {
    if (uploadQueue.length === 0) return;
    const allSettled = uploadQueue.every(i => i.status === 'done' || i.status === 'error');
    if (!allSettled) return;
    dismissTimerRef.current = setTimeout(() => {
      setUploadQueue(prev => {
        prev.forEach(i => URL.revokeObjectURL(i.previewUrl));
        return [];
      });
    }, 3000);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [uploadQueue]);

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
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    const MAX_FILES = 30;

    const rawFiles = Array.from(e.target.files || []);
    const validFiles = rawFiles.filter(f => ALLOWED_TYPES.has(f.type)).slice(0, MAX_FILES);
    if (!validFiles.length) return;

    // Build queue with preview URLs
    const items: UploadItem[] = validFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setUploadQueue(items);
    setUploading(true);
    if (fileInputRef.current) fileInputRef.current.value = '';

    let anySuccess = false;

    for (const item of items) {
      setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });
        await uploadGarment(base64, item.file.type);
        anySuccess = true;
        setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'done' } : i));
      } catch (err) {
        setUploadQueue(q => q.map(i => i.id === item.id ? {
          ...i,
          status: 'error',
          errorMsg: err instanceof Error ? err.message : 'Upload failed',
        } : i));
      }
    }

    if (anySuccess) setRefreshTrigger(prev => prev + 1);
    setUploading(false);
  };

  const handleSync = useCallback(() => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncResult({ type: 'info', message: 'Starting sync...' });

    syncAbortRef.current = startSync(
      (event: WardrobeSyncEvent) => {
        if (event.message) setSyncResult({ type: 'info', message: event.message });
        if (event.progress != null) setSyncProgress(event.progress);
        if (event.type === 'complete' || event.type === 'error') {
          setSyncing(false);
          setSyncResult({
            type: event.type === 'complete' ? 'success' : 'error',
            message: event.message || (event.type === 'error' ? 'Sync failed. Try again.' : 'Sync complete.'),
          });
          if (event.type === 'complete') {
            setRefreshTrigger(prev => prev + 1);
            getGaps().then(data => setGaps(data.gaps)).catch(() => {});
          }
        }
      },
      () => {
        setSyncing(false);
        setSyncResult({ type: 'error', message: 'Sync failed. Check connection and try again.' });
      },
      () => setSyncing(false),
    );
  }, [syncing]);

  const handleTryOn = (_outfit: WardrobeOutfit) => {
    // Navigate to changing room with outfit context — future enhancement
  };

  const handleShopGap = (_gap: WardrobeGap) => {
    // Navigate to shop with gap filters — future enhancement
  };

  return (
    <div className="h-full overflow-y-auto bg-base pb-24">
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

        {/* Sync progress bar (only while running) */}
        {syncing && (
          <div className="px-4 pb-2">
            <div className="flex-1 h-0.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-700 ease-out"
                style={{ width: syncProgress > 0 ? `${syncProgress}%` : '15%' }}
              />
            </div>
          </div>
        )}

        {/* Sync result banner (persists after sync) */}
        {!syncing && syncResult && (
          <div className={`mx-4 mb-2.5 px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-[12px] font-medium
            ${syncResult.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : syncResult.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-surface border border-border text-secondary'}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {syncResult.type === 'error' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
              {syncResult.type === 'success' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              <span className="truncate">{syncResult.message}</span>
            </div>
            <button
              onClick={() => setSyncResult(null)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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

          {/* Sync button */}
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

      {/* Upload Progress Sheet */}
      {uploadQueue.length > 0 && (
        <UploadProgressSheet queue={uploadQueue} onDismiss={() => {
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          setUploadQueue(prev => {
            prev.forEach(i => URL.revokeObjectURL(i.previewUrl));
            return [];
          });
        }} />
      )}

      {/* Hidden file input — multiple, up to 10 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

// ── Upload Progress Sheet ──────────────────────────────────────────

interface UploadProgressSheetProps {
  queue: UploadItem[];
  onDismiss: () => void;
}

const UploadProgressSheet: React.FC<UploadProgressSheetProps> = ({ queue, onDismiss }) => {
  const done = queue.filter(i => i.status === 'done').length;
  const errors = queue.filter(i => i.status === 'error').length;
  const total = queue.length;
  const allSettled = done + errors === total;
  const progress = Math.round(((done + errors) / total) * 100);

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-50 rounded-2xl overflow-hidden
        border border-white/10 shadow-2xl"
      style={{
        background: 'rgba(18,18,18,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Thin progress bar at top */}
      <div className="h-0.5 bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${allSettled && errors === total ? 'bg-red-500' : 'bg-gold'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {allSettled ? (
              errors === total ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              )
            ) : (
              <div className="w-3.5 h-3.5 border-2 rounded-full border-t-transparent animate-spin" style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }} />
            )}
            <span className="text-[13px] font-semibold text-white">
              {allSettled
                ? errors === 0 ? `${done} photo${done !== 1 ? 's' : ''} added`
                  : errors === total ? `Upload failed`
                  : `${done} added, ${errors} failed`
                : `Uploading ${done + errors + 1} of ${total}…`}
            </span>
          </div>
          {allSettled && (
            <button
              onClick={onDismiss}
              className="w-6 h-6 rounded-full flex items-center justify-center
                text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Thumbnail row */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {queue.map(item => (
            <div key={item.id} className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden">
              {/* Image or skeleton */}
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-white/5 animate-pulse" />
              )}

              {/* Status overlay */}
              {item.status === 'pending' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20" />
                </div>
              )}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ animation: 'shimmer 1.2s infinite', left: '-3rem' }}
                    />
                  </div>
                  <div className="w-4 h-4 border-2 rounded-full border-t-transparent animate-spin relative z-10"
                    style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
                  />
                </div>
              )}
              {item.status === 'done' && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/90 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(3.5rem * 4 + 100%)); }
        }
      `}</style>
    </div>
  );
};
