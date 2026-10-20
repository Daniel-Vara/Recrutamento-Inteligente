from django.conf import settings
from django.db import models


class Company(models.Model):
    name = models.CharField("nome", max_length=160)
    tax_id = models.CharField("identificação fiscal", max_length=30, blank=True)
    description = models.TextField("descrição", blank=True)
    city = models.CharField("cidade", max_length=120, blank=True)
    created_at = models.DateTimeField("criada em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    def __str__(self):
        return self.name


class CompanyMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Proprietário"
        RECRUITER = "recruiter", "Recrutador"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="company_memberships"
    )
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField("responsabilidade", max_length=12, choices=Role.choices)
    is_active = models.BooleanField("vínculo ativo", default=True)
    created_at = models.DateTimeField("vinculado em", auto_now_add=True)

    class Meta:
        verbose_name = "responsável pela empresa"
        verbose_name_plural = "responsáveis pelas empresas"
        constraints = [
            models.UniqueConstraint(
                fields=("user", "company"), name="unique_company_membership"
            )
        ]

    def __str__(self):
        return f"{self.user} — {self.company}"
