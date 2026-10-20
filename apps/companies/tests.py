from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Company, CompanyMembership


class CompanyAuthorizationTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            email="owner@example.com", password="SenhaForte123!"
        )
        self.other = get_user_model().objects.create_user(
            email="other@example.com", password="SenhaForte123!"
        )
        self.company = Company.objects.create(name="Empresa da dona")
        CompanyMembership.objects.create(
            user=self.owner, company=self.company, role=CompanyMembership.Role.OWNER
        )

    def test_usuario_de_outra_empresa_nao_pode_editar(self):
        self.client.force_login(self.other)

        response = self.client.get(
            reverse("companies:edit", args=(self.company.pk,))
        )

        self.assertEqual(response.status_code, 404)

    def test_empresa_criada_vincula_usuario_que_a_criou(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            reverse("companies:create"),
            {"name": "Nova empresa", "tax_id": "", "description": "", "city": "Recife"},
        )

        created = Company.objects.get(name="Nova empresa")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            CompanyMembership.objects.filter(
                user=self.owner, company=created, role=CompanyMembership.Role.OWNER
            ).exists()
        )

    def test_painel_empresa_carrega_indicadores_e_vagas(self):
        self.client.force_login(self.owner)

        response = self.client.get(reverse("companies:dashboard"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Vagas publicadas")
