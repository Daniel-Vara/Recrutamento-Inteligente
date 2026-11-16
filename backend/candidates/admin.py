from django.contrib import admin
from .models import CandidateProfile, CandidateSkill, Resume, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'normalized_name', 'created_at')
    search_fields = ('name', 'normalized_name')


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_visible', 'updated_at')
    list_filter = ('is_visible',)
    search_fields = ('user__email', 'user__full_name')


@admin.register(CandidateSkill)
class CandidateSkillAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'skill', 'proficiency_level')


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'original_filename', 'file_size', 'updated_at')
