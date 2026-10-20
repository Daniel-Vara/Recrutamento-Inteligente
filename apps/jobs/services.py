from django.utils import timezone
from django.db import transaction

from apps.companies.models import CompanyMembership

from apps.candidates.models import Skill

from .models import Job, JobRequirement


class JobError(Exception):
    """Erro de autorização ou transição no ciclo de vida da vaga."""


@transaction.atomic
def set_job_requirements(job: Job, requirements):
    retained_ids = []
    for item in requirements:
        name = " ".join(item["name"].split())
        skill, _ = Skill.objects.get_or_create(
            normalized_name=name.casefold(), defaults={"name": name}
        )
        requirement, _ = JobRequirement.objects.update_or_create(
            job=job,
            skill=skill,
            defaults={
                "is_required": item["is_required"],
                "weight": item["weight"],
            },
        )
        retained_ids.append(requirement.pk)
    job.requirements.exclude(pk__in=retained_ids).delete()


@transaction.atomic
def transition_job(*, user, job, target_status):
    requested_job = job
    job = Job.objects.select_for_update().select_related("company").get(pk=job.pk)
    authorized = user.is_superuser or CompanyMembership.objects.filter(
        user=user, company=job.company, is_active=True
    ).exists()
    if not authorized:
        raise JobError("Você não tem permissão para gerenciar esta vaga.")

    allowed_transitions = {
        Job.Status.DRAFT: {Job.Status.PUBLISHED, Job.Status.ARCHIVED},
        Job.Status.PUBLISHED: {Job.Status.CLOSED},
        Job.Status.CLOSED: {Job.Status.ARCHIVED},
    }
    if target_status not in allowed_transitions.get(job.status, set()):
        raise JobError("Essa mudança de status não é permitida.")
    if (
        target_status == Job.Status.PUBLISHED
        and job.application_deadline
        and job.application_deadline < timezone.localdate()
    ):
        raise JobError("Não é possível publicar uma vaga com prazo vencido.")

    job.status = target_status
    job.save(update_fields=("status", "updated_at"))
    requested_job.status = job.status
    requested_job.updated_at = job.updated_at
    return requested_job
