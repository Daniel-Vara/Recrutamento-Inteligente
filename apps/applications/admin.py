from django.contrib import admin

from .models import Application, ApplicationStatusHistory


class StatusHistoryInline(admin.TabularInline):
    model = ApplicationStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("previous_status", "new_status", "changed_by", "changed_at", "note")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("candidate", "job", "status", "applied_at")
    list_filter = ("status", "job__company")
    search_fields = ("candidate__user__email", "job__title", "job__company__name")
    inlines = (StatusHistoryInline,)
    readonly_fields = ("candidate", "job", "status", "applied_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ApplicationStatusHistory)
class ApplicationStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("application", "previous_status", "new_status", "changed_by", "changed_at")
    readonly_fields = ("application", "previous_status", "new_status", "changed_by", "changed_at", "note")
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
