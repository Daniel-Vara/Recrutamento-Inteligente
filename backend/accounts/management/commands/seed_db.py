import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from candidates.models import CandidateProfile, CandidateSkill, Skill
from companies.models import Company
from jobs.models import Job, JobRequirement
from applications.models import Application, ApplicationHistory

User = get_user_model()

SKILLS_SEED = [
    ('React', 'react'),
    ('Node.js', 'nodejs'),
    ('TypeScript', 'typescript'),
    ('JavaScript', 'javascript'),
    ('HTML/CSS', 'htmlcss'),
    ('PostgreSQL', 'postgresql'),
    ('Python', 'python'),
    ('Docker', 'docker'),
    ('Git', 'git'),
    ('UI/UX Design', 'uiuxdesign'),
    ('Tailwind CSS', 'tailwindcss'),
    ('APIs REST', 'apisrest'),
    ('Next.js', 'nextjs'),
    ('GraphQL', 'graphql'),
    ('Figma', 'figma'),
    ('Flutter', 'flutter'),
    ('Java', 'java'),
    ('Arquitetura Web', 'arquiteturaweb'),
]


class Command(BaseCommand):
    help = 'Popula o banco de dados com dados iniciais e usuários de demonstração (SENAI MVP).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando carga de dados iniciais...'))

        # 1. Competências
        skill_objs = {}
        for name, norm in SKILLS_SEED:
            skill, _ = Skill.objects.get_or_create(
                normalized_name=norm,
                defaults={'name': name},
            )
            skill_objs[norm] = skill
        self.stdout.write(self.style.SUCCESS(f'OK: {len(skill_objs)} competências cadastradas.'))

        # 2. Superusuário / Administrador
        admin_user = User.objects.filter(email='admin@appliety.local').first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email='admin@appliety.local',
                password='admin123',
                full_name='Administrador do Sistema',
            )
        self.stdout.write(self.style.SUCCESS('OK: Administrador (admin@appliety.local / admin123) configurado.'))

        # 3. Empresa Demo: Rafael Oliveira / ATLAS TECH
        company_user = User.objects.filter(email='rafael@atlastech.example.com').first()
        if not company_user:
            company_user = User.objects.create_user(
                email='rafael@atlastech.example.com',
                password='demo123456',
                full_name='Rafael Oliveira',
                role='empresa',
                city='São Paulo',
                phone='(11) 98888-1234',
            )
            company_user.set_password('demo123456')
            company_user.save()

        company, _ = Company.objects.get_or_create(
            owner=company_user,
            defaults={
                'name': 'ATLAS TECH',
                'description': 'Líder em soluções de tecnologia empresarial e produtos digitais de alta demanda.',
                'city': 'São Paulo',
                'website': 'https://atlastech.example.com',
            },
        )
        self.stdout.write(self.style.SUCCESS('OK: Empresa (rafael@atlastech.example.com / demo123456) configurada.'))

        # 4. Candidata Demo: Marina Costa
        candidate_user = User.objects.filter(email='marina.costa@example.com').first()
        if not candidate_user:
            candidate_user = User.objects.create_user(
                email='marina.costa@example.com',
                password='demo123456',
                full_name='Marina Costa',
                role='candidato',
                city='São Paulo',
                phone='(11) 99999-2048',
            )

        candidate_profile, _ = CandidateProfile.objects.get_or_create(
            user=candidate_user,
            defaults={
                'professional_summary': 'Desenvolvedora de Software focada no ecossistema TypeScript, React e Node.js. Apaixonada por arquiteturas escaláveis, boas práticas de engenharia e interfaces de usuário modernas e acessíveis.',
                'is_visible': True,
            },
        )

        # Competências da Marina
        marina_skills = [
            ('react', 'avancado'),
            ('nodejs', 'intermediario'),
            ('typescript', 'avancado'),
            ('htmlcss', 'especialista'),
            ('git', 'avancado'),
            ('tailwindcss', 'avancado'),
            ('apisrest', 'intermediario'),
            ('postgresql', 'basico'),
            ('uiuxdesign', 'intermediario'),
        ]
        for norm, level in marina_skills:
            if norm in skill_objs:
                CandidateSkill.objects.update_or_create(
                    candidate=candidate_profile,
                    skill=skill_objs[norm],
                    defaults={'proficiency_level': level},
                )
        self.stdout.write(self.style.SUCCESS('OK: Candidata Marina Costa com perfil e competências criada.'))

        # 5. Vagas da ATLAS TECH
        now = timezone.now()

        # Vaga 1: Full-stack
        job_fs, _ = Job.objects.get_or_create(
            company=company,
            title='Especialista em desenvolvimento full-stack',
            defaults={
                'description': 'Atuar em squads de produto, construir interfaces responsivas e integrar front-end com back-end em projetos de alta demanda. O desafio é conectar a experiência de quem usa o produto à arquitetura que a sustenta.',
                'city': 'São Paulo',
                'area': 'Tecnologia da Informação',
                'work_mode': 'presencial',
                'employment_type': 'clt',
                'status': 'publicada',
                'published_at': now,
            },
        )
        # Requisitos da vaga 1
        reqs_fs = [
            ('react', 'obrigatorio', 'intermediario', 3),
            ('nodejs', 'obrigatorio', 'intermediario', 3),
            ('typescript', 'desejavel', 'intermediario', 2),
            ('postgresql', 'desejavel', 'basico', 2),
        ]
        for norm, req_type, min_lvl, weight in reqs_fs:
            if norm in skill_objs:
                JobRequirement.objects.update_or_create(
                    job=job_fs,
                    skill=skill_objs[norm],
                    defaults={
                        'requirement_type': req_type,
                        'minimum_level': min_lvl,
                        'weight': weight,
                    },
                )

        # Vaga 2: Front-end Pleno
        job_fe, _ = Job.objects.get_or_create(
            company=company,
            title='Desenvolvedor(a) Front-end Pleno',
            defaults={
                'description': 'Buscamos profissional com domínio em React, componentização e acessibilidade web para desenvolver interfaces modulares e sistemas de design.',
                'city': 'São Paulo',
                'area': 'Tecnologia da Informação',
                'work_mode': 'hibrido',
                'employment_type': 'clt',
                'status': 'publicada',
                'published_at': now,
            },
        )
        reqs_fe = [
            ('react', 'obrigatorio', 'avancado', 4),
            ('typescript', 'obrigatorio', 'intermediario', 3),
            ('tailwindcss', 'desejavel', 'intermediario', 2),
            ('uiuxdesign', 'desejavel', 'basico', 1),
        ]
        for norm, req_type, min_lvl, weight in reqs_fe:
            if norm in skill_objs:
                JobRequirement.objects.update_or_create(
                    job=job_fe,
                    skill=skill_objs[norm],
                    defaults={
                        'requirement_type': req_type,
                        'minimum_level': min_lvl,
                        'weight': weight,
                    },
                )

        # Vaga 3: Backend Python
        job_py, _ = Job.objects.get_or_create(
            company=company,
            title='Engenheiro(a) de Software Back-end Python',
            defaults={
                'description': 'Desenvolvimento de microsserviços de alta disponibilidade, pipelines de dados e APIs RESTful em Django e FastAPI.',
                'city': 'São Paulo',
                'area': 'Tecnologia da Informação',
                'work_mode': 'remoto',
                'employment_type': 'clt',
                'status': 'publicada',
                'published_at': now,
            },
        )
        reqs_py = [
            ('python', 'obrigatorio', 'avancado', 5),
            ('postgresql', 'obrigatorio', 'intermediario', 3),
            ('docker', 'desejavel', 'intermediario', 2),
        ]
        for norm, req_type, min_lvl, weight in reqs_py:
            if norm in skill_objs:
                JobRequirement.objects.update_or_create(
                    job=job_py,
                    skill=skill_objs[norm],
                    defaults={
                        'requirement_type': req_type,
                        'minimum_level': min_lvl,
                        'weight': weight,
                    },
                )

        # 6. Candidatura de teste: Marina Costa na Vaga Full-stack
        app_fs, created_app = Application.objects.get_or_create(
            job=job_fs,
            candidate=candidate_profile,
            defaults={'status': 'em_analise'},
        )
        if created_app:
            ApplicationHistory.objects.create(
                application=app_fs,
                previous_status=None,
                new_status='pendente',
                changed_by=candidate_user,
            )
            ApplicationHistory.objects.create(
                application=app_fs,
                previous_status='pendente',
                new_status='em_analise',
                changed_by=company_user,
            )

        self.stdout.write(self.style.SUCCESS('OK: 3 vagas e 1 candidatura de teste configuradas.'))
        self.stdout.write(self.style.SUCCESS('=== SEED CONCLUÍDO COM SUCESSO ==='))
