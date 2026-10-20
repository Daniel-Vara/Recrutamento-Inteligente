from django.urls import path

from . import views

app_name = "candidates"

urlpatterns = [
    path("painel/", views.dashboard, name="dashboard"),
    path("perfil/", views.edit_profile, name="profile"),
    path("curriculos/enviar/", views.upload_resume, name="resume_upload"),
    path("curriculos/<int:resume_id>/baixar/", views.download_resume, name="resume_download"),
]
