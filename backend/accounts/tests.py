from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AccountsApiTestCase(APITestCase):
    def test_register_candidate(self):
        url = reverse('auth_register')
        data = {
            'email': 'candidato.teste@example.com',
            'password': 'SenhaForte123!',
            'full_name': 'Candidato de Teste',
            'role': 'candidato',
            'city': 'São Paulo',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'candidato')
        self.assertTrue(User.objects.filter(email='candidato.teste@example.com').exists())

    def test_register_company(self):
        url = reverse('auth_register')
        data = {
            'email': 'empresa.teste@example.com',
            'password': 'SenhaForte123!',
            'full_name': 'Gestor da Empresa',
            'role': 'empresa',
            'company_name': 'Empresa Inovadora LTDA',
            'city': 'São Paulo',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'empresa')

    def test_login_success(self):
        User.objects.create_user(
            email='usuario.login@example.com',
            password='SenhaCorreta123!',
            full_name='Usuario Login',
            role='candidato',
        )
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'email': 'usuario.login@example.com',
            'password': 'SenhaCorreta123!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'email': 'inexistente@example.com',
            'password': 'senha-errada',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
