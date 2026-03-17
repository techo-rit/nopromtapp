import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon, RefreshIcon } from '../../shared/ui/Icons';
import { profileService } from '../profile/profileService';
import { CONFIG } from '../../config';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName?: string;
  userPhone?: string;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

const AGE_RANGES = [
  { id: 'gen_z', label: 'Gen Z', desc: '1997 – 2012', icon: '⚡' },
  { id: 'millennial', label: 'Millennial', desc: '1981 – 1996', icon: '🌟' },
  { id: 'gen_x', label: 'Gen X', desc: '1965 – 1980', icon: '🎯' },
  { id: 'boomer', label: 'Boomer', desc: '1946 – 1964', icon: '🏆' },
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

const FIT_SIZES = [
  { id: 'xs', label: 'XS' },
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: 'xxl', label: 'XXL' },
];

const BODY_TYPES = [
  { id: 'hourglass', label: 'Hourglass', svg: (
    <svg viewBox="0 0 40 60" className="w-8 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 5 C10 5 8 20 20 30 C32 20 30 5 30 5" />
      <path d="M10 55 C10 55 8 40 20 30 C32 40 30 55 30 55" />
      <line x1="8" y1="5" x2="32" y2="5" />
      <line x1="8" y1="55" x2="32" y2="55" />
    </svg>
  )},
  { id: 'triangle', label: 'Triangle', svg: (
    <svg viewBox="0 0 40 60" className="w-8 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 5 L15 5 L25 5 L32 55 L8 55 Z" />
    </svg>
  )},
  { id: 'inverted_triangle', label: 'Inverted Triangle', svg: (
    <svg viewBox="0 0 40 60" className="w-8 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 5 L32 5 L25 55 L15 55 Z" />
    </svg>
  )},
  { id: 'rectangle', label: 'Rectangle', svg: (
    <svg viewBox="0 0 40 60" className="w-8 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="12" y="5" width="16" height="50" rx="2" />
    </svg>
  )},
  { id: 'round', label: 'Round', svg: (
    <svg viewBox="0 0 40 60" className="w-8 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="20" cy="30" rx="14" ry="25" />
    </svg>
  )},
];

