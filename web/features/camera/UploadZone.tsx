import React, { useState, useId, useEffect, useRef } from 'react';
import { UploadIcon } from '../../shared/ui/Icons';
import { SmartSelfieModal } from './SmartSelfieModal';
import { StandardCameraModal } from './StandardCameraModal'; 
import { useImagePaste } from '../../shared/hooks/useImagePaste';
import { CONFIG } from '../../config';

interface UploadZoneProps {
  onFileChange: (file: File | null) => void;
  title: string;
  subtitle: 'Required' | 'Optional';
  file?: File | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  captureMode?: 'user' | 'environment'; 
}

export const UploadZone: React.FC<UploadZoneProps> = ({ 
  onFileChange, title, subtitle, file, onMouseEnter, onMouseLeave, captureMode = 'user' 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false); 
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  // Validation Logic
  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) return;
    
    if (!CONFIG.UPLOAD.ACCEPTED_TYPES.includes(selectedFile.type)) {
        alert("Invalid file type. Please upload a JPG, PNG, or WebP file.");
        return;
    }
    if (selectedFile.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
        alert("File size exceeds 10MB.");
        return;
    }
    onFileChange(selectedFile);
  };

  useImagePaste({
    onFile: handleFile,
    onError: (message) => alert(message),
  });

  // Drag Handlers
  const handleDrag = (e: React.DragEvent, state: boolean) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(state);
  };
  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e, false);
    if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <p className="block text-xl font-semibold text-primary mb-3">{title}</p>
        
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => handleDrag(e, true)}
          onDragEnter={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          className={`relative block w-full aspect-square border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 outline-none caret-transparent ${isDragging ? 'border-gold bg-gold/10' : 'border-border bg-surface'} focus-within:ring-2 focus-within:ring-gold/50`}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={CONFIG.UPLOAD.ACCEPTED_TYPES.join(',')}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="hidden"
          />
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-2xl p-2 pointer-events-none" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-tertiary pointer-events-none select-none px-4">
                <UploadIcon />
                <p className="mt-3 text-center text-lg">Drag and drop / paste / tap</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
          className="mt-3 w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border rounded-xl text-primary font-medium hover:bg-elevated transition-all hover:cursor-pointer">
          <span>{captureMode === 'user' ? "Capture your face" : "Take a photo"}</span>
        </button>

        {/* Dynamic Import or Condition Render for Modals */}
        {captureMode === 'user' 
          ? <SmartSelfieModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={(f) => { handleFile(f); setShowCamera(false); }} />
          : <StandardCameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={(f) => { handleFile(f); setShowCamera(false); }} />
        }
    </div>
  );
};
