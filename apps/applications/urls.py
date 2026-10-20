from django.urls import path

from . import views

app_name = "applications"

urlpatterns = [
    path("vagas/<int:job_id>/candidatar/", views.apply, name="apply"),
    path("<int:application_id>/retirar/", views.withdraw, name="withdraw"),
]
