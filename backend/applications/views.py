from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate, IsCompany
from candidates.models import CandidateProfile
from jobs.models import Job
from recommendations.matching import compatibility_for
from .models import Application, ApplicationHistory
from .serializers import (
    ApplicationSerializer,
    ApplicationStatusUpdateSerializer,
)


def _record_history(application: Application, previous_status, new_status, changed_by):
    """Registra uma entrada no histórico de mudança de status."""
    ApplicationHistory.objects.create(
        application=application,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=changed_by,
    )


# ---------------------------------------------------------------------------
# CANDIDATO — listar candidaturas e aplicar/retirar
# ---------------------------------------------------------------------------

class CandidateApplicationListView(generics.ListAPIView):
    """Lista todas as candidaturas do candidato autenticado."""
    serializer_class = ApplicationSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        return (
            Application.objects
            .filter(candidate=profile)
            .select_related('job', 'job__company', 'job__company__owner')
            .prefetch_related('job__requirements__skill', 'history__changed_by')
            .order_by('-applied_at')
        )


class ApplyToJobView(APIView):
    """Candidato aplica a uma vaga publicada."""
    permission_classes = [IsCandidate]

    def post(self, request, job_id):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)

        # Verifica vaga publicada e vigente
        now = timezone.now()
        from django.db.models import Q
        job = get_object_or_404(
            Job.objects.filter(status='publicada').filter(
                Q(expires_at__isnull=True) | Q(expires_at__gte=now)
            ),
            pk=job_id,
        )

        # Impede candidatura duplicada ativa
        existing = (
            Application.objects
            .filter(job=job, candidate=profile)
            .exclude(status='retirada')
            .first()
        )
        if existing:
            raise ValidationError({'detail': 'Você já possui uma candidatura ativa para esta vaga.'})

        try:
            application = Application.objects.create(
                job=job,
                candidate=profile,
                status='pendente',
            )
        except IntegrityError:
            raise ValidationError({'detail': 'Você já possui uma candidatura ativa para esta vaga.'})

        _record_history(application, None, 'pendente', request.user)

        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class WithdrawApplicationView(APIView):
    """Candidato retira sua candidatura."""
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
        application = get_object_or_404(Application, pk=pk, candidate=profile)

        if application.status == 'retirada':
            raise ValidationError({'detail': 'Esta candidatura já foi retirada.'})

        previous_status = application.status
        application.status = 'retirada'
        application.withdrawn_at = timezone.now()
        application.save(update_fields=['status', 'withdrawn_at', 'updated_at'])
        _record_history(application, previous_status, 'retirada', request.user)

        return Response({'detail': 'Candidatura retirada com sucesso.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# EMPRESA — listar candidaturas recebidas e atualizar status
# ---------------------------------------------------------------------------

class CompanyApplicationsView(generics.ListAPIView):
    """Lista todas as candidaturas recebidas pelas vagas da empresa autenticada."""
    serializer_class = ApplicationSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        return (
            Application.objects
            .filter(job__company__owner=self.request.user)
            .select_related(
                'job', 'job__company',
                'candidate', 'candidate__user',
            )
            .prefetch_related(
                'candidate__candidate_skills__skill',
                'candidate__resume',
                'history__changed_by',
            )
            .order_by('-applied_at')
        )


class UpdateApplicationStatusView(APIView):
    """Empresa atualiza status de uma candidatura (em_analise, aprovada, rejeitada)."""
    permission_classes = [IsCompany]

    def patch(self, request, pk):
        application = get_object_or_404(
            Application.objects.select_related('job__company'),
            pk=pk,
            job__company__owner=request.user,
        )

        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['status']

        if application.status == 'retirada':
            raise ValidationError({'detail': 'Não é possível alterar o status de uma candidatura retirada.'})

        previous_status = application.status
        application.status = new_status
        application.save(update_fields=['status', 'updated_at'])
        _record_history(application, previous_status, new_status, request.user)

        return Response(ApplicationSerializer(application).data)


class JobCandidatesRankingView(generics.ListAPIView):
    """Ranking de candidatos de uma vaga, ordenado por compatibilidade."""
    permission_classes = [IsCompany]

    def get(self, request, job_id):
        job = get_object_or_404(Job, pk=job_id, company__owner=request.user)

        applications = (
            Application.objects
            .filter(job=job)
            .exclude(status='retirada')
            .select_related('candidate', 'candidate__user')
            .prefetch_related('candidate__candidate_skills__skill', 'candidate__resume')
            .order_by('applied_at')
        )

        ranking = []
        for app in applications:
            compat = compatibility_for(app.candidate, job)
            ranking.append({
                'application_id': str(app.id),
                'status': app.status,
                'applied_at': app.applied_at,
                'candidate': {
                    'id': str(app.candidate.id),
                    'user_id': str(app.candidate.user_id),
                    'full_name': app.candidate.user.full_name,
                    'email': app.candidate.user.email,
                    'city': app.candidate.user.city,
                    'professional_summary': app.candidate.professional_summary,
                    'is_visible': app.candidate.is_visible,
                    'resume_id': str(app.candidate.resume.id) if hasattr(app.candidate, 'resume') and app.candidate.resume else None,
                },
                'compatibility': compat,
            })

        # Ordena: compatíveis primeiro → maior score → data de candidatura mais antiga
        ranking.sort(key=lambda r: (
            not r['compatibility']['is_compatible'],
            -(r['compatibility']['score'] or -1),
            r['applied_at'],
        ))

        return Response(ranking)
