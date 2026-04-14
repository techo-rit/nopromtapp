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

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a] pb-32">
      <div className="w-full max-w-lg mx-auto px-4 py-8">

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex-1 h-[3px] rounded-full" style={{ background: step >= 1 ? '#d4b872' : '#1e1e1e' }} />
          <div className="flex-1 h-[3px] rounded-full transition-colors duration-300" style={{ background: step >= 2 ? '#d4b872' : '#1e1e1e' }} />
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
            <div className="w-8 h-8 border-2 border-[#d4b872] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#6b6b6b]">Creating your look…</p>
          </div>
        )}

        {/* Step 1: Your Photo — camera opens immediately */}
        {!generatedImages && !isLoading && step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[11px] font-medium text-[#d4b872] tracking-[0.2em] uppercase mb-1">Step 1 of 2</p>
              <h2 className="text-2xl font-light text-[#f5f5f5]">Your Photo</h2>
              <p className="text-sm text-[#6b6b6b] mt-1">Position your face and tap capture</p>
            </div>

            {/* Selfie preview / retake */}
            {selfieImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#141414]">
                <img
                  src={URL.createObjectURL(selfieImage)}
                  alt="Your selfie"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setShowCamera(true)}
                  className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCamera(true)}
                className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
                style={{ background: '#141414', border: '1.5px dashed #2a2a2a' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm text-[#4a4a4a]">Tap to open camera</span>
              </button>
            )}

            <button
              onClick={() => setShowClothingCamera(true)}
              disabled={!selfieImage}
              className="w-full py-4 text-sm font-medium tracking-[0.08em] uppercase rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ background: selfieImage ? '#f5f5f5' : '#2a2a2a', color: selfieImage ? '#0a0a0a' : '#6b6b6b' }}
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
                className="p-2 -ml-2 text-[#6b6b6b] hover:text-[#f5f5f5] transition-colors"
                aria-label="Back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              <div>
                <p className="text-[11px] font-medium text-[#d4b872] tracking-[0.2em] uppercase mb-0.5">Step 2 of 2</p>
                <h2 className="text-2xl font-light text-[#f5f5f5]">Clothing Item</h2>
              </div>
            </div>

            {/* Clothing preview / retake */}
            {wearableImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#141414]">
                <img
                  src={URL.createObjectURL(wearableImage)}
                  alt="Clothing item"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setShowClothingCamera(true)}
                  className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClothingCamera(true)}
                className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors"
                style={{ background: '#141414', border: '1.5px dashed #2a2a2a' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm text-[#4a4a4a]">Tap to photograph clothing</span>
              </button>
            )}

            {!template && (
              <p className="text-center text-xs text-[#6b6b6b]">
                Or{' '}
                <button onClick={() => navigate('/')} className="text-[#d4b872] hover:text-[#e5ca82] transition-colors">
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
              className="w-full py-4 text-sm font-medium tracking-[0.08em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed rounded-xl"
            >
              Generate Try-On
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
