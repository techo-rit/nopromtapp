import React, { useState, useCallback, DragEvent, useId, useEffect, useRef } from 'react';
import { UploadIcon } from './Icons';
import { SmartSelfieModal } from './SmartSelfieModal';
import { StandardCameraModal } from './StandardCameraModal'; 

interface UploadZoneProps {
  onFileChange: (file: File | null) => void;
  title: string;
  subtitle: 'Required' | 'Optional';
  file?: File | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  captureMode?: 'user' | 'environment'; 
}

const CameraIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}/>
    <circle cx="12" cy="13" r="4" stroke="currentColor" style={{ strokeWidth: 2 }}/>
  </svg>
);

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onFileChange, 
  title, 
  subtitle, 
  file, 
  onMouseEnter, 
  onMouseLeave,
  captureMode = 'user' 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false); 
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview with external file prop
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFile = useCallback((selectedFile: File | null) => {
    if (selectedFile && (selectedFile.type === "image/jpeg" || selectedFile.type === "image/png" || selectedFile.type === "image/webp")) {
        if (selectedFile.size > 10 * 1024 * 1024) {
            alert("File size exceeds 10MB. Please choose a smaller file.");
            return;
        }
        onFileChange(selectedFile);
    } else if (selectedFile) {
        alert("Invalid file type. Please upload a JPG, PNG, or WebP file.");
    }
  }, [onFileChange]);

  // --- FIXED: Global Paste Listener (No contentEditable needed) ---
  // This prevents the mobile keyboard from popping up when tapping the upload box
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in a text field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return;
      }
      
      let pastedFile: File | null = null;
      if (e.clipboardData?.files.length) {
          pastedFile = e.clipboardData.files[0];
      } else if (e.clipboardData?.items) {
          for (let i = 0; i < e.clipboardData.items.length; i++) {
              if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
                  const f = e.clipboardData.items[i].getAsFile();
                  if (f) {
                      pastedFile = f;
                      break;
                  }
              }
          }
      }
      
      if (pastedFile) {
          handleFile(pastedFile);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleFile]);

  const handleDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
        e.dataTransfer.clearData();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
      if (e.target !== inputRef.current) {
          inputRef.current?.click();
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleCameraCapture = (capturedFile: File) => {
    handleFile(capturedFile);
    setShowCamera(false);
  };

  const buttonLabel = captureMode === 'user' ? "Capture your face" : "Take a photo";

  return (
    <div className="w-full" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <p className="block text-xl font-semibold text-[#f5f5f5] mb-3">{title}</p>
        
        <div
          role="button"
          tabIndex={0}
          // REMOVED contentEditable here to fix mobile keyboard bug
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
             if (e.key === 'Enter' || e.key === ' ') {
                 e.preventDefault();
                 inputRef.current?.click();
             }
          }}
          className={`relative block w-full aspect-square border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 outline-none caret-transparent ${isDragging ? 'border-[#c9a962] bg-[#c9a962]/10' : 'border-[#2a2a2a] bg-[#141414]'} focus-within:ring-2 focus-within:ring-[#c9a962]/50 focus-within:border-[#c9a962]`}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            className="hidden"
            aria-label={`${title} (${subtitle})`}
          />
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-2xl p-2 pointer-events-none" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b] pointer-events-none select-none px-4">
                <UploadIcon />
                <p className="mt-3 text-center text-lg">Drag and drop / paste / tap</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowCamera(true);
          }}
          className="mt-3 w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] font-medium hover:bg-[#2a2a2a] hover:border-[#c9a962]/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50"
        >
          <CameraIcon />
          <span>{buttonLabel}</span>
        </button>

        {captureMode === 'user' ? (
            <SmartSelfieModal
              isOpen={showCamera}
              onClose={() => setShowCamera(false)}
              onCapture={handleCameraCapture}
            />
        ) : (
            <StandardCameraModal
              isOpen={showCamera}
              onClose={() => setShowCamera(false)}
              onCapture={handleCameraCapture}
            />
        )}
    </div>
  );
};