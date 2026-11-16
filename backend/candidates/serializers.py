from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import CandidateProfile, CandidateSkill, Resume, Skill


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'normalized_name', 'created_at']
        read_only_fields = ['id', 'normalized_name', 'created_at']


class CandidateSkillSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)
    candidate_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = CandidateSkill
        fields = [
            'id',
            'candidate',
            'candidate_id',
            'skill',
            'skill_id',
            'proficiency_level',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'candidate', 'created_at', 'updated_at']

    def create(self, validated_data):
        candidate = self.context['candidate']
        skill_id = validated_data.pop('skill_id')
        proficiency_level = validated_data.get('proficiency_level', 'intermediario')
        obj, _ = CandidateSkill.objects.update_or_create(
            candidate=candidate,
            skill_id=skill_id,
            defaults={'proficiency_level': proficiency_level},
        )
        return obj


class ResumeSerializer(serializers.ModelSerializer):
    candidate_id = serializers.UUIDField(read_only=True)
    download_url = serializers.SerializerMethodField()
    storage_path = serializers.CharField(read_only=True)
    original_filename = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)

    class Meta:
        model = Resume
        fields = [
            'id',
            'candidate',
            'candidate_id',
            'storage_path',
            'original_filename',
            'file_size',
            'download_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        return f'/api/v1/candidates/resume/download/{obj.id}/'


class CandidateProfileSerializer(serializers.ModelSerializer):
    profile = UserSerializer(source='user', read_only=True)
    user_id = serializers.UUIDField(read_only=True)
    skills = CandidateSkillSerializer(source='candidate_skills', many=True, read_only=True)
    resume = ResumeSerializer(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = [
            'id',
            'user_id',
            'profile',
            'professional_summary',
            'is_visible',
            'skills',
            'resume',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'created_at', 'updated_at']
