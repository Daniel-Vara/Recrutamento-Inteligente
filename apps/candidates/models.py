from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.db import models
from django.utils import timezone
from pathlib import Path
from uuid import uuid4


@deconstructible
class PrivateResumeStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_MEDIA_ROOT, base_url="")


def validate_resume_file(uploaded_file):
    if uploaded_file.size > 5 * 1024 * 1024:
        raise ValidationError("O currículo deve ter no máximo 5 MB.")
    if Path(uploaded_file.name).suffix.casefold() != ".pdf":
        raise ValidationError("Envie o currículo em formato PDF.")
    uploaded_file.seek(0)
    signature = uploaded_file.read(5)
    uploaded_file.seek(0)
    if signature != b"%PDF-":
        raise ValidationError("O arquivo enviado não parece ser um PDF válido.")


def resume_upload_path(instance, filename):
    return f"resumes/{instance.profile_id}/{uuid4().hex}.pdf"


class CandidateProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
    )
    city = models.CharField("cidade", max_length=120, blank=True)
    summary = models.TextField("resumo profissional", blank=True)
    is_searchable = models.BooleanField(
        "visível em recomendações para empresas", default=False
    )
    created_at = models.DateTimeField("criado em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    @property
    def full_name(self):
        return self.user.get_full_name().strip() or self.user.email

    @property
    def is_complete(self):
        return bool(self.city.strip() and self.summary.strip())

    def __str__(self):
        return self.full_name


class Skill(models.Model):
    name = models.CharField("competência", max_length=80, unique=True)
    normalized_name = models.CharField(
        "nome normalizado", max_length=80, unique=True, editable=False
    )

    def save(self, *args, **kwargs):
        self.name = " ".join(self.name.split())
        self.normalized_name = self.name.casefold()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CandidateSkill(models.Model):
    class Level(models.IntegerChoices):
        BEGINNER = 1, "Iniciante"
        INTERMEDIATE = 2, "Intermediário"
        ADVANCED = 3, "Avançado"
        EXPERT = 4, "Especialista"

    profile = models.ForeignKey(
        CandidateProfile, on_delete=models.CASCADE, related_name="skills"
    )
    skill = models.ForeignKey(Skill, on_delete=models.PROTECT, related_name="candidates")
    level = models.PositiveSmallIntegerField("nível", choices=Level.choices)

    class Meta:
        verbose_name = "competência do candidato"
        verbose_name_plural = "competências dos candidatos"
        constraints = [
            models.UniqueConstraint(
                fields=("profile", "skill"), name="unique_candidate_skill"
            )
        ]

    def __str__(self):
        return f"{self.skill} — {self.get_level_display()}"


class Resume(models.Model):
    profile = models.ForeignKey(
        CandidateProfile, on_delete=models.PROTECT, related_name="resumes"
    )
    file = models.FileField(
        "currículo em PDF",
        upload_to=resume_upload_path,
        storage=PrivateResumeStorage(),
        validators=[validate_resume_file],
    )
    uploaded_at = models.DateTimeField("enviado em", default=timezone.now)
    is_active = models.BooleanField("currículo atual", default=True)

    class Meta:
        ordering = ("-uploaded_at", "-pk")
        verbose_name = "currículo"
        verbose_name_plural = "currículos"
        constraints = [
            models.UniqueConstraint(
                fields=("profile",), condition=models.Q(is_active=True),
                name="one_active_resume_per_candidate",
            )
        ]

    def __str__(self):
        return f"Currículo de {self.profile}"
