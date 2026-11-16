import os
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate
from applications.models import Application
from .files import validate_resume_file
from .models import CandidateProfile, CandidateSkill, Resume, Skill
from .serializers import (
    CandidateProfileSerializer,
    CandidateSkillSerializer,
    ResumeSerializer,
    SkillSerializer,
)


class CandidateProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateProfileSerializer
    permission_classes = [IsCandidate]

    def get_object(self):
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        return profile


class CandidateSkillListCreateView(generics.ListCreateAPIView):
    serializer_class = CandidateSkillSerializer
    permission_classes = [IsCandidate]
    pagination_class = None

    def get_queryset(self):
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        return CandidateSkill.objects.filter(candidate=profile).select_related('skill')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        context['candidate'] = profile
        return context


class CandidateSkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CandidateSkillSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        return CandidateSkill.objects.filter(candidate=profile)


class SkillListCreateView(generics.ListCreateAPIView):
    queryset = Skill.objects.all().order_by('name')
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    search_fields = ['name', 'normalized_name']

    def perform_create(self, serializer):
        if not self.request.user or not self.request.user.is_authenticated:
            raise PermissionDenied('Autenticação necessária para cadastrar novas competências.')
        serializer.save()


class ResumeUploadView(APIView):
    permission_classes = [IsCandidate]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
        resume = Resume.objects.filter(candidate=profile).first()
        if not resume:
            return Response(None, status=status.HTTP_200_OK)
        return Response(ResumeSerializer(resume).data)

    def post(self, request):
        profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
        file_obj = validate_resume_file(request.FILES.get('file'))

        resume = Resume.objects.filter(candidate=profile).first()
        created = resume is None
        if resume and resume.file:
            try:
                if resume.file.path and os.path.isfile(resume.file.path):
                    os.remove(resume.file.path)
            except (OSError, ValueError):
                pass
        if resume is None:
            resume = Resume(candidate=profile)

        resume.file = file_obj
        resume.original_filename = file_obj.name
        resume.file_size = file_obj.size
        resume.save()
        resume.storage_path = resume.file.name
        resume.save(update_fields=['storage_path'])

        return Response(
            ResumeSerializer(resume).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ResumeDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, resume_id=None):
        user = request.user
        if resume_id is None:
            if user.role != 'candidato':
                raise PermissionDenied('Informe o identificador do currículo.')
            profile, _ = CandidateProfile.objects.get_or_create(user=user)
            resume = get_object_or_404(Resume, candidate=profile)
        else:
            resume = get_object_or_404(Resume, id=resume_id)

        if user == resume.candidate.user:
            return self._serve_file(resume)

        if user.role == 'empresa':
            has_application = (
                Application.objects.filter(
                    candidate=resume.candidate,
                    job__company__owner=user,
                )
                .exclude(status='retirada')
                .exists()
            )
            if has_application:
                return self._serve_file(resume)

        raise PermissionDenied(
            'Acesso negado. Apenas o candidato ou empresas com candidatura ativa têm acesso a este currículo.'
        )

    def _serve_file(self, resume):
        if not resume.file:
            raise Http404('Arquivo físico não encontrado.')
        response = FileResponse(resume.file.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{resume.original_filename}"'
        return response
