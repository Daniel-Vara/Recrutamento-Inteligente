import uuid
from django.db import models
from django.conf import settings

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='company')
    name = models.CharField(max_length=255, verbose_name='Nome da Organização')
    description = models.TextField(blank=True, null=True, verbose_name='Descrição / Cultura')
    city = models.CharField(max_length=100, verbose_name='Cidade Sede')
    website = models.URLField(blank=True, null=True, verbose_name='Website')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'companies'
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'

    def __str__(self):
        return f"{self.name} ({self.city})"
