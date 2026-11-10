import os
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404

from .models import CandidateProfile, CandidateSkill, Skill, Resume
from .serializers import (
    CandidateProfileSerializer,
    CandidateSkillSerializer,
    SkillSerializer,
    ResumeSerializer
)

class CandidateProfileView(generics.RetrieveUpdateAPIView):
    """Consulta e atualização do perfil profissional do candidato logado"""
    serializer_class = CandidateProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if user.role != 'candidato':
            raise PermissionDenied("Apenas usuários do tipo 'candidato' possuem perfil de candidato.")
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return profile

class CandidateSkillListCreateView(generics.ListCreateAPIView):
    """Listagem e adição de competências para o candidato autenticado"""
    serializer_class = CandidateSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != 'candidato':
            return CandidateSkill.objects.none()
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return CandidateSkill.objects.filter(candidate=profile).select_related('skill')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        profile, _ = CandidateProfile.objects.get_or_create(user=self.request.user)
        context['candidate'] = profile
        return context

class CandidateSkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Atualização e remoção de competência do perfil"""
    serializer_class = CandidateSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return CandidateSkill.objects.filter(candidate=profile)

class SkillListCreateView(generics.ListCreateAPIView):
    """Catálogo público de competências e cadastro de novas competências"""
    queryset = Skill.objects.all().order_by('name')
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Autenticação necessária para cadastrar novas competências.")
        serializer.save()

class ResumeUploadView(APIView):
    """Upload e substituição de currículo em PDF (máx 5MB)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != 'candidato':
            raise PermissionDenied("Apenas candidatos podem fazer upload de currículos.")

        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        file_obj = request.FILES.get('file')

        if not file_obj:
            raise ValidationError({'file': 'Nenhum arquivo enviado.'})

        # 1. Validação de extensão / formato PDF
        if not file_obj.name.lower().endswith('.pdf'):
            raise ValidationError({'file': 'Apenas arquivos em formato PDF são permitidos.'})

        # 2. Validação de tamanho (máximo 5 MB = 5242880 bytes)
        MAX_SIZE = 5 * 1024 * 1024
        if file_obj.size > MAX_SIZE:
            raise ValidationError({'file': 'O arquivo excede o limite máximo permitido de 5 MB.'})

        # Substitui currículo anterior se houver
        resume, created = Resume.objects.get_or_create(
            candidate=profile,
            defaults={
                'file': file_obj,
                'original_filename': file_obj.name,
                'file_size': file_obj.size,
                'storage_path': f"resumes/{profile.id}/{file_obj.name}"
            }
        )

        if not created:
            # Remove arquivo anterior do disco/storage se existir
            if resume.file and os.path.isfile(resume.file.path):
                try:
                    os.remove(resume.file.path)
                except OSError:
                    pass
            resume.file = file_obj
            resume.original_filename = file_obj.name
            resume.file_size = file_obj.size
            resume.storage_path = f"resumes/{profile.id}/{file_obj.name}"
            resume.save()

        return Response(ResumeSerializer(resume).data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    def get(self, request):
        user = request.user
        if user.role != 'candidato':
            raise PermissionDenied("Apenas candidatos podem consultar seus próprios currículos.")
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        try:
            resume = Resume.objects.get(candidate=profile)
            return Response(ResumeSerializer(resume).data)
        except Resume.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)

class ResumeDownloadView(APIView):
    """Download autenticado e com controle estrito de permissões (Candidato dono ou Empresa com candidatura ativa)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, resume_id):
        resume = get_object_or_404(Resume, id=resume_id)
        user = request.user

        # 1. Se o requisitante for o próprio candidato dono do currículo
        if user == resume.candidate.user:
            return self._serve_file(resume)

        # 2. Se for uma empresa, verifica se o candidato se candidatou a uma vaga daquela empresa
        if user.role == 'empresa':
            from applications.models import Application
            has_application = Application.objects.filter(
                candidate=resume.candidate,
                job__company__owner=user
            ).exclude(status='retirada').exists()

            if has_application:
                return self._serve_file(resume)

        raise PermissionDenied("Acesso negado. Apenas o candidato ou empresas com candidatura ativa têm acesso a este currículo.")

    def _serve_file(self, resume):
        if not resume.file:
            raise Http404("Arquivo físico não encontrado.")
        response = FileResponse(resume.file.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{resume.original_filename}"'
        return response
