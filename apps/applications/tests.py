from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from io import StringIO

from apps.candidates.models import CandidateProfile, Resume
from apps.companies.models import Company
from apps.jobs.models import Job

from .models import Application, ApplicationStatusHistory
from .services import (
    ApplicationError,
    apply_to_job,
    update_application_status,
    withdraw_application,
)


class DemoDataCommandTests(TestCase):
    def test_command_pode_ser_executado_mais_de_uma_vez_sem_duplicar_registros(self):
        call_command("load_demo_data", stdout=StringIO())
        first_history_count = ApplicationStatusHistory.objects.count()

        call_command("load_demo_data", stdout=StringIO())

        self.assertEqual(Company.objects.count(), 3)
        self.assertEqual(Job.objects.count(), 8)
        self.assertEqual(CandidateProfile.objects.count(), 10)
        self.assertEqual(Application.objects.count(), 6)
        self.assertEqual(ApplicationStatusHistory.objects.count(), first_history_count)


class ApplicationConstraintsTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            email="ana@example.com", password="SenhaForte123!"
        )
        self.profile = CandidateProfile.objects.create(
            user=user, city="São Paulo", summary="Desenvolvedora Python"
        )
        company = Company.objects.create(name="Empresa de demonstração")
        self.job = Job.objects.create(
            company=company,
            title="Analista",
            area="Tecnologia",
            description="Descrição",
            status=Job.Status.PUBLISHED,
        )

    def test_banco_impede_candidatura_duplicada(self):
        Application.objects.create(candidate=self.profile, job=self.job)

        with self.assertRaises(IntegrityError), transaction.atomic():
            Application.objects.create(candidate=self.profile, job=self.job)

    def test_fluxo_de_candidatura_registra_historico(self):
        application = apply_to_job(user=self.profile.user, job_id=self.job.pk)

        self.assertEqual(application.status, Application.Status.RECEIVED)
        self.assertEqual(application.history.count(), 1)
        self.assertEqual(application.history.get().changed_by, self.profile.user)

    def test_candidatura_registra_curriculo_atual(self):
        resume = Resume.objects.create(
            profile=self.profile, file="resumes/atual.pdf", is_active=True
        )

        application = apply_to_job(user=self.profile.user, job_id=self.job.pk)

        self.assertEqual(application.resume, resume)

    def test_candidato_nao_pode_enviar_duplicada(self):
        apply_to_job(user=self.profile.user, job_id=self.job.pk)

        with self.assertRaisesMessage(ApplicationError, "já se candidatou"):
            apply_to_job(user=self.profile.user, job_id=self.job.pk)

    def test_candidato_pode_retirar_candidatura_recebida(self):
        application = apply_to_job(user=self.profile.user, job_id=self.job.pk)

        updated = withdraw_application(
            user=self.profile.user, application_id=application.pk
        )

        self.assertEqual(updated.status, Application.Status.WITHDRAWN)
        self.assertEqual(updated.history.count(), 2)

    def test_candidatura_exige_perfil_minimo(self):
        self.profile.city = ""
        self.profile.save()

        with self.assertRaisesMessage(ApplicationError, "Complete seu perfil"):
            apply_to_job(user=self.profile.user, job_id=self.job.pk)

    def test_responsavel_atualiza_status_e_historico(self):
        application = apply_to_job(user=self.profile.user, job_id=self.job.pk)
        company_user = get_user_model().objects.create_user(
            email="recrutador@example.com", password="SenhaForte123!"
        )
        from apps.companies.models import CompanyMembership

        CompanyMembership.objects.create(
            user=company_user,
            company=self.job.company,
            role=CompanyMembership.Role.RECRUITER,
        )

        updated = update_application_status(
            user=company_user,
            application_id=application.pk,
            new_status=Application.Status.REVIEW,
            note="Perfil recebido",
        )

        self.assertEqual(updated.status, Application.Status.REVIEW)
        latest = updated.history.latest("changed_at")
        self.assertEqual(latest.changed_by, company_user)
        self.assertEqual(latest.previous_status, Application.Status.RECEIVED)

    def test_candidato_nao_pode_aprovar_a_propria_candidatura(self):
        application = apply_to_job(user=self.profile.user, job_id=self.job.pk)

        with self.assertRaisesMessage(ApplicationError, "permissão"):
            update_application_status(
                user=self.profile.user,
                application_id=application.pk,
                new_status=Application.Status.APPROVED,
            )
