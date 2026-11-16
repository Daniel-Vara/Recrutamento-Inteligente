import { CandidateSkill, JobRequirement, CompatibilityResult, ProficiencyLevel } from '../types';

export const PROFICIENCY_ORDER: Record<ProficiencyLevel, number> = {
  iniciante: 1,
  basico: 2,
  intermediario: 3,
  avancado: 4,
  especialista: 5,
};

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  iniciante: 'Iniciante',
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  especialista: 'Especialista',
};

export function levelToInt(level?: ProficiencyLevel | null): number {
  if (!level) return 0;
  return PROFICIENCY_ORDER[level] ?? 0;
}

/**
 * Sistema determinístico de compatibilidade:
 * Compatibilidade = (Peso dos requisitos atendidos / Peso total dos requisitos) × 100.
 * 
 * Regras:
 * 1. Requisitos obrigatórios ausentes tornam a vaga não compatível (score = 0, is_compatible = false).
 * 2. Requisitos desejáveis atendidos contribuem com seu peso para a pontuação.
 * 3. Vagas sem requisitos possuem compatibilidade indefinida (score = null, is_compatible = true).
 */
export function calculateCompatibility(
  candidateSkills: CandidateSkill[] = [],
  jobRequirements: JobRequirement[] = []
): CompatibilityResult {
  if (!jobRequirements || jobRequirements.length === 0) {
    return {
      score: null,
      is_compatible: true,
      has_mandatory_fail: false,
      total_requirements: 0,
      met_weight: 0,
      total_weight: 0,
      details: [],
    };
  }

  // Mapa de competências do candidato indexadas por skill_id ou nome
  const candidateSkillMap = new Map<string, ProficiencyLevel>();
  candidateSkills.forEach((cs) => {
    candidateSkillMap.set(cs.skill_id, cs.proficiency_level);
    if (cs.skill?.normalized_name) {
      candidateSkillMap.set(cs.skill.normalized_name, cs.proficiency_level);
    }
  });

  let totalWeight = 0;
  let metWeight = 0;
  let hasMandatoryFail = false;

  const details = jobRequirements.map((req) => {
    totalWeight += req.weight;

    const candidateLevel = 
      candidateSkillMap.get(req.skill_id) || 
      (req.skill?.normalized_name ? candidateSkillMap.get(req.skill.normalized_name) : null);

    const isMet = candidateLevel != null && levelToInt(candidateLevel) >= levelToInt(req.minimum_level);

    if (isMet) {
      metWeight += req.weight;
    } else if (req.requirement_type === 'obrigatorio') {
      hasMandatoryFail = true;
    }

    return {
      skill_name: req.skill?.name || 'Competência',
      requirement_type: req.requirement_type,
      minimum_level: req.minimum_level,
      candidate_level: candidateLevel,
      is_met: isMet,
      weight: req.weight,
    };
  });

  if (totalWeight === 0) {
    return {
      score: null,
      is_compatible: true,
      has_mandatory_fail: false,
      total_requirements: jobRequirements.length,
      met_weight: 0,
      total_weight: 0,
      details,
    };
  }

  if (hasMandatoryFail) {
    return {
      score: 0,
      is_compatible: false,
      has_mandatory_fail: true,
      total_requirements: jobRequirements.length,
      met_weight: metWeight,
      total_weight: totalWeight,
      details,
    };
  }

  const rawScore = (metWeight / totalWeight) * 100;
  const score = Math.round(rawScore * 10) / 10;

  return {
    score,
    is_compatible: true,
    has_mandatory_fail: false,
    total_requirements: jobRequirements.length,
    met_weight: metWeight,
    total_weight: totalWeight,
    details,
  };
}
