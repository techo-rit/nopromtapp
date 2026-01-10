import { useEffect, useCallback } from 'react';
import { CONFIG } from '../config';

export interface UseImagePasteOptions {
  /** Callback when a valid image file is pasted */
  onFile: (file: File) => void;
  /** Callback when validation fails */
  onError?: (message: string) => void;
  /** Whether paste handling is enabled (default: true) */
  enabled?: boolean;
  /** Max file size in bytes (default: CONFIG.UPLOAD.MAX_FILE_SIZE) */
  maxFileSize?: number;
  /** Accepted MIME types (default: CONFIG.UPLOAD.ACCEPTED_TYPES) */
  acceptedTypes?: string[];
}

/**
 * Hook for handling image paste events with built-in validation
 * 
 * Features:
 * - Validates file size and MIME type against config
 * - Ignores paste when typing in inputs/textareas
 * - Handles both direct file paste and "Copy Image" from web
 */
export const useImagePaste = ({
  onFile,
  onError,
  enabled = true,
  maxFileSize = CONFIG.UPLOAD.MAX_FILE_SIZE,
  acceptedTypes = CONFIG.UPLOAD.ACCEPTED_TYPES,
}: UseImagePasteOptions) => {
  const validateAndProcess = useCallback((file: File) => {
    // Validate MIME type
    if (!acceptedTypes.includes(file.type)) {
      onError?.(`Invalid file type: ${file.type}. Accepted: ${acceptedTypes.join(', ')}`);
      return;
    }
    
    // Validate file size
    if (file.size > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024));
      onError?.(`File size exceeds ${maxMB}MB limit.`);
      return;
    }
    
    onFile(file);
  }, [onFile, onError, maxFileSize, acceptedTypes]);

  useEffect(() => {
    if (!enabled) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Ignore if typing in an input
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }
      
      // Try direct file paste first
      if (e.clipboardData?.files.length) {
        validateAndProcess(e.clipboardData.files[0]);
        return;
      }
      
      // Handle "Copy Image" from web
      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              validateAndProcess(file);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [enabled, validateAndProcess]);
};
