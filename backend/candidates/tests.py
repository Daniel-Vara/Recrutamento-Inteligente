from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from candidates.models import CandidateProfile, CandidateSkill, Skill

User = get_user_model()


class CandidatesApiTestCase(APITestCase):
    def setUp(self):
        self.candidato_user = User.objects.create_user(
            email='candidato.perfil@teste.com',
            password='SenhaValida123!',
            full_name='Ana Silva',
            role='candidato',
            city='São Paulo',
        )
        self.skill = Skill.objects.create(name='Python', normalized_name='python')

    def test_retrieve_and_update_candidate_profile(self):
        self.client.force_authenticate(user=self.candidato_user)
        url = reverse('candidate_profile')
        res_get = self.client.get(url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        res_patch = self.client.patch(url, {
            'professional_summary': 'Especialista em automação e back-end.',
            'is_visible': True,
        }, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['professional_summary'], 'Especialista em automação e back-end.')

    def test_add_and_remove_candidate_skill(self):
        self.client.force_authenticate(user=self.candidato_user)
        url = reverse('candidate_skills_list_create')

        # Adicionar skill
        res_post = self.client.post(url, {
            'skill_id': str(self.skill.id),
            'proficiency_level': 'avancado',
        }, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)
        skill_entry_id = res_post.data['id']

        # Remover skill
        del_url = reverse('candidate_skills_detail', kwargs={'pk': skill_entry_id})
        res_del = self.client.delete(del_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)

    def test_upload_resume_pdf_only(self):
        self.client.force_authenticate(user=self.candidato_user)
        url = reverse('candidate_resume')

        # Teste com arquivo inválido (.txt)
        bad_file = SimpleUploadedFile('curriculo.txt', b'Texto plano...', content_type='text/plain')
        res_bad = self.client.post(url, {'file': bad_file}, format='multipart')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Teste com PDF válido
        good_file = SimpleUploadedFile('curriculo.pdf', b'%PDF-1.4 mock content...', content_type='application/pdf')
        res_good = self.client.post(url, {'file': good_file}, format='multipart')
        self.assertIn(res_good.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(res_good.data['original_filename'], 'curriculo.pdf')
