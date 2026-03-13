import React, { useState, useEffect, useCallback } from 'react';
import { profileService } from '../profile/profileService';
import type { User, UserAddress } from '../../types';

interface ProfilePageProps {
  user: User;
  onProfileUpdate: () => void;
  onBack: () => void;
  onLogout: () => void;
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

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onProfileUpdate,
  onBack,
  onLogout,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [ageRange, setAgeRange] = useState(user.ageRange || '');
  const [email, setEmail] = useState(user.email || '');
  const [colorMode, setColorMode] = useState(user.colorMode || '');
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
    setPhone(user.phone || '');
    setAgeRange(user.ageRange || '');
    setEmail(user.email || '');
    setColorMode(user.colorMode || '');
    setColors(user.colors || []);
    setStyles(user.styles || []);
    setFit(user.fit || '');
    setBodyType(user.bodyType || '');
    loadAddresses();
  }, [user]);

  const loadAddresses = useCallback(async () => {
    try {
      const addrs = await profileService.getAddresses();
      setAddresses(addrs);
    } catch { /* ignore */ }
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!name.trim()) { setError('Name is required'); setIsLoading(false); return; }
      if (!phone.trim()) { setError('Phone number is required'); setIsLoading(false); return; }

      const updates: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
      };

      if (ageRange) updates.ageRange = ageRange;
      if (email.trim()) updates.email = email.trim();
      if (colorMode) updates.colorMode = colorMode;
      if (colors.length > 0) updates.colors = colors;
      if (styles.length > 0) updates.styles = styles;
      if (fit) updates.fit = fit;
      if (bodyType) updates.bodyType = bodyType;

      await profileService.updateProfile(updates);
      setSuccess('Profile updated successfully');
      onProfileUpdate();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, ageRange, email, colorMode, colors, styles, fit, bodyType, onProfileUpdate]);

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
    }
  }, [newAddress, newLabel, loadAddresses]);

  const handleDeleteAddress = useCallback(async (id: string) => {
    try {
      await profileService.deleteAddress(id);
      loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
    }
  }, [loadAddresses]);

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

  const avatarUrl = user.avatarUrl || null;

  return (
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
            <p className="text-sm text-[#6b6b6b] truncate">{user.email}</p>
            <p className="text-xs text-[#c9a962] mt-0.5">{user.credits} credits</p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

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
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Phone <span className="text-red-400">*</span></label>
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
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1">Email <span className="text-[#525252]">(optional)</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
                className="w-full h-11 px-4 mt-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] placeholder-[#404040] focus:outline-none focus:border-[#c9a962] focus:ring-1 focus:ring-[#c9a962] text-sm" />
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
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Theme</label>
              <div className="flex gap-3">
                {['light', 'dark'].map((mode) => (
                  <button key={mode} onClick={() => setColorMode(colorMode === mode ? '' : mode)}
                    className={`flex-1 p-3 rounded-xl border text-center font-medium text-sm transition-all ${colorMode === mode ? 'border-[#c9a962] bg-[#c9a962]/10 text-[#f5f5f5]' : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#a0a0a0] hover:border-[#3a3a3a]'}`}>
                    {mode === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Favorite colors (up to 3)</label>
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
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Fit size</label>
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
              <label className="text-xs font-medium text-[#a0a0a0] ml-1 mb-2 block">Body type</label>
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
  );
};
