from django.conf import settings
from django.db import models

from apps.candidates.models import CandidateProfile, Resume
from apps.jobs.models import Job


class Application(models.Model):
    class Status(models.TextChoices):
        RECEIVED = "received", "Recebida"
        REVIEW = "review", "Em análise"
        INTERVIEW = "interview", "Entrevista"
        APPROVED = "approved", "Aprovada"
        REJECTED = "rejected", "Rejeitada"
        WITHDRAWN = "withdrawn", "Desistiu"

    candidate = models.ForeignKey(
        CandidateProfile, on_delete=models.PROTECT, related_name="applications"
    )
    job = models.ForeignKey(Job, on_delete=models.PROTECT, related_name="applications")
    resume = models.ForeignKey(
        Resume,
        on_delete=models.PROTECT,
        related_name="applications",
        blank=True,
        null=True,
    )
    status = models.CharField(
        "status", max_length=12, choices=Status.choices, default=Status.RECEIVED
    )
    applied_at = models.DateTimeField("candidatou-se em", auto_now_add=True)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    class Meta:
        verbose_name = "candidatura"
        verbose_name_plural = "candidaturas"
        constraints = [
            models.UniqueConstraint(
                fields=("candidate", "job"), name="unique_candidate_job_application"
            )
        ]
        indexes = [models.Index(fields=("job", "status"))]

    def __str__(self):
        return f"{self.candidate} — {self.job}"


class ApplicationStatusHistory(models.Model):
    application = models.ForeignKey(
        Application, on_delete=models.PROTECT, related_name="history"
    )
    previous_status = models.CharField("status anterior", max_length=12, blank=True)
    new_status = models.CharField("novo status", max_length=12, choices=Application.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="application_status_changes",
    )
    changed_at = models.DateTimeField("alterado em", auto_now_add=True)
    note = models.CharField("observação", max_length=250, blank=True)

    class Meta:
        ordering = ("changed_at", "pk")
        verbose_name = "alteração de status"
        verbose_name_plural = "histórico de status"
