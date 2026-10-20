from django import forms

from .models import CandidateProfile, CandidateSkill, validate_resume_file
from .services import set_candidate_skills


class CandidateProfileForm(forms.ModelForm):
    first_name = forms.CharField(label="Nome", max_length=150)
    last_name = forms.CharField(label="Sobrenome", max_length=150, required=False)
    skills = forms.CharField(
        label="Competências",
        required=False,
        help_text="Separe por vírgulas e informe o nível de 1 a 4, por exemplo: Python:3, SQL:2.",
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
    )

    class Meta:
        model = CandidateProfile
        fields = ("city", "summary", "is_searchable")
        widgets = {
            "city": forms.TextInput(attrs={"class": "form-control", "autocomplete": "address-level2"}),
            "summary": forms.Textarea(attrs={"class": "form-control", "rows": 5}),
            "is_searchable": forms.CheckboxInput(),
        }

    def __init__(self, *args, user, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        self.fields["first_name"].initial = user.first_name
        self.fields["last_name"].initial = user.last_name
        self.fields["skills"].initial = ", ".join(
            f"{item.skill.name}:{item.level}"
            for item in self.instance.skills.select_related("skill").all()
        )
        for field in ("first_name", "last_name"):
            self.fields[field].widget.attrs["class"] = "form-control"

    def save(self, commit=True):
        profile = super().save(commit=False)
        self.user.first_name = self.cleaned_data["first_name"].strip()
        self.user.last_name = self.cleaned_data["last_name"].strip()
        if commit:
            self.user.save(update_fields=("first_name", "last_name"))
            profile.save()
            set_candidate_skills(profile, self.cleaned_data.get("parsed_skills", []))
        return profile

    def clean_skills(self):
        raw_skills = self.cleaned_data["skills"].strip()
        parsed = []
        seen = set()
        for entry in raw_skills.split(",") if raw_skills else []:
            parts = entry.strip().rsplit(":", 1)
            if len(parts) != 2 or not parts[0].strip():
                raise forms.ValidationError("Use o formato competência:nível, como Python:3.")
            name = " ".join(parts[0].split())
            try:
                level = int(parts[1].strip())
            except ValueError as exc:
                raise forms.ValidationError("O nível deve ser um número de 1 a 4.") from exc
            if level not in CandidateSkill.Level.values:
                raise forms.ValidationError("O nível deve ser um número de 1 a 4.")
            if len(name) > 80:
                raise forms.ValidationError("Cada competência pode ter até 80 caracteres.")
            normalized = name.casefold()
            if normalized in seen:
                raise forms.ValidationError("Não repita a mesma competência.")
            seen.add(normalized)
            parsed.append({"name": name, "level": level})
        if len(parsed) > 30:
            raise forms.ValidationError("Informe no máximo 30 competências.")
        self.cleaned_data["parsed_skills"] = parsed
        return raw_skills


class ResumeUploadForm(forms.Form):
    file = forms.FileField(
        label="Currículo em PDF",
        widget=forms.ClearableFileInput(attrs={"class": "form-control", "accept": ".pdf,application/pdf"}),
    )

    def clean_file(self):
        uploaded_file = self.cleaned_data["file"]
        validate_resume_file(uploaded_file)
        return uploaded_file
