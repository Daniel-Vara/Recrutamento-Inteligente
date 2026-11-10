from django.urls import path
from .views import (
    CandidateProfileView,
    CandidateSkillListCreateView,
    CandidateSkillDetailView,
    SkillListCreateView,
    ResumeUploadView,
    ResumeDownloadView
)

urlpatterns = [
    path('profile/', CandidateProfileView.as_view(), name='candidate_profile'),
    path('skills/', CandidateSkillListCreateView.as_view(), name='candidate_skills_list_create'),
    path('skills/<uuid:pk>/', CandidateSkillDetailView.as_view(), name='candidate_skills_detail'),
    path('resume/', ResumeUploadView.as_view(), name='candidate_resume'),
    path('resume/download/<uuid:resume_id>/', ResumeDownloadView.as_view(), name='candidate_resume_download'),
]
