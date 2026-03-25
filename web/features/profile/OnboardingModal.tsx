import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CloseIcon, RefreshIcon } from '../../shared/ui/Icons';
import { profileService } from '../profile/profileService';
import { CONFIG } from '../../config';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName?: string;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

const AGE_RANGES = [
  { id: 'gen_alpha', label: 'Gen Alpha', desc: '2013 - Present', image: '/images/onboarding/gen/gen_alpha.webp' },
  { id: 'gen_z', label: 'Gen Z', desc: '1997 - 2012', image: '/images/onboarding/gen/genz.webp' },
  { id: 'millennial', label: 'Millennial', desc: '1981 - 1996', image: '/images/onboarding/gen/millenial.webp' },
  { id: 'gen_x', label: 'Gen X', desc: '1965 - 1980', image: '/images/onboarding/gen/genx.webp' },
  { id: 'boomer', label: 'Boomer', desc: '1946 - 1964', image: '/images/onboarding/gen/boomer.webp' },
];

const PRIMARY_COLORS = [
  { id: 'red', label: 'Red', image: '/images/onboarding/colors/red.webp' },
  { id: 'blue', label: 'Blue', image: '/images/onboarding/colors/blue.webp' },
  { id: 'yellow', label: 'Yellow', image: '/images/onboarding/colors/yellow.webp' },
  { id: 'green', label: 'Green', image: '/images/onboarding/colors/green.webp' },
  { id: 'orange', label: 'Orange', image: '/images/onboarding/colors/orange.webp' },
  { id: 'purple', label: 'Purple', image: '/images/onboarding/colors/purple.webp' },
  { id: 'pink', label: 'Pink', image: '/images/onboarding/colors/pink.webp' },
  { id: 'black', label: 'Black', image: '/images/onboarding/colors/black.webp' },
  { id: 'white', label: 'White', image: '/images/onboarding/colors/white.webp' },
  { id: 'brown', label: 'Brown', image: '/images/onboarding/colors/brown.webp' },
  { id: 'navy', label: 'Navy', image: '/images/onboarding/colors/navy.webp' },
  { id: 'teal', label: 'Teal', image: '/images/onboarding/colors/teal.webp' },
];

const STYLES = [
  { id: 'casual', label: 'Casual', image: '/images/onboarding/styles/casual.webp' },
  { id: 'formal', label: 'Formal', image: '/images/onboarding/styles/formal.webp' },
  { id: 'party', label: 'Party', image: '/images/onboarding/styles/party.webp' },
  { id: 'beachwear', label: 'Beachwear', image: '/images/onboarding/styles/beach.webp' },
  { id: 'streetwear', label: 'Streetwear', image: '/images/onboarding/styles/streetwear.webp' },
  { id: 'ethnic', label: 'Ethnic', image: '/images/onboarding/styles/ethnic.webp' },
  { id: 'sporty', label: 'Sporty', image: '/images/onboarding/styles/sporty.webp' },
  { id: 'minimalist', label: 'Minimalist', image: '/images/onboarding/styles/minimal.webp' },
];

const FIT_SIZES = [
  { id: 'xs', label: 'XS' },
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: 'xxl', label: 'XXL' },
];

const SKIN_TONES = [
  { id: 'fair', label: 'Fair' },
  { id: 'medium', label: 'Medium' },
  { id: 'dark', label: 'Dark' },
];

const BODY_TYPES = [
  { id: 'hourglass', label: 'Hourglass', image: '/images/onboarding/body_types/hourglass.webp' },
  { id: 'pear', label: 'Pear', image: '/images/onboarding/body_types/pear.webp' },
  { id: 'inverted_triangle', label: 'Inverted Triangle', image: '/images/onboarding/body_types/inverted_triangle.webp' },
  { id: 'rectangle', label: 'Rectangle', image: '/images/onboarding/body_types/rectangle.webp' },
  { id: 'round', label: 'Round', image: '/images/onboarding/body_types/round.webp' },
];

const STEP_INFO = [
  { title: 'Your color palette', subtitle: 'Pick your favorite colors' },
  { title: 'Style DNA', subtitle: 'What\'s your everyday mood? Select all that resonate' },
  { title: 'Your fit size', subtitle: 'Enter your measurements or pick your size' },
  { title: 'Body profile', subtitle: 'Help us understand your body shape' },
  { title: 'Tell us about yourself', subtitle: 'Let\'s personalize your fashion journey' },
  { title: 'Your location', subtitle: 'For local fashion trends and delivery estimates' },
];

