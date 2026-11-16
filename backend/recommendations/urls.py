from django.urls import path
from .views import (
    CandidateDashboardView,
    CompanyDashboardView,
    RecommendedJobsView,
)

urlpatterns = [
    path('recommendations/', RecommendedJobsView.as_view(), name='recommended_jobs'),
    path('dashboards/candidate/', CandidateDashboardView.as_view(), name='candidate_dashboard'),
    path('dashboards/company/', CompanyDashboardView.as_view(), name='company_dashboard'),
]
