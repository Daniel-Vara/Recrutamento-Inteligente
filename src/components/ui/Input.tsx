import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  requiredAsterisk?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, requiredAsterisk = false, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex flex-col gap-[8px] w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="font-sans font-medium text-[14px] text-[#0b5aa8] flex items-center gap-1 select-none"
          >
            {label}
            {requiredAsterisk && <span className="text-[#0b5aa8]">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`bg-[#f8fbff] border ${error ? 'border-red-500' : 'border-[#b8d8ff]'} focus:border-[#5ea8ff] focus:ring-1 focus:ring-[#5ea8ff] outline-none min-h-[50px] px-[16px] py-[12px] rounded-[4px] text-[15px] text-[#0b5aa8] placeholder-[#5f7288]/60 transition-colors w-full font-sans ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="font-sans text-[12px] text-[#5f7288] leading-tight">
            {helperText}
          </p>
        )}
        {error && (
          <p className="font-sans text-[12px] text-red-600 font-medium leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
