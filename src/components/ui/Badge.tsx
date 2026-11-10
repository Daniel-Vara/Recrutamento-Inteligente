import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'active' | 'success' | 'warning' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className = '' 
}) => {
  const variantStyles = {
    default: 'bg-[#f8fbff] border-[#b8d8ff] text-[#0b5aa8]',
    active: 'bg-[#0b5aa8] border-[#0b5aa8] text-white',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
    neutral: 'bg-slate-100 border-slate-300 text-slate-700',
  }[variant];

  return (
    <div 
      className={`border inline-flex items-center justify-center px-[12px] py-[5px] rounded-[999px] text-[12px] font-medium tracking-[0.2px] select-none font-sans ${variantStyles} ${className}`}
    >
      {children}
    </div>
  );
};
