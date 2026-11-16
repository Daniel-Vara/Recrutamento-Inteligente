import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from companies.models import Company
from candidates.models import Skill


class Job(models.Model):
    WORK_MODE_CHOICES = (
        ('presencial', 'Presencial'),
        ('hibrido', 'Híbrido'),
        ('remoto', 'Remoto'),
    )
    EMPLOYMENT_TYPE_CHOICES = (
        ('clt', 'CLT'),
        ('pj', 'PJ'),
        ('estagio', 'Estágio'),
        ('temporario', 'Temporário'),
        ('freelancer', 'Freelancer'),
    )
    STATUS_CHOICES = (
        ('rascunho', 'Rascunho'),
        ('publicada', 'Publicada'),
        ('encerrada', 'Encerrada'),
        ('arquivada', 'Arquivada'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='jobs')
    title = models.CharField(max_length=255, verbose_name='Título')
    description = models.TextField(verbose_name='Descrição')
    city = models.CharField(max_length=100, verbose_name='Cidade')
    area = models.CharField(max_length=100, verbose_name='Área')
    work_mode = models.CharField(max_length=20, choices=WORK_MODE_CHOICES)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='rascunho')
    published_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'jobs'
        verbose_name = 'Vaga'
        verbose_name_plural = 'Vagas'
        indexes = [
            models.Index(fields=['status', 'expires_at']),
            models.Index(fields=['company']),
            models.Index(fields=['area']),
            models.Index(fields=['city']),
        ]
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return f'{self.title} ({self.company.name})'


class JobRequirement(models.Model):
    REQUIREMENT_TYPE_CHOICES = (
        ('obrigatorio', 'Obrigatório'),
        ('desejavel', 'Desejável'),
    )
    PROFICIENCY_CHOICES = (
        ('iniciante', 'Iniciante'),
        ('basico', 'Básico'),
        ('intermediario', 'Intermediário'),
        ('avancado', 'Avançado'),
        ('especialista', 'Especialista'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='requirements')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='job_requirements')
    requirement_type = models.CharField(max_length=20, choices=REQUIREMENT_TYPE_CHOICES)
    minimum_level = models.CharField(max_length=20, choices=PROFICIENCY_CHOICES)
    weight = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'job_requirements'
        constraints = [
            models.UniqueConstraint(fields=['job', 'skill'], name='unique_job_skill_requirement'),
        ]
        verbose_name = 'Requisito da Vaga'
        verbose_name_plural = 'Requisitos das Vagas'

    def __str__(self):
        return f'{self.job.title} — {self.skill.name}'
