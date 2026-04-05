import React, { useState, useRef } from 'react';
import { uploadProfilePhoto, deleteProfilePhoto } from './profilePhotoService';

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  userName: string;
  onPhotoUpdated: (url: string | null) => void;
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  userName,
  onPhotoUpdated,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const newUrl = await uploadProfilePhoto(dataUrl);
      onPhotoUpdated(newUrl);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteProfilePhoto();
      onPhotoUpdated(null);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={userName}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#2a2a2a]"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border-2 border-dashed border-[#3a3a3a] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#4a4a4a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
          className="text-sm text-[#c9a962] hover:text-[#d4b872] transition-colors disabled:opacity-50"
        >
          {currentPhotoUrl ? 'Change Photo' : 'Add Profile Photo'}
        </button>
        {currentPhotoUrl && (
          <button
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="text-xs text-[#6b6b6b] hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Removing...' : 'Remove Photo'}
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};
