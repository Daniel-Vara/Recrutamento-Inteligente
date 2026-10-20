from django.contrib import admin

from .models import Company, CompanyMembership


class MembershipInline(admin.TabularInline):
    model = CompanyMembership
    extra = 0


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "created_at")
    search_fields = ("name", "city")
    inlines = (MembershipInline,)


@admin.register(CompanyMembership)
class CompanyMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("user__email", "company__name")
