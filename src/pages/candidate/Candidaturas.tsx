import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCandidateApplications, withdrawApplication } from '../../services/api';
import { Application } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { NoticeBanner } from '../../components/shared/NoticeBanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const CandidateCandidaturas: React.FC = () => {
  const { user, candidateProfile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!candidateProfile) return;
    setLoading(true);
    try {
      const list = await getCandidateApplications(candidateProfile.id);
      setApplications(list);
    } catch (err) {
      console.error('Erro ao carregar candidaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [candidateProfile]);

  const handleWithdraw = async (applicationId: string) => {
    if (!candidateProfile) return;
    const confirm = window.confirm('Deseja realmente retirar esta candidatura?');
    if (!confirm) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      await withdrawApplication(applicationId, candidateProfile.id);
      setActionSuccess('Candidatura retirada com sucesso.');
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao retirar candidatura.');
    }
  };

  const activeApps = applications.filter((a) => a.status !== 'retirada');
  const inReviewApps = activeApps.filter((a) => a.status === 'em_analise');
  const approvedApps = activeApps.filter((a) => a.status === 'aprovada');

  const filteredApps = applications.filter((a) => {
    if (statusFilter === 'todas') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow="MARINA COSTA / MINHAS CANDIDATURAS"
        title="Cada passo da sua trajetória."
        description="Consulte o andamento dos processos seletivos e mantenha seus próximos passos organizados em um único lugar."
        contextText="Área do candidato / Cada passo da sua trajetória."
        backPath="/candidato/dashboard"
        rightAction={
          <Link to="/vagas">
            <Button size="sm" showArrow>
              Explorar Novas Vagas
            </Button>
          </Link>
        }
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <NoticeBanner
          title="Cadastro concluído • seu perfil está pronto"
          description="Currículo e dados profissionais revisados. Você pode acompanhar as mudanças de status em tempo real."
        />

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-[2px] text-[14px]">
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-[2px] text-[14px]">
            {actionError}
          </div>
        )}

        {/* Resumo / Métricas (Figma node 2:2161) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(activeApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Total de candidaturas ativas</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(inReviewApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Em análise pela empresa</span>
          </div>

          <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 flex flex-col gap-2">
            <span className="font-medium text-[#0b5aa8] text-[40px] tracking-[-1.5px] leading-none">
              {String(approvedApps.length).padStart(2, '0')}
            </span>
            <span className="text-[#5f7288] text-[14px]">Aprovadas / Entrevista</span>
          </div>
        </div>

        {/* Filtros de Status (Figma node 2:2171) */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => setStatusFilter('todas')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'todas' ? 'active' : 'default'}>
              Todas ({applications.length})
            </Badge>
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'pendente' ? 'active' : 'default'}>
              Enviadas ({applications.filter((a) => a.status === 'pendente').length})
            </Badge>
          </button>
          <button
            onClick={() => setStatusFilter('em_analise')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'em_analise' ? 'active' : 'default'}>
              Em análise ({applications.filter((a) => a.status === 'em_analise').length})
            </Badge>
          </button>
          <button
            onClick={() => setStatusFilter('aprovada')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'aprovada' ? 'active' : 'default'}>
              Aprovadas ({applications.filter((a) => a.status === 'aprovada').length})
            </Badge>
          </button>
          <button
            onClick={() => setStatusFilter('rejeitada')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'rejeitada' ? 'active' : 'default'}>
              Rejeitadas ({applications.filter((a) => a.status === 'rejeitada').length})
            </Badge>
          </button>
          <button
            onClick={() => setStatusFilter('retirada')}
            className="cursor-pointer"
          >
            <Badge variant={statusFilter === 'retirada' ? 'active' : 'default'}>
              Retiradas ({applications.filter((a) => a.status === 'retirada').length})
            </Badge>
          </button>
        </div>

        {/* Lista de Cards de Candidatura (Figma node 2:2180) */}
        {loading ? (
          <div className="text-center py-16 text-[#5f7288]">Carregando candidaturas...</div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-[#f8fbff] border border-[#b8d8ff] p-12 text-center flex flex-col items-center gap-4">
            <p className="font-medium text-[#0b5aa8] text-[18px]">
              Nenhuma candidatura encontrada nesta categoria
            </p>
            <Link to="/vagas">
              <Button size="md">Buscar Oportunidades</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-5 hover:border-[#5ea8ff] transition-colors"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#0b5aa8] text-[12px] tracking-[1.3px] uppercase">
                      {app.job?.company?.name || 'EMPRESA'}
                    </span>
                    <Link
                      to={`/vagas/${app.job_id}`}
                      className="font-medium text-[#0b5aa8] text-[22px] sm:text-[24px] tracking-[-0.7px] hover:underline"
                    >
                      {app.job?.title || 'Vaga'}
                    </Link>
                    <p className="text-[#5f7288] text-[13px]">
                      {app.job?.city} • <span className="capitalize">{app.job?.work_mode}</span> • Enviada em {new Date(app.applied_at).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <Badge
                    variant={
                      app.status === 'aprovada'
                        ? 'success'
                        : app.status === 'rejeitada'
                        ? 'warning'
                        : app.status === 'retirada'
                        ? 'neutral'
                        : 'default'
                    }
                    className="capitalize text-[13px] px-3 py-1 self-start"
                  >
                    {app.status === 'pendente' ? 'Enviada' : app.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="bg-[#b8d8ff] h-px w-full" />

                {/* Cronologia / Linha do Tempo (Figma node 2:2189) */}
                <div className="flex flex-wrap gap-4 sm:gap-8 text-[13px] font-sans">
                  <span className="text-[#0b5aa8] font-medium flex items-center gap-1">
                    ✓ {new Date(app.applied_at).toLocaleDateString('pt-BR')} • Enviada
                  </span>
                  <span className={`${app.status !== 'pendente' && app.status !== 'retirada' ? 'text-[#0b5aa8] font-medium' : 'text-[#5f7288]'} flex items-center gap-1`}>
                    → Aguardando análise
                  </span>
                  <span className={`${app.status === 'aprovada' ? 'text-[#0b5aa8] font-medium' : 'text-[#5f7288]'} flex items-center gap-1`}>
                    ○ Próximas etapas / Resultado
                  </span>
                </div>

                {/* Histórico detalhado de alterações se houver */}
                {app.history && app.history.length > 0 && (
                  <div className="bg-[#e5f0fd] p-3 text-[12px] text-[#5f7288] flex flex-col gap-1">
                    <strong className="text-[#0b5aa8]">Histórico de auditoria de status:</strong>
                    {app.history.map((h) => (
                      <div key={h.id} className="flex gap-2">
                        <span>• {new Date(h.created_at).toLocaleString('pt-BR')}:</span>
                        <span>
                          Status alterado de <strong>{h.previous_status || 'início'}</strong> para <strong>{h.new_status}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ações e feedback */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#b8d8ff]/40">
                  <p className="text-[13px] text-[#5f7288]">
                    {app.status === 'pendente' && 'Seu currículo foi recebido. Aguarde a análise da equipe de recrutamento.'}
                    {app.status === 'em_analise' && 'A empresa está analisando seu perfil e competências para esta oportunidade.'}
                    {app.status === 'aprovada' && 'Parabéns! Sua candidatura foi aprovada para as próximas etapas.'}
                    {app.status === 'rejeitada' && 'A empresa encerrou a avaliação deste perfil para esta posição.'}
                    {app.status === 'retirada' && 'Você retirou esta candidatura.'}
                  </p>

                  <div className="flex items-center gap-4">
                    {app.status !== 'retirada' && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        className="text-red-600 hover:text-red-800 text-[13px] font-medium hover:underline"
                      >
                        Retirar candidatura
                      </button>
                    )}
                    <Link
                      to={`/vagas/${app.job_id}`}
                      className="text-[#0b5aa8] text-[14px] hover:underline font-medium"
                    >
                      Ver detalhes da vaga ↗
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
