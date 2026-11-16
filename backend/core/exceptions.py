from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Mantém o formato DRF e evita vazar detalhes internos em 500."""
    response = exception_handler(exc, context)
    if response is not None:
        return response
    return response
