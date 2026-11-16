import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchitecturalMotif } from './ArchitecturalMotif';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  backText?: string;
  backPath?: string;
  contextText?: string;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  backText = 'Voltar',
  backPath,
  contextText,
  rightAction,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col gap-[28px] pb-[36px] pt-[28px] px-6 sm:px-[64px] w-full border-b border-[#b8d8ff]/40 bg-[#f2f8ff]">
      {/* Context bar */}
      <div className="flex items-center justify-between text-[14px] text-[#0b5aa8]">
        <button
          onClick={handleBack}
          className="hover:underline flex items-center gap-2 cursor-pointer font-medium transition-colors"
        >
          <span>←</span>
          <span>{backText}</span>
        </button>
        {contextText && (
          <span className="text-[#5f7288] text-[12px] hidden sm:inline-block">
            {contextText}
          </span>
        )}
      </div>

      {/* Editorial opening */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-[64px] items-start md:items-center justify-between">
        <div className="flex flex-col gap-[14px] flex-1 min-w-0">
          <p className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-medium text-[#0b5aa8] text-[36px] sm:text-[48px] md:text-[56px] leading-[1.12] tracking-[-1.8px]">
            {title}
          </h1>
          <p className="font-normal text-[#5f7288] text-[15px] sm:text-[16px] leading-[1.55] max-w-3xl">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {rightAction}
          <div className="hidden lg:block">
            <ArchitecturalMotif />
          </div>
        </div>
      </div>
    </div>
  );
};
