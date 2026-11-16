import React from 'react';

interface NoticeBannerProps {
  title: string;
  description: string;
  icon?: string | React.ReactNode;
  className?: string;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  title,
  description,
  icon = '✓',
  className = '',
}) => {
  return (
    <div 
      className={`bg-[#e5f0fd] border border-[#b8d8ff] flex items-start gap-[16px] p-[20px] w-full text-left font-sans ${className}`}
      data-name="Aviso"
    >
      <div className="text-[#0b5aa8] text-[18px] font-normal shrink-0 mt-[1px]">
        {icon}
      </div>
      <div className="flex flex-col gap-[4px] flex-1 min-w-0">
        <p className="font-medium text-[#0b5aa8] text-[15px] leading-snug">
          {title}
        </p>
        <p className="font-normal text-[#5f7288] text-[13px] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
