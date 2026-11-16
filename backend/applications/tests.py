from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from candidates.models import CandidateProfile
from companies.models import Company
from jobs.models import Job
from applications.models import Application, ApplicationHistory

User = get_user_model()


class ApplicationsApiTestCase(APITestCase):
    def setUp(self):
        # Empresa
        self.empresa_user = User.objects.create_user(
            email='empresa.app@teste.com',
            password='SenhaValida123!',
            full_name='Gestor Empresa',
            role='empresa',
        )
        self.company = Company.objects.create(
            owner=self.empresa_user,
            name='Empresa Teste',
            city='São Paulo',
        )
        self.job = Job.objects.create(
            company=self.company,
            title='Engenheiro de Software',
            description='Construção de sistemas.',
            city='São Paulo',
            area='Tecnologia',
            work_mode='hibrido',
            employment_type='clt',
            status='publicada',
        )

        # Candidato
        self.candidato_user = User.objects.create_user(
            email='candidato.app@teste.com',
            password='SenhaValida123!',
            full_name='Candidato Teste',
            role='candidato',
        )
        self.candidate_profile = CandidateProfile.objects.create(
            user=self.candidato_user,
            professional_summary='Engenheiro fullstack experiente.',
        )

    def test_apply_to_job_success(self):
        self.client.force_authenticate(user=self.candidato_user)
        url = reverse('apply_to_job', kwargs={'job_id': self.job.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pendente')
        self.assertTrue(Application.objects.filter(job=self.job, candidate=self.candidate_profile).exists())
        self.assertTrue(ApplicationHistory.objects.filter(application_id=response.data['id']).exists())

    def test_prevent_duplicate_application(self):
        self.client.force_authenticate(user=self.candidato_user)
        url = reverse('apply_to_job', kwargs={'job_id': self.job.id})
        # 1ª candidatura
        res1 = self.client.post(url)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        # 2ª candidatura na mesma vaga (duplicada)
        res2 = self.client.post(url)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_withdraw_application(self):
        self.client.force_authenticate(user=self.candidato_user)
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate_profile,
            status='pendente',
        )
        url = reverse('withdraw_application', kwargs={'pk': app.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'retirada')
        self.assertIsNotNone(app.withdrawn_at)

    def test_company_update_status(self):
        app = Application.objects.create(
            job=self.job,
            candidate=self.candidate_profile,
            status='pendente',
        )
        self.client.force_authenticate(user=self.empresa_user)
        url = reverse('update_application_status', kwargs={'pk': app.id})
        response = self.client.patch(url, {'status': 'em_analise'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'em_analise')
