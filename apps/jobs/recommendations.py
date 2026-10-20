from dataclasses import dataclass
from django.db.models import prefetch_related_objects

from apps.candidates.models import CandidateProfile

from .models import Job


@dataclass(frozen=True)
class Compatibility:
    score: float | None
    matched_skills: tuple[str, ...]
    missing_skills: tuple[str, ...]
    missing_required_skills: tuple[str, ...]
    compatible: bool
    explanation: str


def calculate_compatibility(profile: CandidateProfile, job: Job) -> Compatibility:
    """Calcula compatibilidade por peso, sem considerar dados pessoais."""
    requirements = list(job.requirements.all())
    if not requirements:
        return Compatibility(
            score=None,
            matched_skills=(),
            missing_skills=(),
            missing_required_skills=(),
            compatible=False,
            explanation="A vaga ainda não possui requisitos cadastrados.",
        )

    candidate_skills = {
        item.skill.normalized_name for item in profile.skills.all()
    }
    matched = [r for r in requirements if r.skill.normalized_name in candidate_skills]
    missing = [r for r in requirements if r.skill.normalized_name not in candidate_skills]
    total_weight = sum(r.weight for r in requirements)
    matched_weight = sum(r.weight for r in matched)
    score = round(matched_weight / total_weight * 100, 1)
    missing_required = [r for r in missing if r.is_required]

    return Compatibility(
        score=score,
        matched_skills=tuple(r.skill.name for r in matched),
        missing_skills=tuple(r.skill.name for r in missing),
        missing_required_skills=tuple(r.skill.name for r in missing_required),
        compatible=not missing_required,
        explanation=(
            f"{matched_weight} de {total_weight} pontos de peso correspondem "
            f"às competências do perfil ({score}%)."
        ),
    )


def recommend_jobs_for(profile: CandidateProfile):
    """Retorna vagas abertas com requisitos, ordenadas por compatibilidade."""
    prefetch_related_objects([profile], "skills__skill")
    scored_jobs = []
    jobs = (
        Job.objects.filter(status=Job.Status.PUBLISHED)
        .select_related("company")
        .prefetch_related("requirements__skill")
    )
    for job in jobs:
        if not job.is_open:
            continue
        result = calculate_compatibility(profile, job)
        if result.score is not None:
            scored_jobs.append((job, result))
    return sorted(
        scored_jobs,
        key=lambda item: (item[1].compatible, item[1].score, item[0].created_at),
        reverse=True,
    )
