from django.urls import path
from .views import (
    ApplyToJobView,
    CandidateApplicationListView,
    CompanyApplicationsView,
    JobCandidatesRankingView,
    UpdateApplicationStatusView,
    WithdrawApplicationView,
)

urlpatterns = [
    # Candidato
    path('', CandidateApplicationListView.as_view(), name='candidate_applications'),
    path('apply/<uuid:job_id>/', ApplyToJobView.as_view(), name='apply_to_job'),
    path('<uuid:pk>/withdraw/', WithdrawApplicationView.as_view(), name='withdraw_application'),

    # Empresa
    path('<uuid:pk>/status/', UpdateApplicationStatusView.as_view(), name='update_application_status'),
]
