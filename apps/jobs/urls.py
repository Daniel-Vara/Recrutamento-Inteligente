from django.urls import path

from .views import PublicJobDetailView, PublicJobListView

app_name = "jobs"

urlpatterns = [
    path("", PublicJobListView.as_view(), name="list"),
    path("vagas/<int:pk>/", PublicJobDetailView.as_view(), name="detail"),
]
