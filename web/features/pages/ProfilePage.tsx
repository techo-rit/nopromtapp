import React, { useState, useEffect, useCallback, useRef } from 'react';
import { profileService } from '../profile/profileService';
import { ProfilePhotoUpload } from '../profile/ProfilePhotoUpload';
import { CONFIG } from '../../config';
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
  { id: 'gen_z', label: 'Gen Z', desc: '1997 – 2012', image: '/images/onboarding/gen/genz.webp' },
  { id: 'gen_alpha', label: 'Gen Alpha', desc: '2013 – Present', image: '/images/onboarding/gen/gen_alpha.webp' },
  { id: 'millennial', label: 'Millennial', desc: '1981 – 1996', image: '/images/onboarding/gen/millenial.webp' },
  { id: 'gen_x', label: 'Gen X', desc: '1965 – 1980', image: '/images/onboarding/gen/genx.webp' },
  { id: 'boomer', label: 'Boomer', desc: '1946 – 1964', image: '/images/onboarding/gen/boomer.webp' },
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

const FIT_SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'];
const FIT_LABELS: Record<string, string> = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL' };
const SKIN_TONES = [
  { id: 'fair', label: 'Fair' },
  { id: 'medium', label: 'Medium' },
  { id: 'dark', label: 'Dark' },
];

