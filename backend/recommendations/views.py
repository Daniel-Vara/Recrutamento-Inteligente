from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate, IsCompany
from applications.models import Application
from candidates.models import CandidateProfile
from jobs.models import Job
from jobs.serializers import JobSerializer
from jobs.views import public_jobs_queryset
from .matching import compatibility_for, serialize_candidate_skills, serialize_job_requirements


class RecommendedJobsView(APIView):
    """
    Vagas recomendadas para o candidato autenticado,
    ordenadas por compatibilidade decrescente.
    """
    permission_classes = [IsCandidate]

    def get(self, request):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)

        public_jobs = (
            public_jobs_queryset()
            .prefetch_related('requirements__skill')
        )

        applied_job_ids = set(
            Application.objects
            .filter(candidate=profile)
            .exclude(status='retirada')
            .values_list('job_id', flat=True)
        )

        results = []
        for job in public_jobs:
            compat = compatibility_for(profile, job)
            results.append({
                'job': JobSerializer(job, context={'request': request}).data,
                'compatibility': compat,
                'applied': job.id in applied_job_ids,
            })

        # Ordena: compatíveis primeiro → maior score → mais recentes
        results.sort(key=lambda r: (
            not r['compatibility']['is_compatible'],
            -(r['compatibility']['score'] or -1),
        ))

        return Response(results)


class CandidateDashboardView(APIView):
    """KPIs do painel do candidato."""
    permission_classes = [IsCandidate]

    def get(self, request):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)

        apps = Application.objects.filter(candidate=profile)
        total = apps.count()
        em_analise = apps.filter(status='em_analise').count()
        aprovadas = apps.filter(status='aprovada').count()
        rejeitadas = apps.filter(status='rejeitada').count()
        pendentes = apps.filter(status='pendente').count()

        # Candidaturas recentes (últimas 5)
        from applications.serializers import ApplicationSerializer
        recent_apps = (
            apps
            .select_related('job', 'job__company')
            .prefetch_related('job__requirements__skill')
            .order_by('-applied_at')[:5]
        )

        # Vagas recomendadas (top 3)
        public_jobs = public_jobs_queryset().prefetch_related('requirements__skill')
        applied_ids = set(apps.exclude(status='retirada').values_list('job_id', flat=True))
        recs = []
        for job in public_jobs:
            compat = compatibility_for(profile, job)
            if compat['is_compatible']:
                recs.append({
                    'job': JobSerializer(job, context={'request': request}).data,
                    'compatibility': compat,
                    'applied': job.id in applied_ids,
                })
        recs.sort(key=lambda r: -(r['compatibility']['score'] or -1))

        return Response({
            'stats': {
                'total': total,
                'pendente': pendentes,
                'em_analise': em_analise,
                'aprovada': aprovadas,
                'rejeitada': rejeitadas,
            },
            'recent_applications': ApplicationSerializer(recent_apps, many=True).data,
            'recommended_jobs': recs[:3],
        })


class CompanyDashboardView(APIView):
    """KPIs do painel da empresa."""
    permission_classes = [IsCompany]

    def get(self, request):
        from companies.models import Company
        company, _ = Company.objects.get_or_create(
            owner=request.user,
            defaults={'name': request.user.full_name, 'city': request.user.city or 'São Paulo'},
        )

        jobs = Job.objects.filter(company=company)
        total_vagas = jobs.count()
        publicadas = jobs.filter(status='publicada').count()
        rascunhos = jobs.filter(status='rascunho').count()
        encerradas = jobs.filter(status='encerrada').count()

        total_candidaturas = (
            Application.objects
            .filter(job__company=company)
            .exclude(status='retirada')
            .count()
        )
        em_analise = (
            Application.objects
            .filter(job__company=company, status='em_analise')
            .count()
        )

        # Áreas mais requisitadas
        from jobs.serializers import JobSerializer
        top_areas = (
            jobs.filter(status='publicada')
            .values('area')
            .annotate(total=Count('id'))
            .order_by('-total')[:5]
        )

        # Vagas recentes com contagem de candidaturas
        recent_jobs = (
            jobs.order_by('-created_at')[:5]
            .annotate(applications_count=Count('applications', filter=~Q(applications__status='retirada')))
        )

        return Response({
            'stats': {
                'total_vagas': total_vagas,
                'publicadas': publicadas,
                'rascunhos': rascunhos,
                'encerradas': encerradas,
                'total_candidaturas': total_candidaturas,
                'em_analise': em_analise,
            },
            'top_areas': list(top_areas),
            'recent_jobs': JobSerializer(recent_jobs, many=True, context={'request': request}).data,
        })
