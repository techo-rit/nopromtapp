import React, { useState } from 'react';
import { saveSelfie } from './savedSelfieService';

interface ProfilePhotoPromptProps {
  selfieFile: File;
  onSaved: (profilePhotoUrl: string) => void;
  onDismiss: () => void;
}

export const ProfilePhotoPrompt: React.FC<ProfilePhotoPromptProps> = ({
  selfieFile,
  onSaved,
  onDismiss,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [preview] = useState(() => URL.createObjectURL(selfieFile));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(selfieFile);
      });
      const { profilePhotoUrl } = await saveSelfie(dataUrl);
      onSaved(profilePhotoUrl);
    } catch {
      onDismiss();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#141414] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex justify-center mb-5">
          <img src={preview} alt="Your selfie" className="w-24 h-24 rounded-full object-cover border-2 border-[#c9a962]" />
        </div>

        <h3 className="text-lg font-medium text-[#f5f5f5] text-center mb-2">Save this selfie?</h3>
        <p className="text-sm text-[#6b6b6b] text-center mb-6">
          Add to your selfie collection and use it for future try-ons
        </p>

        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 text-sm font-medium bg-[#c9a962] text-[#0a0a0a] rounded-xl hover:bg-[#d4b872] transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save Selfie'}
          </button>
          <button
            onClick={onDismiss}
            disabled={isSaving}
            className="w-full py-3 text-sm text-[#6b6b6b] hover:text-[#a0a0a0] transition-colors disabled:opacity-50"
          >
            Not Now
          </button>
        </div>

        <p className="text-xs text-[#4a4a4a] text-center mt-4">
          View and manage all your selfies from your Profile
        </p>

        <style>{`
          @keyframes slide-up {
            0% { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>
      </div>
    </div>
  );
};
