from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from candidates.models import Skill
from companies.models import Company
from jobs.models import Job

User = get_user_model()


class JobsApiTestCase(APITestCase):
    def setUp(self):
        self.empresa_user = User.objects.create_user(
            email='rh@techcorp.com',
            password='SenhaValida123!',
            full_name='Recrutador TechCorp',
            role='empresa',
        )
        self.company = Company.objects.create(
            owner=self.empresa_user,
            name='TechCorp',
            city='São Paulo',
        )
        self.skill_react = Skill.objects.create(name='React', normalized_name='react')
        self.skill_node = Skill.objects.create(name='Node.js', normalized_name='nodejs')

    def test_create_job_with_requirements(self):
        self.client.force_authenticate(user=self.empresa_user)
        url = reverse('company_job_list_create')
        data = {
            'title': 'Desenvolvedor React / Node',
            'description': 'Construção de aplicações escaláveis.',
            'city': 'São Paulo',
            'area': 'Tecnologia da Informação',
            'work_mode': 'hibrido',
            'employment_type': 'clt',
            'status': 'publicada',
            'requirements': [
                {
                    'skill_id': str(self.skill_react.id),
                    'requirement_type': 'obrigatorio',
                    'minimum_level': 'avancado',
                    'weight': 3,
                },
                {
                    'skill_id': str(self.skill_node.id),
                    'requirement_type': 'desejavel',
                    'minimum_level': 'intermediario',
                    'weight': 2,
                },
            ],
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Desenvolvedor React / Node')
        self.assertEqual(len(response.data['requirements']), 2)

    def test_public_job_list(self):
        Job.objects.create(
            company=self.company,
            title='Vaga Pública Teste',
            description='Descrição detalhada.',
            city='Campinas',
            area='Tecnologia',
            work_mode='remoto',
            employment_type='clt',
            status='publicada',
        )
        url = reverse('public_job_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verifica se paginação ou lista retornou os dados
        results = response.data.get('results', response.data)
        self.assertTrue(any(j['title'] == 'Vaga Pública Teste' for j in results))
