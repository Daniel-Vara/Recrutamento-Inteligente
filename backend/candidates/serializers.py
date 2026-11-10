from rest_framework import serializers
from .models import Skill, CandidateProfile, CandidateSkill, Resume
from accounts.serializers import UserSerializer

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'normalized_name', 'created_at']
        read_only_fields = ['id', 'normalized_name', 'created_at']

class CandidateSkillSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = CandidateSkill
        fields = ['id', 'candidate', 'skill', 'skill_id', 'proficiency_level', 'created_at', 'updated_at']
        read_only_fields = ['id', 'candidate', 'created_at', 'updated_at']

    def create(self, validated_data):
        candidate = self.context['candidate']
        skill_id = validated_data.pop('skill_id')
        proficiency_level = validated_data.get('proficiency_level', 'intermediario')
        
        candidate_skill, _ = CandidateSkill.objects.update_or_create(
            candidate=candidate,
            skill_id=skill_id,
            defaults={'proficiency_level': proficiency_level}
        )
        return candidate_skill

class ResumeSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = ['id', 'candidate', 'original_filename', 'file_size', 'download_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'candidate', 'original_filename', 'file_size', 'download_url', 'created_at', 'updated_at']

    def get_download_url(self, obj):
        return f"/api/v1/candidates/resume/download/{obj.id}/"

class CandidateProfileSerializer(serializers.ModelSerializer):
    profile = UserSerializer(source='user', read_only=True)
    skills = CandidateSkillSerializer(source='candidate_skills', many=True, read_only=True)
    resume = ResumeSerializer(read_only=True)

    class Meta:
        model = CandidateProfile
        fields = ['id', 'user_id', 'profile', 'professional_summary', 'is_visible', 'skills', 'resume', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user_id', 'created_at', 'updated_at']
