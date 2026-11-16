from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from candidates.models import Skill
from candidates.serializers import SkillSerializer
from companies.serializers import CompanySerializer
from .models import Job, JobRequirement


class JobRequirementSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField()

    class Meta:
        model = JobRequirement
        fields = [
            'id',
            'job',
            'skill',
            'skill_id',
            'requirement_type',
            'minimum_level',
            'weight',
            'created_at',
        ]
        read_only_fields = ['id', 'job', 'created_at']


class JobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    requirements = JobRequirementSerializer(many=True, required=False)
    applications_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Job
        fields = [
            'id',
            'company',
            'company_id',
            'title',
            'description',
            'city',
            'area',
            'work_mode',
            'employment_type',
            'status',
            'published_at',
            'expires_at',
            'created_at',
            'updated_at',
            'requirements',
            'applications_count',
        ]
        read_only_fields = ['id', 'company', 'company_id', 'published_at', 'created_at', 'updated_at']

    def validate_requirements(self, value):
        skill_ids = [str(item.get('skill_id')) for item in value]
        if len(skill_ids) != len(set(skill_ids)):
            raise serializers.ValidationError('A vaga não pode repetir a mesma competência.')
        for item in value:
            weight = item.get('weight', 1)
            if weight < 1 or weight > 10:
                raise serializers.ValidationError('O peso de cada requisito deve estar entre 1 e 10.')
        return value

    def _sync_requirements(self, job, requirements):
        job.requirements.all().delete()
        for item in requirements:
            skill_id = item['skill_id']
            if not Skill.objects.filter(id=skill_id).exists():
                raise serializers.ValidationError({'requirements': 'Competência inválida.'})
            JobRequirement.objects.create(
                job=job,
                skill_id=skill_id,
                requirement_type=item['requirement_type'],
                minimum_level=item['minimum_level'],
                weight=item.get('weight', 1),
            )

    def _apply_publication(self, job, status_value):
        if status_value == 'publicada' and not job.published_at:
            job.published_at = timezone.now()
            job.save(update_fields=['published_at'])

    @transaction.atomic
    def create(self, validated_data):
        requirements = validated_data.pop('requirements', [])
        company = self.context['company']
        job = Job.objects.create(company=company, **validated_data)
        self._sync_requirements(job, requirements)
        self._apply_publication(job, job.status)
        return job

    @transaction.atomic
    def update(self, instance, validated_data):
        requirements = validated_data.pop('requirements', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if requirements is not None:
            self._sync_requirements(instance, requirements)
        self._apply_publication(instance, instance.status)
        return instance
