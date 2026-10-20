from django.urls import path
from . import views

app_name = "api_v1"

urlpatterns = [
    path("auth/register/", views.register, name="register"),
    path("auth/token/", views.token_login, name="token"),
    path("profiles/me/", views.my_profile, name="my_profile"),
    path("companies/", views.companies, name="companies"),
    path("companies/<int:company_id>/", views.company_detail, name="company_detail"),
    path("jobs/", views.job_list, name="jobs"),
    path("jobs/<int:job_id>/", views.job_detail, name="job_detail"),
    path("jobs/<int:job_id>/publish/", views.job_action, {"action": "publish"}, name="job_publish"),
    path("jobs/<int:job_id>/close/", views.job_action, {"action": "close"}, name="job_close"),
    path("applications/", views.application_list, name="applications"),
    path("jobs/<int:job_id>/apply/", views.apply, name="apply"),
    path("applications/<int:application_id>/withdraw/", views.withdraw, name="withdraw"),
    path("applications/<int:application_id>/status/", views.application_status, name="application_status"),
    path("recommendations/jobs/", views.job_recommendations, name="job_recommendations"),
    path("jobs/<int:job_id>/recommendations/candidates/", views.candidate_recommendations, name="candidate_recommendations"),
    path("reports/summary/", views.report_summary, name="report_summary"),
]
