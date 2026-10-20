from django.db import transaction

from .models import CandidateProfile, CandidateSkill, Skill


@transaction.atomic
def set_candidate_skills(profile: CandidateProfile, skills):
    retained_ids = []
    for item in skills:
        name = " ".join(item["name"].split())
        normalized = name.casefold()
        skill, _ = Skill.objects.get_or_create(
            normalized_name=normalized,
            defaults={"name": name},
        )
        candidate_skill, _ = CandidateSkill.objects.update_or_create(
            profile=profile,
            skill=skill,
            defaults={"level": item["level"]},
        )
        retained_ids.append(candidate_skill.pk)
    profile.skills.exclude(pk__in=retained_ids).delete()
