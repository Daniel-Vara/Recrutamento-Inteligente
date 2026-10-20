
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


User = get_user_model()


class AutenticacaoTests(TestCase):
    def test_cadastro_cria_usuario_e_autentica(self):
        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "candidato@example.com",
                "first_name": "Ana",
                "last_name": "Silva",
                "password1": "UmaSenhaForte123!",
                "password2": "UmaSenhaForte123!",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            User.objects.filter(
                email="candidato@example.com"
            ).exists()
        )
        self.assertIn("_auth_user_id", self.client.session)

    def test_login_com_email_e_senha(self):
        User.objects.create_user(
            email="teste@example.com",
            password="UmaSenhaForte123!",
            first_name="Teste",
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "username": "teste@example.com",
                "password": "UmaSenhaForte123!",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn("_auth_user_id", self.client.session)

    def test_login_com_senha_incorreta(self):
        User.objects.create_user(
            email="teste@example.com",
            password="UmaSenhaForte123!",
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "username": "teste@example.com",
                "password": "senha-errada",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_email_nao_pode_ser_repetido(self):
        User.objects.create_user(
            email="teste@example.com",
            password="UmaSenhaForte123!",
        )

        response = self.client.post(
            reverse("accounts:register"),
            {
                "email": "teste@example.com",
                "first_name": "Outro",
                "last_name": "Usuário",
                "password1": "UmaSenhaForte123!",
                "password2": "UmaSenhaForte123!",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            User.objects.filter(email="teste@example.com").count(),
            1,
        )
