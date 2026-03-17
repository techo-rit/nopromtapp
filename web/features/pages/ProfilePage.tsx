import React, { useState, useEffect, useCallback } from 'react';
import { profileService } from '../profile/profileService';
import type { User, UserAddress, GeneratedImage } from '../../types';

const stripCountryCode = (p: string) => { const d = (p || '').replace(/\D/g, ''); return d.length === 12 && d.startsWith('91') ? d.slice(2) : d; };

interface ProfilePageProps {
  user: User;
  onProfileUpdate: () => void;
  onBack: () => void;
  onLogout: () => void;
  onUpgrade?: () => void;
}

const AGE_RANGES = [
  { id: 'gen_z', label: 'Gen Z', desc: '1997 – 2012' },
  { id: 'millennial', label: 'Millennial', desc: '1981 – 1996' },
  { id: 'gen_x', label: 'Gen X', desc: '1965 – 1980' },
  { id: 'boomer', label: 'Boomer', desc: '1946 – 1964' },
];

const PRIMARY_COLORS = [
  { id: 'red', label: 'Red', hex: '#EF4444' },
  { id: 'blue', label: 'Blue', hex: '#3B82F6' },
  { id: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { id: 'green', label: 'Green', hex: '#22C55E' },
  { id: 'orange', label: 'Orange', hex: '#F97316' },
  { id: 'purple', label: 'Purple', hex: '#A855F7' },
  { id: 'pink', label: 'Pink', hex: '#EC4899' },
  { id: 'black', label: 'Black', hex: '#1a1a1a' },
  { id: 'white', label: 'White', hex: '#f5f5f5' },
  { id: 'brown', label: 'Brown', hex: '#92400E' },
  { id: 'navy', label: 'Navy', hex: '#1E3A5F' },
  { id: 'teal', label: 'Teal', hex: '#14B8A6' },
];

const STYLES = [
  { id: 'casual', label: 'Casual', icon: '👕' },
  { id: 'formal', label: 'Formal', icon: '👔' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'beachwear', label: 'Beachwear', icon: '🏖️' },
  { id: 'streetwear', label: 'Streetwear', icon: '🧢' },
  { id: 'ethnic', label: 'Ethnic', icon: '🪷' },
  { id: 'sporty', label: 'Sporty', icon: '⚽' },
  { id: 'minimalist', label: 'Minimalist', icon: '◻️' },
];

const FIT_SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const FIT_LABELS: Record<string, string> = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL' };

const BODY_TYPES = [
  { id: 'hourglass', label: 'Hourglass' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'inverted_triangle', label: 'Inv. Triangle' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'round', label: 'Round' },
];

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    ? `${months[d.getMonth()]} ${d.getDate()}`
    : `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onProfileUpdate,
  onBack,
  onLogout,
  onUpgrade,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [cachedProfile, setCachedProfile] = useState<null | {
    name: string;
    phone: string;
    ageRange: string;
    colors: string[];
    styles: string[];
    fit: string;
    bodyType: string;
  }>(null);

  // Form fields
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(stripCountryCode(user.phone || ''));
  const [ageRange, setAgeRange] = useState(user.ageRange || '');
  const [colors, setColors] = useState<string[]>(user.colors || []);
  const [styles, setStyles] = useState<string[]>(user.styles || []);
  const [fit, setFit] = useState(user.fit || '');
  const [bodyType, setBodyType] = useState(user.bodyType || '');

  // Addresses
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('Home');

  useEffect(() => {
    setName(user.name || '');
    setPhone(stripCountryCode(user.phone || ''));
    setAgeRange(user.ageRange || '');
    setColors(user.colors || []);
    setStyles(user.styles || []);
    setFit(user.fit || '');
    setBodyType(user.bodyType || '');
    setCachedProfile({
      name: (user.name || '').trim(),
      phone: (user.phone || '').trim(),
      ageRange: user.ageRange || '',
      colors: user.colors || [],
      styles: user.styles || [],
      fit: user.fit || '',
      bodyType: user.bodyType || '',
    });
    loadAddresses();
    loadGallery();
  }, [user]);

  const loadAddresses = useCallback(async () => {
    try {
      const addrs = await profileService.getAddresses();
      setAddresses(addrs);
    } catch { /* ignore */ }
  }, []);

  const loadGallery = useCallback(async (force = false) => {
    setIsGalleryLoading(true);
    try {
      const { generations: imgs } = await profileService.getGenerations(force);
      setGenerations(imgs);
    } catch { /* ignore */ } finally {
      setIsGalleryLoading(false);
    }
  }, []);

  const handleDeleteGeneration = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await profileService.deleteGeneration(id);
      setGenerations(prev => prev.filter(g => g.id !== id));
      setLightboxImage(prev => prev?.id === id ? null : prev);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDeleteAllGenerations = useCallback(async () => {
    setConfirmClearAll(false);
    setIsDeletingAll(true);
    try {
      await profileService.deleteAllGenerations();
      setGenerations([]);
      setLightboxImage(null);
    } catch (err: any) {
      setError(err.message || 'Failed to clear gallery');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsDeletingAll(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!name.trim()) { setError('Name is required'); setIsLoading(false); return; }
      if (phone.trim() && phone.trim().length < 10) { setError('Enter a valid phone number'); setIsLoading(false); return; }
      if (!fit) { setError('Fit size is required'); setIsLoading(false); return; }
      if (!bodyType) { setError('Body type is required'); setIsLoading(false); return; }

      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const hasChanges = !cachedProfile
        || trimmedName !== cachedProfile.name
        || trimmedPhone !== cachedProfile.phone
        || (ageRange || '') !== cachedProfile.ageRange
        || !arraysEqual(colors, cachedProfile.colors)
        || !arraysEqual(styles, cachedProfile.styles)
        || fit !== cachedProfile.fit
        || bodyType !== cachedProfile.bodyType;

      if (!hasChanges) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(null), 3000);
        setIsLoading(false);
        return;
      }

      const updates: Record<string, any> = {
        name: trimmedName,
      };
      if (trimmedPhone) updates.phone = trimmedPhone;

      if (ageRange) updates.ageRange = ageRange;
      if (colors.length > 0) updates.colors = colors;
      if (styles.length > 0) updates.styles = styles;
      updates.fit = fit;
      updates.bodyType = bodyType;

      await profileService.updateProfile(updates);
      setSuccess('Profile updated successfully');
      setCachedProfile({
        name: trimmedName,
        phone: trimmedPhone,
        ageRange: ageRange || '',
        colors: [...colors],
        styles: [...styles],
        fit,
        bodyType,
      });
      onProfileUpdate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, ageRange, colors, styles, fit, bodyType, cachedProfile, onProfileUpdate]);

  const handleAddAddress = useCallback(async () => {
    if (!newAddress.trim()) return;
    try {
      await profileService.addAddress({
        label: newLabel,
        addressLine: newAddress.trim(),
      });
      setNewAddress('');
      setNewLabel('Home');
      loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to add address');
      setTimeout(() => setError(null), 4000);
    }
  }, [newAddress, newLabel, loadAddresses]);

  const handleDeleteAddress = useCallback(async (id: string) => {
    try {
      await profileService.deleteAddress(id);
      loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
      setTimeout(() => setError(null), 4000);
    }
  }, [loadAddresses]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await profileService.getProfile(true);
      const addrs = await profileService.getAddresses(true);
      if (data?.profile) {
        const p = data.profile;
        setName(p.name || '');
        setPhone(stripCountryCode(p.phone || ''));
        setAgeRange(p.ageRange || '');
        setColors(p.colors || []);
        setStyles(p.styles || []);
        setFit(p.fit || '');
        setBodyType(p.bodyType || '');
        setCachedProfile({
          name: (p.name || '').trim(),
          phone: (p.phone || '').trim(),
          ageRange: p.ageRange || '',
          colors: p.colors || [],
          styles: p.styles || [],
          fit: p.fit || '',
          bodyType: p.bodyType || '',
        });
      }
      setAddresses(addrs);
      loadGallery(true);
      onProfileUpdate();
      setSuccess('Profile refreshed');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [onProfileUpdate]);

  const toggleColor = (id: string) => {
    setColors(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const toggleStyle = (id: string) => {
    setStyles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    return aSorted.every((val, idx) => val === bSorted[idx]);
  };

  const avatarUrl = user.avatarUrl || null;
  const accountLabel = user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1);
  const monthlyRemaining = Math.max(user.monthlyQuota - user.monthlyUsed, 0);

  return (
    <>
    {/* Lightbox */}
    {lightboxImage && (
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
        onClick={() => setLightboxImage(null)}
      >
        <div
          className="relative flex flex-col items-center max-w-[min(90vw,480px)] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
          <img
            src={lightboxImage.imageUrl}
            alt={lightboxImage.templateName || 'Creation'}
            className="w-full max-h-[75vh] object-contain rounded-2xl border border-[#2a2a2a]"
          />
          <div className="mt-3 w-full flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lightboxImage.mode === 'tryon' ? 'bg-[#60a5fa]/15 text-[#60a5fa] border border-[#60a5fa]/30' : 'bg-[#c9a962]/15 text-[#c9a962] border border-[#c9a962]/30'}`}>
                {lightboxImage.mode === 'tryon' ? 'Try-on' : 'Remix'}
              </span>
              {lightboxImage.templateName && (
                <span className="text-sm text-[#a0a0a0] truncate max-w-[180px]">{lightboxImage.templateName}</span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-[#6b6b6b]">{formatDate(lightboxImage.createdAt)}</span>
              <button
                onClick={() => handleDeleteGeneration(lightboxImage.id)}
                disabled={deletingId === lightboxImage.id}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
              >
                {deletingId === lightboxImage.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="w-full h-full overflow-y-auto bg-[#0a0a0a] scrollbar-hide">
      <div className="max-w-[600px] mx-auto px-4 py-6 pb-[100px]">

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#2a2a2a]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#c9a962] flex items-center justify-center text-[#0a0a0a] text-2xl font-bold">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-[#f5f5f5] truncate">{user.name}</h1>
            <p className="text-xs text-[#c9a962] mt-0.5">{accountLabel} account • {user.creationsLeft} left</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 px-3 rounded-lg border border-[#2a2a2a] text-xs font-medium text-[#a0a0a0] hover:text-[#f5f5f5] hover:border-[#3a3a3a] transition-all disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* Notifications (fixed) */}
        {(error || success) && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-[520px]">
            {error && (
              <div className="mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 shadow-lg backdrop-blur">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 shadow-lg backdrop-blur">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <p className="text-sm text-green-400">{success}</p>
                <button onClick={() => setSuccess(null)} className="ml-auto text-green-400/60 hover:text-green-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section: Account & Usage */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>💳</span> Account & Usage
          </h2>
          <div className="space-y-3 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#6b6b6b]">Account Type</p>
                <p className="text-sm text-[#f5f5f5] font-medium">{accountLabel}</p>
              </div>
              {user.accountType !== 'ultimate' && onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="h-9 px-3 rounded-lg border border-[#2a2a2a] text-xs font-medium text-[#c9a962] hover:text-[#f5f5f5] hover:border-[#c9a962]/50 transition-all"
                >
                  Upgrade
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]">
                <p className="text-[11px] text-[#6b6b6b]">Monthly used</p>
                <p className="text-sm text-[#f5f5f5]">{user.monthlyUsed}/{user.monthlyQuota}</p>
              </div>
              <div className="p-3 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]">
                <p className="text-[11px] text-[#6b6b6b]">Monthly left</p>
                <p className="text-sm text-[#f5f5f5]">{monthlyRemaining}</p>
              </div>
              <div className="p-3 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]">
                <p className="text-[11px] text-[#6b6b6b]">Extra creations</p>
                <p className="text-sm text-[#f5f5f5]">{user.extraCredits}</p>
              </div>
              <div className="p-3 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a]">
                <p className="text-[11px] text-[#6b6b6b]">Total left</p>
                <p className="text-sm text-[#f5f5f5]">{user.creationsLeft}</p>
              </div>
            </div>

            <p className="text-[11px] text-[#6b6b6b] leading-relaxed">
              Your account starts with 8 creations: 5 welcome bonus creations plus 3 monthly free creations.
              Monthly free creations reset on the 1st of every month (UTC).
            </p>
          </div>
        </section>

        {/* Section: My Creations Gallery */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#c9a962] flex items-center gap-2">
              <span>✦</span> My Creations
              {!isGalleryLoading && generations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#c9a962]/10 text-[#c9a962] text-[10px] font-medium border border-[#c9a962]/20">
                  {generations.length}
                </span>
              )}
            </h2>
            {!isGalleryLoading && generations.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadGallery(true)}
                  className="text-[11px] text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors"
                >
                  Refresh
                </button>
                {confirmClearAll ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#6b6b6b]">Sure?</span>
                    <button
                      onClick={handleDeleteAllGenerations}
                      disabled={isDeletingAll}
                      className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {isDeletingAll ? 'Clearing…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmClearAll(false)}
                      className="text-[11px] text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearAll(true)}
                    className="text-[11px] text-[#6b6b6b] hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            )}
          </div>

          {isGalleryLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#141414] animate-pulse" />
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 bg-[#121212] border border-[#1a1a1a] rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#3a3a3a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9" strokeLinecap="round" />
                  <path d="M16 3l2 2-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 7l-2-2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#3a3a3a]">No creations yet</p>
                <p className="text-xs text-[#2a2a2a] mt-1">Your generated looks will appear here</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-[#141414] border border-[#1a1a1a] hover:border-[#3a3a3a] transition-all cursor-pointer"
                  onClick={() => deletingId !== gen.id && setLightboxImage(gen)}
                >
                  <img
                    src={gen.imageUrl}
                    alt={gen.templateName || 'Creation'}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  {/* Mode badge on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-6 pb-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${gen.mode === 'tryon' ? 'bg-[#60a5fa]/20 text-[#60a5fa]' : 'bg-[#c9a962]/20 text-[#c9a962]'}`}>
                      {gen.mode === 'tryon' ? 'Try-on' : 'Remix'}
                    </span>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGeneration(gen.id); }}
                    disabled={deletingId === gen.id}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-[#6b6b6b] hover:text-red-400 hover:bg-black/85 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-100 active:scale-90"
                    aria-label="Delete"
                  >
                    {deletingId === gen.id ? (
                      <svg className="w-3 h-3 animate-spin text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Personal Info */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>👤</span> Personal Info
          </h2>
          <div className="space-y-3 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Full Name <span className="text-red-400">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full h-11 px-4 mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Phone <span className="text-[#525252]">(optional)</span></label>
              <div className="flex gap-2 mt-1">
                <span className="h-11 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#6b6b6b] flex items-center text-sm shrink-0">+91</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number"
                  className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Generation <span className="text-[#525252]">(optional)</span></label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {AGE_RANGES.map((a) => (
                  <button key={a.id} onClick={() => setAgeRange(ageRange === a.id ? '' : a.id)}
                    className={`p-3 rounded-xl border text-left text-sm transition-all ${ageRange === a.id ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#f5f5f5]' : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'}`}>
                    <p className="font-medium text-xs">{a.label}</p>
                    <p className="text-[10px] text-[#6b6b6b]">{a.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Colors */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>🎨</span> Color Preferences
          </h2>
          <div className="space-y-4 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Favorite colors <span className="text-red-400">*</span> (up to 3)</label>
              <div className="grid grid-cols-4 gap-2">
                {PRIMARY_COLORS.map((c) => {
                  const sel = colors.includes(c.id);
                  const dis = !sel && colors.length >= 3;
                  return (
                    <button key={c.id} onClick={() => !dis && toggleColor(c.id)} disabled={dis}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${sel ? 'border-[#c9a962] bg-[#c9a962]/10' : dis ? 'opacity-40 border-[#1a1a1a]' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
                      <div className={`w-7 h-7 rounded-full border-2 ${sel ? 'border-[#c9a962]' : 'border-[#3a3a3a]'}`} style={{ backgroundColor: c.hex }} />
                      <span className="text-[10px] text-[#a0a0a0]">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Styles */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>✨</span> Style Preferences
          </h2>
          <div className="grid grid-cols-2 gap-3 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            {STYLES.map((s) => {
              const sel = styles.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleStyle(s.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${sel ? 'border-[#c9a962] bg-[#c9a962]/10' : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'}`}>
                  <span className="text-2xl">{s.icon}</span>
                  <span className={`text-sm font-medium ${sel ? 'text-[#f5f5f5]' : 'text-[#a0a0a0]'}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Fit & Body */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>📐</span> Fit & Body Type
          </h2>
          <div className="space-y-4 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Fit size <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {FIT_SIZES.map((s) => (
                  <button key={s} onClick={() => setFit(fit === s ? '' : s)}
                    className={`h-11 rounded-xl border font-semibold text-sm transition-all ${fit === s ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]' : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'}`}>
                    {FIT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Body type <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {BODY_TYPES.map((b) => (
                  <button key={b.id} onClick={() => setBodyType(bodyType === b.id ? '' : b.id)}
                    className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${bodyType === b.id ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]' : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Addresses */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>🏠</span> Saved Addresses
          </h2>
          <div className="space-y-3 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            {addresses.length === 0 && (
              <p className="text-sm text-[#525252] text-center py-3">No saved addresses yet</p>
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[#c9a962]">{addr.label}</p>
                  <p className="text-sm text-[#a0a0a0] mt-0.5">{addr.addressLine}</p>
                  {addr.city && <p className="text-xs text-[#6b6b6b] mt-0.5">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.pincode || ''}</p>}
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 text-[#6b6b6b] hover:text-red-400 transition-colors shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            <div className="border-t border-[#1a1a1a] pt-3">
              <p className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2">Add new address</p>
              <div className="flex gap-2 mb-2">
                {['Home', 'Work', 'Other'].map((l) => (
                  <button key={l} onClick={() => setNewLabel(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${newLabel === l ? 'bg-[#c9a962]/15 text-[#c9a962] border border-[#c9a962]/30' : 'bg-[#1a1a1a] text-[#6b6b6b]'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Enter address"
                className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm" />
              <button onClick={handleAddAddress} disabled={!newAddress.trim()}
                className="w-full h-10 mt-2 bg-[#1a1a1a] text-[#a0a0a0] text-sm font-medium rounded-xl border border-[#2a2a2a] hover:border-[#c9a962]/30 hover:text-[#f5f5f5] disabled:opacity-40 transition-all">
                + Add Address
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-12 bg-[#c9a962] text-[#0a0a0a] font-semibold text-sm rounded-xl hover:bg-[#d4b872] active:scale-[0.98] disabled:opacity-50 transition-all shadow-[0_0_20px_-5px_rgba(201,169,98,0.3)] mb-4"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full h-11 text-sm font-medium text-red-400 border border-red-400/20 rounded-xl hover:bg-red-400/5 transition-all"
        >
          Log Out
        </button>
      </div>
    </div>
    </>
  );
};
