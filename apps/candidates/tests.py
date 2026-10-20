from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
from io import BytesIO

from django.core.files.storage import FileSystemStorage

from apps.accounts.models import User
from apps.applications.models import Application
from apps.companies.models import Company, CompanyMembership
from apps.jobs.models import Job
from .forms import CandidateProfileForm
from .models import CandidateProfile, CandidateSkill, Resume, Skill


class SkillTests(TestCase):
    def test_nome_e_normalizado_ao_salvar(self):
        skill = Skill.objects.create(name="  Python   Avançado ")

        self.assertEqual(skill.name, "Python Avançado")
        self.assertEqual(skill.normalized_name, "python avançado")

    def test_edicao_de_perfil_substitui_competencias(self):
        user = User.objects.create_user(email="pessoa@example.com", password="Senha123!")
        profile = CandidateProfile.objects.create(user=user)
        form = CandidateProfileForm(
            data={
                "first_name": "Pessoa",
                "last_name": "Teste",
                "city": "Curitiba",
                "summary": "Desenvolvedora",
                "is_searchable": "on",
                "skills": "Python:3, SQL:2",
            },
            instance=profile,
            user=user,
        )

        self.assertTrue(form.is_valid(), form.errors)
        form.save()

        self.assertEqual(profile.skills.count(), 2)
        self.assertEqual(profile.skills.get(skill__name="Python").level, CandidateSkill.Level.ADVANCED)
        self.assertTrue(profile.is_searchable)


class CandidateDashboardTests(TestCase):
    def test_painel_exibe_perfil_e_vagas_recomendadas(self):
        user = User.objects.create_user(
            email="painel@example.com", password="SenhaForte123!"
        )
        self.client.force_login(user)

        response = self.client.get(reverse("candidates:dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Vagas recomendadas")
        self.assertContains(response, "Currículo")


class ResumePrivacyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="curriculo@example.com", password="SenhaForte123!"
        )
        self.profile = CandidateProfile.objects.create(user=self.user)
        self.client.force_login(self.user)

    def test_upload_valido_substitui_curriculo_atual(self):
        old = Resume.objects.create(
            profile=self.profile,
            file="resumes/old.pdf",
            is_active=True,
        )
        uploaded = SimpleUploadedFile("novo.pdf", b"%PDF-1.7 conteudo")
        storage = Resume._meta.get_field("file").storage

        with TemporaryDirectory() as directory:
            def save_to_test_directory(name, content, max_length=None):
                path = Path(directory, name)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content.read())
                content.seek(0)
                return name

            with patch.object(storage, "save", side_effect=save_to_test_directory):
                response = self.client.post(
                    "/candidato/curriculos/enviar/", {"file": uploaded}
                )
            new = Resume.objects.exclude(pk=old.pk).get()
            self.assertEqual(response.status_code, 302)
            self.assertFalse(Resume.objects.get(pk=old.pk).is_active)
            self.assertTrue(new.is_active)
            self.assertTrue(Path(directory, new.file.name).exists())

    def test_upload_recusa_arquivo_que_nao_e_pdf(self):
        uploaded = SimpleUploadedFile("curriculo.txt", b"texto")
        response = self.client.post(
            "/candidato/curriculos/enviar/", {"file": uploaded}
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.profile.resumes.count(), 0)

    def test_outro_candidato_nao_pode_baixar_curriculo(self):
        resume = Resume.objects.create(
            profile=self.profile,
            file="resumes/private.pdf",
        )
        other = User.objects.create_user(
            email="outra@example.com", password="SenhaForte123!"
        )
        self.client.force_login(other)

        response = self.client.get(f"/candidato/curriculos/{resume.pk}/baixar/")

        self.assertEqual(response.status_code, 404)

    def test_empresa_so_pode_baixar_curriculo_de_candidatura_da_propria_vaga(self):
        resume = Resume.objects.create(profile=self.profile, file="resumes/private.pdf")
        company = Company.objects.create(name="Empresa com candidatura")
        job = Job.objects.create(
            company=company,
            title="Vaga",
            area="Tecnologia",
            description="Descrição",
        )
        Application.objects.create(candidate=self.profile, job=job, resume=resume)
        manager = User.objects.create_user(
            email="gestor@example.com", password="SenhaForte123!"
        )
        CompanyMembership.objects.create(
            user=manager, company=company, role=CompanyMembership.Role.RECRUITER
        )
        self.client.force_login(manager)

        with patch.object(FileSystemStorage, "open", return_value=BytesIO(b"%PDF-content")):
            response = self.client.get(f"/candidato/curriculos/{resume.pk}/baixar/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