// Standard size chart (inches) — bust / waist / hip ranges
const SIZE_CHART: Record<string, { bust: [number, number]; waist: [number, number]; hip: [number, number] }> = {
  xs:  { bust: [30, 32], waist: [24, 26], hip: [33, 35] },
  s:   { bust: [33, 35], waist: [27, 29], hip: [36, 38] },
  m:   { bust: [36, 38], waist: [30, 32], hip: [39, 41] },
  l:   { bust: [39, 41], waist: [33, 35], hip: [42, 44] },
  xl:  { bust: [42, 44], waist: [36, 38], hip: [45, 47] },
  xxl: { bust: [45, 47], waist: [39, 41], hip: [48, 50] },
};

function sizeMedian(sizeId: string): { bust: number; waist: number; hip: number } {
  const s = SIZE_CHART[sizeId];
  if (!s) return { bust: 0, waist: 0, hip: 0 };
  return {
    bust: Math.round(((s.bust[0] + s.bust[1]) / 2) * 10) / 10,
    waist: Math.round(((s.waist[0] + s.waist[1]) / 2) * 10) / 10,
    hip: Math.round(((s.hip[0] + s.hip[1]) / 2) * 10) / 10,
  };
}

function mapMeasurementsToSize(bust: number, waist: number, hip: number, unit: string): string | null {
  // Convert cm to inches for comparison
  const b = unit === 'cm' ? bust / 2.54 : bust;
  const w = unit === 'cm' ? waist / 2.54 : waist;
  const h = unit === 'cm' ? hip / 2.54 : hip;
  if (!b && !w && !h) return null;

  let bestSize: string | null = null;
  let bestDist = Infinity;
  for (const [sizeId, ranges] of Object.entries(SIZE_CHART)) {
    const mid = sizeMedian(sizeId);
    let dist = 0;
    let count = 0;
    if (b > 0) { dist += Math.abs(b - mid.bust); count++; }
    if (w > 0) { dist += Math.abs(w - mid.waist); count++; }
    if (h > 0) { dist += Math.abs(h - mid.hip); count++; }
    if (count === 0) continue;
    dist /= count;
    if (dist < bestDist) {
      bestDist = dist;
      bestSize = sizeId;
    }
  }
  return bestSize;
}



