import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ArchitecturalMotif } from '../../components/shared/ArchitecturalMotif';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col w-full bg-[#f2f8ff] font-sans">
      {/* Hero Section (Figma node 2:4221 & 2:1582) */}
      <section className="border-b border-[#b8d8ff] px-6 sm:px-12 lg:px-20 py-16 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-[#e5f0fd] border border-[#b8d8ff] px-3 py-1 rounded-full text-[12px] font-medium tracking-wider uppercase text-[#0b5aa8]">
              PLATAFORMA INTELIGENTE DE RECRUTAMENTO
            </div>
          </div>

          <h1 className="font-medium text-[#0b5aa8] text-[64px] sm:text-[92px] lg:text-[116px] leading-[0.95] tracking-[-6px]">
            Appliety
          </h1>

          <div className="font-medium text-[#0b5aa8] text-[28px] sm:text-[36px] tracking-[-1.5px] leading-tight">
            <p>Seu talento.</p>
            <p>Novos caminhos.</p>
          </div>

          <p className="text-[#5f7288] text-[16px] sm:text-[18px] leading-relaxed max-w-xl">
            Conectamos candidatos em busca de oportunidades a empresas que desejam talentos qualificados através de um sistema determinístico de compatibilidade.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to="/vagas">
              <Button size="lg" showArrow>
                Explorar Vagas Abertas
              </Button>
            </Link>
            <Link to="/cadastro">
              <Button variant="outline" size="lg">
                Criar Conta Gratuita
              </Button>
            </Link>
          </div>
        </div>

        {/* Lado Direito: Composição Arquitetural */}
        <div className="flex flex-col items-center gap-8 w-full max-w-md lg:max-w-none lg:w-auto">
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 sm:p-12 shadow-sm flex flex-col gap-6 relative overflow-hidden w-full sm:w-[420px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#0b5aa8] text-[13px] tracking-widest uppercase">
                ACESSO DUAL
              </span>
              <ArchitecturalMotif />
            </div>

            <div className="border-t border-[#b8d8ff] pt-4 flex flex-col gap-3">
              <strong className="text-[#0b5aa8] text-[18px]">Candidatos</strong>
              <p className="text-[#5f7288] text-[13px] leading-relaxed">
                Cadastre suas competências com níveis de domínio, envie seu currículo em PDF privado e receba recomendações transparentes.
              </p>
              <Link to="/cadastro?tipo=candidato" className="text-[#0076ff] text-[14px] font-medium hover:underline">
                Criar conta de candidato ↗
              </Link>
            </div>

            <div className="border-t border-[#b8d8ff] pt-4 flex flex-col gap-3">
              <strong className="text-[#0b5aa8] text-[18px]">Empresas</strong>
              <p className="text-[#5f7288] text-[13px] leading-relaxed">
                Cadastre sua organização, publique vagas com critérios ponderados e acerte no recrutamento com ranking objetivo.
              </p>
              <Link to="/cadastro?tipo=empresa" className="text-[#0076ff] text-[14px] font-medium hover:underline">
                Criar conta corporativa ↗
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares da Plataforma */}
      <section className="px-6 sm:px-12 lg:px-20 py-20 max-w-7xl mx-auto w-full flex flex-col gap-12">
        <div className="flex flex-col gap-3 max-w-2xl">
          <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
            ARQUITETURA E DIFERENCIAIS
          </span>
          <h2 className="font-medium text-[#0b5aa8] text-[36px] sm:text-[42px] tracking-[-1.5px] leading-tight">
            Transparência e rigor técnico em cada etapa.
          </h2>
          <p className="text-[#5f7288] text-[16px]">
            Construído para substituir incertezas e caixas-pretas por regras claras e auditáveis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 flex flex-col gap-4">
            <span className="font-medium text-[#0b5aa8] text-[32px] leading-none">01</span>
            <h3 className="font-medium text-[#0b5aa8] text-[20px]">
              Matching Determinístico
            </h3>
            <p className="text-[#5f7288] text-[14px] leading-relaxed">
              Fórmula objetiva baseada em requisitos obrigatórios e desejáveis com pesos ponderados. Requisitos obrigatórios ausentes tornam a vaga não compatível sem margem para ambiguidade.
            </p>
          </div>

          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 flex flex-col gap-4">
            <span className="font-medium text-[#0b5aa8] text-[32px] leading-none">02</span>
            <h3 className="font-medium text-[#0b5aa8] text-[20px]">
              Currículos em Storage Privado
            </h3>
            <p className="text-[#5f7288] text-[14px] leading-relaxed">
              Seus documentos não ficam públicos. Apenas você e os recrutadores das vagas para as quais você submeteu candidatura autorizada conseguem gerar links de download autenticados.
            </p>
          </div>

          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-8 flex flex-col gap-4">
            <span className="font-medium text-[#0b5aa8] text-[32px] leading-none">03</span>
            <h3 className="font-medium text-[#0b5aa8] text-[20px]">
              Auditoria e Histórico de Status
            </h3>
            <p className="text-[#5f7288] text-[14px] leading-relaxed">
              Toda mudança de status da candidatura (Pendente, Em análise, Aprovada, Rejeitada, Retirada) registra trilha de auditoria completa no PostgreSQL com data e responsável.
            </p>
          </div>
        </div>
      </section>

      {/* Chamada para Ação */}
      <section className="border-t border-[#b8d8ff] bg-[#e5f0fd] px-6 sm:px-12 lg:px-20 py-16 text-center flex flex-col items-center gap-6">
        <h2 className="font-medium text-[#0b5aa8] text-[32px] sm:text-[44px] tracking-[-1.5px] max-w-2xl leading-tight">
          Pronto para dar o próximo passo na sua carreira ou time?
        </h2>
        <p className="text-[#5f7288] text-[16px] max-w-md">
          Acesse a plataforma hoje e experimente o ecossistema completo da Appliety.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/cadastro">
            <Button size="lg" showArrow>
              Cadastre-se Agora
            </Button>
          </Link>
          <Link to="/vagas">
            <Button variant="outline" size="lg">
              Ver Vagas Disponíveis
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};
