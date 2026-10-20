from django.urls import path

from . import views

app_name = "companies"

urlpatterns = [
    path("painel/", views.dashboard, name="dashboard"),
    path("nova/", views.create_company, name="create"),
    path("<int:company_id>/editar/", views.edit_company, name="edit"),
    path("<int:company_id>/vagas/nova/", views.job_create, name="job_create"),
    path("<int:company_id>/vagas/<int:job_id>/editar/", views.job_edit, name="job_edit"),
    path("<int:company_id>/vagas/<int:job_id>/candidatos/", views.job_applicants, name="job_applicants"),
    path("<int:company_id>/vagas/<int:job_id>/recomendacoes/", views.job_recommendations, name="job_recommendations"),
    path("<int:company_id>/vagas/<int:job_id>/candidatos/<int:application_id>/status/", views.update_candidate_status, name="application_status"),
    path(
        "<int:company_id>/vagas/<int:job_id>/<str:action>/",
        views.change_job_status,
        name="job_status",
    ),
]
