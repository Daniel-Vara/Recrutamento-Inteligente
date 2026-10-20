from django import forms

from .models import Company


class CompanyForm(forms.ModelForm):
    class Meta:
        model = Company
        fields = ("name", "tax_id", "description", "city")
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "tax_id": forms.TextInput(attrs={"class": "form-control"}),
            "description": forms.Textarea(attrs={"class": "form-control", "rows": 4}),
            "city": forms.TextInput(attrs={"class": "form-control"}),
        }
