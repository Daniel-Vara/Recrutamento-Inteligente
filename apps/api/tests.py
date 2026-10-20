from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.candidates.models import CandidateProfile, CandidateSkill, Skill
from apps.companies.models import Company, CompanyMembership
from apps.jobs.models import Job


class ApiAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = get_user_model().objects.create_user(
            email="empresa@example.com", password="SenhaForte123!"
        )
        self.candidate = get_user_model().objects.create_user(
            email="candidato@example.com", password="SenhaForte123!"
        )
        CandidateProfile.objects.create(user=self.candidate)
        self.company = Company.objects.create(name="Empresa reservada")
        CompanyMembership.objects.create(
            user=self.owner, company=self.company, role=CompanyMembership.Role.OWNER
        )
        self.draft = Job.objects.create(
            company=self.company,
            title="Vaga confidencial",
            area="Tecnologia",
            description="Rascunho",
        )

    def test_cadastro_api_cria_usuario_perfil_e_token(self):
        response = self.client.post(
            reverse("api_v1:register"),
            {
                "email": "nova@example.com",
                "first_name": "Nova",
                "last_name": "Pessoa",
                "password": "SenhaForte123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(email="nova@example.com")
        self.assertTrue(CandidateProfile.objects.filter(user=user).exists())
        self.assertTrue(response.data["token"])

    def test_cadastro_api_rejeita_email_duplicado_sem_diferenciar_caixa(self):
        response = self.client.post(
            reverse("api_v1:register"),
            {
                "email": "EMPRESA@EXAMPLE.COM",
                "first_name": "Nome",
                "last_name": "Teste",
                "password": "SenhaForte123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_token_login_usa_email_e_suporta_maiusculas(self):
        response = self.client.post(
            reverse("api_v1:token"),
            {"email": "EMPRESA@EXAMPLE.COM", "password": "SenhaForte123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["token"])

    def test_perfil_exige_autenticacao(self):
        response = self.client.get(reverse("api_v1:my_profile"))

        self.assertEqual(response.status_code, 401)

    def test_rascunho_nao_e_publico_para_candidato_autenticado(self):
        self.client.force_authenticate(self.candidate)

        response = self.client.get(reverse("api_v1:job_detail", args=(self.draft.pk,)))

        self.assertEqual(response.status_code, 404)

    def test_rascunho_fica_visivel_ao_responsavel_da_empresa(self):
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse("api_v1:job_detail", args=(self.draft.pk,)))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Job.Status.DRAFT)

    def test_empresa_cria_vaga_e_requisitos_pela_api(self):
        self.client.force_authenticate(self.owner)

        response = self.client.post(
            reverse("api_v1:jobs"),
            {
                "company": self.company.pk,
                "title": "Vaga API",
                "area": "Tecnologia",
                "description": "Descrição",
                "requirements": [
                    {"name": "Python", "is_required": True, "weight": 3}
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        job = Job.objects.get(pk=response.data["id"])
        self.assertEqual(job.requirements.get().skill.name, "Python")
        self.assertEqual(job.requirements.get().weight, 3)

    def test_lista_de_empresas_contem_somente_vinculos_do_usuario(self):
        other_company = Company.objects.create(name="Outra empresa")
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse("api_v1:companies"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["id"] for row in response.data["results"]], [self.company.pk]
        )
        self.assertNotEqual(other_company.pk, self.company.pk)

    def test_perfil_api_atualiza_competencias(self):
        self.client.force_authenticate(self.candidate)

        response = self.client.patch(
            reverse("api_v1:my_profile"),
            {
                "city": "Porto Alegre",
                "summary": "Pessoa desenvolvedora",
                "skills": [{"name": "Django", "level": 3}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["skills"], [{"name": "Django", "level": 3}])
        self.assertTrue(
            CandidateSkill.objects.filter(
                profile__user=self.candidate, skill__name="Django", level=3
            ).exists()
        )

    def test_recomendacoes_respeitam_opcao_de_visibilidade_do_candidato(self):
        skill = Skill.objects.create(name="Python")
        from apps.jobs.models import JobRequirement

        job = Job.objects.create(
            company=self.company,
            title="Desenvolvedor",
            area="Tecnologia",
            description="Descrição",
        )
        JobRequirement.objects.create(job=job, skill=skill)
        self.candidate.candidate_profile.city = "Porto Alegre"
        self.candidate.candidate_profile.summary = "Desenvolvedor Python"
        self.candidate.candidate_profile.save()
        CandidateSkill.objects.create(
            profile=self.candidate.candidate_profile, skill=skill, level=3
        )
        self.client.force_authenticate(self.owner)

        response = self.client.get(
            reverse("api_v1:candidate_recommendations", args=(job.pk,))
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        self.candidate.candidate_profile.is_searchable = True
        self.candidate.candidate_profile.save(update_fields=("is_searchable",))
        response = self.client.get(
            reverse("api_v1:candidate_recommendations", args=(job.pk,))
        )
        self.assertEqual(len(response.data), 1)

    def test_relatorio_retorna_apenas_vagas_das_empresas_do_usuario(self):
        Job.objects.create(
            company=self.company,
            title="Publicada da empresa",
            area="Tecnologia",
            description="Descrição",
            status=Job.Status.PUBLISHED,
        )
        other_company = Company.objects.create(name="Empresa de outra pessoa")
        Job.objects.create(
            company=other_company,
            title="Publicada de outra empresa",
            area="Tecnologia",
            description="Descrição",
            status=Job.Status.PUBLISHED,
        )
        self.client.force_authenticate(self.owner)

        response = self.client.get(reverse("api_v1:report_summary"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["published_jobs"], 1)
