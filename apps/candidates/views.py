from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.db import transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from apps.applications.models import Application
from apps.companies.models import CompanyMembership
from apps.jobs.recommendations import recommend_jobs_for

from .forms import CandidateProfileForm, ResumeUploadForm
from .models import CandidateProfile, Resume


@login_required
def dashboard(request):
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    applications = (
        Application.objects.filter(candidate=profile)
        .select_related("job", "job__company")
        .order_by("-applied_at")
    )
    counts = {
        entry["status"]: entry["total"]
        for entry in applications.values("status").annotate(total=Count("id"))
    }
    application_counts = [
        {"status": label, "total": counts[status]}
        for status, label in Application.Status.choices
        if status in counts
    ]
    return render(
        request,
        "candidates/dashboard.html",
        {
            "profile": profile,
            "applications": applications,
            "application_total": applications.count(),
            "application_counts": application_counts,
            "recommended_jobs": recommend_jobs_for(profile)[:5],
            "active_resume": profile.resumes.filter(is_active=True).first(),
        },
    )


@login_required
def edit_profile(request):
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    form = CandidateProfileForm(
        request.POST or None, instance=profile, user=request.user
    )
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Seu perfil foi atualizado.")
        return redirect("candidates:dashboard")
    return render(request, "candidates/profile_form.html", {"form": form})


@login_required
@require_POST
def upload_resume(request):
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    form = ResumeUploadForm(request.POST, request.FILES)
    if form.is_valid():
        with transaction.atomic():
            profile.resumes.filter(is_active=True).update(is_active=False)
            Resume.objects.create(profile=profile, file=form.cleaned_data["file"])
        messages.success(request, "Seu currículo foi enviado com segurança.")
    else:
        errors = form.errors.get("file", ["Não foi possível enviar o currículo."])
        messages.error(request, " ".join(errors))
    return redirect("candidates:dashboard")


@login_required
def download_resume(request, resume_id):
    resume = get_object_or_404(
        Resume.objects.select_related("profile__user"), pk=resume_id
    )
    is_owner = resume.profile.user_id == request.user.pk
    is_company_authorized = CompanyMembership.objects.filter(
        user=request.user,
        is_active=True,
        company__jobs__applications__resume=resume,
    ).exists()
    if not (is_owner or request.user.is_superuser or is_company_authorized):
        raise Http404
    return FileResponse(
        resume.file.open("rb"),
        as_attachment=True,
        filename="curriculo.pdf",
        content_type="application/pdf",
    )
