
from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm

from .models import User


class CadastroForm(UserCreationForm):
    email = forms.EmailField(
        label="E-mail",
        widget=forms.EmailInput(
            attrs={
                "class": "form-control",
                "placeholder": "seu@email.com",
                "autocomplete": "email",
            }
        ),
    )

    first_name = forms.CharField(
        label="Nome",
        max_length=150,
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Seu nome",
                "autocomplete": "given-name",
            }
        ),
    )

    last_name = forms.CharField(
        label="Sobrenome",
        max_length=150,
        widget=forms.TextInput(
            attrs={
                "class": "form-control",
                "placeholder": "Seu sobrenome",
                "autocomplete": "family-name",
            }
        ),
    )

    password1 = forms.CharField(
        label="Senha",
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "autocomplete": "new-password",
            }
        ),
    )

    password2 = forms.CharField(
        label="Confirme a senha",
        widget=forms.PasswordInput(
            attrs={
                "class": "form-control",
                "autocomplete": "new-password",
            }
        ),
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
        )

    def clean_email(self):
        email = self.cleaned_data["email"].strip()

        if User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError(
                "Já existe uma conta cadastrada com este e-mail."
            )

        return email


class EntrarForm(AuthenticationForm):
    def clean_username(self):
        return self.cleaned_data["username"].strip().casefold()
