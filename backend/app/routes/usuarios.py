"""
Rutas de Administración de Usuarios — Cable Latín
CRUD seguro de perfiles de usuario vinculados con Firebase.
"""
import logging
from flask import Blueprint, request, jsonify, g
from app.services.firebase_service import FirebaseService, _col_path
from app.services.auth_middleware import token_required, role_required

logger = logging.getLogger(__name__)

usuarios_bp = Blueprint('usuarios', __name__)
firebase_service = FirebaseService()

@usuarios_bp.route('/', methods=['GET'])
@token_required
@role_required(['administrador'])
def listar_usuarios():
    """Obtener todos los usuarios registrados."""
    try:
        usuarios = firebase_service.listar_usuarios()
        return jsonify({
            'success': True,
            'datos': usuarios
        }), 200
    except Exception as e:
        logger.exception("[Usuarios] Error listando usuarios")
        return jsonify({'success': False, 'message': 'Error al recuperar usuarios.'}), 500


@usuarios_bp.route('/<string:uid>', methods=['GET'])
@token_required
@role_required(['administrador'])
def obtener_usuario(uid):
    """Obtener detalles de un usuario específico por su UID."""
    try:
        usuario = firebase_service.obtener_usuario_por_id(uid)
        if not usuario:
            return jsonify({'success': False, 'message': 'Usuario no encontrado.'}), 404
        
        # Eliminar información sensible si existiera
        usuario.pop('contraseña', None)
        usuario.pop('contrasena', None)
        return jsonify({
            'success': True,
            'datos': usuario
        }), 200
    except Exception as e:
        logger.exception(f"[Usuarios] Error obteniendo usuario {uid}")
        return jsonify({'success': False, 'message': 'Error al recuperar detalles del usuario.'}), 500


@usuarios_bp.route('/<string:uid>', methods=['PUT'])
@token_required
@role_required(['administrador'])
def actualizar_usuario(uid):
    """Actualizar datos de perfil de usuario en Firestore."""
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({'success': False, 'message': 'Cuerpo de petición no válido.'}), 400

        # Sanitizar campos modificables por seguridad (evitamos sobreescribir el email o el UID)
        campos_permitidos = ['nombre', 'usuario', 'telefono', 'rol', 'estado']
        datos_actualizar = {k: v for k, v in data.items() if k in campos_permitidos}

        if 'usuario' in datos_actualizar:
            datos_actualizar['usuario'] = datos_actualizar['usuario'].strip().lower()

        if 'rol' in datos_actualizar:
            roles_validos = ['administrador', 'supervisor', 'vendedor']
            if datos_actualizar['rol'].lower() not in roles_validos:
                return jsonify({'success': False, 'message': 'Rol especificado no es válido.'}), 400

        resultado = firebase_service.actualizar_usuario(uid, datos_actualizar)
        if resultado['success']:
            return jsonify({
                'success': True,
                'message': 'Usuario actualizado exitosamente.'
            }), 200

        return jsonify({'success': False, 'message': resultado.get('message', 'No se pudo actualizar el usuario.')}), 400
    except Exception as e:
        logger.exception(f"[Usuarios] Error actualizando usuario {uid}")
        return jsonify({'success': False, 'message': 'Error interno del servidor.'}), 500


@usuarios_bp.route('/<string:uid>', methods=['DELETE'])
@token_required
@role_required(['administrador'])
def eliminar_usuario(uid):
    """
    Eliminar un usuario de Firestore y Firebase Auth.
    """
    try:
        # Evitar que el administrador se auto-elimine
        if g.current_user.get('uid') == uid:
            return jsonify({'success': False, 'message': 'No puedes eliminar tu propia cuenta de administrador.'}), 400

        # Para asegurar una eliminación completa, borramos el documento en Firestore
        db = firebase_service.db
        
        doc_ref = _col_path(db, 'personal').document(uid)
        doc_snap = doc_ref.get()
        
        if not doc_snap.exists:
            return jsonify({'success': False, 'message': 'Usuario no encontrado.'}), 404
        
        doc_ref.delete()
        
        # Opcionalmente se puede borrar de Firebase Auth para consistencia absoluta
        try:
            firebase_service.auth.delete_user(uid)
        except Exception as auth_err:
            logger.warning(f"No se pudo eliminar de Firebase Auth (UID: {uid}): {auth_err}")

        return jsonify({
            'success': True,
            'message': 'Usuario eliminado exitosamente.'
        }), 200
    except Exception as e:
        logger.exception(f"[Usuarios] Error eliminando usuario {uid}")
        return jsonify({'success': False, 'message': 'Error interno al eliminar el usuario.'}), 500