import React, { useRef, useCallback, useEffect, useState } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onDismiss,
  children,
  snapPoints = [0.75],
  initialSnap = 0,
  className = '',
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startHeight: 0, dragging: false });
  const [height, setHeight] = useState(0);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const targetHeight = snapPoints[initialSnap] * window.innerHeight;

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(targetHeight);
          setAnimating(true);
        });
      });
    } else if (visible) {
      setHeight(0);
      setAnimating(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimating(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetHeight, visible]);

  const findNearestSnap = useCallback(
    (currentH: number) => {
      const vh = window.innerHeight;
      let nearest = 0;
      let minDist = Infinity;
      for (const sp of snapPoints) {
        const dist = Math.abs(currentH - sp * vh);
        if (dist < minDist) {
          minDist = dist;
          nearest = sp;
        }
      }
      return nearest * vh;
    },
    [snapPoints],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = { startY: e.clientY, startHeight: height, dragging: true };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setAnimating(false);
    },
    [height],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const delta = dragRef.current.startY - e.clientY;
    const newH = Math.max(0, Math.min(window.innerHeight * 0.95, dragRef.current.startHeight + delta));
    setHeight(newH);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setAnimating(true);

    const dismissThreshold = window.innerHeight * 0.15;
    if (height < dismissThreshold) {
      onDismiss();
    } else {
      setHeight(findNearestSnap(height));
    }
  }, [height, onDismiss, findNearestSnap]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        style={{
          opacity: height > 0 ? 1 : 0,
          zIndex: 'var(--z-sheet)' as unknown as number,
        }}
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={[
          'fixed bottom-0 left-0 right-0 bg-surface',
          'rounded-t-[var(--radius-sheet)]',
          'overflow-hidden',
          className,
        ].join(' ')}
        style={{
          height: `${height}px`,
          zIndex: 'calc(var(--z-sheet) + 1)' as unknown as number,
          transition: animating
            ? 'height 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'none',
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="w-9 h-[5px] rounded-full bg-[rgba(255,255,255,0.3)]" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-44px)] overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
};
