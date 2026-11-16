from django.test import TestCase
from recommendations.matching import calculate_compatibility


class MatchingAlgorithmTestCase(TestCase):
    def test_full_match_with_weights(self):
        candidate_skills = [
            {'normalized_name': 'react', 'proficiency_level': 'avancado'},
            {'normalized_name': 'nodejs', 'proficiency_level': 'intermediario'},
            {'normalized_name': 'typescript', 'proficiency_level': 'intermediario'},
        ]
        job_requirements = [
            {'normalized_name': 'react', 'requirement_type': 'obrigatorio', 'minimum_level': 'intermediario', 'weight': 3},
            {'normalized_name': 'nodejs', 'requirement_type': 'obrigatorio', 'minimum_level': 'basico', 'weight': 3},
            {'normalized_name': 'typescript', 'requirement_type': 'desejavel', 'minimum_level': 'intermediario', 'weight': 2},
        ]
        result = calculate_compatibility(candidate_skills, job_requirements)
        self.assertTrue(result['is_compatible'])
        self.assertFalse(result['has_mandatory_fail'])
        self.assertEqual(result['score'], 100.0)

    def test_mandatory_missing_yields_zero_score(self):
        candidate_skills = [
            {'normalized_name': 'react', 'proficiency_level': 'avancado'},
            {'normalized_name': 'typescript', 'proficiency_level': 'avancado'},
        ]
        job_requirements = [
            {'normalized_name': 'react', 'requirement_type': 'obrigatorio', 'minimum_level': 'intermediario', 'weight': 3},
            {'normalized_name': 'nodejs', 'requirement_type': 'obrigatorio', 'minimum_level': 'intermediario', 'weight': 3},
        ]
        result = calculate_compatibility(candidate_skills, job_requirements)
        self.assertFalse(result['is_compatible'])
        self.assertTrue(result['has_mandatory_fail'])
        self.assertEqual(result['score'], 0)

    def test_insufficient_level_for_mandatory_requirement(self):
        candidate_skills = [
            {'normalized_name': 'react', 'proficiency_level': 'iniciante'},
        ]
        job_requirements = [
            {'normalized_name': 'react', 'requirement_type': 'obrigatorio', 'minimum_level': 'avancado', 'weight': 5},
        ]
        result = calculate_compatibility(candidate_skills, job_requirements)
        self.assertFalse(result['is_compatible'])
        self.assertTrue(result['has_mandatory_fail'])
        self.assertEqual(result['score'], 0)

    def test_missing_desirable_requirement_does_not_block(self):
        candidate_skills = [
            {'normalized_name': 'react', 'proficiency_level': 'avancado'},
        ]
        job_requirements = [
            {'normalized_name': 'react', 'requirement_type': 'obrigatorio', 'minimum_level': 'intermediario', 'weight': 6},
            {'normalized_name': 'docker', 'requirement_type': 'desejavel', 'minimum_level': 'basico', 'weight': 4},
        ]
        result = calculate_compatibility(candidate_skills, job_requirements)
        self.assertTrue(result['is_compatible'])
        self.assertFalse(result['has_mandatory_fail'])
        self.assertEqual(result['score'], 60.0)

    def test_job_without_requirements_is_undefined(self):
        candidate_skills = [
            {'normalized_name': 'react', 'proficiency_level': 'avancado'},
        ]
        result = calculate_compatibility(candidate_skills, [])
        self.assertTrue(result['is_compatible'])
        self.assertIsNone(result['score'])
