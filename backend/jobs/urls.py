from django.urls import path
from .views import (
    CompanyJobDetailView,
    CompanyJobListCreateView,
    PublicJobDetailView,
    PublicJobListView,
)

urlpatterns = [
    # Rotas públicas
    path('', PublicJobListView.as_view(), name='public_job_list'),
    path('<uuid:pk>/', PublicJobDetailView.as_view(), name='public_job_detail'),

    # Rotas autenticadas da empresa (GET = listagem própria + POST = criar)
    path('my-jobs/', CompanyJobListCreateView.as_view(), name='company_job_list_create'),

    # Rota de gestão de vaga específica (PUT/PATCH/DELETE pela empresa)
    path('my-jobs/<uuid:pk>/', CompanyJobDetailView.as_view(), name='company_job_detail'),
]
