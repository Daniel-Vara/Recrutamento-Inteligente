from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'city', 'phone', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Bloqueia alteração do papel do usuário
        validated_data.pop('role', None)
        validated_data.pop('email', None)
        return super().update(instance, validated_data)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Anexa informações essenciais do usuário no payload da resposta do login
        data['user'] = UserSerializer(self.user).data
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    company_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'full_name', 'role', 'city', 'phone', 'company_name']
        read_only_fields = ['id']

    def create(self, validated_data):
        company_name = validated_data.pop('company_name', None)
        password = validated_data.pop('password')
        role = validated_data.get('role', 'candidato')

        user = User.objects.create_user(password=password, **validated_data)

        # Se for candidato, inicializa candidate_profiles
        if role == 'candidato':
            from candidates.models import CandidateProfile
            CandidateProfile.objects.get_or_create(user=user)

        # Se for empresa, inicializa companies
        elif role == 'empresa':
            from companies.models import Company
            c_name = company_name or user.full_name
            Company.objects.get_or_create(
                owner=user,
                defaults={'name': c_name, 'city': user.city or 'São Paulo'}
            )

        return user

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
