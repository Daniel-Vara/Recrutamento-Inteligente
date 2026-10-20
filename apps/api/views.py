from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import OpenApiParameter, extend_schema
from drf_spectacular.types import OpenApiTypes

from apps.applications.models import Application
from apps.applications.services import ApplicationError, apply_to_job, update_application_status, withdraw_application
from apps.candidates.models import CandidateProfile
from apps.companies.models import Company, CompanyMembership
from apps.jobs.models import Job
from apps.jobs.recommendations import calculate_compatibility, recommend_jobs_for
from apps.jobs.services import JobError, transition_job

from .serializers import (
    ApplicationCollectionSerializer,
    ApplicationSerializer,
    CandidateRecommendationSerializer,
    CompanySerializer,
    CompanyCollectionSerializer,
    JobSerializer,
    JobCollectionSerializer,
    JobRecommendationSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ReportSummarySerializer,
    TokenLoginSerializer,
)


User = get_user_model()


def _paginated_response(request, queryset, serializer_class):
    paginator = PageNumberPagination()
    paginator.page_size = 10
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(serializer_class(page, many=True).data)


@extend_schema(request=RegisterSerializer, responses={201: OpenApiTypes.OBJECT}, operation_id="registerAccount")
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    CandidateProfile.objects.create(user=user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"user_id": user.pk, "email": user.email, "token": token.key},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(request=TokenLoginSerializer, responses={200: OpenApiTypes.OBJECT}, operation_id="obtainApiToken")
@api_view(["POST"])
@permission_classes([AllowAny])
def token_login(request):
    serializer = TokenLoginSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data["user"]
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user_id": user.pk, "email": user.email})


@extend_schema(request={"PATCH": ProfileSerializer}, responses=ProfileSerializer)
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def my_profile(request):
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    if request.method == "PATCH":
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = ProfileSerializer(profile)
    return Response(serializer.data)


@extend_schema(methods=["GET"], responses=CompanyCollectionSerializer, operation_id="listMyCompanies")
@extend_schema(methods=["POST"], request=CompanySerializer, responses=CompanySerializer, operation_id="createCompany")
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def companies(request):
    if request.method == "GET":
        queryset = Company.objects.filter(
            memberships__user=request.user, memberships__is_active=True
        ).distinct().order_by("name")
        return _paginated_response(request, queryset, CompanySerializer)
    serializer = CompanySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        company = serializer.save()
        CompanyMembership.objects.create(
            user=request.user, company=company, role=CompanyMembership.Role.OWNER
        )
    return Response(CompanySerializer(company).data, status=status.HTTP_201_CREATED)


def _company_for_user(request, company_id):
    if request.user.is_superuser:
        return get_object_or_404(Company, pk=company_id)
    return get_object_or_404(
        Company.objects.filter(memberships__user=request.user, memberships__is_active=True),
        pk=company_id,
    )


@extend_schema(methods=["GET"], responses=CompanySerializer, operation_id="retrieveMyCompany")
@extend_schema(methods=["PATCH"], request=CompanySerializer, responses=CompanySerializer, operation_id="updateMyCompany")
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def company_detail(request, company_id):
    company = _company_for_user(request, company_id)
    if request.method == "PATCH":
        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = CompanySerializer(company)
    return Response(serializer.data)


