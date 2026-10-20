from django.db import IntegrityError, transaction

from apps.candidates.models import CandidateProfile
from apps.candidates.models import Resume
from apps.jobs.models import Job

from .models import Application, ApplicationStatusHistory


class ApplicationError(Exception):
    """Erro de regra de negócio ao criar ou atualizar uma candidatura."""


@transaction.atomic
def apply_to_job(*, user, job_id):
    profile = CandidateProfile.objects.filter(user=user).first()
    if profile is None or not profile.is_complete:
        raise ApplicationError("Complete seu perfil antes de se candidatar.")

    job = Job.objects.select_for_update().filter(pk=job_id).first()
    if job is None or not job.is_open:
        raise ApplicationError("Esta vaga não está aceitando candidaturas.")

    try:
        with transaction.atomic():
            resume = Resume.objects.filter(profile=profile, is_active=True).first()
            application = Application.objects.create(
                candidate=profile, job=job, resume=resume
            )
    except IntegrityError as exc:
        raise ApplicationError("Você já se candidatou a esta vaga.") from exc

    ApplicationStatusHistory.objects.create(
        application=application,
        previous_status="",
        new_status=application.status,
        changed_by=user,
        note="Candidatura enviada.",
    )
    return application


@transaction.atomic
def withdraw_application(*, user, application_id):
    application = (
        Application.objects.select_for_update()
        .filter(pk=application_id, candidate__user=user)
        .first()
    )
    if application is None:
        raise ApplicationError("A candidatura não foi encontrada.")
    allowed = {Application.Status.RECEIVED, Application.Status.REVIEW}
    if application.status not in allowed:
        raise ApplicationError("Esta candidatura não pode mais ser retirada.")

    previous_status = application.status
    application.status = Application.Status.WITHDRAWN
    application.save(update_fields=("status", "updated_at"))
    ApplicationStatusHistory.objects.create(
        application=application,
        previous_status=previous_status,
        new_status=application.status,
        changed_by=user,
        note="Candidatura retirada pelo candidato.",
    )
    return application


@transaction.atomic
def update_application_status(*, user, application_id, new_status, note=""):
    application = (
        Application.objects.select_for_update()
        .select_related("job__company")
        .filter(pk=application_id)
        .first()
    )
    if application is None:
        raise ApplicationError("A candidatura não foi encontrada.")

    authorized = user.is_superuser or application.job.company.memberships.filter(
        user=user, is_active=True
    ).exists()
    if not authorized:
        raise ApplicationError("Você não tem permissão para atualizar esta candidatura.")

    transitions = {
        Application.Status.RECEIVED: {
            Application.Status.REVIEW,
            Application.Status.INTERVIEW,
            Application.Status.APPROVED,
            Application.Status.REJECTED,
        },
        Application.Status.REVIEW: {
            Application.Status.INTERVIEW,
            Application.Status.APPROVED,
            Application.Status.REJECTED,
        },
        Application.Status.INTERVIEW: {
            Application.Status.APPROVED,
            Application.Status.REJECTED,
        },
    }
    if new_status not in transitions.get(application.status, set()):
        raise ApplicationError("Essa mudança de status não é permitida.")

    previous_status = application.status
    application.status = new_status
    application.save(update_fields=("status", "updated_at"))
    ApplicationStatusHistory.objects.create(
        application=application,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=user,
        note=note.strip()[:250],
    )
    return application
