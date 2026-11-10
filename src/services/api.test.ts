import { describe, it, expect, beforeEach } from 'vitest';
import { 
  applyToJob, 
  withdrawApplication, 
  updateApplicationStatus, 
  uploadCandidateResume, 
  getResumeSecureUrl,
  getJobCandidatesRanking,
  initializeLocalDatabase,
  clearMemoryStorage
} from './api';

describe('Regras de Negócio e Segurança — Appliety API', () => {
  beforeEach(() => {
    clearMemoryStorage();
    initializeLocalDatabase();
  });

  describe('Candidaturas e Proteção contra Duplicidade', () => {
    it('deve registrar uma candidatura com status inicial "pendente"', async () => {
      const app = await applyToJob('job-fullstack-atlas', 'candidate-test-1');
      expect(app.job_id).toBe('job-fullstack-atlas');
      expect(app.candidate_id).toBe('candidate-test-1');
      expect(app.status).toBe('pendente');
      expect(app.applied_at).toBeDefined();
    });

    it('deve impedir candidaturas duplicadas ativas para a mesma vaga', async () => {
      await applyToJob('job-fullstack-atlas', 'candidate-test-1');

      await expect(
        applyToJob('job-fullstack-atlas', 'candidate-test-1')
      ).rejects.toThrow('Você já possui uma candidatura ativa para esta vaga.');
    });

    it('deve permitir nova candidatura se a anterior foi retirada', async () => {
      const app1 = await applyToJob('job-fullstack-atlas', 'candidate-test-1');
      await withdrawApplication(app1.id, 'candidate-test-1');

      // Agora deve permitir nova candidatura
      const app2 = await applyToJob('job-fullstack-atlas', 'candidate-test-1');
      expect(app2.id).not.toBe(app1.id);
      expect(app2.status).toBe('pendente');
    });

    it('deve registrar histórico de auditoria ao alterar status da candidatura', async () => {
      const app = await applyToJob('job-fullstack-atlas', 'candidate-test-1');
      
      const updated = await updateApplicationStatus(app.id, 'em_analise', 'user-rafael-atlas');
      expect(updated.status).toBe('em_analise');

      const ranking = await getJobCandidatesRanking('job-fullstack-atlas');
      const candidateEntry = ranking.find((r) => r.application.id === app.id);
      
      expect(candidateEntry?.history.length).toBeGreaterThanOrEqual(2);
      expect(candidateEntry?.history[1].new_status).toBe('em_analise');
      expect(candidateEntry?.history[1].changed_by).toBe('user-rafael-atlas');
    });
  });

  describe('Validação de Currículo e Storage Privado (RLS)', () => {
    it('deve rejeitar arquivos que não sejam PDF', async () => {
      const fakeImage = new File(['fake content'], 'curriculo.png', { type: 'image/png' });

      await expect(
        uploadCandidateResume('candidate-test-1', fakeImage)
      ).rejects.toThrow('Apenas arquivos em formato PDF são permitidos.');
    });

    it('deve rejeitar arquivos maiores que 5 MB', async () => {
      // 5.5 MB
      const bigContent = new Uint8Array(5.5 * 1024 * 1024);
      const bigFile = new File([bigContent], 'grande.pdf', { type: 'application/pdf' });

      await expect(
        uploadCandidateResume('candidate-test-1', bigFile)
      ).rejects.toThrow('O arquivo excede o limite máximo permitido de 5 MB.');
    });

    it('deve permitir upload de PDF válido de até 5 MB', async () => {
      const validPdf = new File(['%PDF-1.4 mock content'], 'curriculo.pdf', { type: 'application/pdf' });
      const resume = await uploadCandidateResume('candidate-test-1', validPdf);

      expect(resume.candidate_id).toBe('candidate-test-1');
      expect(resume.original_filename).toBe('curriculo.pdf');
      expect(resume.storage_path).toContain('resumes/candidate-test-1/');
    });

    it('deve bloquear acesso de usuários não autorizados ao currículo privado', async () => {
      const validPdf = new File(['%PDF-1.4 mock content'], 'curriculo.pdf', { type: 'application/pdf' });
      const resume = await uploadCandidateResume('candidate-test-1', validPdf);

      // Usuário estranho tentando acessar sem ser o dono e sem ser empresa com candidatura
      await expect(
        getResumeSecureUrl(resume.storage_path, 'random-unauthorized-user')
      ).rejects.toThrow('Acesso negado');
    });
  });
});