@extend_schema(
    methods=["GET"],
    responses=JobCollectionSerializer,
    operation_id="listJobs",
    parameters=[
        OpenApiParameter("q", str, OpenApiParameter.QUERY, description="Título ou área"),
        OpenApiParameter("city", str, OpenApiParameter.QUERY),
        OpenApiParameter("skill", str, OpenApiParameter.QUERY),
        OpenApiParameter("sort", str, OpenApiParameter.QUERY, enum=("newest", "title", "deadline")),
        OpenApiParameter("page", int, OpenApiParameter.QUERY),
    ],
)
@extend_schema(methods=["POST"], request=JobSerializer, responses=JobSerializer, operation_id="createJob")
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def job_list(request):
    queryset = Job.objects.filter(status=Job.Status.PUBLISHED).filter(
        Q(application_deadline__isnull=True)
        | Q(application_deadline__gte=timezone.localdate())
    ).select_related("company")
    query = request.query_params.get("q", "").strip()[:100]
    city = request.query_params.get("city", "").strip()[:100]
    skill = request.query_params.get("skill", "").strip()[:80]
    if query:
        queryset = queryset.filter(Q(title__icontains=query) | Q(area__icontains=query))
    if city:
        queryset = queryset.filter(city__icontains=city)
    if skill:
        queryset = queryset.filter(requirements__skill__name__icontains=skill)
    ordering = {
        "newest": "-created_at",
        "title": "title",
        "deadline": "application_deadline",
    }.get(request.query_params.get("sort", "newest"))
    if ordering is None:
        return Response(
            {"detail": "Ordenação inválida. Use newest, title ou deadline."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    queryset = queryset.distinct().order_by(ordering, "pk")
    if request.method == "GET":
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(JobSerializer(page, many=True).data)
    if not request.user.is_authenticated:
        return Response({"detail": "Autenticação necessária."}, status=status.HTTP_401_UNAUTHORIZED)
    serializer = JobSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    company = _company_for_user(request, serializer.validated_data["company"].pk)
    job = serializer.save(company=company)
    return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)


@extend_schema(request={"PATCH": JobSerializer}, responses=JobSerializer)
@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])
def job_detail(request, job_id):
    public_job = Job.objects.filter(status=Job.Status.PUBLISHED).filter(
        Q(application_deadline__isnull=True)
        | Q(application_deadline__gte=timezone.localdate())
    ).filter(pk=job_id)
    job = public_job.first()
    if job is None and request.user.is_authenticated:
        job = Job.objects.filter(pk=job_id).first()
        if job and not (
            request.user.is_superuser
            or CompanyMembership.objects.filter(
                user=request.user,
                company_id=job.company_id,
                is_active=True,
            ).exists()
        ):
            job = None
    if job is None:
        return Response({"detail": "Vaga não encontrada."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "PATCH":
        if not request.user.is_authenticated:
            return Response({"detail": "Autenticação necessária."}, status=status.HTTP_401_UNAUTHORIZED)
        _company_for_user(request, job.company_id)
        serializer = JobSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=job.company)
    else:
        serializer = JobSerializer(job)
    return Response(serializer.data)


@extend_schema(request=None, responses={200: JobSerializer, 400: OpenApiTypes.OBJECT})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def job_action(request, job_id, action):
    job = get_object_or_404(Job, pk=job_id)
    _company_for_user(request, job.company_id)
    target_status = {
        "publish": Job.Status.PUBLISHED,
        "close": Job.Status.CLOSED,
    }.get(action)
    if target_status is None:
        return Response({"detail": "Transição de status não permitida."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        job = transition_job(user=request.user, job=job, target_status=target_status)
    except JobError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(JobSerializer(job).data)


@extend_schema(responses=ApplicationCollectionSerializer, operation_id="applicationCollection")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def application_list(request):
    profile = CandidateProfile.objects.filter(user=request.user).first()
    queryset = Application.objects.none()
    if profile:
        queryset = Application.objects.filter(candidate=profile)
    company_ids = CompanyMembership.objects.filter(
        user=request.user, is_active=True
    ).values_list("company_id", flat=True)
    queryset = (queryset | Application.objects.filter(job__company_id__in=company_ids)).distinct()
    queryset = queryset.select_related("job", "job__company", "candidate__user").order_by("-applied_at")
    return _paginated_response(request, queryset, ApplicationSerializer)


@extend_schema(request=None, responses={200: ApplicationSerializer, 201: ApplicationSerializer, 400: OpenApiTypes.OBJECT})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply(request, job_id):
    try:
        application = apply_to_job(user=request.user, job_id=job_id)
    except ApplicationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


@extend_schema(request=None, responses={200: ApplicationSerializer, 400: OpenApiTypes.OBJECT})
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def withdraw(request, application_id):
    try:
        application = withdraw_application(user=request.user, application_id=application_id)
    except ApplicationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ApplicationSerializer(application).data)


@extend_schema(request=OpenApiTypes.OBJECT, responses=ApplicationSerializer, operation_id="updateApplicationStatus")
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def application_status(request, application_id):
    try:
        application = update_application_status(
            user=request.user,
            application_id=application_id,
            new_status=request.data.get("status", ""),
            note=request.data.get("note", ""),
        )
    except ApplicationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ApplicationSerializer(application).data)


@extend_schema(responses=JobRecommendationSerializer(many=True), operation_id="recommendedJobs")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_recommendations(request):
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    results = []
    for job, match in recommend_jobs_for(profile):
        results.append({"job": JobSerializer(job).data, "compatibility": match.__dict__})
    return Response(results)


@extend_schema(responses=CandidateRecommendationSerializer(many=True), operation_id="recommendedCandidates")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def candidate_recommendations(request, job_id):
    job = get_object_or_404(Job, pk=job_id)
    _company_for_user(request, job.company_id)
    results = []
    profiles = (
        CandidateProfile.objects.filter(user__is_active=True, is_searchable=True)
        .exclude(city="")
        .exclude(summary="")
        .prefetch_related("skills__skill")
        .select_related("user")
    )
    for profile in profiles:
        match = calculate_compatibility(profile, job)
        if match.score is not None:
            results.append({
                "candidate": {
                    "id": profile.pk,
                    "name": profile.full_name,
                    "city": profile.city,
                    "summary": profile.summary,
                },
                "compatibility": match.__dict__,
            })
    return Response(sorted(results, key=lambda item: item["compatibility"]["score"], reverse=True))


@extend_schema(responses=ReportSummarySerializer, operation_id="reportSummary")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_summary(request):
    company_ids = CompanyMembership.objects.filter(
        user=request.user, is_active=True
    ).values_list("company_id", flat=True)
    jobs = Job.objects.filter(company_id__in=company_ids)
    applications = Application.objects.filter(job__in=jobs)
    return Response({
        "published_jobs": jobs.filter(status=Job.Status.PUBLISHED).count(),
        "closed_jobs": jobs.filter(status__in=(Job.Status.CLOSED, Job.Status.ARCHIVED)).count(),
        "applications": applications.count(),
        "applications_by_status": dict(
            applications.values_list("status").annotate(total=Count("id"))
        ),
    })
