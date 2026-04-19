import React from 'react';

type PillVariant = 'primary' | 'ghost' | 'gold';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillVariant;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses: Record<PillVariant, string> = {
  primary: [
    'bg-primary text-base',
    'hover:shadow-[0_4px_20px_rgba(242,242,247,0.15)]',
    'active:scale-[0.97]',
  ].join(' '),
  ghost: [
    'bg-transparent border border-[rgba(255,255,255,0.15)] text-primary',
    'hover:bg-[rgba(255,255,255,0.06)]',
    'active:scale-[0.97]',
  ].join(' '),
  gold: [
    'bg-gold-subtle text-gold',
    'hover:bg-[rgba(232,195,125,0.25)]',
    'active:scale-[0.97]',
  ].join(' '),
};

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-9 px-5 text-[13px]',
  md: 'h-[50px] px-8 text-[15px]',
  lg: 'h-14 px-10 text-[17px]',
};

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => (
  <button
    className={[
      'inline-flex items-center justify-center',
      'rounded-[9999px] font-semibold',
      'transition-all duration-200',
      'cursor-pointer select-none',
      'min-w-[44px] min-h-[44px]',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(' ')}
    style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
    {...props}
  >
    {children}
  </button>
);
