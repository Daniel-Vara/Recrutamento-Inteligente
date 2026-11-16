import uuid
from django.conf import settings
from django.db import models
from candidates.models import CandidateProfile
from jobs.models import Job


class Application(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('em_analise', 'Em análise'),
        ('aprovada', 'Aprovada'),
        ('rejeitada', 'Rejeitada'),
        ('retirada', 'Retirada'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    candidate = models.ForeignKey(CandidateProfile, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    applied_at = models.DateTimeField(auto_now_add=True)
    withdrawn_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'applications'
        constraints = [
            models.UniqueConstraint(
                fields=['job', 'candidate'],
                condition=~models.Q(status='retirada'),
                name='unique_active_application',
            ),
        ]
        indexes = [
            models.Index(fields=['candidate']),
            models.Index(fields=['job']),
        ]
        verbose_name = 'Candidatura'
        verbose_name_plural = 'Candidaturas'

    def __str__(self):
        return f'{self.candidate} → {self.job.title} ({self.status})'


class ApplicationHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='history')
    previous_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='application_changes',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_history'
        ordering = ['created_at']
        verbose_name = 'Histórico de Candidatura'
        verbose_name_plural = 'Históricos de Candidaturas'

    def __str__(self):
        return f'{self.application_id}: {self.previous_status} → {self.new_status}'
