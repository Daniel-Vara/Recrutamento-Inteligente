from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from candidates.views import SkillListCreateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/candidates/', include('candidates.urls')),
    path('api/v1/companies/', include('companies.urls')),
    path('api/v1/jobs/', include('jobs.urls')),
    path('api/v1/applications/', include('applications.urls')),
    path('api/v1/', include('recommendations.urls')),
    # Catálogo global de competências
    path('api/v1/skills/', SkillListCreateView.as_view(), name='skills_list'),
]

# Currículos NÃO são servidos via MEDIA_URL público.
# O download ocorre apenas nas views autenticadas de candidates.
