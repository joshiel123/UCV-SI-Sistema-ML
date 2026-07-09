"""
Rutas para gestión de pagos — Cable Latín
Protegidas con JWT y control de roles RBAC.
"""
from flask import Blueprint, request, jsonify, g
from app.services.firebase_service import FirebaseService
from app.services.auth_middleware import token_required, role_required
from app.models.pago import Pago, METODOS_PAGO_VALIDOS

pagos_bp = Blueprint('pagos', __name__)
firebase_service = FirebaseService()

ROLES_SUPERVISION = ['supervisor', 'administrador']
TODOS_LOS_ROLES   = ['vendedor', 'supervisor', 'administrador']


@pagos_bp.route('/', methods=['GET'])
@token_required
@role_required(ROLES_SUPERVISION)
def obtener_pagos():
    """
    Listar pagos registrados. Solo supervisores y administradores.
    """
    try:
        filtros = {}
        servicio_id = request.args.get('servicio_id', '').strip()
        if servicio_id:
            filtros['servicio_id'] = servicio_id

        pagos = firebase_service.obtener_pagos(filtros)

        # Filtro por rango de fechas
        fecha_desde = request.args.get('fecha_desde', '').strip()
        fecha_hasta = request.args.get('fecha_hasta', '').strip()

        if fecha_desde:
            pagos = [p for p in pagos if p.get('fecha_pago', '') >= fecha_desde]
        if fecha_hasta:
            fecha_hasta_completa = fecha_hasta + 'T23:59:59'
            pagos = [p for p in pagos if p.get('fecha_pago', '') <= fecha_hasta_completa]

        # Sanitizar campos de respuesta (Consistencia de ID de servicio)
        for p in pagos:
            if 'id_servicio' in p and 'servicio_id' not in p:
                p['servicio_id'] = p.pop('id_servicio')

        return jsonify({'success': True, 'data': pagos, 'total': len(pagos)}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': 'Error interno al listar pagos.', 'errors': [str(e)]}), 500


@pagos_bp.route('/procesar', methods=['POST'])
@token_required
@role_required(TODOS_LOS_ROLES)
def procesar_pago():
    """
    Procesar el pago de un servicio/factura de forma atómica y segura.
    """
    current_user = getattr(g, 'current_user', {})

    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({'success': False, 'message': 'Cuerpo de la solicitud vacío.'}), 400

        servicio_id = (data.get('servicio_id') or '').strip()
        if not servicio_id:
            return jsonify({'success': False, 'message': 'El servicio_id es requerido.'}), 400

        # 1. Validar que la factura/servicio exista y no esté pagada
        servicio = firebase_service.obtener_servicio_por_id(servicio_id)
        if not servicio:
            return jsonify({'success': False, 'message': 'El servicio o factura no existe.'}), 404
            
        if servicio.get('estado', '').lower() == 'pagada':
            return jsonify({'success': False, 'message': 'Esta factura ya se encuentra pagada.'}), 400

        try:
            monto = float(data.get('monto', 0))
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'El monto debe ser un número válido.'}), 400

        metodo_pago = (data.get('metodo_pago') or 'Efectivo').strip()

        # 2. Utilizar el Modelo Pago para validación estricta de negocio
        pago_model = Pago(
            servicio_id=servicio_id,
            monto=monto,
            metodo_pago=metodo_pago,
            observacion=(data.get('observacion') or '').strip(),
            procesado_por=current_user.get('usuario', 'sistema'),
            uid_procesador=current_user.get('uid', '')
        )

        errores = pago_model.validate()
        if errores:
            return jsonify({'success': False, 'message': errores[0], 'errors': errores}), 400

        # 3. Registrar transacción contable en la base de datos
        datos_pago = pago_model.to_dict()
        datos_pago['n_documento'] = servicio.get('n_documento') or servicio.get('cliente_dni') or 'N/A'

        # Registrar pago y mutar estado de la factura a 'Pagada' en Firestore
        resultado = firebase_service.registrar_pago(servicio_id, datos_pago)
        
        if resultado.get('success'):
            return jsonify({
                'success': True,
                'message': 'Pago procesado y factura actualizada con éxito.',
                'id_pago': resultado.get('id')
            }), 201

        return jsonify({'success': False, 'message': 'No se pudo completar el registro del pago.'}), 400

    except Exception as e:
        return jsonify({'success': False, 'message': 'Error interno de procesamiento.', 'errors': [str(e)]}), 500