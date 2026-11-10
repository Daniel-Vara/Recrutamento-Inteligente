import { describe, it, expect } from 'vitest';
import { calculateCompatibility } from './compatibility';
import { CandidateSkill, JobRequirement } from '../types';

describe('Sistema Determinístico de Compatibilidade (Appliety)', () => {
  const reqReactMandatory: JobRequirement = {
    id: 'req-1',
    job_id: 'job-1',
    skill_id: 'skill-react',
    requirement_type: 'obrigatorio',
    minimum_level: 'intermediario',
    weight: 3,
    created_at: new Date().toISOString(),
    skill: { id: 'skill-react', name: 'React', normalized_name: 'react' },
  };

  const reqNodeMandatory: JobRequirement = {
    id: 'req-2',
    job_id: 'job-1',
    skill_id: 'skill-node',
    requirement_type: 'obrigatorio',
    minimum_level: 'intermediario',
    weight: 3,
    created_at: new Date().toISOString(),
    skill: { id: 'skill-node', name: 'Node.js', normalized_name: 'nodejs' },
  };

  const reqTsDesirable: JobRequirement = {
    id: 'req-3',
    job_id: 'job-1',
    skill_id: 'skill-ts',
    requirement_type: 'desejavel',
    minimum_level: 'basico',
    weight: 2,
    created_at: new Date().toISOString(),
    skill: { id: 'skill-ts', name: 'TypeScript', normalized_name: 'typescript' },
  };

  const reqPgDesirable: JobRequirement = {
    id: 'req-4',
    job_id: 'job-1',
    skill_id: 'skill-pg',
    requirement_type: 'desejavel',
    minimum_level: 'basico',
    weight: 2,
    created_at: new Date().toISOString(),
    skill: { id: 'skill-pg', name: 'PostgreSQL', normalized_name: 'postgresql' },
  };

  const allRequirements = [reqReactMandatory, reqNodeMandatory, reqTsDesirable, reqPgDesirable];

  it('deve retornar 100% quando todos os requisitos obrigatórios e desejáveis são atendidos', () => {
    const candidateSkills: CandidateSkill[] = [
      { id: '1', candidate_id: 'c1', skill_id: 'skill-react', proficiency_level: 'avancado', created_at: '', updated_at: '' },
      { id: '2', candidate_id: 'c1', skill_id: 'skill-node', proficiency_level: 'intermediario', created_at: '', updated_at: '' },
      { id: '3', candidate_id: 'c1', skill_id: 'skill-ts', proficiency_level: 'intermediario', created_at: '', updated_at: '' },
      { id: '4', candidate_id: 'c1', skill_id: 'skill-pg', proficiency_level: 'basico', created_at: '', updated_at: '' },
    ];

    const result = calculateCompatibility(candidateSkills, allRequirements);
    expect(result.score).toBe(100);
    expect(result.is_compatible).toBe(true);
    expect(result.has_mandatory_fail).toBe(false);
  });

  it('deve retornar 0 e não compatível se faltar qualquer requisito obrigatório', () => {
    // Candidato não tem Node.js (requisito obrigatório)
    const candidateSkills: CandidateSkill[] = [
      { id: '1', candidate_id: 'c1', skill_id: 'skill-react', proficiency_level: 'avancado', created_at: '', updated_at: '' },
      { id: '3', candidate_id: 'c1', skill_id: 'skill-ts', proficiency_level: 'especialista', created_at: '', updated_at: '' },
      { id: '4', candidate_id: 'c1', skill_id: 'skill-pg', proficiency_level: 'avancado', created_at: '', updated_at: '' },
    ];

    const result = calculateCompatibility(candidateSkills, allRequirements);
    expect(result.score).toBe(0);
    expect(result.is_compatible).toBe(false);
    expect(result.has_mandatory_fail).toBe(true);
  });

  it('deve retornar 0 e não compatível se nível em requisito obrigatório for inferior ao mínimo', () => {
    // Exigido React intermediário (3), candidato tem iniciante (1)
    const candidateSkills: CandidateSkill[] = [
      { id: '1', candidate_id: 'c1', skill_id: 'skill-react', proficiency_level: 'iniciante', created_at: '', updated_at: '' },
      { id: '2', candidate_id: 'c1', skill_id: 'skill-node', proficiency_level: 'avancado', created_at: '', updated_at: '' },
    ];

    const result = calculateCompatibility(candidateSkills, allRequirements);
    expect(result.score).toBe(0);
    expect(result.is_compatible).toBe(false);
    expect(result.has_mandatory_fail).toBe(true);
  });

  it('deve calcular pontuação proporcional ponderada quando atende obrigatórios e parte dos desejáveis', () => {
    // Atende React (3) + Node (3) + TS (2) = 8 de 10 de peso total = 80%
    const candidateSkills: CandidateSkill[] = [
      { id: '1', candidate_id: 'c1', skill_id: 'skill-react', proficiency_level: 'intermediario', created_at: '', updated_at: '' },
      { id: '2', candidate_id: 'c1', skill_id: 'skill-node', proficiency_level: 'intermediario', created_at: '', updated_at: '' },
      { id: '3', candidate_id: 'c1', skill_id: 'skill-ts', proficiency_level: 'basico', created_at: '', updated_at: '' },
      // Falta PostgreSQL (peso 2)
    ];

    const result = calculateCompatibility(candidateSkills, allRequirements);
    expect(result.score).toBe(80);
    expect(result.is_compatible).toBe(true);
    expect(result.has_mandatory_fail).toBe(false);
  });

  it('deve retornar score null para vagas sem nenhum requisito cadastrado', () => {
    const result = calculateCompatibility([], []);
    expect(result.score).toBeNull();
    expect(result.is_compatible).toBe(true);
  });
});
