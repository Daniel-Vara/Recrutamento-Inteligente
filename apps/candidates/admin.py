from django.contrib import admin

from .models import CandidateProfile, CandidateSkill, Skill


class CandidateSkillInline(admin.TabularInline):
    model = CandidateSkill
    extra = 0


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "city", "created_at", "updated_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "city")
    inlines = (CandidateSkillInline,)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "normalized_name")
    search_fields = ("name",)

