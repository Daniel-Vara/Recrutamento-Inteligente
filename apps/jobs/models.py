from django.db import models
from django.utils import timezone

from apps.candidates.models import Skill
from apps.companies.models import Company


class Job(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Rascunho"
        PUBLISHED = "published", "Publicada"
        CLOSED = "closed", "Encerrada"
        ARCHIVED = "archived", "Arquivada"

    class WorkMode(models.TextChoices):
        ONSITE = "onsite", "Presencial"
        HYBRID = "hybrid", "Híbrido"
        REMOTE = "remote", "Remoto"

    company = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="jobs")
    title = models.CharField("título", max_length=160)
    area = models.CharField("área profissional", max_length=120)
    description = models.TextField("descrição")
    city = models.CharField("cidade", max_length=120, blank=True)
    work_mode = models.CharField(
        "modalidade", max_length=10, choices=WorkMode.choices, default=WorkMode.ONSITE
    )
    application_deadline = models.DateField("prazo de candidatura", blank=True, null=True)
    status = models.CharField(
        "status", max_length=12, choices=Status.choices, default=Status.DRAFT
    )
    skills = models.ManyToManyField(Skill, through="JobRequirement", related_name="jobs")
    created_at = models.DateTimeField("criada em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    @property
    def is_open(self):
        return self.status == self.Status.PUBLISHED and not (
            self.application_deadline and self.application_deadline < timezone.localdate()
        )

    def __str__(self):
        return self.title


class JobRequirement(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="requirements")
    skill = models.ForeignKey(Skill, on_delete=models.PROTECT, related_name="job_requirements")
    is_required = models.BooleanField("obrigatória", default=True)
    weight = models.PositiveSmallIntegerField("peso", default=1)

    class Meta:
        verbose_name = "requisito da vaga"
        verbose_name_plural = "requisitos da vaga"
        constraints = [
            models.UniqueConstraint(fields=("job", "skill"), name="unique_job_skill"),
            models.CheckConstraint(condition=models.Q(weight__gte=1), name="job_skill_weight_positive"),
        ]

    def __str__(self):
        return f"{self.skill} — {self.job}"