export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userName = '',
}) => {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cachedProfile, setCachedProfile] = useState<null | {
    name: string | null;
    ageRange: string | null;
    colors: string[];
    styles: string[];
    fit: string | null;
    bodyType: string | null;
    skinTone: string | null;
    bust: number | null;
    waist: number | null;
    hip: number | null;
    measurementUnit: string | null;
  }>(null);
  const [cachedAddress, setCachedAddress] = useState<null | {
    addressLine: string;
    city: string | null;
    state: string | null;
    pincode: string | null;
    lat: number | null;
    lng: number | null;
  }>(null);

  // Step 4
  const [name, setName] = useState(userName || '');
  const [ageRange, setAgeRange] = useState<string | null>(null);

  // Step 1
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorSearch, setColorSearch] = useState('');

  // Step 2
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Step 3 – Fit size & measurements
  const [fit, setFit] = useState<string | null>(null);
  const [bustInput, setBustInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [hipInput, setHipInput] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState<'in' | 'cm'>('in');
  const [focusedMeasurement, setFocusedMeasurement] = useState<'bust' | 'waist' | 'hip' | null>(null);
  const fromSizeClickRef = useRef(false);

  // Step 4 – Body profile
  const [bodyType, setBodyType] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<string | null>(null);

  // Step 5
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

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
        setAgeRange(profile?.ageRange || null);
        setSelectedColors(profile?.colors || []);
        setSelectedStyles(profile?.styles || []);
        setFit(profile?.fit || null);
        setBodyType(profile?.bodyType || null);
        setSkinTone(profile?.skinTone || null);
        setBustInput(profile?.bust != null ? String(profile.bust) : '');
        setWaistInput(profile?.waist != null ? String(profile.waist) : '');
        setHipInput(profile?.hip != null ? String(profile.hip) : '');
        setMeasurementUnit((profile?.measurementUnit === 'cm' ? 'cm' : 'in') as 'in' | 'cm');
        setAddress(addressLine);
        setCity(defaultAddress?.city ?? null);
        setState(defaultAddress?.state ?? null);
        setPincode(defaultAddress?.pincode ?? null);
        setLat(defaultAddress?.lat ?? null);
        setLng(defaultAddress?.lng ?? null);
        setCachedProfile({
          name: profile?.name || null,
          ageRange: profile?.ageRange || null,
          colors: profile?.colors || [],
          styles: profile?.styles || [],
          fit: profile?.fit || null,
          bodyType: profile?.bodyType || null,
          skinTone: profile?.skinTone || null,
          bust: profile?.bust ?? null,
          waist: profile?.waist ?? null,
          hip: profile?.hip ?? null,
          measurementUnit: profile?.measurementUnit ?? null,
        });
        setCachedAddress(defaultAddress ? {
          addressLine: defaultAddress.addressLine || '',
          city: defaultAddress.city ?? null,
          state: defaultAddress.state ?? null,
          pincode: defaultAddress.pincode ?? null,
          lat: defaultAddress.lat ?? null,
          lng: defaultAddress.lng ?? null,
        } : null);

        const hasColors = (profile?.colors || []).length > 0;
        const hasStyles = (profile?.styles || []).length > 0;
        const hasFit = !!profile?.fit;
        const hasBodyProfile = !!profile?.bodyType && !!profile?.skinTone;
        const hasName = !!(profile?.name || userName || '').trim();
        const hasLocation = !!addressLine;

        let nextStep: OnboardingStep = 6;
        if (!hasColors) {
          nextStep = 1;
        } else if (!hasStyles) {
          nextStep = 2;
        } else if (!hasFit) {
          nextStep = 3;
        } else if (!hasBodyProfile) {
          nextStep = 4;
        } else if (!hasName) {
          nextStep = 5;
        } else if (!hasLocation) {
          nextStep = 6;
        }

        setStep(nextStep);
      } catch {
        if (!alive) return;
        setName(userName || '');
        setCachedProfile({
          name: userName || null,
          ageRange: null,
          colors: [],
          styles: [],
          fit: null,
          bodyType: null,
          skinTone: null,
          bust: null,
          waist: null,
          hip: null,
          measurementUnit: null,
        });
      }
    };
    loadProfile();
    return () => {
      alive = false;
    };
  }, [isOpen, userName]);

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

  useEffect(() => {
    if (!isOpen) return;
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [isOpen, step]);

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
        setCity(data.city || null);
        setState(data.state || null);
        setPincode(data.pincode || null);
      } catch {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setCity(null);
        setState(null);
        setPincode(null);
      }
    } catch (err: any) {
      setError('Location access denied. You can enter your address manually.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handleAddressInput = useCallback((value: string) => {
    setAddress(value);
    setCity(null);
    setState(null);
    setPincode(null);
    // Clear resolved lat/lng since the user is typing a new address
    setLat(null);
    setLng(null);
    setShowSuggestions(false);

    if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    if (autocompleteAbortRef.current) autocompleteAbortRef.current.abort();

    if (!value.trim() || value.trim().length < 3) {
      setPlaceSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    autocompleteDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      autocompleteAbortRef.current = controller;
      try {
        const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
        const url = `${apiBase || ''}/api/places/autocomplete?input=${encodeURIComponent(value)}`;
        const resp = await fetch(url, { credentials: 'include', signal: controller.signal });
        const data = await resp.json();
        const predictions: Array<{ place_id: string; description: string }> = (data.predictions || [])
          .slice(0, 5)
          .map((p: any) => ({ place_id: p.place_id, description: p.description }));
        setPlaceSuggestions(predictions);
        setShowSuggestions(predictions.length > 0);
      } catch (err: any) {
        if (err.name !== 'AbortError') setPlaceSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 350);
  }, []);

  const handleSelectSuggestion = useCallback(async (suggestion: { place_id: string; description: string }) => {
    setShowSuggestions(false);
    setPlaceSuggestions([]);
    setAddress(suggestion.description);
    setSuggestionsLoading(true);
    try {
      const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
      const url = `${apiBase || ''}/api/places/details?place_id=${encodeURIComponent(suggestion.place_id)}`;
      const resp = await fetch(url, { credentials: 'include' });
      const data = await resp.json();
      if (data.address) setAddress(data.address);
      setCity(data.city || null);
      setState(data.state || null);
      setPincode(data.pincode || null);
      if (data.lat != null) setLat(data.lat);
      if (data.lng != null) setLng(data.lng);
    } catch {
      // keep the description as the address text
      setCity(null);
      setState(null);
      setPincode(null);
    } finally {
      setSuggestionsLoading(false);
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
      setAgeRange(profile?.ageRange || null);
      setSelectedColors(profile?.colors || []);
      setSelectedStyles(profile?.styles || []);
      setFit(profile?.fit || null);
      setBodyType(profile?.bodyType || null);
      setSkinTone(profile?.skinTone || null);
      setBustInput(profile?.bust != null ? String(profile.bust) : '');
      setWaistInput(profile?.waist != null ? String(profile.waist) : '');
      setHipInput(profile?.hip != null ? String(profile.hip) : '');
      setMeasurementUnit((profile?.measurementUnit === 'cm' ? 'cm' : 'in') as 'in' | 'cm');
      setAddress(addressLine);
      setCity(defaultAddress?.city ?? null);
      setState(defaultAddress?.state ?? null);
      setPincode(defaultAddress?.pincode ?? null);
      setLat(defaultAddress?.lat ?? null);
      setLng(defaultAddress?.lng ?? null);

      setCachedProfile({
        name: profile?.name || null,
        ageRange: profile?.ageRange || null,
        colors: profile?.colors || [],
        styles: profile?.styles || [],
        fit: profile?.fit || null,
        bodyType: profile?.bodyType || null,
        skinTone: profile?.skinTone || null,
        bust: profile?.bust ?? null,
        waist: profile?.waist ?? null,
        hip: profile?.hip ?? null,
        measurementUnit: profile?.measurementUnit ?? null,
      });
      setCachedAddress(defaultAddress ? {
        addressLine: defaultAddress.addressLine || '',
        city: defaultAddress.city ?? null,
        state: defaultAddress.state ?? null,
        pincode: defaultAddress.pincode ?? null,
        lat: defaultAddress.lat ?? null,
        lng: defaultAddress.lng ?? null,
      } : null);
      setSuccess('Refreshed');
    } catch (err: any) {
      setError(err.message || 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [userName]);

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    return aSorted.every((val, idx) => val === bSorted[idx]);
  };

  // Auto-map measurements → size when all three are filled
  useEffect(() => {
    if (fromSizeClickRef.current) { fromSizeClickRef.current = false; return; }
    const b = parseFloat(bustInput);
    const w = parseFloat(waistInput);
    const h = parseFloat(hipInput);
    if (b > 0 && w > 0 && h > 0) {
      const mapped = mapMeasurementsToSize(b, w, h, measurementUnit);
      if (mapped) setFit(mapped);
    }
  }, [bustInput, waistInput, hipInput, measurementUnit]);

  const handleSizeClick = useCallback((sizeId: string) => {
    if (fit === sizeId) { setFit(null); setBustInput(''); setWaistInput(''); setHipInput(''); return; }
    setFit(sizeId);
    fromSizeClickRef.current = true;
    const med = sizeMedian(sizeId);
    if (measurementUnit === 'cm') {
      setBustInput(String(Math.round(med.bust * 2.54)));
      setWaistInput(String(Math.round(med.waist * 2.54)));
      setHipInput(String(Math.round(med.hip * 2.54)));
    } else {
      setBustInput(String(med.bust));
      setWaistInput(String(med.waist));
      setHipInput(String(med.hip));
    }
  }, [fit, measurementUnit]);

  const handleUnitToggle = useCallback((newUnit: 'in' | 'cm') => {
    if (newUnit === measurementUnit) return;
    const convert = (val: string) => {
      const n = parseFloat(val);
      if (!n) return '';
      return newUnit === 'cm' ? String(Math.round(n * 2.54)) : String(Math.round(n / 2.54 * 10) / 10);
    };
    fromSizeClickRef.current = true;
    setBustInput(convert(bustInput));
    setWaistInput(convert(waistInput));
    setHipInput(convert(hipInput));
    setMeasurementUnit(newUnit);
  }, [measurementUnit, bustInput, waistInput, hipInput]);

  const stepHasRequired = useCallback(() => {
    if (step === 1) return selectedColors.length > 0;
    if (step === 2) return selectedStyles.length > 0;
    if (step === 3) return !!fit;
    if (step === 4) return !!bodyType && !!skinTone;
    if (step === 5) return !!(name || '').trim();
    if (step === 6) return !!address.trim();
    return true;
  }, [step, selectedColors.length, selectedStyles.length, fit, bodyType, skinTone, name, address]);

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
        case 3: {
          if (!fit) { setError('Select a fit size'); setIsLoading(false); return false; }
          if (!cachedProfile || fit !== cachedProfile.fit) {
            updates.fit = fit;
            hasWork = true;
          }
          const bustVal = parseFloat(bustInput) || null;
          const waistVal = parseFloat(waistInput) || null;
          const hipVal = parseFloat(hipInput) || null;
          if (bustVal !== (cachedProfile?.bust ?? null)) { updates.bust = bustVal; hasWork = true; }
          if (waistVal !== (cachedProfile?.waist ?? null)) { updates.waist = waistVal; hasWork = true; }
          if (hipVal !== (cachedProfile?.hip ?? null)) { updates.hip = hipVal; hasWork = true; }
          if (measurementUnit !== (cachedProfile?.measurementUnit ?? 'in')) { updates.measurementUnit = measurementUnit; hasWork = true; }
          break;
        }
        case 4:
          if (!bodyType) { setError('Select a body type'); setIsLoading(false); return false; }
          if (!skinTone) { setError('Select a skin tone'); setIsLoading(false); return false; }
          if (!cachedProfile || bodyType !== cachedProfile.bodyType) {
            updates.bodyType = bodyType;
            hasWork = true;
          }
          if (!cachedProfile || skinTone !== cachedProfile.skinTone) {
            updates.skinTone = skinTone;
            hasWork = true;
          }
          break;
        case 5: {
          const trimmedName = (name || '').trim();
          if (!trimmedName) { setError('Name is required'); setIsLoading(false); return false; }
          if (!cachedProfile || trimmedName !== (cachedProfile.name || '')) {
            updates.name = trimmedName;
            hasWork = true;
          }
          if (ageRange && (!cachedProfile || ageRange !== cachedProfile.ageRange)) {
            updates.ageRange = ageRange;
            hasWork = true;
          }
          break;
        }
        case 6:
          if (address.trim()) {
            const sameAddress = cachedAddress
              && cachedAddress.addressLine === address.trim()
              && (cachedAddress.city ?? null) === (city ?? null)
              && (cachedAddress.state ?? null) === (state ?? null)
              && (cachedAddress.pincode ?? null) === (pincode ?? null)
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
                ...(city ? { city } : {}),
                ...(state ? { state } : {}),
                ...(pincode ? { pincode } : {}),
                lat: lat ?? undefined,
                lng: lng ?? undefined,
                isDefault: true,
              });
              setCachedAddress({
                addressLine: address.trim(),
                city: city ?? null,
                state: state ?? null,
                pincode: pincode ?? null,
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
          ageRange: result.profile.ageRange || null,
          colors: result.profile.colors || [],
          styles: result.profile.styles || [],
          fit: result.profile.fit || null,
          bodyType: result.profile.bodyType || null,
          skinTone: result.profile.skinTone || null,
          bust: result.profile.bust ?? null,
          waist: result.profile.waist ?? null,
          hip: result.profile.hip ?? null,
          measurementUnit: result.profile.measurementUnit ?? null,
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
  }, [step, name, ageRange, selectedColors, selectedStyles, fit, bodyType, skinTone, bustInput, waistInput, hipInput, measurementUnit, address, city, state, pincode, lat, lng]);

  const handleNext = useCallback(async () => {
    const saved = await saveCurrentStep();
    if (!saved) return;

    if (step < 6) {
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
    if (step === 5) {
      if (!(name || '').trim()) {
        setError('Name is required before skipping');
        return;
      }
      const saved = await saveCurrentStep();
      if (!saved) return;
    }
    if (step < 6) {
      setStep((step + 1) as OnboardingStep);
    } else {
      setIsLoading(true);
      try {
        await profileService.updateProfile({ isOnboardingComplete: true });
      } catch (err: any) {
        setError(err?.message || 'Failed to skip onboarding');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      onComplete();
    }
  }, [step, name, saveCurrentStep, onComplete]);

  if (!isOpen) return null;

  const canSkip = step === 2 || step === 3 || step === 5 || step === 6;

  const progress = (step / 6) * 100;
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
                {[1, 2, 3, 4, 5, 6].map((s) => (
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
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto px-6 pb-2 scrollbar-hide">
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

            {/* Step 5: Personal Info */}
            {step === 5 && (
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
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1">Generation <span className="text-[#525252]">(optional)</span></label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {AGE_RANGES.map((age) => (
                      <button
                        key={age.id}
                        onClick={() => setAgeRange(ageRange === age.id ? null : age.id)}
                        className={`relative overflow-hidden rounded-xl border text-left transition-all ${
                          ageRange === age.id
                            ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40'
                            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <img
                          src={age.image}
                          alt={age.label}
                          className="w-full h-24 object-cover object-top"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                          <p className="font-medium text-xs text-[#f5f5f5]">{age.label}</p>
                          <p className="text-[10px] text-[#d0d0d0]">{age.desc}</p>
                        </div>
                        {ageRange === age.id && (
                          <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                        )}
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
                  <div className="relative mb-3">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
                    <input
                      type="text"
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      placeholder="Search colors..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] text-sm text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#3a3a3a]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PRIMARY_COLORS.filter((color) => color.label.toLowerCase().includes(colorSearch.toLowerCase())).map((color) => {
                      const isSelected = selectedColors.includes(color.id);
                      const isDisabled = !isSelected && selectedColors.length >= 3;
                      return (
                        <button
                          key={color.id}
                          onClick={() => !isDisabled && toggleColor(color.id)}
                          disabled={isDisabled}
                          className={`relative overflow-hidden rounded-xl border transition-all ${
                            isSelected
                              ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40'
                              : isDisabled
                              ? 'border-[#1a1a1a] opacity-40 cursor-not-allowed'
                              : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:-translate-y-0.5'
                          }`}
                        >
                          <img
                            src={color.image}
                            alt={color.label}
                            className="w-full h-24 object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                            <span className="text-xs font-medium text-[#f5f5f5]">{color.label}</span>
                          </div>
                          {isSelected && (
                            <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                          )}
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
                        className={`relative overflow-hidden rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a] hover:-translate-y-0.5'
                        }`}
                      >
                        <img
                          src={style.image}
                          alt={style.label}
                          className="w-full h-28 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                          <span className="text-sm font-medium text-[#f5f5f5]">{style.label}</span>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedStyles.length > 0 && (
                  <p className="text-[11px] text-[#c9a962] mt-3 ml-1">{selectedStyles.length} style{selectedStyles.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            {/* Step 3: Fit Size & Measurements */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Measurements */}
                <div className="space-y-3">
                  {/* Unit toggle */}
                  <div className="flex items-center gap-1 justify-end">
                    {(['in', 'cm'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => handleUnitToggle(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          measurementUnit === u
                            ? 'bg-[#c9a962]/15 text-[#c9a962] border border-[#c9a962]/40'
                            : 'bg-[#0a0a0a] text-[#6b6b6b] border border-[#2a2a2a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>

                  {/* Bust */}
                  <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 transition-colors focus-within:border-[#c9a962] focus-within:ring-1 focus-within:ring-[#c9a962]">
                    <img src="/images/onboarding/measurements/bust.webp" alt="Bust measurement" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="flex-1">
                      <label className="text-[11px] text-[#6b6b6b]">Bust</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bustInput}
                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setBustInput(v); }}
                        onFocus={() => setFocusedMeasurement('bust')}
                        onBlur={() => setFocusedMeasurement(null)}
                        placeholder={measurementUnit === 'in' ? 'e.g. 36' : 'e.g. 91'}
                        className="w-full bg-transparent text-[#f5f5f5] placeholder-[#404040] focus:outline-none text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-[#525252] shrink-0">{measurementUnit}</span>
                  </div>

                  {/* Waist */}
                  <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 transition-colors focus-within:border-[#c9a962] focus-within:ring-1 focus-within:ring-[#c9a962]">
                    <img src="/images/onboarding/measurements/waist.webp" alt="Waist measurement" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="flex-1">
                      <label className="text-[11px] text-[#6b6b6b]">Waist</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={waistInput}
                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setWaistInput(v); }}
                        onFocus={() => setFocusedMeasurement('waist')}
                        onBlur={() => setFocusedMeasurement(null)}
                        placeholder={measurementUnit === 'in' ? 'e.g. 30' : 'e.g. 76'}
                        className="w-full bg-transparent text-[#f5f5f5] placeholder-[#404040] focus:outline-none text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-[#525252] shrink-0">{measurementUnit}</span>
                  </div>

                  {/* Hip */}
                  <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-3 transition-colors focus-within:border-[#c9a962] focus-within:ring-1 focus-within:ring-[#c9a962]">
                    <img src="/images/onboarding/measurements/hip.webp" alt="Hip measurement" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="flex-1">
                      <label className="text-[11px] text-[#6b6b6b]">Hip</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={hipInput}
                        onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setHipInput(v); }}
                        onFocus={() => setFocusedMeasurement('hip')}
                        onBlur={() => setFocusedMeasurement(null)}
                        placeholder={measurementUnit === 'in' ? 'e.g. 40' : 'e.g. 102'}
                        className="w-full bg-transparent text-[#f5f5f5] placeholder-[#404040] focus:outline-none text-sm"
                      />
                    </div>
                    <span className="text-[10px] text-[#525252] shrink-0">{measurementUnit}</span>
                  </div>
                </div>

                <p className="text-[10px] text-[#525252] ml-1">Measurements are optional — you can pick a size and skip them.</p>

                {/* Separator */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2a2a2a]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#121212] px-3 text-[#525252]">or pick your size</span>
                  </div>
                </div>

                {/* Size cards */}
                <div className="grid grid-cols-2 gap-2">
                  {FIT_SIZES.map((size) => {
                    const ranges = SIZE_CHART[size.id];
                    return (
                      <button
                        key={size.id}
                        onClick={() => handleSizeClick(size.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          fit === size.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <span className={`block text-sm font-semibold mb-1 ${fit === size.id ? 'text-[#c9a962]' : 'text-[#e0e0e0]'}`}>{size.label}</span>
                        <div className={`text-[10px] leading-relaxed ${fit === size.id ? 'text-[#c9a962]/70' : 'text-[#606060]'}`}>
                          <span>B {ranges.bust[0]}-{ranges.bust[1]}</span>{' · '}
                          <span>W {ranges.waist[0]}-{ranges.waist[1]}</span>{' · '}
                          <span>H {ranges.hip[0]}-{ranges.hip[1]}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Body Type & Skin Tone */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Body type <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-3">
                    {BODY_TYPES.map((bt) => (
                      <button
                        key={bt.id}
                        onClick={() => setBodyType(bodyType === bt.id ? null : bt.id)}
                        className={`relative overflow-hidden rounded-xl border transition-all ${
                          bodyType === bt.id
                            ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a] hover:-translate-y-0.5'
                        }`}
                      >
                        <img
                          src={bt.image}
                          alt={bt.label}
                          className="w-full h-40 object-cover object-top"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                          <span className="text-xs font-medium text-[#f5f5f5]">{bt.label}</span>
                        </div>
                        {bodyType === bt.id && (
                          <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Skin tone <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSkinTone(skinTone === tone.id ? null : tone.id)}
                        className={`h-11 rounded-xl border font-semibold text-sm transition-all ${
                          skinTone === tone.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]'
                            : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Location */}
            {step === 6 && (
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
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => { if (placeSuggestions.length > 0) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Search your address or locality"
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] transition-colors text-sm"
                    />
                    {suggestionsLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-[#c9a962]" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                    {showSuggestions && placeSuggestions.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
                        {placeSuggestions.map((s) => (
                          <li key={s.place_id}>
                            <button
                              type="button"
                              onMouseDown={() => handleSelectSuggestion(s)}
                              className="w-full text-left px-4 py-3 text-sm text-[#d0d0d0] hover:bg-[#252525] flex items-start gap-3 transition-colors border-b border-[#1e1e1e] last:border-0"
                            >
                              <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#c9a962]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                              </svg>
                              <span className="leading-snug">{s.description}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
                ) : step === 6 ? (
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
