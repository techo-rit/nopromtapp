import { useEffect } from 'react';

export const usePaste = (onFile: (f: File) => void) => {
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Ignore if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.clipboardData?.files.length) {
        onFile(e.clipboardData.files[0]);
      } else if (e.clipboardData?.items) {
        // Handle "Copy Image" from web
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
            const f = e.clipboardData.items[i].getAsFile();
            if (f) onFile(f);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [onFile]);
};