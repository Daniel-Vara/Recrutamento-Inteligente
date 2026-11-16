from django.conf import settings
from rest_framework.exceptions import ValidationError


def validate_resume_file(file_obj):
    if file_obj is None:
        raise ValidationError({'file': 'Nenhum arquivo enviado.'})

    max_size = getattr(settings, 'MAX_RESUME_SIZE', 5 * 1024 * 1024)
    if file_obj.size > max_size:
        raise ValidationError({'file': 'O arquivo excede o limite máximo permitido de 5 MB.'})

    filename = (file_obj.name or '').lower()
    content_type = (getattr(file_obj, 'content_type', '') or '').lower()
    if not filename.endswith('.pdf'):
        raise ValidationError({'file': 'Apenas arquivos em formato PDF são permitidos.'})
    if content_type and content_type not in ('application/pdf', 'application/x-pdf', 'application/octet-stream'):
        raise ValidationError({'file': 'Apenas arquivos em formato PDF são permitidos.'})

    header = file_obj.read(5)
    file_obj.seek(0)
    if header != b'%PDF-':
        raise ValidationError({'file': 'O conteúdo do arquivo não é um PDF válido.'})
    return file_obj
