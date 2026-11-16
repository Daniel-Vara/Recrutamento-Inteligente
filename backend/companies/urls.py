from django.urls import path
from applications.views import CompanyApplicationsView, JobCandidatesRankingView
from .views import CompanyProfileView, CompanyVisibleCandidatesView

urlpatterns = [
    path('profile/', CompanyProfileView.as_view(), name='company_profile'),
    path('candidates/', CompanyVisibleCandidatesView.as_view(), name='company_visible_candidates'),
    path('applications/', CompanyApplicationsView.as_view(), name='company_applications'),
    path('jobs/<uuid:job_id>/candidates/', JobCandidatesRankingView.as_view(), name='job_candidates_ranking'),
]
