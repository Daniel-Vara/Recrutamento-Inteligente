from django.contrib import admin
from .models import Application, ApplicationHistory


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['id', 'candidate', 'job', 'status', 'applied_at', 'updated_at']
    list_filter = ['status', 'applied_at']
    search_fields = ['candidate__user__full_name', 'job__title']
    raw_id_fields = ['job', 'candidate']


@admin.register(ApplicationHistory)
class ApplicationHistoryAdmin(admin.ModelAdmin):
    list_display = ['application', 'previous_status', 'new_status', 'changed_by', 'created_at']
    list_filter = ['new_status']
    search_fields = ['application__candidate__user__full_name']
