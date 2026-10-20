from django.contrib import admin

from .models import Job, JobRequirement


class JobRequirementInline(admin.TabularInline):
    model = JobRequirement
    extra = 0


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "city", "status", "application_deadline")
    list_filter = ("status", "work_mode", "area")
    search_fields = ("title", "area", "company__name", "city")
    inlines = (JobRequirementInline,)
