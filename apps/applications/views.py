from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.views.decorators.http import require_POST

from .services import ApplicationError, apply_to_job, withdraw_application


@login_required
@require_POST
def apply(request, job_id):
    try:
        apply_to_job(user=request.user, job_id=job_id)
    except ApplicationError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, "Sua candidatura foi enviada.")
    return redirect("jobs:detail", pk=job_id)


@login_required
@require_POST
def withdraw(request, application_id):
    try:
        withdraw_application(user=request.user, application_id=application_id)
    except ApplicationError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, "Sua candidatura foi retirada.")
    return redirect("candidates:dashboard")
