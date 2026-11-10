import uuid
from django.db import models
from django.conf import settings

class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name='Nome da Competência')
    normalized_name = models.CharField(max_length=100, unique=True, verbose_name='Nome Normalizado')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skills'
        verbose_name = 'Competência'
        verbose_name_plural = 'Competências'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.normalized_name:
            import re
            self.normalized_name = re.sub(r'[^a-z0-9]', '', self.name.lower())
        super().save(*args, **kwargs)

class CandidateProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='candidate_profile')
    professional_summary = models.TextField(blank=True, null=True, verbose_name='Resumo Profissional')
    is_visible = models.BooleanField(default=True, verbose_name='Visível em Recomendações')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_profiles'
        verbose_name = 'Perfil do Candidato'
        verbose_name_plural = 'Perfis de Candidatos'

    def __str__(self):
        return f"Candidato: {self.user.full_name}"

class CandidateSkill(models.Model):
    PROFICIENCY_CHOICES = (
        ('iniciante', 'Iniciante'),
        ('basico', 'Básico'),
        ('intermediario', 'Intermediário'),
        ('avancado', 'Avançado'),
        ('especialista', 'Especialista'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name='candidate_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='candidate_skills')
    proficiency_level = models.CharField(max_length=20, choices=PROFICIENCY_CHOICES, default='intermediario')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_skills'
        unique_together = ('candidate', 'skill')
        verbose_name = 'Competência do Candidato'
        verbose_name_plural = 'Competências dos Candidatos'

    def __str__(self):
        return f"{self.candidate.user.full_name} - {self.skill.name} ({self.get_proficiency_level_display()})"

def resume_upload_path(instance, filename):
    return f"resumes/{instance.candidate.id}/{uuid.uuid4().hex}_{filename}"

class Resume(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.OneToOneField(CandidateProfile, on_delete=models.CASCADE, related_name='resume')
    file = models.FileField(upload_to=resume_upload_path, verbose_name='Arquivo PDF')
    storage_path = models.CharField(max_length=500, blank=True, null=True)
    original_filename = models.CharField(max_length=255, verbose_name='Nome Original')
    file_size = models.IntegerField(verbose_name='Tamanho em Bytes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'resumes'
        verbose_name = 'Currículo'
        verbose_name_plural = 'Currículos'

    def __str__(self):
        return f"Currículo: {self.original_filename} ({self.candidate.user.full_name})"
