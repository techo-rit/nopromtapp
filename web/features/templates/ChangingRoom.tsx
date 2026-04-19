import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Template, User } from '../../types';
import { UploadZone } from '../camera/UploadZone';
import { SmartSelfieModal } from '../camera/SmartSelfieModal';
import { StandardCameraModal } from '../camera/StandardCameraModal';
import { generateImage } from '../templates/geminiService';
import { fetchTemplateById } from '../templates/templateService';
import { TRYON_TEMPLATE } from '../templates/tryOnConfig';
import { ProductTryOn } from './ProductTryOn';
import { TryOnResult } from './TryOnResult';
import { CONFIG } from '../../config';

interface ChangingRoomProps {
  user: User | null;
  onLoginRequired: () => void;
  onProfilePhotoSaved?: () => void;
}

export const ChangingRoom: React.FC<ChangingRoomProps> = ({
  user,
  onLoginRequired,
  onProfilePhotoSaved,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productHandle = searchParams.get('product');

  // If product handle is present AND user is logged in, use streamlined ProductTryOn
  if (productHandle && user) {
    return (
      <ProductTryOn
        user={user}
        productHandle={productHandle}
        onLoginRequired={onLoginRequired}
        onProfilePhotoSaved={onProfilePhotoSaved}
      />
    );
  }

  // If product handle is present but user is not logged in, prompt login
  if (productHandle && !user) {
    onLoginRequired();
  }

  const [template, setTemplate] = useState<Template | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [wearableImage, setWearableImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [showCamera, setShowCamera] = useState(true);
  const [showClothingCamera, setShowClothingCamera] = useState(false);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const clothingGalleryRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!user) {
      onLoginRequired();
      return;
    }
    if (!selfieImage) {
      setError('Please upload your selfie');
      return;
    }

    setError(null);
    setIsLoading(true);
    setGeneratedImages(null);

    try {
      // Use template if available (from product URL), otherwise use built-in try-on config
      const templateForGeneration = template || TRYON_TEMPLATE;
      const result = await generateImage(templateForGeneration, selfieImage, wearableImage);
      setGeneratedImages(result);
      if (result.length === 0) {
        setError('Generation completed but no images were produced. Try different images.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during generation.');
    } finally {
      setIsLoading(false);
    }
  }, [selfieImage, wearableImage, template, user, onLoginRequired]);

  const handleReset = () => {
    setSelfieImage(null);
    setWearableImage(null);
    setGeneratedImages(null);
    setError(null);
    setStep(1);
    setShowCamera(true);
    setShowClothingCamera(false);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'selfie' | 'clothing') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { onLoginRequired(); return; }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;

    if (target === 'selfie') {
      setSelfieImage(file);
      setShowCamera(false);
      setShowClothingCamera(true);
    } else {
      setWearableImage(file);
      setShowClothingCamera(false);
      setStep(2);
    }
    e.target.value = '';
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-base pb-32">
      <div className="w-full max-w-lg mx-auto px-4 py-8">

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex-1 h-[3px] rounded-full" style={{ background: step >= 1 ? 'var(--color-gold-hover)' : 'var(--color-border)' }} />
          <div className="flex-1 h-[3px] rounded-full transition-colors duration-300" style={{ background: step >= 2 ? 'var(--color-gold-hover)' : 'var(--color-border)' }} />
        </div>

        {/* Results */}
        {generatedImages && generatedImages.length > 0 && user && (
          <TryOnResult
            images={generatedImages}
            selfieFile={selfieImage}
            user={user}
            onTryAgain={handleReset}
            onProfilePhotoSaved={onProfilePhotoSaved}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Creating your look…</p>
          </div>
        )}

        {/* Step 1: Your Photo — camera opens immediately */}
        {!generatedImages && !isLoading && step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-medium text-gold-hover tracking-[0.2em] uppercase mb-1">Step 1 of 2</p>
              <h2 className="text-2xl font-light text-primary">Your Photo</h2>
              <p className="text-sm text-tertiary mt-1">Position your face and tap capture</p>
            </div>

            {/* Selfie preview / retake */}
            {selfieImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-surface">
                <img
                  src={URL.createObjectURL(selfieImage)}
                  alt="Your selfie"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setShowCamera(true)}
                  className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowCamera(true)}
                  className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
                  style={{ background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-sm text-tertiary">Tap to open camera</span>
                </button>

                {/* Gallery upload option */}
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-secondary border border-border rounded-xl hover:bg-elevated hover:text-primary transition-all cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Upload from gallery
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleGalleryUpload(e, 'selfie')}
                  className="hidden"
                />
              </div>
            )}

            <button
              onClick={() => setShowClothingCamera(true)}
              disabled={!selfieImage}
              className="w-full py-4 text-sm font-medium tracking-[0.08em] uppercase rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: selfieImage ? 'var(--color-primary)' : 'var(--color-elevated)', color: selfieImage ? 'var(--color-base)' : 'var(--color-tertiary)' }}
            >
              Next →
            </button>
          </div>
        )}

        {/* StandardCamera modal for clothing (rear camera) */}
        <StandardCameraModal
          isOpen={showClothingCamera && !generatedImages}
          onClose={() => setShowClothingCamera(false)}
          onCapture={(file) => {
            if (!user) { onLoginRequired(); return; }
            setWearableImage(file);
            setShowClothingCamera(false);
            setStep(2);
          }}
        />

        {/* SmartSelfie camera modal */}
        <SmartSelfieModal
          isOpen={showCamera && step === 1 && !generatedImages}
          onClose={() => setShowCamera(false)}
          onCapture={(file) => {
            if (!user) { onLoginRequired(); return; }
            setSelfieImage(file);
            setShowCamera(false);
            setShowClothingCamera(true);
          }}
        />

        {/* Step 2: Clothing Item */}
        {!generatedImages && !isLoading && step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="p-2 -ml-2 text-tertiary hover:text-primary transition-colors"
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <div>
                <p className="text-[11px] font-medium text-gold-hover tracking-[0.2em] uppercase mb-0.5">Step 2 of 2</p>
                <h2 className="text-2xl font-light text-primary">Clothing Item</h2>
              </div>
            </div>

            {/* Clothing preview / retake */}
            {wearableImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-surface">
                <img
                  src={URL.createObjectURL(wearableImage)}
                  alt="Clothing item"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setShowClothingCamera(true)}
                  className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowClothingCamera(true)}
                  className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
                  style={{ background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span className="text-sm text-tertiary">Tap to photograph clothing</span>
                </button>

                {/* Gallery upload option for clothing */}
                <button
                  onClick={() => clothingGalleryRef.current?.click()}
                  className="w-full py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-secondary border border-border rounded-xl hover:bg-elevated hover:text-primary transition-all cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Upload from gallery
                </button>
                <input
                  ref={clothingGalleryRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleGalleryUpload(e, 'clothing')}
                  className="hidden"
                />
              </div>
            )}

            {!template && (
              <p className="text-center text-xs text-tertiary">
                Or{' '}
                <button onClick={() => navigate('/')} className="text-gold-hover hover:text-gold transition-colors">
                  browse our catalog
                </button>{' '}
                to try on a specific look
              </p>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selfieImage || isLoading}
              className="w-full py-4 text-sm font-medium tracking-[0.08em] uppercase bg-primary text-base hover:bg-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed rounded-xl"
            >
              Generate Try-On
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
