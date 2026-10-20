from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from apps.applications.models import Application
from apps.applications.services import ApplicationError, update_application_status
from apps.candidates.models import CandidateProfile
from apps.jobs.models import Job
from apps.jobs.recommendations import calculate_compatibility
from apps.jobs.services import JobError, transition_job

from .forms import CompanyForm
from .models import Company, CompanyMembership


@login_required
def dashboard(request):
    companies = Company.objects.filter(
        memberships__user=request.user, memberships__is_active=True
    ).annotate(
        published_jobs=Count("jobs", filter=Q(jobs__status="published"), distinct=True),
        closed_jobs=Count("jobs", filter=Q(jobs__status__in=("closed", "archived")), distinct=True),
        application_total=Count("jobs__applications", distinct=True),
    ).prefetch_related("jobs").distinct().order_by("name")
    company_ids = companies.values_list("pk", flat=True)
    status_counts = (
        Application.objects.filter(job__company_id__in=company_ids)
        .values("status")
        .annotate(total=Count("id"))
    )
    counts = {entry["status"]: entry["total"] for entry in status_counts}
    application_counts = [
        {"status": label, "total": counts[status]}
        for status, label in Application.Status.choices
        if status in counts
    ]
    return render(
        request,
        "companies/dashboard.html",
        {"companies": companies, "application_counts": application_counts},
    )


@login_required
def create_company(request):
    form = CompanyForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            company = form.save()
            CompanyMembership.objects.create(
                user=request.user,
                company=company,
                role=CompanyMembership.Role.OWNER,
            )
        messages.success(request, "Empresa cadastrada.")
        return redirect("companies:dashboard")
    return render(request, "companies/company_form.html", {"form": form})


def _managed_company(request, company_id):
    if request.user.is_superuser:
        return get_object_or_404(Company, pk=company_id)
    return get_object_or_404(
        Company.objects.filter(
            memberships__user=request.user,
            memberships__is_active=True,
        ).distinct(),
        pk=company_id,
    )


@login_required
def edit_company(request, company_id):
    company = _managed_company(request, company_id)
    form = CompanyForm(request.POST or None, instance=company)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Dados da empresa atualizados.")
        return redirect("companies:dashboard")
    return render(request, "companies/company_form.html", {"form": form, "company": company})


@login_required
def job_create(request, company_id):
    company = _managed_company(request, company_id)
    from apps.jobs.forms import JobForm
    from apps.jobs.services import set_job_requirements

    form = JobForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        job = form.save(commit=False)
        job.company = company
        job.save()
        set_job_requirements(job, form.cleaned_data["parsed_requirements"])
        messages.success(request, "Rascunho da vaga criado.")
        return redirect("companies:dashboard")
    return render(request, "jobs/job_form.html", {"form": form, "company": company})


@login_required
def job_edit(request, company_id, job_id):
    company = _managed_company(request, company_id)
    from apps.jobs.forms import JobForm

    job = get_object_or_404(Job, pk=job_id, company=company)
    form = JobForm(request.POST or None, instance=job)
    if request.method == "POST" and form.is_valid():
        from apps.jobs.services import set_job_requirements

        job = form.save()
        set_job_requirements(job, form.cleaned_data["parsed_requirements"])
        messages.success(request, "Vaga atualizada.")
        return redirect("companies:dashboard")
    return render(request, "jobs/job_form.html", {"form": form, "company": company, "job": job})


@login_required
@require_POST
def change_job_status(request, company_id, job_id, action):
    company = _managed_company(request, company_id)
    job = get_object_or_404(Job, pk=job_id, company=company)
    targets = {
        "publish": Job.Status.PUBLISHED,
        "close": Job.Status.CLOSED,
        "archive": Job.Status.ARCHIVED,
    }
    if action not in targets:
        messages.error(request, "Essa mudança de status não é permitida.")
        return redirect("companies:dashboard")
    try:
        job = transition_job(user=request.user, job=job, target_status=targets[action])
    except JobError as exc:
        messages.error(request, str(exc))
        return redirect("companies:dashboard")
    message = f"Vaga {job.get_status_display().lower()}."
    messages.success(request, message)
    return redirect("companies:dashboard")


@login_required
def job_applicants(request, company_id, job_id):
    company = _managed_company(request, company_id)
    job = get_object_or_404(Job, pk=job_id, company=company)
    applications = (
        Application.objects.filter(job=job)
        .select_related("candidate__user")
        .prefetch_related("candidate__skills__skill")
        .order_by("-applied_at")
    )
    return render(
        request,
        "companies/job_applicants.html",
        {"company": company, "job": job, "applications": applications},
    )


@login_required
def job_recommendations(request, company_id, job_id):
    company = _managed_company(request, company_id)
    job = get_object_or_404(Job, pk=job_id, company=company)
    profiles = (
        CandidateProfile.objects.filter(user__is_active=True, is_searchable=True)
        .exclude(city="")
        .exclude(summary="")
        .prefetch_related("skills__skill")
        .select_related("user")
    )
    recommendations = []
    for profile in profiles:
        compatibility = calculate_compatibility(profile, job)
        if compatibility.score is not None:
            recommendations.append((profile, compatibility))
    recommendations.sort(key=lambda row: (row[1].compatible, row[1].score), reverse=True)
    return render(
        request,
        "companies/job_recommendations.html",
        {"company": company, "job": job, "recommendations": recommendations},
    )


@login_required
@require_POST
def update_candidate_status(request, company_id, job_id, application_id):
    company = _managed_company(request, company_id)
    application = get_object_or_404(
        Application.objects.filter(job__company=company, job_id=job_id),
        pk=application_id,
    )
    new_status = request.POST.get("status", "")
    try:
        update_application_status(
            user=request.user,
            application_id=application.pk,
            new_status=new_status,
            note=request.POST.get("note", ""),
        )
    except ApplicationError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, "Status da candidatura atualizado.")
    return redirect("companies:job_applicants", company_id=company.pk, job_id=job_id)
