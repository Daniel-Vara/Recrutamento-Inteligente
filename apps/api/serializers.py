from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field

from apps.applications.models import Application
from apps.candidates.models import CandidateProfile, CandidateSkill
from apps.candidates.services import set_candidate_skills
from apps.companies.models import Company, CompanyMembership
from apps.jobs.models import Job
from apps.jobs.services import set_job_requirements


User = get_user_model()


class CandidateSkillSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    level = serializers.ChoiceField(choices=CandidateSkill.Level.choices)

    def to_representation(self, instance):
        return {"name": instance.skill.name, "level": instance.level}


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "password")

    def validate_email(self, value):
        value = value.strip().casefold()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class TokenLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().casefold(),
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("E-mail ou senha inválidos.")
        attrs["user"] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)
    skills = CandidateSkillSerializer(many=True, required=False)

    class Meta:
        model = CandidateProfile
        fields = ("email", "first_name", "last_name", "city", "summary", "skills", "is_searchable", "created_at", "updated_at")
        read_only_fields = ("created_at", "updated_at")

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        skills = validated_data.pop("skills", None)
        for field, value in user_data.items():
            setattr(instance.user, field, value.strip())
        if user_data:
            instance.user.save(update_fields=tuple(user_data))
        instance = super().update(instance, validated_data)
        if skills is not None:
            set_candidate_skills(instance, skills)
        return instance


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "tax_id", "description", "city", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class JobRequirementSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    is_required = serializers.BooleanField(default=True, required=False)
    weight = serializers.IntegerField(min_value=1, max_value=100, default=1, required=False)

    def validate_name(self, value):
        return " ".join(value.split())

    def to_representation(self, instance):
        return {
            "name": instance.skill.name,
            "is_required": instance.is_required,
            "weight": instance.weight,
        }


class JobSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    status = serializers.CharField(read_only=True)
    requirements = JobRequirementSerializer(many=True, required=False)

    class Meta:
        model = Job
        fields = (
            "id", "company", "company_name", "title", "area", "description",
            "city", "work_mode", "application_deadline", "status", "created_at", "requirements",
        )
        read_only_fields = ("id", "company_name", "status", "created_at")

    def validate_requirements(self, value):
        names = [item["name"].casefold() for item in value]
        if len(names) > 30:
            raise serializers.ValidationError("Informe no máximo 30 competências.")
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Não repita competências na mesma vaga.")
        return value

    def create(self, validated_data):
        requirements = validated_data.pop("requirements", [])
        job = Job.objects.create(**validated_data)
        set_job_requirements(job, requirements)
        return job

    def update(self, instance, validated_data):
        requirements = validated_data.pop("requirements", None)
        instance = super().update(instance, validated_data)
        if requirements is not None:
            set_job_requirements(instance, requirements)
        return instance


class ApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    company_name = serializers.CharField(source="job.company.name", read_only=True)
    candidate_name = serializers.CharField(source="candidate.full_name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    resume_available = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = (
            "id", "job", "job_title", "company_name", "candidate_name",
            "status", "status_label", "applied_at", "updated_at", "resume_available",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_resume_available(self, instance) -> bool:
        return instance.resume_id is not None


class CompatibilitySerializer(serializers.Serializer):
    score = serializers.FloatField(allow_null=True)
    matched_skills = serializers.ListField(child=serializers.CharField())
    missing_skills = serializers.ListField(child=serializers.CharField())
    missing_required_skills = serializers.ListField(child=serializers.CharField())
    compatible = serializers.BooleanField()
    explanation = serializers.CharField()


class JobRecommendationSerializer(serializers.Serializer):
    job = JobSerializer()
    compatibility = CompatibilitySerializer()


class JobCollectionSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = JobSerializer(many=True)


class CompanyCollectionSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = CompanySerializer(many=True)


class ApplicationCollectionSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = ApplicationSerializer(many=True)


class CandidateRecommendationSerializer(serializers.Serializer):
    candidate = serializers.DictField()
    compatibility = CompatibilitySerializer()


class ReportSummarySerializer(serializers.Serializer):
    published_jobs = serializers.IntegerField()
    closed_jobs = serializers.IntegerField()
    applications = serializers.IntegerField()
    applications_by_status = serializers.DictField(child=serializers.IntegerField())
