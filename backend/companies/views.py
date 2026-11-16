from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCompany
from candidates.models import CandidateProfile
from jobs.models import Job
from recommendations.matching import compatibility_for
from .models import Company
from .serializers import CompanySerializer, VisibleCandidateSerializer


class CompanyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CompanySerializer
    permission_classes = [IsCompany]

    def get_object(self):
        company, _ = Company.objects.get_or_create(
            owner=self.request.user,
            defaults={
                'name': self.request.user.full_name,
                'city': self.request.user.city or 'São Paulo',
            },
        )
        return company


class CompanyVisibleCandidatesView(generics.ListAPIView):
    permission_classes = [IsCompany]
    serializer_class = VisibleCandidateSerializer

    def get_queryset(self):
        return (
            CandidateProfile.objects.filter(is_visible=True)
            .select_related('user')
            .prefetch_related('candidate_skills__skill', 'resume')
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        job_id = self.request.query_params.get('job_id')
        compatibility_map = {}
        if job_id:
            job = get_object_or_404(Job, id=job_id, company__owner=self.request.user)
            for candidate in self.get_queryset():
                compatibility_map[str(candidate.id)] = compatibility_for(candidate, job)
        context['compatibility_map'] = compatibility_map
        return context
