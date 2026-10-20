from django.db.models import Q
from django.utils import timezone
from django.views.generic import DetailView, ListView

from .models import Job


class PublicJobListView(ListView):
    model = Job
    template_name = "jobs/job_list.html"
    context_object_name = "jobs"
    paginate_by = 10

    def get_queryset(self):
        queryset = Job.objects.filter(status=Job.Status.PUBLISHED).select_related("company")
        queryset = queryset.filter(
            Q(application_deadline__isnull=True)
            | Q(application_deadline__gte=timezone.localdate())
        )
        query = self.request.GET.get("q", "").strip()[:100]
        city = self.request.GET.get("city", "").strip()[:100]
        skill = self.request.GET.get("skill", "").strip()[:80]
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
        }.get(self.request.GET.get("sort", "newest"), "-created_at")
        return queryset.distinct().order_by(ordering, "pk")


class PublicJobDetailView(DetailView):
    model = Job
    template_name = "jobs/job_detail.html"
    context_object_name = "job"

    def get_queryset(self):
        today = timezone.localdate()
        return Job.objects.filter(status=Job.Status.PUBLISHED).filter(
            Q(application_deadline__isnull=True) | Q(application_deadline__gte=today)
        ).select_related("company").prefetch_related("requirements__skill")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        context["already_applied"] = (
            user.is_authenticated
            and self.object.applications.filter(candidate__user=user).exists()
        )
        return context
