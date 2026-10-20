from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.candidates.models import CandidateProfile, CandidateSkill, Skill
from apps.companies.models import Company
from apps.companies.models import CompanyMembership
from django.contrib.auth import get_user_model
from django.urls import reverse

from .forms import JobForm
from .models import Job, JobRequirement
from .recommendations import calculate_compatibility
from .services import JobError, transition_job


class JobAvailabilityTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Empresa de demonstração")

    def test_vaga_publicada_sem_prazo_vencido_esta_aberta(self):
        job = Job.objects.create(
            company=self.company,
            title="Desenvolvedor Python",
            area="Tecnologia",
            description="Descrição da vaga",
            status=Job.Status.PUBLISHED,
            application_deadline=timezone.localdate() + timedelta(days=1),
        )

        self.assertTrue(job.is_open)

    def test_vaga_com_prazo_vencido_nao_esta_aberta(self):
        job = Job.objects.create(
            company=self.company,
            title="Desenvolvedor Python",
            area="Tecnologia",
            description="Descrição da vaga",
            status=Job.Status.PUBLISHED,
            application_deadline=timezone.localdate() - timedelta(days=1),
        )

        self.assertFalse(job.is_open)

    def test_busca_publica_nao_exibe_rascunhos(self):
        Job.objects.create(
            company=self.company,
            title="Vaga publicada",
            area="Tecnologia",
            description="Descrição",
            status=Job.Status.PUBLISHED,
        )
        Job.objects.create(
            company=self.company,
            title="Vaga interna",
            area="Tecnologia",
            description="Descrição",
            status=Job.Status.DRAFT,
        )

        response = self.client.get(reverse("jobs:list"))

        self.assertContains(response, "Vaga publicada")
        self.assertNotContains(response, "Vaga interna")


class CompatibilityTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            email="candidata@example.com", password="SenhaForte123!"
        )
        self.profile = CandidateProfile.objects.create(user=user)
        company = Company.objects.create(name="Empresa de demonstração")
        self.job = Job.objects.create(
            company=company,
            title="Desenvolvedora",
            area="Tecnologia",
            description="Descrição",
        )

    def test_pesos_diferentes_refletem_a_pontuacao(self):
        python = Skill.objects.create(name="Python")
        sql = Skill.objects.create(name="SQL")
        JobRequirement.objects.create(job=self.job, skill=python, weight=3)
        JobRequirement.objects.create(job=self.job, skill=sql, weight=1, is_required=False)
        CandidateSkill.objects.create(profile=self.profile, skill=python, level=3)

        result = calculate_compatibility(self.profile, self.job)

        self.assertEqual(result.score, 75.0)
        self.assertEqual(result.matched_skills, ("Python",))
        self.assertEqual(result.missing_skills, ("SQL",))

    def test_requisito_obrigatorio_ausente_remove_compatibilidade(self):
        skill = Skill.objects.create(name="Django")
        JobRequirement.objects.create(job=self.job, skill=skill, is_required=True)

        result = calculate_compatibility(self.profile, self.job)

        self.assertEqual(result.score, 0.0)
        self.assertFalse(result.compatible)
        self.assertEqual(result.missing_required_skills, ("Django",))

    def test_sem_requisitos_nao_inventa_pontuacao(self):
        result = calculate_compatibility(self.profile, self.job)

        self.assertIsNone(result.score)
        self.assertFalse(result.compatible)


class JobTransitionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="responsavel@example.com", password="SenhaForte123!"
        )
        company = Company.objects.create(name="Empresa responsável")
        CompanyMembership.objects.create(
            user=self.user, company=company, role=CompanyMembership.Role.OWNER
        )
        self.job = Job.objects.create(
            company=company,
            title="Analista",
            area="Tecnologia",
            description="Descrição",
        )

    def test_responsavel_publica_rascunho(self):
        transition_job(user=self.user, job=self.job, target_status=Job.Status.PUBLISHED)

        self.assertEqual(self.job.status, Job.Status.PUBLISHED)

    def test_usuario_sem_vinculo_nao_publica_vaga(self):
        outsider = get_user_model().objects.create_user(
            email="estranho@example.com", password="SenhaForte123!"
        )

        with self.assertRaisesMessage(JobError, "permissão"):
            transition_job(user=outsider, job=self.job, target_status=Job.Status.PUBLISHED)

    def test_nao_publica_vaga_com_prazo_vencido(self):
        self.job.application_deadline = timezone.localdate() - timedelta(days=1)
        self.job.save()

        with self.assertRaisesMessage(JobError, "prazo vencido"):
            transition_job(user=self.user, job=self.job, target_status=Job.Status.PUBLISHED)


class JobFormTests(TestCase):
    def test_forma_salva_requisitos_com_pesos_e_tipos(self):
        company = Company.objects.create(name="Empresa de vagas")
        form = JobForm(data={
            "title": "Backend",
            "area": "Tecnologia",
            "description": "Descrição",
            "city": "São Paulo",
            "work_mode": Job.WorkMode.HYBRID,
            "application_deadline": "",
            "required_skills": "Python:3",
            "desired_skills": "SQL:2",
        })

        self.assertTrue(form.is_valid(), form.errors)
        job = form.save(commit=False)
        job.company = company
        job.save()
        from .services import set_job_requirements

        set_job_requirements(job, form.cleaned_data["parsed_requirements"])

        self.assertEqual(job.requirements.get(skill__name="Python").weight, 3)
        self.assertTrue(job.requirements.get(skill__name="Python").is_required)
        self.assertFalse(job.requirements.get(skill__name="SQL").is_required)
