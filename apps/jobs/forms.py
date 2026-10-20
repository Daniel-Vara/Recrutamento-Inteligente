from django import forms

from .models import Job


class JobForm(forms.ModelForm):
    required_skills = forms.CharField(
        label="Competências obrigatórias",
        required=False,
        help_text="Separe por vírgulas. Informe o peso opcional de 1 a 100, por exemplo: Python:3, Django:2.",
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
    )
    desired_skills = forms.CharField(
        label="Competências desejáveis",
        required=False,
        help_text="Use o mesmo formato. Competências obrigatórias têm prioridade se forem repetidas.",
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
    )

    class Meta:
        model = Job
        fields = ("title", "area", "description", "city", "work_mode", "application_deadline")
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-control"}),
            "area": forms.TextInput(attrs={"class": "form-control"}),
            "description": forms.Textarea(attrs={"class": "form-control", "rows": 7}),
            "city": forms.TextInput(attrs={"class": "form-control"}),
            "work_mode": forms.Select(attrs={"class": "form-control"}),
            "application_deadline": forms.DateInput(
                attrs={"class": "form-control", "type": "date"}, format="%Y-%m-%d"
            ),
        }
        help_texts = {
            "application_deadline": "Deixe em branco para não definir prazo.",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            required = self.instance.requirements.filter(is_required=True).select_related("skill")
            desired = self.instance.requirements.filter(is_required=False).select_related("skill")
            self.fields["required_skills"].initial = ", ".join(
                f"{item.skill.name}:{item.weight}" for item in required
            )
            self.fields["desired_skills"].initial = ", ".join(
                f"{item.skill.name}:{item.weight}" for item in desired
            )

    def clean(self):
        cleaned_data = super().clean()
        requirements = []
        names = set()
        for field_name, is_required in (("required_skills", True), ("desired_skills", False)):
            for entry in (cleaned_data.get(field_name) or "").split(","):
                if not entry.strip():
                    continue
                parts = entry.strip().rsplit(":", 1)
                name = " ".join(parts[0].split())
                if not name or len(name) > 80:
                    self.add_error(field_name, "Cada competência deve ter de 1 a 80 caracteres.")
                    continue
                weight = 1
                if len(parts) == 2:
                    try:
                        weight = int(parts[1].strip())
                    except ValueError:
                        self.add_error(field_name, "O peso deve ser um número entre 1 e 100.")
                        continue
                if not 1 <= weight <= 100:
                    self.add_error(field_name, "O peso deve ser um número entre 1 e 100.")
                    continue
                normalized = name.casefold()
                if normalized in names:
                    continue
                names.add(normalized)
                requirements.append(
                    {"name": name, "weight": weight, "is_required": is_required}
                )
        if len(requirements) > 30:
            self.add_error("required_skills", "Informe no máximo 30 competências por vaga.")
        cleaned_data["parsed_requirements"] = requirements
        return cleaned_data
