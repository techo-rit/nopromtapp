import React, { useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface HoverPreviewProps {
  imageUrl: string | null;
  rect: DOMRect | null;
}

export const HoverPreview: React.FC<HoverPreviewProps> = ({ imageUrl, rect }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transform: 'scale(0.95)',
    transition: 'opacity 150ms ease-out, transform 150ms ease-out',
  });

  useLayoutEffect(() => {
    if (rect && imageUrl && previewRef.current) {
      const previewWidth = 320;
      const margin = 24;

      let left = rect.right + margin;
      if (left + previewWidth > window.innerWidth - margin) {
        left = rect.left - previewWidth - margin;
      }

      const previewHeight = previewRef.current.offsetHeight;
      let top = rect.top + rect.height / 2 - previewHeight / 2;

      if (top < margin) {
        top = margin;
      }
      if (top + previewHeight > window.innerHeight - margin) {
        top = window.innerHeight - previewHeight - margin;
      }
      
      setStyle(s => ({
        ...s,
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
        transform: 'scale(1)',
      }));
    } else {
      setStyle(s => ({ ...s, opacity: 0, transform: 'scale(0.95)' }));
    }
  }, [rect, imageUrl]);
  
  // Conditionally render to avoid having a stray div in the body when not visible
  if (!imageUrl && style.opacity === 0) return null;

  return ReactDOM.createPortal(
    <div
      ref={previewRef}
      style={style}
      className="fixed w-[320px] z-[100] bg-white rounded-xl shadow-2xl shadow-purple-500/20 p-2 pointer-events-none"
    >
      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden">
        {imageUrl && <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />}
      </div>
    </div>,
    document.body
  );
};