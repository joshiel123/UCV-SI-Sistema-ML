"""
backend/app/config/security.py
Configuración de seguridad compartida — Cable Latín

Módulo sin dependencias hacia rutas ni servicios.
"""
import os
import secrets
import logging

logger = logging.getLogger(__name__)

# ===================== JWT_SECRET =====================
JWT_SECRET: str = os.getenv('JWT_SECRET') or secrets.token_hex(32)

if not os.getenv('JWT_SECRET'):
    logger.warning(
        "[Security] JWT_SECRET no está definido en el entorno. "
        "Se usará una clave temporal generada en este arranque. "
        "Los tokens serán inválidos al reiniciar el servidor. "
        "Define JWT_SECRET en producción antes de iniciar el servidor."
    )

# ===================== VALIDACIÓN ESTRICTA EN PRODUCCIÓN =====================
_FLASK_ENV = os.getenv('FLASK_ENV', 'development')

if _FLASK_ENV == 'production' and not os.getenv('JWT_SECRET'):
    raise EnvironmentError(
        "[Security] JWT_SECRET es obligatorio en entornos de producción. "
        "Define la variable de entorno JWT_SECRET antes de iniciar el servidor."
    )