const BODY_TYPES = [
  { id: 'hourglass', label: 'Hourglass', image: '/images/onboarding/body_types/hourglass.webp' },
  { id: 'pear', label: 'Pear', image: '/images/onboarding/body_types/pear.webp' },
  { id: 'inverted_triangle', label: 'Inv. Triangle', image: '/images/onboarding/body_types/inverted_triangle.webp' },
  { id: 'rectangle', label: 'Rectangle', image: '/images/onboarding/body_types/rectangle.webp' },
  { id: 'round', label: 'Round', image: '/images/onboarding/body_types/round.webp' },
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
  const b = unit === 'cm' ? bust / 2.54 : bust;
  const w = unit === 'cm' ? waist / 2.54 : waist;
  const h = unit === 'cm' ? hip / 2.54 : hip;
  if (!b && !w && !h) return null;
  let bestSize: string | null = null;
  let bestDist = Infinity;
  for (const [sizeId] of Object.entries(SIZE_CHART)) {
    const mid = sizeMedian(sizeId);
    let dist = 0, count = 0;
    if (b > 0) { dist += Math.abs(b - mid.bust); count++; }
    if (w > 0) { dist += Math.abs(w - mid.waist); count++; }
    if (h > 0) { dist += Math.abs(h - mid.hip); count++; }
    if (count === 0) continue;
    dist /= count;
    if (dist < bestDist) { bestDist = dist; bestSize = sizeId; }
  }
  return bestSize;
}

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
    ageRange: string;
    colors: string[];
    styles: string[];
    fit: string;
    bodyType: string;
    skinTone: string;
    bust: number | null;
    waist: number | null;
    hip: number | null;
    measurementUnit: string;
  }>(null);

  // Form fields
  const [name, setName] = useState(user.name || '');
  const [ageRange, setAgeRange] = useState(user.ageRange || '');
  const [colors, setColors] = useState<string[]>(user.colors || []);
  const [colorSearch, setColorSearch] = useState('');
  const [styles, setStyles] = useState<string[]>(user.styles || []);
  const [fit, setFit] = useState(user.fit || '');
  const [bodyType, setBodyType] = useState(user.bodyType || '');
  const [skinTone, setSkinTone] = useState(user.skinTone || '');
  const [bustInput, setBustInput] = useState(user.bust != null ? String(user.bust) : '');
  const [waistInput, setWaistInput] = useState(user.waist != null ? String(user.waist) : '');
  const [hipInput, setHipInput] = useState(user.hip != null ? String(user.hip) : '');
  const [measurementUnit, setMeasurementUnit] = useState<'in' | 'cm'>((user.measurementUnit === 'cm' ? 'cm' : 'in') as 'in' | 'cm');
  const fromSizeClickRef = useRef(false);
  const accountPhone = stripCountryCode(user.phone || '');

  // Addresses
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [settingDefaultAddressId, setSettingDefaultAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingAddressLabel, setEditingAddressLabel] = useState('Home');
  const [editingAddressLine1, setEditingAddressLine1] = useState('');
  const [editingAddress, setEditingAddress] = useState('');
  const [editingAddressCity, setEditingAddressCity] = useState<string | null>(null);
  const [editingAddressState, setEditingAddressState] = useState<string | null>(null);
  const [editingAddressPincode, setEditingAddressPincode] = useState<string | null>(null);
  const [editingAddressLat, setEditingAddressLat] = useState<number | null>(null);
  const [editingAddressLng, setEditingAddressLng] = useState<number | null>(null);
  const [editingAddressLocationLoading, setEditingAddressLocationLoading] = useState(false);
  const [editingAddressSuggestions, setEditingAddressSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [showEditingAddressSuggestions, setShowEditingAddressSuggestions] = useState(false);
  const [editingAddressSuggestionsLoading, setEditingAddressSuggestionsLoading] = useState(false);
  const editingAddressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingAddressAbortRef = useRef<AbortController | null>(null);
  const [updatingAddressId, setUpdatingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newLabel, setNewLabel] = useState('Home');
  const [newAddressCity, setNewAddressCity] = useState<string | null>(null);
  const [newAddressState, setNewAddressState] = useState<string | null>(null);
  const [newAddressPincode, setNewAddressPincode] = useState<string | null>(null);
  const [newAddressLat, setNewAddressLat] = useState<number | null>(null);
  const [newAddressLng, setNewAddressLng] = useState<number | null>(null);
  const [newAddressLocationLoading, setNewAddressLocationLoading] = useState(false);
  const [newAddressSuggestions, setNewAddressSuggestions] = useState<Array<{ place_id: string; description: string }>>([]);
  const [showNewAddressSuggestions, setShowNewAddressSuggestions] = useState(false);
  const [newAddressSuggestionsLoading, setNewAddressSuggestionsLoading] = useState(false);
  const newAddressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newAddressAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setName(user.name || '');
    setAgeRange(user.ageRange || '');
    setColors(user.colors || []);
    setStyles(user.styles || []);
    setFit(user.fit || '');
    setBodyType(user.bodyType || '');
    setSkinTone(user.skinTone || '');
    setBustInput(user.bust != null ? String(user.bust) : '');
    setWaistInput(user.waist != null ? String(user.waist) : '');
    setHipInput(user.hip != null ? String(user.hip) : '');
    setMeasurementUnit((user.measurementUnit === 'cm' ? 'cm' : 'in') as 'in' | 'cm');
    setCachedProfile({
      name: (user.name || '').trim(),
      ageRange: user.ageRange || '',
      colors: user.colors || [],
      styles: user.styles || [],
      fit: user.fit || '',
      bodyType: user.bodyType || '',
      skinTone: user.skinTone || '',
      bust: user.bust ?? null,
      waist: user.waist ?? null,
      hip: user.hip ?? null,
      measurementUnit: user.measurementUnit || 'in',
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
    if (fit === sizeId) { setFit(''); setBustInput(''); setWaistInput(''); setHipInput(''); return; }
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
      if (!fit) { setError('Fit size is required'); setIsLoading(false); return; }
      if (!bodyType) { setError('Body type is required'); setIsLoading(false); return; }
      if (!skinTone) { setError('Skin tone is required'); setIsLoading(false); return; }

      if ((cachedProfile?.ageRange || '') && !ageRange) {
        setError('Generation cannot be empty once selected. You can change it, but not remove it.');
        setIsLoading(false);
        return;
      }

      if ((cachedProfile?.styles || []).length > 0 && styles.length === 0) {
        setError('Style preferences cannot be empty once selected. You can change them, but not remove all.');
        setIsLoading(false);
        return;
      }

      const trimmedName = name.trim();
      const bustVal = parseFloat(bustInput) || null;
      const waistVal = parseFloat(waistInput) || null;
      const hipVal = parseFloat(hipInput) || null;
      const hasChanges = !cachedProfile
        || trimmedName !== cachedProfile.name
        || (ageRange || '') !== cachedProfile.ageRange
        || !arraysEqual(colors, cachedProfile.colors)
        || !arraysEqual(styles, cachedProfile.styles)
        || fit !== cachedProfile.fit
        || bodyType !== cachedProfile.bodyType
        || skinTone !== cachedProfile.skinTone
        || bustVal !== (cachedProfile.bust ?? null)
        || waistVal !== (cachedProfile.waist ?? null)
        || hipVal !== (cachedProfile.hip ?? null)
        || measurementUnit !== (cachedProfile.measurementUnit || 'in');

      if (!hasChanges) {
      setSuccess('No changes to save');
      setTimeout(() => setSuccess(null), 3000);
        setIsLoading(false);
        return;
      }

      const updates: Record<string, any> = {
        name: trimmedName,
      };

      if (!cachedProfile || ageRange !== cachedProfile.ageRange) updates.ageRange = ageRange || null;
      if (colors.length > 0) updates.colors = colors;
      if (!cachedProfile || !arraysEqual(styles, cachedProfile.styles)) updates.styles = styles;
      updates.fit = fit;
      updates.bodyType = bodyType;
      updates.skinTone = skinTone;
      updates.bust = bustVal;
      updates.waist = waistVal;
      updates.hip = hipVal;
      updates.measurementUnit = measurementUnit;

      await profileService.updateProfile(updates);
      setSuccess('Profile updated successfully');
      setCachedProfile({
        name: trimmedName,
        ageRange: ageRange || '',
        colors: [...colors],
        styles: [...styles],
        fit,
        bodyType,
        skinTone,
        bust: bustVal,
        waist: waistVal,
        hip: hipVal,
        measurementUnit,
      });
      onProfileUpdate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsLoading(false);
    }
  }, [name, ageRange, colors, styles, fit, bodyType, skinTone, bustInput, waistInput, hipInput, measurementUnit, cachedProfile, onProfileUpdate]);

  const handleNewAddressLocationGet = useCallback(async () => {
    setNewAddressLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = position.coords;
      setNewAddressLat(latitude);
      setNewAddressLng(longitude);
      try {
        const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
        const resp = await fetch(`${apiBase || ''}/api/geocode?lat=${latitude}&lng=${longitude}`, { credentials: 'include' });
        const data = await resp.json();
        setNewAddress(data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setNewAddressCity(data.city || null);
        setNewAddressState(data.state || null);
        setNewAddressPincode(data.pincode || null);
      } catch {
        setNewAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setNewAddressCity(null);
        setNewAddressState(null);
        setNewAddressPincode(null);
      }
    } catch {
      setError('Location access denied. Enter address manually.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setNewAddressLocationLoading(false);
    }
  }, []);

  const handleNewAddressInput = useCallback((value: string) => {
    setNewAddress(value);
    setNewAddressCity(null);
    setNewAddressState(null);
    setNewAddressPincode(null);
    setNewAddressLat(null);
    setNewAddressLng(null);
    setShowNewAddressSuggestions(false);
    if (newAddressDebounceRef.current) clearTimeout(newAddressDebounceRef.current);
    if (newAddressAbortRef.current) newAddressAbortRef.current.abort();
    if (!value.trim() || value.trim().length < 3) {
      setNewAddressSuggestions([]);
      setNewAddressSuggestionsLoading(false);
      return;
    }
    setNewAddressSuggestionsLoading(true);
    newAddressDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      newAddressAbortRef.current = controller;
      try {
        const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
        const resp = await fetch(`${apiBase || ''}/api/places/autocomplete?input=${encodeURIComponent(value)}`, { credentials: 'include', signal: controller.signal });
        const data = await resp.json();
        const predictions = (data.predictions || []).slice(0, 5).map((p: any) => ({ place_id: p.place_id, description: p.description }));
        setNewAddressSuggestions(predictions);
        setShowNewAddressSuggestions(predictions.length > 0);
      } catch (err: any) {
        if (err.name !== 'AbortError') setNewAddressSuggestions([]);
      } finally {
        setNewAddressSuggestionsLoading(false);
      }
    }, 350);
  }, []);

  const handleNewAddressSelectSuggestion = useCallback(async (s: { place_id: string; description: string }) => {
    setShowNewAddressSuggestions(false);
    setNewAddressSuggestions([]);
    setNewAddress(s.description);
    setNewAddressSuggestionsLoading(true);
    try {
      const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
      const resp = await fetch(`${apiBase || ''}/api/places/details?place_id=${encodeURIComponent(s.place_id)}`, { credentials: 'include' });
      const data = await resp.json();
      if (data.address) setNewAddress(data.address);
      setNewAddressCity(data.city || null);
      setNewAddressState(data.state || null);
      setNewAddressPincode(data.pincode || null);
      if (data.lat != null) setNewAddressLat(data.lat);
      if (data.lng != null) setNewAddressLng(data.lng);
    } catch {
      setNewAddressCity(null);
      setNewAddressState(null);
      setNewAddressPincode(null);
    } finally {
      setNewAddressSuggestionsLoading(false);
    }
  }, []);

  const handleAddAddress = useCallback(async () => {
    if (!newAddressLine1.trim()) {
      setError('Address details are required.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    if (!newAddress.trim()) return;
    try {
      await profileService.addAddress({
        label: newLabel,
        addressLine1: newAddressLine1.trim(),
        addressLine: newAddress.trim(),
        ...(newAddressCity ? { city: newAddressCity } : {}),
        ...(newAddressState ? { state: newAddressState } : {}),
        ...(newAddressPincode ? { pincode: newAddressPincode } : {}),
        ...(newAddressLat != null ? { lat: newAddressLat } : {}),
        ...(newAddressLng != null ? { lng: newAddressLng } : {}),
      });
      setNewAddressLine1('');
      setNewAddress('');
      setNewLabel('Home');
      setNewAddressCity(null);
      setNewAddressState(null);
      setNewAddressPincode(null);
      setNewAddressLat(null);
      setNewAddressLng(null);
      loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to add address');
      setTimeout(() => setError(null), 4000);
    }
  }, [newAddress, newAddressLine1, newLabel, newAddressCity, newAddressState, newAddressPincode, newAddressLat, newAddressLng, loadAddresses]);

  const handleDeleteAddress = useCallback(async (id: string) => {
    const target = addresses.find((addr) => addr.id === id);
    if (target?.isDefault) {
      setError('You cannot delete your default address. Set another address as default first.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (addresses.length <= 1) {
      setError('You cannot delete your only saved address.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    try {
      await profileService.deleteAddress(id);
      loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
      setTimeout(() => setError(null), 4000);
    }
  }, [addresses, loadAddresses]);

  const handleSetDefaultAddress = useCallback(async (id: string) => {
    try {
      setSettingDefaultAddressId(id);
      await profileService.setDefaultAddress(id);
      setAddresses((prev) => prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      })));
      setSuccess('Default address updated');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to set default address');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSettingDefaultAddressId(null);
    }
  }, []);

  const handleStartEditAddressLine1 = useCallback((address: UserAddress) => {
    setEditingAddressId(address.id);
    setEditingAddressLabel(address.label || 'Home');
    setEditingAddressLine1(address.addressLine1 || '');
    setEditingAddress(address.addressLine || '');
    setEditingAddressCity(address.city ?? null);
    setEditingAddressState(address.state ?? null);
    setEditingAddressPincode(address.pincode ?? null);
    setEditingAddressLat(address.lat ?? null);
    setEditingAddressLng(address.lng ?? null);
  }, []);

  const handleCancelEditAddressLine1 = useCallback(() => {
    setEditingAddressId(null);
    setEditingAddressLabel('Home');
    setEditingAddressLine1('');
    setEditingAddress('');
    setEditingAddressCity(null);
    setEditingAddressState(null);
    setEditingAddressPincode(null);
    setEditingAddressLat(null);
    setEditingAddressLng(null);
    setEditingAddressSuggestions([]);
    setShowEditingAddressSuggestions(false);
  }, []);

  const handleEditingAddressInput = useCallback((value: string) => {
    setEditingAddress(value);
    setEditingAddressCity(null);
    setEditingAddressState(null);
    setEditingAddressPincode(null);
    setEditingAddressLat(null);
    setEditingAddressLng(null);
    setShowEditingAddressSuggestions(false);
    if (editingAddressDebounceRef.current) clearTimeout(editingAddressDebounceRef.current);
    if (editingAddressAbortRef.current) editingAddressAbortRef.current.abort();
    if (!value.trim() || value.trim().length < 3) {
      setEditingAddressSuggestions([]);
      setEditingAddressSuggestionsLoading(false);
      return;
    }
    setEditingAddressSuggestionsLoading(true);
    editingAddressDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      editingAddressAbortRef.current = controller;
      try {
        const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
        const resp = await fetch(`${apiBase || ''}/api/places/autocomplete?input=${encodeURIComponent(value)}`, { credentials: 'include', signal: controller.signal });
        const data = await resp.json();
        const predictions = (data.predictions || []).slice(0, 5).map((p: any) => ({ place_id: p.place_id, description: p.description }));
        setEditingAddressSuggestions(predictions);
        setShowEditingAddressSuggestions(predictions.length > 0);
      } catch (err: any) {
        if (err.name !== 'AbortError') setEditingAddressSuggestions([]);
      } finally {
        setEditingAddressSuggestionsLoading(false);
      }
    }, 350);
  }, []);

  const handleEditingAddressSelectSuggestion = useCallback(async (s: { place_id: string; description: string }) => {
    setShowEditingAddressSuggestions(false);
    setEditingAddressSuggestions([]);
    setEditingAddress(s.description);
    setEditingAddressSuggestionsLoading(true);
    try {
      const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
      const resp = await fetch(`${apiBase || ''}/api/places/details?place_id=${encodeURIComponent(s.place_id)}`, { credentials: 'include' });
      const data = await resp.json();
      if (data.address) setEditingAddress(data.address);
      setEditingAddressCity(data.city || null);
      setEditingAddressState(data.state || null);
      setEditingAddressPincode(data.pincode || null);
      if (data.lat != null) setEditingAddressLat(data.lat);
      if (data.lng != null) setEditingAddressLng(data.lng);
    } catch {
      setEditingAddressCity(null);
      setEditingAddressState(null);
      setEditingAddressPincode(null);
    } finally {
      setEditingAddressSuggestionsLoading(false);
    }
  }, []);

  const handleEditingAddressLocationGet = useCallback(async () => {
    setEditingAddressLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = position.coords;
      setEditingAddressLat(latitude);
      setEditingAddressLng(longitude);
      try {
        const apiBase = CONFIG.API.BASE_URL.replace(/\/$/, '');
        const resp = await fetch(`${apiBase || ''}/api/geocode?lat=${latitude}&lng=${longitude}`, { credentials: 'include' });
        const data = await resp.json();
        setEditingAddress(data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setEditingAddressCity(data.city || null);
        setEditingAddressState(data.state || null);
        setEditingAddressPincode(data.pincode || null);
      } catch {
        setEditingAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setEditingAddressCity(null);
        setEditingAddressState(null);
        setEditingAddressPincode(null);
      }
    } catch {
      setError('Location access denied. Enter address manually.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setEditingAddressLocationLoading(false);
    }
  }, []);

  const handleSaveAddressLine1 = useCallback(async (id: string) => {
    if (!editingAddressLine1.trim()) {
      setError('Address details are required.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    if (!editingAddress.trim()) {
      setError('Main address is required.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    try {
      setUpdatingAddressId(id);
      const updated = await profileService.updateAddress(id, {
        label: editingAddressLabel,
        addressLine1: editingAddressLine1.trim(),
        addressLine: editingAddress.trim(),
        city: editingAddressCity,
        state: editingAddressState,
        pincode: editingAddressPincode,
        lat: editingAddressLat,
        lng: editingAddressLng,
      });
      setAddresses((prev) => prev.map((addr) => addr.id === id ? updated : addr));
      setEditingAddressId(null);
      setEditingAddressLabel('Home');
      setEditingAddressLine1('');
      setEditingAddress('');
      setEditingAddressCity(null);
      setEditingAddressState(null);
      setEditingAddressPincode(null);
      setEditingAddressLat(null);
      setEditingAddressLng(null);
      setSuccess('Address updated');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update address');
      setTimeout(() => setError(null), 4000);
    } finally {
      setUpdatingAddressId(null);
    }
  }, [editingAddressLabel, editingAddressLine1, editingAddress, editingAddressCity, editingAddressState, editingAddressPincode, editingAddressLat, editingAddressLng]);

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
        setAgeRange(p.ageRange || '');
        setColors(p.colors || []);
        setStyles(p.styles || []);
        setFit(p.fit || '');
        setBodyType(p.bodyType || '');
        setSkinTone(p.skinTone || '');
        setCachedProfile({
          name: (p.name || '').trim(),
          ageRange: p.ageRange || '',
          colors: p.colors || [],
          styles: p.styles || [],
          fit: p.fit || '',
          bodyType: p.bodyType || '',
          skinTone: p.skinTone || '',
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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(user.profilePhotoUrl || null);
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

        {/* Profile Photo */}
        <section className="mb-6 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>📸</span> Profile Photo
          </h2>
          <p className="text-xs text-[#6b6b6b] mb-3">Used for personalized try-on previews across the app</p>
          <ProfilePhotoUpload
            currentPhotoUrl={profilePhotoUrl}
            userName={user.name || 'User'}
            onPhotoUpdated={(url) => {
              setProfilePhotoUrl(url);
              onProfileUpdate();
            }}
          />
        </section>

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
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Phone</label>
              <div className="flex gap-2 mt-1">
                <span className="h-11 px-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#6b6b6b] flex items-center text-sm shrink-0">+91</span>
                <input type="tel" value={accountPhone} readOnly
                  className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#8c8c8c] text-sm cursor-not-allowed"
                  aria-label="Phone"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Generation <span className="text-[#525252]">(optional)</span></label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {AGE_RANGES.map((a) => (
                  <button key={a.id} onClick={() => setAgeRange(ageRange === a.id ? '' : a.id)}
                    className={`relative overflow-hidden rounded-xl border text-left transition-all ${ageRange === a.id ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
                    <img src={a.image} alt={a.label} className="w-full h-24 object-cover object-top" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <p className="font-medium text-xs text-[#f5f5f5]">{a.label}</p>
                      <p className="text-[10px] text-[#d0d0d0]">{a.desc}</p>
                    </div>
                    {ageRange === a.id && (
                      <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                    )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRIMARY_COLORS.filter((c) => c.label.toLowerCase().includes(colorSearch.toLowerCase())).map((c) => {
                  const sel = colors.includes(c.id);
                  const dis = !sel && colors.length >= 3;
                  return (
                    <button key={c.id} onClick={() => !dis && toggleColor(c.id)} disabled={dis}
                      className={`relative overflow-hidden rounded-xl border transition-all ${sel ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40' : dis ? 'opacity-40 border-[#1a1a1a]' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
                      <img src={c.image} alt={c.label} className="w-full h-20 object-cover" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <span className="text-[11px] font-medium text-[#f5f5f5]">{c.label}</span>
                      </div>
                      {sel && (
                        <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                      )}
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
          <div className="bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-3">
              {STYLES.map((s) => {
                const sel = styles.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleStyle(s.id)}
                    className={`relative overflow-hidden rounded-xl border text-left transition-all ${sel ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40' : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'}`}>
                    <img src={s.image} alt={s.label} className="w-full h-24 object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <span className="text-sm font-medium text-[#f5f5f5]">{s.label}</span>
                    </div>
                    {sel && (
                      <span className="absolute top-2 right-2 h-5 min-w-5 px-1 rounded-full bg-[#c9a962] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section: Fit Size & Measurements */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>📐</span> Fit Size
          </h2>
          <div className="space-y-4 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            {/* Measurements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#a0a0a0] ml-1">Measurements <span className="text-[#525252]">(optional)</span></label>
                <div className="flex items-center gap-1">
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
                    placeholder={measurementUnit === 'in' ? 'e.g. 40' : 'e.g. 102'}
                    className="w-full bg-transparent text-[#f5f5f5] placeholder-[#404040] focus:outline-none text-sm"
                  />
                </div>
                <span className="text-[10px] text-[#525252] shrink-0">{measurementUnit}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2a2a]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#121212] px-3 text-[#525252]">or pick your size</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FIT_SIZES.map((s) => {
                const ranges = SIZE_CHART[s];
                return (
                  <button key={s} onClick={() => handleSizeClick(s)}
                    className={`rounded-xl border p-3 text-left transition-all ${fit === s ? 'border-[#c9a962] bg-[#c9a962]/10' : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'}`}>
                    <span className={`block text-sm font-semibold mb-1 ${fit === s ? 'text-[#c9a962]' : 'text-[#e0e0e0]'}`}>{FIT_LABELS[s]}</span>
                    <div className={`text-[10px] leading-relaxed ${fit === s ? 'text-[#c9a962]/70' : 'text-[#606060]'}`}>
                      <span>B {ranges.bust[0]}-{ranges.bust[1]}</span>{' · '}
                      <span>W {ranges.waist[0]}-{ranges.waist[1]}</span>{' · '}
                      <span>H {ranges.hip[0]}-{ranges.hip[1]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section: Body Type & Skin Tone */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[#c9a962] mb-3 flex items-center gap-2">
            <span>🧍</span> Body Type & Skin Tone
          </h2>
          <div className="space-y-4 bg-[#121212] border border-[#1a1a1a] rounded-2xl p-4">
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Body type <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {BODY_TYPES.map((b) => (
                  <button key={b.id} onClick={() => setBodyType(bodyType === b.id ? '' : b.id)}
                    className={`relative overflow-hidden rounded-xl border transition-all ${bodyType === b.id ? 'border-[#c9a962] ring-2 ring-[#c9a962]/40' : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'}`}>
                    <img src={b.image} alt={b.label} className="w-full h-40 object-cover object-top" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                      <span className="text-xs font-medium text-[#f5f5f5]">{b.label}</span>
                    </div>
                    {bodyType === b.id && (
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
                  <button key={tone.id} onClick={() => setSkinTone(skinTone === tone.id ? '' : tone.id)}
                    className={`h-11 rounded-xl border font-semibold text-sm transition-all ${skinTone === tone.id ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#c9a962]' : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'}`}>
                    {tone.label}
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[#c9a962]">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a962]/20 text-[#c9a962] border border-[#c9a962]/35">
                        Default
                      </span>
                    )}
                  </div>
                  {editingAddressId === addr.id ? (
                    <div className="mt-2 flex flex-col gap-2 max-w-[440px]">
                      <div className="flex gap-2">
                        {['Home', 'Work', 'Other'].map((label) => (
                          <button key={label} onClick={() => setEditingAddressLabel(label)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editingAddressLabel === label ? 'bg-[#c9a962]/15 text-[#c9a962] border border-[#c9a962]/30' : 'bg-[#1a1a1a] text-[#6b6b6b]'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleEditingAddressLocationGet}
                        disabled={editingAddressLocationLoading}
                        className="w-full p-3 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#c9a962]/50 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="text-xs font-medium text-[#a0a0a0]">
                          {editingAddressLocationLoading ? 'Fetching location...' : 'Use my current location'}
                        </span>
                      </button>
                      <input
                        type="text"
                        value={editingAddressLine1}
                        onChange={(e) => setEditingAddressLine1(e.target.value)}
                        placeholder="Flat No., Building Name, Landmark"
                        className="w-full h-12 px-4 bg-[#121212] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder-[#505050] focus:outline-none focus:border-[#c9a962] text-sm"
                      />
                      <div className="relative">
                        <input
                          type="text"
                          value={editingAddress}
                          onChange={(e) => handleEditingAddressInput(e.target.value)}
                          onFocus={() => { if (editingAddressSuggestions.length > 0) setShowEditingAddressSuggestions(true); }}
                          onBlur={() => setTimeout(() => setShowEditingAddressSuggestions(false), 150)}
                          placeholder="Search address or locality"
                          className="w-full h-11 px-4 bg-[#121212] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] placeholder-[#505050] focus:outline-none focus:border-[#c9a962] text-sm"
                        />
                        {editingAddressSuggestionsLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="animate-spin h-4 w-4 text-[#c9a962]" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        )}
                        {showEditingAddressSuggestions && editingAddressSuggestions.length > 0 && (
                          <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
                            {editingAddressSuggestions.map((s) => (
                              <li key={s.place_id}>
                                <button
                                  type="button"
                                  onMouseDown={() => handleEditingAddressSelectSuggestion(s)}
                                  className="w-full text-left px-4 py-3 text-sm text-[#d0d0d0] hover:bg-[#252525] transition-colors border-b border-[#1e1e1e] last:border-0"
                                >
                                  <span className="leading-snug">{s.description}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveAddressLine1(addr.id)}
                          disabled={updatingAddressId === addr.id}
                          className="px-3 h-8 rounded-lg text-[11px] font-medium bg-[#c9a962] text-[#0a0a0a] disabled:opacity-50 transition-all"
                        >
                          {updatingAddressId === addr.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEditAddressLine1}
                          disabled={updatingAddressId === addr.id}
                          className="px-3 h-8 rounded-lg text-[11px] font-medium border border-[#2a2a2a] text-[#a0a0a0] disabled:opacity-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {addr.addressLine1 && (
                        <p className="text-sm text-[#d0d0d0] mt-1">{addr.addressLine1}</p>
                      )}
                      {!addr.addressLine1 && (
                        <button
                          onClick={() => handleStartEditAddressLine1(addr)}
                          className="mt-2 h-10 px-4 rounded-xl border border-[#c9a962]/25 bg-[#c9a962]/10 text-sm font-medium text-[#c9a962] hover:border-[#c9a962]/45 transition-all"
                        >
                          Add address details
                        </button>
                      )}
                    </>
                  )}
                  <p className="text-sm text-[#a0a0a0] mt-0.5">{addr.addressLine}</p>
                  {addr.city && <p className="text-xs text-[#6b6b6b] mt-0.5">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.pincode || ''}</p>}
                  {addr.isDefault && (
                    <p className="text-[11px] text-[#6b6b6b] mt-1">
                      INFO: You cannot delete your default address.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {addresses.length > 1 && !addr.isDefault && (
                    <button
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      disabled={settingDefaultAddressId === addr.id}
                      className="px-2.5 h-7 rounded-lg text-[11px] font-medium text-[#a0a0a0] border border-[#2a2a2a] hover:border-[#c9a962]/40 hover:text-[#c9a962] disabled:opacity-50 transition-all"
                    >
                      {settingDefaultAddressId === addr.id ? 'Setting...' : 'Set default'}
                    </button>
                  )}
                  <button
                    onClick={() => handleStartEditAddressLine1(addr)}
                    className="p-1.5 text-[#6b6b6b] hover:text-[#c9a962] transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    disabled={addr.isDefault}
                    className="p-1.5 text-[#6b6b6b] hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
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
              {/* Current location button */}
              <button
                onClick={handleNewAddressLocationGet}
                disabled={newAddressLocationLoading}
                className="w-full p-3 mb-2 rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#c9a962]/50 transition-all flex items-center justify-center gap-2"
              >
                {newAddressLocationLoading ? (
                  <svg className="animate-spin h-4 w-4 text-[#c9a962]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[#c9a962]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                )}
                <span className="text-xs font-medium text-[#a0a0a0]">
                  {newAddressLocationLoading ? 'Fetching location...' : 'Use my current location'}
                </span>
              </button>
              <input
                type="text"
                value={newAddressLine1}
                onChange={(e) => setNewAddressLine1(e.target.value)}
                placeholder="Flat No., Building Name, Landmark"
                className="w-full h-12 px-4 mb-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm"
              />

              {/* Autocomplete address input */}
              <div className="relative">
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => handleNewAddressInput(e.target.value)}
                  onFocus={() => { if (newAddressSuggestions.length > 0) setShowNewAddressSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowNewAddressSuggestions(false), 150)}
                  placeholder="Search address or locality"
                  className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm"
                />
                {newAddressSuggestionsLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-[#c9a962]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {showNewAddressSuggestions && newAddressSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
                    {newAddressSuggestions.map((s) => (
                      <li key={s.place_id}>
                        <button
                          type="button"
                          onMouseDown={() => handleNewAddressSelectSuggestion(s)}
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

              <button onClick={handleAddAddress} disabled={!newAddress.trim() || !newAddressLine1.trim()}
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
