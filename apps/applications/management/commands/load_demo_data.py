from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.applications.models import Application, ApplicationStatusHistory
from apps.candidates.models import CandidateProfile, CandidateSkill, Skill
from apps.candidates.services import set_candidate_skills
from apps.companies.models import Company, CompanyMembership
from apps.jobs.models import Job
from apps.jobs.services import set_job_requirements


SKILLS = ("Python", "Django", "PostgreSQL", "HTML", "CSS", "JavaScript")
JOB_DATA = (
    ("Desenvolvedor Python Júnior", "Tecnologia", 0, ("Python", "Django")),
    ("Analista de Dados", "Dados", 1, ("Python", "PostgreSQL")),
    ("Desenvolvedor Web", "Tecnologia", 2, ("HTML", "CSS")),
    ("Pessoa Desenvolvedora Backend", "Tecnologia", 0, ("Django", "PostgreSQL")),
    ("Desenvolvedor Front-end", "Tecnologia", 1, ("JavaScript", "CSS")),
    ("Assistente de Sistemas", "Tecnologia", 2, ("HTML", "PostgreSQL")),
    ("Engenheira de Software", "Tecnologia", 0, ("Python", "JavaScript")),
    ("Analista de Aplicações", "Tecnologia", 1, ("Django", "HTML")),
)
APPLICATION_STATUSES = (
    Application.Status.REVIEW,
    Application.Status.INTERVIEW,
    Application.Status.APPROVED,
    Application.Status.REJECTED,
    Application.Status.WITHDRAWN,
    Application.Status.RECEIVED,
)


class Command(BaseCommand):
    help = "Cria dados fictícios e repetíveis para demonstrar a plataforma."

    @transaction.atomic
    def handle(self, *args, **options):
        companies = []
        for number in range(1, 4):
            owner, created = User.objects.get_or_create(
                email=f"empresa{number}@example.invalid",
                defaults={"first_name": f"Responsável {number}", "is_active": True},
            )
            if created:
                owner.set_password("DemoPass123!")
                owner.save(update_fields=("password",))
            company, _ = Company.objects.get_or_create(
                name=f"Empresa Demonstração {number}",
                defaults={"city": ("São Paulo", "Curitiba", "Recife")[number - 1]},
            )
            CompanyMembership.objects.get_or_create(
                user=owner,
                company=company,
                defaults={"role": CompanyMembership.Role.OWNER, "is_active": True},
            )
            companies.append(company)

        skill_objects = {
            skill.name: skill for skill in (Skill.objects.get_or_create(name=name)[0] for name in SKILLS)
        }

        candidates = []
        for number in range(1, 11):
            user, created = User.objects.get_or_create(
                email=f"candidato{number:02}@example.invalid",
                defaults={
                    "first_name": f"Candidato {number}",
                    "last_name": "Demonstração",
                    "is_active": True,
                },
            )
            if created:
                user.set_password("DemoPass123!")
                user.save(update_fields=("password",))
            profile, _ = CandidateProfile.objects.get_or_create(
                user=user,
                defaults={
                    "city": ("São Paulo", "Curitiba", "Recife")[number % 3],
                    "summary": f"Profissional fictício com interesse em tecnologia ({number}).",
                    "is_searchable": True,
                },
            )
            chosen = (SKILLS[(number - 1) % len(SKILLS)], SKILLS[number % len(SKILLS)])
            set_candidate_skills(
                profile,
                [{"name": name, "level": (number % 4) + 1} for name in chosen],
            )
            candidates.append(profile)

        jobs = []
        for number, (title, area, company_index, requirement_names) in enumerate(JOB_DATA):
            job, _ = Job.objects.get_or_create(
                company=companies[company_index],
                title=title,
                defaults={
                    "area": area,
                    "description": f"Vaga fictícia para demonstração de {title.lower()}.",
                    "city": companies[company_index].city,
                    "work_mode": Job.WorkMode.HYBRID if number % 2 else Job.WorkMode.ONSITE,
                    "application_deadline": timezone.localdate() + timedelta(days=30),
                    "status": Job.Status.CLOSED if number == 7 else (
                        Job.Status.DRAFT if number == 6 else Job.Status.PUBLISHED
                    ),
                },
            )
            set_job_requirements(
                job,
                [
                    {
                        "name": skill_name,
                        "is_required": index == 0,
                        "weight": 3 if index == 0 else 1,
                    }
                    for index, skill_name in enumerate(requirement_names)
                ],
            )
            jobs.append(job)

        for index, profile in enumerate(candidates[:6]):
            job = jobs[index]
            application, created = Application.objects.get_or_create(
                candidate=profile,
                job=job,
                defaults={"status": Application.Status.RECEIVED},
            )
            target_status = APPLICATION_STATUSES[index]
            if created:
                ApplicationStatusHistory.objects.create(
                    application=application,
                    previous_status="",
                    new_status=Application.Status.RECEIVED,
                    changed_by=profile.user,
                    note="Candidatura fictícia criada para demonstração.",
                )
            if application.status != target_status:
                previous_status = application.status
                application.status = target_status
                application.save(update_fields=("status", "updated_at"))
                ApplicationStatusHistory.objects.create(
                    application=application,
                    previous_status=previous_status,
                    new_status=target_status,
                    changed_by=companies[index % len(companies)].memberships.filter(
                        is_active=True
                    ).first().user,
                    note="Status fictício para demonstração.",
                )

        self.stdout.write(
            self.style.SUCCESS("Dados fictícios carregados: 3 empresas, 8 vagas e 10 candidatos.")
        )
