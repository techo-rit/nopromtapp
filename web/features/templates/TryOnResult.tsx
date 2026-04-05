import React, { useState, useCallback } from 'react';
import type { User } from '../../types';
import { ProfilePhotoPrompt } from '../profile/ProfilePhotoPrompt';
import { createShareLink } from './shareLinkService';

interface TryOnResultProps {
  images: string[];
  productHandle?: string;
  productName?: string;
  selfieFile: File | null;
  user: User;
  onViewProduct?: () => void;
  onTryAgain: () => void;
  onProfilePhotoSaved?: () => void;
}

async function addWatermark(imageUrl: string, shareUrl?: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0);

      // Brand watermark — top-left
      const brandFontSize = Math.max(14, Math.floor(img.width * 0.03));
      ctx.font = `bold ${brandFontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Tried on with Stiri.in', 16, 16);

      // Share URL strip — bottom bar
      if (shareUrl) {
        const barHeight = Math.max(32, Math.floor(img.height * 0.06));
        // Semi-transparent dark bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

        const urlFontSize = Math.max(11, Math.floor(img.width * 0.025));
        ctx.font = `${urlFontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shareUrl, img.width / 2, img.height - barHeight / 2);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

export const TryOnResult: React.FC<TryOnResultProps> = ({
  images,
  productHandle,
  productName,
  selfieFile,
  user,
  onViewProduct,
  onTryAgain,
  onProfilePhotoSaved,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  // Cache the share link so we don't create a new one per click
  const [cachedShareLink, setCachedShareLink] = useState<{ url: string } | null>(null);

  // Show profile photo prompt after first render if user has no profile photo and has a selfie
  const shouldShowPrompt = !promptDismissed && !user.profilePhotoUrl && selfieFile;

  // Trigger prompt after a brief delay
  React.useEffect(() => {
    if (shouldShowPrompt) {
      const timer = setTimeout(() => setShowPhotoPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowPrompt]);

  const handleShare = useCallback(async (imageUrl: string) => {
    setIsSharing(true);
    try {
      // Create or reuse a trackable share link
      let shareUrl: string;
      if (cachedShareLink) {
        shareUrl = cachedShareLink.url;
      } else {
        try {
          const link = await createShareLink(productHandle, productName);
          setCachedShareLink(link);
          shareUrl = link.url;
        } catch {
          // Fallback: use product URL directly if share link creation fails
          shareUrl = productHandle
            ? `${window.location.origin}/product/${productHandle}`
            : window.location.origin;
        }
      }

      const watermarkedBlob = await addWatermark(imageUrl, shareUrl);

      const shareText = productHandle
        ? `I tried on ${productName} on Stiri! 👗✨\nShop it here: ${shareUrl}`
        : `Check out my look on Stiri! ✨\n${shareUrl}`;

      if (navigator.share) {
        const file = new File([watermarkedBlob], 'tryon-stiri.jpg', { type: 'image/jpeg' });
        await navigator.share({
          title: productName || 'My Try-On Look',
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback: copy text with link to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Caption & link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setIsSharing(false);
    }
  }, [productHandle, productName, cachedShareLink]);

  const handleDownload = useCallback((imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `stiri-tryon-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-[#0a0a0a] pb-24">
      <div className="w-full max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-light text-[#f5f5f5]">Your Look</h2>
          <button
            onClick={onTryAgain}
            className="text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors"
          >
            Try Again
          </button>
        </div>

        {/* Result images */}
        <div className="space-y-4 mb-8">
          {images.map((img, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden bg-[#111]">
              <img
                src={img}
                alt={`Try-on result ${i + 1}`}
                className="w-full aspect-[3/4] object-cover"
              />
              {/* Action bar */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleShare(img)}
                    disabled={isSharing}
                    className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors disabled:opacity-50"
                    aria-label="Share"
                  >
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload(img, i)}
                    className="p-2.5 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-colors"
                    aria-label="Download"
                  >
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View Product CTA */}
        {onViewProduct && productHandle && (
          <button
            onClick={onViewProduct}
            className="w-full py-4 text-sm font-medium tracking-[0.1em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white transition-colors rounded-xl mb-3"
          >
            View Product
          </button>
        )}

        <button
          onClick={onTryAgain}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-colors ${onViewProduct && productHandle ? 'text-[#a0a0a0] hover:text-[#f5f5f5] border border-[#2a2a2a] hover:border-[#3a3a3a]' : 'tracking-[0.1em] uppercase bg-[#f5f5f5] text-[#0a0a0a] hover:bg-white'}`}
        >
          Try Another Look
        </button>
      </div>

      {/* Profile Photo Prompt */}
      {showPhotoPrompt && selfieFile && (
        <ProfilePhotoPrompt
          selfieFile={selfieFile}
          onSaved={() => {
            setShowPhotoPrompt(false);
            setPromptDismissed(true);
            onProfilePhotoSaved?.();
          }}
          onDismiss={() => {
            setShowPhotoPrompt(false);
            setPromptDismissed(true);
          }}
        />
      )}
    </div>
  );
};
