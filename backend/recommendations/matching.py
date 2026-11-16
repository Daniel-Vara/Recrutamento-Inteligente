"""
Motor determinístico de compatibilidade do Appliety.

Fórmula:
    Score = (Peso dos requisitos atendidos / Peso total dos requisitos) × 100

Regras:
1. Um requisito é atendido se o candidato possui a competência e o nível
   de proficiência é maior ou igual ao mínimo exigido.
2. Se qualquer requisito obrigatório não for atendido, o score é 0 e
   is_compatible é False.
3. Requisitos desejáveis não bloqueiam; somam peso quando atendidos.
4. Vaga sem requisitos: score indefinido (None) e is_compatible True.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping, Optional

PROFICIENCY_ORDER = {
    'iniciante': 1,
    'basico': 2,
    'intermediario': 3,
    'avancado': 4,
    'especialista': 5,
}

PROFICIENCY_LABELS = {
    'iniciante': 'Iniciante',
    'basico': 'Básico',
    'intermediario': 'Intermediário',
    'avancado': 'Avançado',
    'especialista': 'Especialista',
}


def level_to_int(level: Optional[str]) -> int:
    if not level:
        return 0
    return PROFICIENCY_ORDER.get(level, 0)


def _skill_keys(item: Mapping[str, Any]) -> list[str]:
    keys = []
    skill_id = item.get('skill_id') or item.get('id')
    if skill_id:
        keys.append(str(skill_id))
    normalized = item.get('normalized_name')
    skill = item.get('skill')
    if isinstance(skill, Mapping):
        if skill.get('id'):
            keys.append(str(skill['id']))
        normalized = normalized or skill.get('normalized_name')
    if normalized:
        keys.append(str(normalized))
    return keys


def calculate_compatibility(
    candidate_skills: Iterable[Mapping[str, Any]] | None = None,
    job_requirements: Iterable[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    requirements = list(job_requirements or [])
    skills = list(candidate_skills or [])

    if not requirements:
        return {
            'score': None,
            'is_compatible': True,
            'has_mandatory_fail': False,
            'total_requirements': 0,
            'met_weight': 0,
            'total_weight': 0,
            'details': [],
        }

    candidate_map: dict[str, str] = {}
    for cs in skills:
        level = cs.get('proficiency_level')
        for key in _skill_keys(cs):
            candidate_map[key] = level

    total_weight = 0
    met_weight = 0
    has_mandatory_fail = False
    details = []

    for req in requirements:
        weight = int(req.get('weight') or 0)
        total_weight += weight
        skill = req.get('skill') if isinstance(req.get('skill'), Mapping) else {}
        skill_name = req.get('skill_name') or skill.get('name') or 'Competência'
        candidate_level = None
        for key in _skill_keys(req):
            if key in candidate_map:
                candidate_level = candidate_map[key]
                break

        is_met = candidate_level is not None and level_to_int(candidate_level) >= level_to_int(
            req.get('minimum_level')
        )
        if is_met:
            met_weight += weight
        elif req.get('requirement_type') == 'obrigatorio':
            has_mandatory_fail = True

        details.append(
            {
                'skill_name': skill_name,
                'requirement_type': req.get('requirement_type'),
                'minimum_level': req.get('minimum_level'),
                'candidate_level': candidate_level,
                'is_met': is_met,
                'weight': weight,
            }
        )

    if total_weight == 0:
        return {
            'score': None,
            'is_compatible': True,
            'has_mandatory_fail': False,
            'total_requirements': len(requirements),
            'met_weight': 0,
            'total_weight': 0,
            'details': details,
        }

    if has_mandatory_fail:
        return {
            'score': 0,
            'is_compatible': False,
            'has_mandatory_fail': True,
            'total_requirements': len(requirements),
            'met_weight': met_weight,
            'total_weight': total_weight,
            'details': details,
        }

    raw_score = (met_weight / total_weight) * 100
    score = round(raw_score, 1)
    return {
        'score': score,
        'is_compatible': True,
        'has_mandatory_fail': False,
        'total_requirements': len(requirements),
        'met_weight': met_weight,
        'total_weight': total_weight,
        'details': details,
    }


def serialize_candidate_skills(candidate) -> list[dict[str, Any]]:
    payload = []
    for cs in candidate.candidate_skills.select_related('skill').all():
        payload.append(
            {
                'skill_id': str(cs.skill_id),
                'proficiency_level': cs.proficiency_level,
                'normalized_name': cs.skill.normalized_name,
                'skill': {
                    'id': str(cs.skill_id),
                    'name': cs.skill.name,
                    'normalized_name': cs.skill.normalized_name,
                },
            }
        )
    return payload


def serialize_job_requirements(job) -> list[dict[str, Any]]:
    payload = []
    for req in job.requirements.select_related('skill').all():
        payload.append(
            {
                'skill_id': str(req.skill_id),
                'requirement_type': req.requirement_type,
                'minimum_level': req.minimum_level,
                'weight': req.weight,
                'skill_name': req.skill.name,
                'normalized_name': req.skill.normalized_name,
                'skill': {
                    'id': str(req.skill_id),
                    'name': req.skill.name,
                    'normalized_name': req.skill.normalized_name,
                },
            }
        )
    return payload


def compatibility_for(candidate, job) -> dict[str, Any]:
    return calculate_compatibility(
        serialize_candidate_skills(candidate),
        serialize_job_requirements(job),
    )
