import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Template, User } from '../../types';
import { UploadZone } from '../camera/UploadZone';
import { generateImage } from '../templates/geminiService';
import { fetchTemplateById } from '../templates/templateService';
import { Spinner } from '../../shared/ui/Spinner';
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
      // Use template if available (from product URL), otherwise create a minimal fitit template
      const templateForGeneration = template || {
        id: 'fitit_custom',
        stackId: 'fitit',
        name: 'Custom Try-On',
      };
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
  };

  const isFitit = template?.stackId === 'fitit' || !template;
  const canGenerate = selfieImage && (isFitit ? wearableImage || template : true);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a] pb-24">
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-light text-[#f5f5f5] mb-2">
            Changing Room
          </h1>
          <p className="text-sm text-[#6b6b6b]">
            Upload your photo and a clothing item to see how it looks on you
          </p>
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

        {/* Upload zones (hidden when showing results) */}
        {!generatedImages && !isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selfie */}
              <UploadZone
                onFileChange={(file) => {
                  if (!user) { onLoginRequired(); return; }
                  setSelfieImage(file);
                }}
                title="Your Photo"
                subtitle="Required"
                file={selfieImage}
                captureMode="user"
              />

              {/* Wearable / product image */}
              {isFitit && !template && (
                <UploadZone
                  onFileChange={(file) => {
                    if (!user) { onLoginRequired(); return; }
                    setWearableImage(file);
                  }}
                  title="Clothing Item"
                  subtitle={template ? 'Optional' : 'Required'}
                  file={wearableImage}
                  captureMode="environment"
                />
              )}
            </div>

            {/* Browse catalog link */}
            {!template && (
              <div className="text-center">
                <p className="text-xs text-[#6b6b6b] mb-2">Or pick from our catalog</p>
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors"
                >
                  Browse Products
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isLoading}
              className="w-full py-4 text-sm font-medium tracking-[0.1em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-xl"
            >
              Generate Try-On
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Spinner />
            <p className="text-sm text-[#6b6b6b]">Creating your look...</p>
            <p className="text-xs text-[#4a4a4a]">This may take a moment</p>
          </div>
        )}
      </div>
    </div>
  );
};
