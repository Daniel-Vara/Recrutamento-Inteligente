
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("apps.jobs.urls")),
    path("candidato/", include("apps.candidates.urls")),
    path("candidaturas/", include("apps.applications.urls")),
    path("empresa/", include("apps.companies.urls")),
    path("contas/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.api.urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/v1/docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
]
