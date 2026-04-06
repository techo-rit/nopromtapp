import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Template, User, ShopifyProduct } from '../../types';
import { SmartSelfieModal } from '../camera/SmartSelfieModal';
import { GenerationShowcase } from './GenerationShowcase';
import { TryOnResult } from './TryOnResult';
import { generateImage } from './geminiService';
import { fetchTemplateById } from './templateService';
import { TRYON_TEMPLATE } from './tryOnConfig';
import { CONFIG } from '../../config';

interface ProductTryOnProps {
  user: User;
  productHandle: string;
  onLoginRequired: () => void;
  onProfilePhotoSaved?: () => void;
}

type TryOnPhase = 'selfie' | 'generating' | 'result';

export const ProductTryOn: React.FC<ProductTryOnProps> = ({
  user,
  productHandle,
  onLoginRequired,
  onProfilePhotoSaved,
}) => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(() => !user.profilePhotoUrl);
  const [phase, setPhase] = useState<TryOnPhase>('selfie');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch template
  useEffect(() => {
    let cancelled = false;
    setLoadingTemplate(true);
    fetchTemplateById(productHandle).then((t) => {
      if (!cancelled) {
        setTemplate(t);
        setLoadingTemplate(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingTemplate(false);
    });
    return () => { cancelled = true; };
  }, [productHandle]);

  // If user has a profile photo, pre-load it as selfie
  useEffect(() => {
    if (user.profilePhotoUrl && !selfieFile) {
      setSelfiePreview(user.profilePhotoUrl);
    }
  }, [user.profilePhotoUrl]);

  const handleCapture = useCallback((file: File) => {
    setSelfieFile(file);
    const url = URL.createObjectURL(file);
    setSelfiePreview(url);
    setShowCamera(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!template) return;

    let fileToUse = selfieFile;

    // If using profile photo (no file captured), fetch it as a File
    if (!fileToUse && user.profilePhotoUrl) {
      try {
        const resp = await fetch(user.profilePhotoUrl);
        const blob = await resp.blob();
        fileToUse = new File([blob], 'profile-selfie.jpg', { type: blob.type || 'image/jpeg' });
      } catch {
        setError('Failed to load profile photo. Please retake your selfie.');
        return;
      }
    }

    if (!fileToUse) {
      setError('Please take a selfie first');
      return;
    }

    setError(null);
    setPhase('generating');

    try {
      // For product try-on, fetch the product image as the wearable
      let wearableFile: File | null = null;
      if (template.imageUrl) {
        const resp = await fetch(template.imageUrl);
        const blob = await resp.blob();
        wearableFile = new File([blob], 'product.jpg', { type: blob.type || 'image/jpeg' });
      }

      const templateForGeneration = {
        ...template,
        id: template.id.startsWith('fitit') ? template.id : `fitit_${template.id}`,
        prompt: template.prompt || TRYON_TEMPLATE.prompt,
        aspectRatio: template.aspectRatio || TRYON_TEMPLATE.aspectRatio,
      };

      const result = await generateImage(templateForGeneration, fileToUse, wearableFile);
      setGeneratedImages(result);
      setPhase('result');
    } catch (e: any) {
      setError(e.message || 'Generation failed. Please try again.');
      setPhase('selfie');
    }
  }, [selfieFile, template, user.profilePhotoUrl]);

  const handleRetake = useCallback(() => {
    setSelfieFile(null);
    setSelfiePreview(null);
    setShowCamera(true);
  }, []);

  const handleTryAgain = useCallback(() => {
    setGeneratedImages([]);
    setPhase('selfie');
  }, []);

  if (loadingTemplate) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#c9a962] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6b6b6b]">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] px-6">
        <p className="text-[#a0a0a0] text-sm mb-4">Product not found</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  // Generation showcase (animated wait)
  if (phase === 'generating') {
    return (
      <GenerationShowcase
        productImage={template.imageUrl}
        productName={template.name}
      />
    );
  }

  // Result screen
  if (phase === 'result' && generatedImages.length > 0) {
    return (
      <TryOnResult
        images={generatedImages}
        productHandle={productHandle}
        productName={template.name}
        selfieFile={selfieFile}
        user={user}
        onViewProduct={() => navigate(`/product/${productHandle}`)}
        onTryAgain={handleTryAgain}
        onProfilePhotoSaved={onProfilePhotoSaved}
      />
    );
  }

  // Selfie capture phase
  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a] pb-24">
      <div className="w-full max-w-lg mx-auto px-4 py-6">

        {/* Product info */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-[#121212] border border-[#1a1a1a] rounded-2xl">
          {template.imageUrl && (
            <img
              src={template.imageUrl}
              alt={template.name}
              className="w-16 h-20 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#f5f5f5] truncate">{template.name}</p>
            <p className="text-xs text-[#6b6b6b] mt-1">Virtual Try-On</p>
          </div>
        </div>

        {/* Selfie section */}
        <div className="mb-6">
          <h2 className="text-lg font-light text-[#f5f5f5] mb-4">Your Selfie</h2>

          {selfiePreview ? (
            <div className="relative rounded-2xl overflow-hidden bg-[#111] mb-4">
              <img
                src={selfiePreview}
                alt="Your selfie"
                className="w-full aspect-[3/4] object-cover"
              />
              <button
                onClick={handleRetake}
                className="absolute bottom-3 right-3 px-4 py-2 text-xs font-medium bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors"
              >
                Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCamera(true)}
              className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-[#2a2a2a] bg-[#111] flex flex-col items-center justify-center gap-3 hover:border-[#c9a962]/50 transition-colors"
            >
              <svg className="w-12 h-12 text-[#4a4a4a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-[#6b6b6b]">Take a Selfie</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selfiePreview}
          className="w-full py-4 text-sm font-medium tracking-[0.1em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-xl"
        >
          Generate Try-On
        </button>
      </div>

      {/* SmartSelfie camera modal */}
      <SmartSelfieModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCapture}
      />
    </div>
  );
};
