from rest_framework import serializers
from accounts.serializers import UserSerializer
from candidates.serializers import CandidateProfileSerializer
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(read_only=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Company
        fields = [
            'id',
            'owner_id',
            'owner',
            'name',
            'description',
            'city',
            'website',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner_id', 'created_at', 'updated_at']


class VisibleCandidateSerializer(CandidateProfileSerializer):
    compatibility = serializers.SerializerMethodField()

    class Meta(CandidateProfileSerializer.Meta):
        fields = CandidateProfileSerializer.Meta.fields + ['compatibility']

    def get_compatibility(self, obj):
        return self.context.get('compatibility_map', {}).get(str(obj.id))
