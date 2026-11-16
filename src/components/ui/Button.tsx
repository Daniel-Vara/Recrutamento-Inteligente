import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  showArrow = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-medium transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[#5ea8ff] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'h-[38px] px-3 text-[13px] rounded-[2px] gap-2',
    md: 'min-h-[50px] px-5 py-3 text-[15px] rounded-[2px] gap-3',
    lg: 'h-[64px] px-6 text-[17px] rounded-[4px] gap-4',
  }[size];

  const variantStyles = {
    primary: 'bg-[#0b5aa8] text-white border border-[#0b5aa8] hover:bg-[#094a8b] hover:border-[#094a8b] font-bold shadow-sm',
    outline: 'bg-[#f8fbff] text-[#0b5aa8] border border-[#0b5aa8] hover:bg-[#e5f0fd] font-medium',
    secondary: 'bg-[#f8fbff] text-[#0b5aa8] border border-[#b8d8ff] hover:bg-[#e5f0fd] font-medium',
    ghost: 'bg-transparent text-[#0b5aa8] hover:bg-[#e5f0fd] border border-transparent font-medium',
    danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700 font-bold',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
      {showArrow && (
        <span className="font-normal text-[18px] leading-none transform translate-y-[-1px]">
          ↗
        </span>
      )}
    </button>
  );
};
