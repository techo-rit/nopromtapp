import React, { useEffect, useState, useCallback } from 'react';
import { SmartSelfieModal } from '../camera/SmartSelfieModal';
import { getSavedSelfies, saveSelfie, deleteSavedSelfie, activateSelfie, SavedSelfie } from './savedSelfieService';

interface SavedSelfiesGalleryProps {
  activePhotoUrl: string | null;
  onActivePhotoChanged: (url: string | null) => void;
}

export const SavedSelfiesGallery: React.FC<SavedSelfiesGalleryProps> = ({
  activePhotoUrl,
  onActivePhotoChanged,
}) => {
  const [selfies, setSelfies] = useState<SavedSelfie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSavedSelfies();
      setSelfies(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCameraCapture = async (file: File) => {
    setShowCamera(false);
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { profilePhotoUrl } = await saveSelfie(dataUrl);
      onActivePhotoChanged(profilePhotoUrl);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save selfie');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { profilePhotoUrl } = await saveSelfie(dataUrl);
      onActivePhotoChanged(profilePhotoUrl);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save selfie');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (selfie: SavedSelfie) => {
    if (selfie.url === activePhotoUrl) return;
    setActivating(selfie.id);
    try {
      const url = await activateSelfie(selfie.id);
      onActivePhotoChanged(url);
    } catch (err: any) {
      setError(err.message || 'Failed to set active selfie');
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (selfie: SavedSelfie) => {
    setDeleting(selfie.id);
    setError(null);
    try {
      await deleteSavedSelfie(selfie.id);
      if (selfie.url === activePhotoUrl) {
        const remaining = selfies.filter(s => s.id !== selfie.id);
        onActivePhotoChanged(remaining[0]?.url || null);
      }
      setSelfies(prev => prev.filter(s => s.id !== selfie.id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete selfie');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Add buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowCamera(true)}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Take Selfie
        </button>
        <span className="text-[#2a2a2a]">|</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
          className="text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors disabled:opacity-50"
        >
          Upload Photo
        </button>
        {saving && <span className="text-xs text-[#6b6b6b] ml-1">Saving…</span>}
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : selfies.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-center">
          <svg className="w-10 h-10 text-[#2a2a2a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-[#4a4a4a]">No saved selfies yet</p>
          <p className="text-xs text-[#3a3a3a]">Take a selfie or upload a photo to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {selfies.map(selfie => {
            const isActive = selfie.url === activePhotoUrl;
            const isDeleting = deleting === selfie.id;
            const isActivating = activating === selfie.id;
            return (
              <div key={selfie.id} className="relative aspect-square group">
                <button
                  onClick={() => handleActivate(selfie)}
                  className="w-full h-full rounded-xl overflow-hidden transition-all"
                  style={{ outline: isActive ? '2px solid #d4b872' : 'none', outlineOffset: '2px' }}
                  disabled={isActivating}
                  title={isActive ? 'Active for try-on' : 'Tap to use for try-on'}
                >
                  <img
                    src={selfie.url}
                    alt="Saved selfie"
                    className="w-full h-full object-cover"
                  />
                  {(isDeleting || isActivating) && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-[#d4b872] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {isActive && !isDeleting && (
                    <div className="absolute bottom-1.5 left-1.5 bg-[#d4b872] text-[#0a0a0a] text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full uppercase">
                      Active
                    </div>
                  )}
                </button>
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(selfie); }}
                  disabled={isDeleting}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                  aria-label="Delete selfie"
                >
                  <svg className="w-2.5 h-2.5 text-[#f5f5f5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selfies.length > 0 && (
        <p className="text-[11px] text-[#4a4a4a] mt-3">Tap a selfie to make it active for try-on</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      <SmartSelfieModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
