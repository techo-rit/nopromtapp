import React from 'react';

interface GlassNavProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
}

export const GlassNav: React.FC<GlassNavProps> = ({
  children,
  className = '',
  position = 'top',
}) => (
  <nav
    className={[
      'fixed left-0 right-0 glass',
      position === 'top' ? 'top-0' : 'bottom-0',
      className,
    ].join(' ')}
    style={{ zIndex: 'var(--z-nav)' } as React.CSSProperties}
  >
    {children}
  </nav>
);
