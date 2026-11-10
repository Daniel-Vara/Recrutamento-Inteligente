import React from 'react';

interface ArchitecturalMotifProps {
  className?: string;
}

/**
 * Motivo gráfico arquitetural de assinatura visual da Appliety
 * Extraído diretamente do frame "Caminhos abertos" do Figma
 */
export const ArchitecturalMotif: React.FC<ArchitecturalMotifProps> = ({ className = '' }) => {
  return (
    <div className={`h-[100px] overflow-hidden relative shrink-0 w-[152px] ${className}`}>
      {/* Estrutura central */}
      <div 
        className="absolute border-[#5ea8ff] border-l border-r border-t h-[70px] left-[54.72px] top-[30px] w-[42.56px]" 
        data-name="Estrutura-1"
      />
      {/* Estrutura intermediária */}
      <div 
        className="absolute border-[#b8d8ff] border-l border-r border-t h-[85px] left-[27.36px] top-[15px] w-[97.28px]" 
        data-name="Estrutura-2"
      />
      {/* Estrutura externa */}
      <div 
        className="absolute border-[#b8d8ff] border-l border-r border-t h-[100px] left-0 top-0 w-[152px]" 
        data-name="Estrutura-3"
      />
    </div>
  );
};
