
from django.contrib.auth import login
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.views.generic import CreateView

from .forms import CadastroForm, EntrarForm


class CadastroView(CreateView):
    form_class = CadastroForm
    template_name = "accounts/register.html"
    success_url = reverse_lazy("accounts:login")

    def form_valid(self, form):
        response = super().form_valid(form)
        login(self.request, self.object)
        return response


class EntrarView(LoginView):
    template_name = "registration/login.html"
    form_class = EntrarForm
    redirect_authenticated_user = True
