from rest_framework.permissions import BasePermission


class IsCandidate(BasePermission):
    message = 'Apenas candidatos autenticados podem acessar este recurso.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'candidato'
        )


class IsCompany(BasePermission):
    message = 'Apenas empresas autenticadas podem acessar este recurso.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'empresa'
        )
