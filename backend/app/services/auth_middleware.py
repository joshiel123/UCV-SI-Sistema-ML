"""
Middleware de Autenticación y Autorización - Cable Latín
Decoradores @token_required y @role_required para proteger endpoints Flask.
"""
import jwt
from functools import wraps
from flask import request, jsonify, g
from app.config.security import JWT_SECRET


def token_required(f):
    """
    Decorador que verifica que el request lleve un token JWT válido y no expirado.
    Extrae el token y lo asigna a flask.g.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')

        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        if not token:
            return jsonify({
                'success': False,
                'message': 'Token de acceso requerido. Por favor, inicia sesión.'
            }), 401

        try:
            # Almacenamos el payload decodificado en el objeto g de Flask
            g.current_user = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])

        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                'codigo': 'TOKEN_EXPIRADO'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'message': 'Token inválido o alterado.',
                'codigo': 'TOKEN_INVALIDO'
            }), 401

        return f(*args, **kwargs)

    return decorated


def role_required(roles_permitidos: list):
    """
    Decorador para control de roles (RBAC).
    Debe usarse DESPUÉS de @token_required.

    Ejemplo:
        @clientes_bp.route('/<int:cliente_id>', methods=['GET'])
        @token_required
        @role_required(['vendedor', 'administrador'])
        def obtener_cliente(cliente_id):
            usuario = g.current_user
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Aseguramos que token_required se haya ejecutado previamente
            current_user = getattr(g, 'current_user', None)
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'Usuario no autenticado en el contexto de la solicitud.'
                }), 401

            rol_usuario = current_user.get('rol', '').lower()
            roles_norm = [r.lower() for r in roles_permitidos]

            if rol_usuario not in roles_norm:
                return jsonify({
                    'success': False,
                    'message': f'Acceso denegado. Se requiere uno de los siguientes roles: {", ".join(roles_norm)}.',
                    'codigo': 'ACCESO_DENEGADO'
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator