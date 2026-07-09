"""
Rutas de autenticación — Cable Latín
Login real con JWT, protección contra fuerza bruta y verificación de token.
"""
import jwt
import logging
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from app.services.firebase_service import FirebaseService
from app.config.security import JWT_SECRET
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)
firebase_service = FirebaseService()

# ===================== PROTECCIÓN FUERZA BRUTA =====================
_intentos_fallidos = {}

MAX_INTENTOS     = 3
SEGUNDOS_BLOQUEO = 30


def _verificar_bloqueo(username: str) -> dict | None:
    """
    Retorna un dict con mensaje de bloqueo si el usuario está bloqueado,
    o None si puede intentar login.
    """
    registro = _intentos_fallidos.get(username)
    if not registro:
        return None

    bloqueado_hasta = registro.get('bloqueado_hasta')
    now = datetime.now(timezone.utc)

    if bloqueado_hasta and now < bloqueado_hasta:
        segundos_restantes = int((bloqueado_hasta - now).total_seconds())
        return {
            'success': False,
            'mensaje': f'Cuenta bloqueada temporalmente. Espere {segundos_restantes} segundos.',
            'codigo':  'CUENTA_BLOQUEADA',
            'segundos_restantes': segundos_restantes
        }

    if bloqueado_hasta and now >= bloqueado_hasta:
        _intentos_fallidos.pop(username, None)

    return None


def _registrar_intento_fallido(username: str) -> int:
    """Incrementa el contador de intentos fallidos y bloquea si supera el límite."""
    now = datetime.now(timezone.utc)
    if username not in _intentos_fallidos:
        _intentos_fallidos[username] = {'intentos': 0, 'bloqueado_hasta': None}

    _intentos_fallidos[username]['intentos'] += 1
    intentos_actuales = _intentos_fallidos[username]['intentos']

    if intentos_actuales >= MAX_INTENTOS:
        _intentos_fallidos[username]['bloqueado_hasta'] = now + timedelta(seconds=SEGUNDOS_BLOQUEO)
        _intentos_fallidos[username]['intentos'] = 0
        return 0

    return max(0, MAX_INTENTOS - intentos_actuales)


def _limpiar_intentos(username: str):
    """Elimina el registro de intentos fallidos tras un login exitoso."""
    _intentos_fallidos.pop(username, None)


def _generar_token(usuario_data: dict) -> str:
    """
    Genera un token JWT firmado con los datos del usuario.
    """
    now = datetime.now(timezone.utc)
    payload = {
        'uid':     usuario_data.get('uid'),
        'usuario': usuario_data.get('usuario'),
        'nombre':  usuario_data.get('nombre'),
        'email':   usuario_data.get('email'),
        'rol':     usuario_data.get('rol'),
        'iat':     int(now.timestamp()),
        'exp':     int((now + timedelta(hours=2)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


# ===================== ENDPOINTS =====================

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Inicia sesión de usuario validando credenciales y devolviendo un JWT.
    """
    try:
        data = request.get_json(force=True, silent=True)

        if not data:
            return jsonify({'success': False, 'mensaje': 'Cuerpo de petición inválido.'}), 400

        username = data.get('usuario', '').strip().lower()
        
        # Corrección de lectura multivariable (acepta variaciones seguras de codificación)
        password = (
            data.get('contrasena') or 
            data.get('contrasenda') or 
            data.get('contraseña') or 
            data.get('password', '')
        )

        if not username or not password:
            return jsonify({'success': False, 'mensaje': 'Usuario y contraseña son requeridos.'}), 400

        # 1. Verificar si el usuario está bloqueado temporalmente
        bloqueo = _verificar_bloqueo(username)
        if bloqueo:
            return jsonify(bloqueo), 429

        # 2. Buscar usuario en Firestore por nombre de usuario (en minúsculas)
        usuario = firebase_service.obtener_usuario_por_username(username)

        if not usuario:
            restantes = _registrar_intento_fallido(username)
            return jsonify({
                'success': False,
                'mensaje': f'Credenciales incorrectas. Intentos restantes: {restantes}.'
            }), 401

        # 3. Verificar estado activo
        if usuario.get('estado', '').lower() != 'activo':
            return jsonify({
                'success': False,
                'mensaje': 'Tu cuenta está desactivada. Contacta al administrador.'
            }), 403

        # 4. Verificar contraseña con Firebase Auth REST API
        email = usuario.get('email')
        if not email:
            logger.error("[Auth] Usuario '%s' no tiene email configurado.", username)
            return jsonify({'success': False, 'mensaje': 'Error de configuración: usuario sin email registrado.'}), 500

        auth_result = firebase_service.autenticar_con_firebase_auth(email, password)

        if not auth_result.get('success'):
            restantes = _registrar_intento_fallido(username)
            return jsonify({
                'success': False,
                'mensaje': f'Credenciales incorrectas. Intentos restantes: {restantes}.'
            }), 401

        # 5. Éxito de autenticación
        _limpiar_intentos(username)
        token = _generar_token(usuario)

        return jsonify({
            'success': True,
            'mensaje': '¡Bienvenido!',
            'token':   token,
            'usuario': {
                'uid':     usuario.get('uid'),
                'nombre':  usuario.get('nombre'),
                'usuario': usuario.get('usuario'),
                'rol':     usuario.get('rol'),
                'email':   usuario.get('email')
            }
        }), 200

    except Exception:
        logger.exception("[Auth] Error inesperado en /login")
        return jsonify({'success': False, 'mensaje': 'Ocurrió un error interno en el servidor.'}), 500


@auth_bp.route('/verificar-token', methods=['GET'])
def verificar_token():
    """
    Verifica si el token Bearer en el encabezado Authorization es válido.
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'valido': False, 'mensaje': 'Token no proporcionado.'}), 401

        token   = auth_header.split(' ', 1)[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])

        return jsonify({
            'valido':  True,
            'usuario': {
                'uid':     payload.get('uid'),
                'nombre':  payload.get('nombre'),
                'usuario': payload.get('usuario'),
                'rol':     payload.get('rol'),
                'email':   payload.get('email')
            }
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'valido': False, 'mensaje': 'Sesión expirada.',  'codigo': 'TOKEN_EXPIRADO'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'valido': False, 'mensaje': 'Token inválido.',   'codigo': 'TOKEN_INVALIDO'}), 401
    except Exception:
        logger.exception("[Auth] Error inesperado en /verificar-token")
        return jsonify({'valido': False, 'mensaje': 'Error al procesar el token.'}), 500


@auth_bp.route('/registro', methods=['POST'])
def registro():
    """
    Registrar nuevo usuario.
    """
    try:
        data = request.get_json(force=True, silent=True)

        campos_requeridos = ['nombre', 'usuario', 'email', 'rol']
        if not data or not all(campo in data for campo in campos_requeridos) or ('contraseña' not in data and 'contrasenda' not in data and 'contrasena' not in data):
            return jsonify({'success': False, 'mensaje': 'Faltan campos requeridos.'}), 400

        email     = data['email'].strip().lower()
        contraseña = data.get('contrasena') or data.get('contrasenda') or data.get('contraseña', '')

        if len(contraseña) < 6:
            return jsonify({'success': False, 'mensaje': 'La contraseña debe tener al menos 6 caracteres.'}), 400

        # Validar mediante el modelo formal Usuario
        usuario_val = Usuario(
            nombre=data['nombre'],
            usuario=data['usuario'],
            email=email,
            rol=data['rol'],
            telefono=data.get('telefono', ''),
            estado='Activo'
        )
        errores = usuario_val.validate()
        if errores:
            return jsonify({'success': False, 'mensaje': '; '.join(errores)}), 400

        datos_perfil = {
            'nombre':   usuario_val.nombre.strip(),
            'usuario':  usuario_val.usuario.strip().lower(),
            'rol':      usuario_val.rol.lower(),
            'telefono': usuario_val.telefono,
            'estado':   usuario_val.estado
        }

        resultado = firebase_service.crear_usuario(email, contraseña, datos_perfil)

        if resultado['success']:
            return jsonify({
                'success': True,
                'mensaje': 'Usuario creado exitosamente.',
                'uid':     resultado['uid']
            }), 201

        mensaje = resultado.get('mensaje', 'Error al crear usuario.')
        if 'email-already-exists' in mensaje or 'EMAIL_EXISTS' in mensaje:
            mensaje = 'Este email ya está registrado.'
        elif 'weak-password' in mensaje:
            mensaje = 'La contraseña es muy débil.'

        return jsonify({'success': False, 'mensaje': mensaje}), 400

    except Exception:
        logger.exception("[Auth] Error inesperado en /registro")
        return jsonify({'success': False, 'mensaje': 'Error en registro.'}), 500