const STEP_INFO = [
  { title: 'Your color palette', subtitle: 'Pick your favorite colors' },
  { title: 'Style DNA', subtitle: 'What\'s your everyday mood? Select all that resonate' },
  { title: 'Perfect fit', subtitle: 'Help us recommend the right sizes for you' },
  { title: 'Tell us about yourself', subtitle: 'Let\'s personalize your fashion journey' },
  { title: 'Your location', subtitle: 'For local fashion trends and delivery estimates' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userName = '',
  userPhone = '',
}) => {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cachedProfile, setCachedProfile] = useState<null | {
    name: string | null;
    phone: string | null;
    ageRange: string | null;
    colors: string[];
    styles: string[];
    fit: string | null;
    bodyType: string | null;
  }>(null);
  const [cachedAddress, setCachedAddress] = useState<null | {
    addressLine: string;
    lat: number | null;
    lng: number | null;
  }>(null);

  // Step 4
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(() => { const d = (userPhone || '').replace(/\D/g, ''); return d.length === 12 && d.startsWith('91') ? d.slice(2) : d; });
  const [ageRange, setAgeRange] = useState<string | null>(null);

  // Step 1
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  // Step 2
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Step 3
  const [fit, setFit] = useState<string | null>(null);
  const [bodyType, setBodyType] = useState<string | null>(null);

  // Step 5
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    const loadProfile = async () => {
      setStep(1);
      setError(null);
      try {
        const data = await profileService.getProfile();
        const profile = data?.profile || null;
        const addresses = await profileService.getAddresses();
        if (!alive) return;

        const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
        const addressLine = defaultAddress?.addressLine || '';

        setName((profile?.name || userName || '').trim());
        const rawPhone = (profile?.phone || userPhone || '').replace(/\D/g, '');
        setPhone(rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone);
        setAgeRange(profile?.ageRange || null);
        setSelectedColors(profile?.colors || []);
        setSelectedStyles(profile?.styles || []);
        setFit(profile?.fit || null);
        setBodyType(profile?.bodyType || null);
        setAddress(addressLine);
        setLat(defaultAddress?.lat ?? null);
        setLng(defaultAddress?.lng ?? null);
        setCachedProfile({
          name: profile?.name || null,
          phone: profile?.phone || null,
          ageRange: profile?.ageRange || null,
          colors: profile?.colors || [],
          styles: profile?.styles || [],
          fit: profile?.fit || null,
          bodyType: profile?.bodyType || null,
        });
        setCachedAddress(defaultAddress ? {
          addressLine: defaultAddress.addressLine || '',
          lat: defaultAddress.lat ?? null,
          lng: defaultAddress.lng ?? null,
        } : null);

        const hasColors = (profile?.colors || []).length > 0;
        const hasFit = !!profile?.fit;
        const hasBodyType = !!profile?.bodyType;
        const hasName = !!(profile?.name || userName || '').trim();
        const hasLocation = !!addressLine;

        let nextStep: OnboardingStep = 1;
        if (!hasColors) {
          nextStep = 1;
        } else if (!hasFit || !hasBodyType) {
          nextStep = 3;
        } else if (!hasName) {
          nextStep = 4;
        } else if (!hasLocation) {
          nextStep = 5;
        } else {
          nextStep = 5;
        }

        setStep(nextStep);
      } catch {
        if (!alive) return;
        setName(userName || '');
        setPhone(userPhone || '');
        setCachedProfile({
          name: userName || null,
          phone: userPhone || null,
          ageRange: null,
          colors: [],
          styles: [],
          fit: null,
          bodyType: null,
        });
      }
    };
    loadProfile();
    return () => {
      alive = false;
    };
  }, [isOpen, userName, userPhone]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const toggleColor = useCallback((colorId: string) => {
    setSelectedColors(prev => {
      if (prev.includes(colorId)) return prev.filter(c => c !== colorId);
      if (prev.length >= 3) return prev;
      return [...prev, colorId];
    });
  }, []);

  const toggleStyle = useCallback((styleId: string) => {
    setSelectedStyles(prev =>
      prev.includes(styleId) ? prev.filter(s => s !== styleId) : [...prev, styleId]
    );
  }, []);

  const handleGetLocation = useCallback(async () => {
    setLocationLoading(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = position.coords;
      setLat(latitude);
      setLng(longitude);

      // Reverse geocode via backend proxy (keeps API key server-side)
      const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
      const geocodeUrl = apiBase
        ? `${apiBase}/api/geocode?lat=${latitude}&lng=${longitude}`
        : `/api/geocode?lat=${latitude}&lng=${longitude}`;
      try {
        const resp = await fetch(geocodeUrl, { credentials: 'include' });
        const data = await resp.json();
        if (data.address) {
          setAddress(data.address);
        } else {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (err: any) {
      setError('Location access denied. You can enter your address manually.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile(true);
      const addresses = await profileService.getAddresses(true);
      const profile = data?.profile || null;
      const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
      const addressLine = defaultAddress?.addressLine || '';

      setName((profile?.name || userName || '').trim());
      setPhone((profile?.phone || userPhone || '').trim());
      setAgeRange(profile?.ageRange || null);
      setSelectedColors(profile?.colors || []);
      setSelectedStyles(profile?.styles || []);
      setFit(profile?.fit || null);
      setBodyType(profile?.bodyType || null);
      setAddress(addressLine);
      setLat(defaultAddress?.lat ?? null);
      setLng(defaultAddress?.lng ?? null);

      setCachedProfile({
        name: profile?.name || null,
        phone: profile?.phone || null,
        ageRange: profile?.ageRange || null,
        colors: profile?.colors || [],
        styles: profile?.styles || [],
        fit: profile?.fit || null,
        bodyType: profile?.bodyType || null,
      });
      setCachedAddress(defaultAddress ? {
        addressLine: defaultAddress.addressLine || '',
        lat: defaultAddress.lat ?? null,
        lng: defaultAddress.lng ?? null,
      } : null);
      setSuccess('Refreshed');
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [userName, userPhone]);

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    return aSorted.every((val, idx) => val === bSorted[idx]);
  };

  const stepHasRequired = useCallback(() => {
    if (step === 1) return selectedColors.length > 0;
    if (step === 2) return selectedStyles.length > 0;
    if (step === 3) return !!fit && !!bodyType;
    if (step === 4) return !!(name || '').trim();
    if (step === 5) return !!address.trim();
    return true;
  }, [step, selectedColors.length, selectedStyles.length, fit, bodyType, name, address]);

  const saveCurrentStep = useCallback(async () => {
    setError(null);
    try {
      const updates: Record<string, any> = {};
      let hasWork = false;

      switch (step) {
        case 1:
          if (selectedColors.length === 0) { setError('Select at least one color'); setIsLoading(false); return false; }
          if (!cachedProfile || !arraysEqual(selectedColors, cachedProfile.colors || [])) {
            updates.colors = selectedColors;
            hasWork = true;
          }
          break;
        case 2:
          if (!cachedProfile || !arraysEqual(selectedStyles, cachedProfile.styles || [])) {
            updates.styles = selectedStyles;
            hasWork = true;
          }
          break;
        case 3:
          if (!fit) { setError('Select a fit size'); setIsLoading(false); return false; }
          if (!bodyType) { setError('Select a body type'); setIsLoading(false); return false; }
          if (!cachedProfile || fit !== cachedProfile.fit) {
            updates.fit = fit;
            hasWork = true;
          }
          if (!cachedProfile || bodyType !== cachedProfile.bodyType) {
            updates.bodyType = bodyType;
            hasWork = true;
          }
          break;
        case 4: {
          const trimmedName = (name || '').trim();
          const trimmedPhone = (phone || '').trim();
          if (!trimmedName) { setError('Name is required'); setIsLoading(false); return false; }
          if (trimmedPhone && trimmedPhone.length < 10) { setError('Enter a valid phone number'); setIsLoading(false); return false; }
          if (!cachedProfile || trimmedName !== (cachedProfile.name || '')) {
            updates.name = trimmedName;
            hasWork = true;
          }
          if (trimmedPhone && (!cachedProfile || trimmedPhone !== (cachedProfile.phone || ''))) {
            updates.phone = trimmedPhone;
            hasWork = true;
          }
          if (ageRange && (!cachedProfile || ageRange !== cachedProfile.ageRange)) {
            updates.ageRange = ageRange;
            hasWork = true;
          }
          break;
        }
        case 5:
          if (address.trim()) {
            const sameAddress = cachedAddress
              && cachedAddress.addressLine === address.trim()
              && (cachedAddress.lat ?? null) === (lat ?? null)
              && (cachedAddress.lng ?? null) === (lng ?? null);
            if (!sameAddress) {
              hasWork = true;
            }
            // Save to user_addresses table instead of profile
            if (!sameAddress) {
              await profileService.addAddress({
                label: 'Home',
                addressLine: address.trim(),
                lat: lat ?? undefined,
                lng: lng ?? undefined,
                isDefault: true,
              });
              setCachedAddress({
                addressLine: address.trim(),
                lat: lat ?? null,
                lng: lng ?? null,
              });
              setSuccess('Saved');
            }
          }
          break;
      }

      if (!hasWork) {
        setIsLoading(false);
        return true;
      }

      setIsLoading(true);

      if (Object.keys(updates).length > 0) {
        const result = await profileService.updateProfile(updates);
        setCachedProfile({
          name: result.profile.name || null,
          phone: result.profile.phone || null,
          ageRange: result.profile.ageRange || null,
          colors: result.profile.colors || [],
          styles: result.profile.styles || [],
          fit: result.profile.fit || null,
          bodyType: result.profile.bodyType || null,
        });
        setSuccess('Saved');
      }
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setIsLoading(false);
      return false;
    }
  }, [step, name, phone, ageRange, selectedColors, selectedStyles, fit, bodyType, address, lat, lng]);

  const handleNext = useCallback(async () => {
    const saved = await saveCurrentStep();
    if (!saved) return;

    if (step < 5) {
      setStep((step + 1) as OnboardingStep);
    } else {
      onComplete();
    }
  }, [step, saveCurrentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((step - 1) as OnboardingStep);
  }, [step]);

  const handleSkip = useCallback(async () => {
    // Personal details need a name before skipping
    if (step === 4) {
      if (!(name || '').trim()) {
        setError('Name is required before skipping');
        return;
      }
      const saved = await saveCurrentStep();
      if (!saved) return;
    }
    if (step < 5) {
      setStep((step + 1) as OnboardingStep);
    } else {
      onComplete();
    }
  }, [step, name, saveCurrentStep, onComplete]);

  if (!isOpen) return null;

  const canSkip = step === 2 || step === 4 || step === 5;

  const progress = (step / 5) * 100;
  const continueDisabled = isLoading || !stepHasRequired();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[#121212] w-full max-w-[480px] max-h-[90vh] rounded-3xl shadow-2xl border border-[#2a2a2a] overflow-hidden pointer-events-auto flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 shrink-0">
            {/* Top row: title + actions */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#f5f5f5] tracking-tight leading-tight">
                  Welcome to Stiri
                </h2>
                <p className="text-[#c9a962] text-xs mt-0.5 font-medium">Your personal fashion assistant</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="p-2 rounded-full text-[#6b6b6b] hover:text-[#f5f5f5] hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <RefreshIcon />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-[#6b6b6b] hover:text-[#f5f5f5] hover:bg-[#2a2a2a] transition-colors"
                  aria-label="Close"
                >
                  <CloseIcon width={18} height={18} />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                      s < step
                        ? 'bg-[#c9a962] text-[#0a0a0a]'
                        : s === step
                        ? 'bg-[#c9a962]/20 text-[#c9a962] ring-2 ring-[#c9a962]'
                        : 'bg-[#1a1a1a] text-[#6b6b6b]'
                    }`}
                  >
                    {s < step ? '✓' : s}
                  </div>
                ))}
              </div>
              <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#c9a962] to-[#d4b872] transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Step title */}
            <div className="mt-3">
              <h3 className="text-base font-medium text-[#f5f5f5]">{STEP_INFO[step - 1].title}</h3>
              <p className="text-xs text-[#6b6b6b] mt-0.5">{STEP_INFO[step - 1].subtitle}</p>
            </div>
          </div>

          {/* Content area - scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-2 scrollbar-hide">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {/* Step 4: Personal Info */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-11 px-4 mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">
                    Phone Number <span className="text-[#525252]">(optional)</span>
                  </label>
                  <div className="flex gap-2 mt-1">
                    <span className="h-11 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#6b6b6b] flex items-center text-sm shrink-0">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">Generation <span className="text-[#525252]">(optional)</span></label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {AGE_RANGES.map((age) => (
                      <button
                        key={age.id}
                        onClick={() => setAgeRange(ageRange === age.id ? null : age.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-sm ${
                          ageRange === age.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#f5f5f5]'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <span className="text-lg">{age.icon}</span>
                        <div>
                          <p className="font-medium text-xs">{age.label}</p>
                          <p className="text-[10px] text-[#6b6b6b]">{age.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          )}

            {/* Step 1: Color Preferences */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">
                    Favorite colors <span className="text-red-400">*</span> <span className="text-[#525252]">(pick up to 3)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIMARY_COLORS.map((color) => {
                      const isSelected = selectedColors.includes(color.id);
                      const isDisabled = !isSelected && selectedColors.length >= 3;
                      return (
                        <button
                          key={color.id}
                          onClick={() => !isDisabled && toggleColor(color.id)}
                          disabled={isDisabled}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-[#c9a962] bg-[#c9a962]/10 scale-105'
                              : isDisabled
                              ? 'border-[#1a1a1a] opacity-40 cursor-not-allowed'
                              : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isSelected ? 'border-[#c9a962] ring-2 ring-[#c9a962]/30' : 'border-[#3a3a3a]'
                            }`}
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-[10px] text-[#a0a0a0]">{color.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedColors.length > 0 && (
                    <p className="text-[11px] text-[#c9a962] mt-2 ml-1">{selectedColors.length}/3 selected</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Style Preferences */}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {STYLES.map((style) => {
                    const isSelected = selectedStyles.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        onClick={() => toggleStyle(style.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-[#c9a962] bg-[#c9a962]/10'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <span className="text-2xl">{style.icon}</span>
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#f5f5f5]' : 'text-[#a0a0a0]'}`}>
                          {style.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedStyles.length > 0 && (
                  <p className="text-[11px] text-[#c9a962] mt-3 ml-1">{selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            {/* Step 3: Fit & Body Type */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">What size fits you best? <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {FIT_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setFit(fit === size.id ? null : size.id)}
                        className={`h-12 rounded-xl border font-semibold text-sm transition-all ${
                          fit === size.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Body type <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {BODY_TYPES.map((bt) => (
                      <button
                        key={bt.id}
                        onClick={() => setBodyType(bodyType === bt.id ? null : bt.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                          bodyType === bt.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#6b6b6b] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {bt.svg}
                        <span className="text-[10px] font-medium">{bt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Location */}
            {step === 5 && (
              <div className="space-y-4">
                <button
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="w-full p-4 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#c9a962]/50 transition-all flex items-center justify-center gap-3"
                >
                  {locationLoading ? (
                    <svg className="animate-spin h-5 w-5 text-[#c9a962]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-[#c9a962]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-[#a0a0a0]">
                    {locationLoading ? 'Fetching location...' : 'Use my current location'}
                  </span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2a2a2a]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#121212] px-3 text-[#525252]">or enter manually</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your address or locality"
                    rows={3}
                    className="w-full px-4 py-3 mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-sm resize-none"
                  />
                </div>

                {address && (
                  <div className="p-3 bg-[#c9a962]/5 border border-[#c9a962]/20 rounded-xl">
                    <p className="text-xs text-[#c9a962] flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      {address}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#1a1a1a] shrink-0">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="h-11 px-5 rounded-xl border border-[#2a2a2a] text-[#a0a0a0] text-sm font-medium hover:bg-[#1a1a1a] transition-all active:scale-[0.98]"
                >
                  Back
                </button>
              )}

              {canSkip && (
                <button
                  onClick={handleSkip}
                  className="h-11 px-4 text-sm text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors"
                >
                  Skip
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={continueDisabled}
                className="flex-1 h-11 bg-[#c9a962] text-[#0a0a0a] font-semibold text-sm rounded-xl hover:bg-[#d4b872] active:scale-[0.98] disabled:opacity-50 transition-all shadow-[0_0_20px_-5px_rgba(201,169,98,0.3)]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving
                  </span>
                ) : step === 5 ? (
                  'Complete Setup'
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
