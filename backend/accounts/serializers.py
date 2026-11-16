from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'city', 'phone', 'created_at', 'updated_at']
        read_only_fields = ['id', 'email', 'role', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        validated_data.pop('role', None)
        validated_data.pop('email', None)
        return super().update(instance, validated_data)


class MeSerializer(serializers.ModelSerializer):
    candidate_profile_id = serializers.SerializerMethodField()
    company_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'role',
            'city',
            'phone',
            'created_at',
            'updated_at',
            'candidate_profile_id',
            'company_id',
        ]
        read_only_fields = ['id', 'email', 'role', 'created_at', 'updated_at']

    def get_candidate_profile_id(self, obj):
        profile = getattr(obj, 'candidate_profile', None)
        return str(profile.id) if profile else None

    def get_company_id(self, obj):
        company = getattr(obj, 'company', None)
        return str(company.id) if company else None

    def update(self, instance, validated_data):
        validated_data.pop('role', None)
        validated_data.pop('email', None)
        return super().update(instance, validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'full_name', 'role', 'city', 'phone', 'company_name']
        read_only_fields = ['id']

    def validate_role(self, value):
        if value not in ('candidato', 'empresa'):
            raise serializers.ValidationError('Papel inválido.')
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get('role') == 'empresa' and not (attrs.get('company_name') or '').strip():
            raise serializers.ValidationError({'company_name': 'Informe o nome da organização.'})
        return attrs

    def create(self, validated_data):
        company_name = validated_data.pop('company_name', None)
        password = validated_data.pop('password')
        role = validated_data.get('role', 'candidato')
        user = User.objects.create_user(password=password, **validated_data)

        if role == 'candidato':
            from candidates.models import CandidateProfile
            CandidateProfile.objects.get_or_create(user=user)
        elif role == 'empresa':
            from companies.models import Company
            Company.objects.get_or_create(
                owner=user,
                defaults={
                    'name': (company_name or user.full_name).strip(),
                    'city': user.city or 'São Paulo',
                },
            )
        return user


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password(value)
        return value
