from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCompany
from candidates.views import SkillListCreateView  # re-exported via jobs urls as /api/v1/skills/
from companies.models import Company
from .models import Job
from .serializers import JobSerializer


def public_jobs_queryset():
    now = timezone.now()
    return (
        Job.objects.filter(status='publicada')
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
        .select_related('company', 'company__owner')
        .prefetch_related('requirements__skill')
        .annotate(
            applications_count=Count('applications', filter=~Q(applications__status='retirada'))
        )
        .order_by('-published_at', '-created_at')
    )


class PublicJobListView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ['title', 'description', 'company__name']
    filterset_fields = ['area', 'city', 'work_mode']

    def get_queryset(self):
        qs = public_jobs_queryset()
        search = self.request.query_params.get('search') or self.request.query_params.get('title')
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(company__name__icontains=search)
            )
        return qs


class PublicJobDetailView(generics.RetrieveAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == 'empresa':
            return Job.objects.filter(Q(status='publicada') | Q(company__owner=user)).select_related(
                'company'
            ).prefetch_related('requirements__skill')
        return public_jobs_queryset()


class CompanyJobListCreateView(generics.ListCreateAPIView):
    serializer_class = JobSerializer
    permission_classes = [IsCompany]

    def get_company(self):
        company, _ = Company.objects.get_or_create(
            owner=self.request.user,
            defaults={'name': self.request.user.full_name, 'city': self.request.user.city or 'São Paulo'},
        )
        return company

    def get_queryset(self):
        return (
            Job.objects.filter(company=self.get_company())
            .select_related('company')
            .prefetch_related('requirements__skill')
            .annotate(
                applications_count=Count('applications', filter=~Q(applications__status='retirada'))
            )
            .order_by('-created_at')
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = self.get_company()
        return context


class CompanyJobDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JobSerializer
    permission_classes = [IsCompany]

    def get_queryset(self):
        return Job.objects.filter(company__owner=self.request.user).prefetch_related('requirements__skill')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = self.get_queryset().first().company if self.get_queryset().exists() else None
        if context['company'] is None:
            context['company'] = Company.objects.filter(owner=self.request.user).first()
        return context

    def perform_destroy(self, instance):
        if instance.company.owner_id != self.request.user.id:
            raise PermissionDenied('Somente a empresa dona pode excluir esta vaga.')
        instance.delete()
