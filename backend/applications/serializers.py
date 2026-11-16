from rest_framework import serializers

from candidates.serializers import CandidateProfileSerializer
from jobs.serializers import JobSerializer
from .models import Application, ApplicationHistory


class ApplicationHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = ApplicationHistory
        fields = [
            'id',
            'application',
            'previous_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'created_at',
        ]
        read_only_fields = fields


class ApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.UUIDField(write_only=True)
    candidate = CandidateProfileSerializer(read_only=True)
    history = ApplicationHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'job_id',
            'candidate',
            'status',
            'applied_at',
            'withdrawn_at',
            'updated_at',
            'history',
        ]
        read_only_fields = ['id', 'candidate', 'status', 'applied_at', 'withdrawn_at', 'updated_at']

    def validate_job_id(self, value):
        from django.utils import timezone
        from django.db.models import Q
        from jobs.models import Job

        now = timezone.now()
        job = Job.objects.filter(
            id=value,
            status='publicada',
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=now)
        ).first()

        if not job:
            raise serializers.ValidationError('Esta vaga não está recebendo candidaturas no momento.')
        return value


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    """Serializer para atualização de status pela empresa."""
    COMPANY_ALLOWED_STATUSES = ('em_analise', 'aprovada', 'rejeitada')

    status = serializers.ChoiceField(choices=COMPANY_ALLOWED_STATUSES)
