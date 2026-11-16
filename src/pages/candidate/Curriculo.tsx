import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getCandidateResume, 
  uploadCandidateResume, 
  getResumeSecureUrl 
} from '../../services/api';
import { Resume } from '../../types';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { NoticeBanner } from '../../components/shared/NoticeBanner';

export const CandidateCurriculo: React.FC = () => {
  const { user, candidateProfile, refreshAuth } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!candidateProfile) return;
      setLoading(true);
      try {
        const r = await getCandidateResume(candidateProfile.id);
        setResume(r);
      } catch (err) {
        console.error('Erro ao buscar currículo:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [candidateProfile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !candidateProfile) return;

    setError(null);
    setSuccess(null);

    // Validação client-side
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Formato inválido. Apenas arquivos em formato PDF são permitidos.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo excede o limite máximo permitido de 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadCandidateResume(candidateProfile.id, file);
      setResume(uploaded);
      await refreshAuth();
      setSuccess(`Currículo "${file.name}" anexado com sucesso e protegido em armazenamento privado!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao processar upload do currículo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!resume || !user) return;
    setDownloading(true);
    setError(null);
    try {
      const { url, filename } = await getResumeSecureUrl(resume.storage_path, user.id);
      
      // Cria link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao obter link seguro de download.');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col w-full pb-24 font-sans bg-[#f2f8ff]">
      <PageHeader
        eyebrow="MARINA COSTA / DOCUMENTOS"
        title="Currículo profissional"
        description="Envie ou substitua seu currículo em formato PDF. Ele é armazenado em bucket privado e apenas empresas com candidaturas ativas terão acesso."
        contextText="Área do candidato / Currículo"
        backPath="/candidato/dashboard"
      />

      <div className="px-6 sm:px-[64px] py-10 max-w-4xl mx-auto w-full flex flex-col gap-8">
        {success && (
          <NoticeBanner
            title="Upload concluído"
            description={success}
          />
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-[2px] text-[14px]">
            {error}
          </div>
        )}

        {/* Caixa de Currículo Atual */}
        <div className="bg-[#f8fbff] border border-[#b8d8ff] p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="font-medium text-[#0b5aa8] text-[22px] tracking-[-0.6px] border-b border-[#b8d8ff]/50 pb-3">
            Arquivo anexado à conta
          </h2>

          {loading ? (
            <p className="text-[#5f7288] text-[14px]">Verificando documentos no storage...</p>
          ) : resume ? (
            <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0b5aa8] text-white flex items-center justify-center font-bold rounded-[2px] text-[16px] shrink-0">
                  PDF
                </div>
                <div>
                  <p className="font-medium text-[#0b5aa8] text-[16px] break-all">
                    {resume.original_filename}
                  </p>
                  <p className="text-[13px] text-[#5f7288]">
                    Tamanho: {formatFileSize(resume.file_size)} • Enviado em {new Date(resume.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full sm:w-auto"
                >
                  {downloading ? 'Baixando...' : 'Baixar PDF ↗'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#b8d8ff] p-8 text-center flex flex-col items-center gap-3 rounded-[2px]">
              <div className="w-12 h-12 border-2 border-dashed border-[#b8d8ff] flex items-center justify-center rounded-full text-[#0b5aa8]">
                📄
              </div>
              <p className="font-medium text-[#0b5aa8] text-[16px]">
                Nenhum currículo em PDF enviado até o momento
              </p>
              <p className="text-[13px] text-[#5f7288] max-w-md">
                O envio do currículo é essencial para que as empresas possam avaliar seu histórico completo nas candidaturas.
              </p>
            </div>
          )}

          {/* Área de Upload / Substituição */}
          <div className="flex flex-col gap-3 pt-4 border-t border-[#b8d8ff]/50">
            <h3 className="font-medium text-[#0b5aa8] text-[16px]">
              {resume ? 'Substituir currículo atual' : 'Fazer upload de novo currículo'}
            </h3>
            
            <div className="border-2 border-dashed border-[#b8d8ff] hover:border-[#5ea8ff] bg-white p-8 text-center rounded-[4px] transition-colors flex flex-col items-center justify-center gap-4">
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="resume-file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <span className="font-medium text-[#0b5aa8] text-[15px] underline hover:text-[#0076ff]">
                  {uploading ? 'Processando envio...' : 'Clique para selecionar um arquivo PDF do seu computador'}
                </span>
                <span className="text-[12px] text-[#5f7288]">
                  Tamanho máximo: 5 MB • Apenas arquivos com extensão .pdf
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Informações de Privacidade do Storage */}
        <div className="bg-[#e5f0fd] border border-[#b8d8ff] p-6 text-[14px] text-[#5f7288] flex flex-col gap-2">
          <strong className="text-[#0b5aa8]">Garantia de Privacidade e Segurança (Supabase Storage)</strong>
          <p className="leading-relaxed">
            Seu currículo não fica em um bucket público na internet. O acesso é estritamente restrito: apenas você e os recrutadores das vagas para as quais você submeter uma candidatura ativa têm permissão para gerar links de download autenticados.
          </p>
        </div>
      </div>
    </div>
  );
};
