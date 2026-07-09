"""
Rutas para gestión de facturas y servicios — Cable Latín
Protegidas con JWT y control de roles RBAC.
"""
import logging
from flask import Blueprint, request, jsonify, g
from app.services.firebase_service import FirebaseService
from app.services.auth_middleware import token_required, role_required
from app.models.factura import Factura
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

facturas_bp = Blueprint('facturas', __name__)
firebase_service = FirebaseService()

TODOS_LOS_ROLES = ['vendedor', 'supervisor', 'administrador']
ROLES_SUPERVISION = ['supervisor', 'administrador']


@facturas_bp.route('/', methods=['GET'])
@token_required
@role_required(TODOS_LOS_ROLES)
def obtener_facturas():
    """Obtener lista de facturas/servicios con mapeo tolerante a fallas de campos históricos."""
    try:
        filtros = {}
        estado = request.args.get('estado', '').strip()
        cliente_id_arg = request.args.get('cliente_id', '').strip()

        if estado:
            filtros['estado'] = estado
        if cliente_id_arg:
            filtros['cliente_id'] = cliente_id_arg

        servicios = firebase_service.obtener_servicios(filtros)
        clientes = firebase_service.obtener_clientes()
        clientes_map = {c['id']: c for c in clientes}

        for s in servicios:
            # Tolerancia: Buscar por 'cliente_id' o 'id_cliente' para registros antiguos
            id_cli = s.get('cliente_id') or s.get('id_cliente')
            cli = clientes_map.get(id_cli)
            
            # Forzar consistencia de ID para que el frontend no falle
            s['cliente_id'] = id_cli

            if cli:
                s['cliente_nombre'] = f"{cli.get('nombre', '')} {cli.get('apellido', '')}".strip()
                s['cliente_dni'] = cli.get('numero_documento') or cli.get('dni') or 'N/A'
            else:
                s['cliente_nombre'] = 'Cliente Desconocido'
                s['cliente_dni'] = 'N/A'

            # Tolerancia para montos guardados de forma anidada
            if s.get('monto') is None or float(s.get('monto', 0)) == 0.0:
                plan_info = s.get('plan_info') or {}
                s['monto'] = s.get('monto') or plan_info.get('precio') or 0.0

            # Tolerancia para fechas faltantes
            if not s.get('fecha_vencimiento'):
                s['fecha_vencimiento'] = s.get('fecha_inicio') or 'N/A'
            if not s.get('fecha_limite'):
                s['fecha_limite'] = s.get('fecha_vencimiento') or 'N/A'

        return jsonify({'success': True, 'data': servicios, 'total': len(servicios)}), 200

    except Exception as e:
        logger.exception("[Facturas] Error en obtener_facturas")
        return jsonify({'success': False, 'message': 'Error al procesar la lista.', 'errors': [str(e)]}), 500


@facturas_bp.route('/<servicio_id>', methods=['PUT'])
@token_required
@role_required(TODOS_LOS_ROLES)
def actualizar_factura(servicio_id):
    """
    NUEVO: Actualiza los datos de asignación de un servicio en la base de datos.
    Satisface la llamada del botón 'Guardar Cambio Servicios' de clientes.html.
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({'success': False, 'message': 'Datos vacíos.'}), 400

        # Sanitizador de entrada asíncrono para evitar excepciones de tipo float
        def parser_float(val, default=0.0):
            try:
                if val is None or str(val).strip().lower() in ['nan', 'null', 'undefined', '']:
                    return default
                return float(val)
            except (ValueError, TypeError):
                return default

        # Limpiar precios antes de inyectarlos en Firestore
        if 'monto' in data:
            data['monto'] = parser_float(data['monto'])
        if 'costo_adicional' in data:
            data['costo_adicional'] = parser_float(data['costo_adicional'])
        if 'ciclo_facturacion' in data:
            try:
                data['ciclo_facturacion'] = int(float(data['ciclo_facturacion']))
            except (ValueError, TypeError):
                data['ciclo_facturacion'] = 15

        resultado = firebase_service.actualizar_servicio(servicio_id, data)
        status = 200 if resultado.get('success') else 400
        return jsonify(resultado), status

    except Exception as e:
        logger.exception(f"[Facturas] Error en actualizar_factura {servicio_id}")
        return jsonify({'success': False, 'message': 'Error al actualizar servicio.', 'errors': [str(e)]}), 500


@facturas_bp.route('/<servicio_id>/pagar', methods=['PUT'])
@token_required
@role_required(TODOS_LOS_ROLES)
def pagar_factura(servicio_id):
    """
    Registra el cobro de una factura de forma segura en el servidor.
    Actualiza el estado a 'Pagada', recalcula fechas de vencimiento y genera un registro de pago.
    """
    try:
        current_user = g.current_user
        
        # 1. Obtener la factura de la base de datos
        servicio = firebase_service.obtener_servicio_por_id(servicio_id)
        if not servicio:
            return jsonify({'success': False, 'message': 'Factura no encontrada.'}), 404

        if servicio.get('estado', '').lower() == 'pagada':
            return jsonify({'success': False, 'message': 'Esta factura ya fue pagada anteriormente.'}), 400

        # 2. Calcular de manera segura las nuevas fechas en el servidor (Evita fraude en el cliente)
        hoy = datetime.now()
        fecha_pago_str = hoy.strftime('%Y-%m-%d')
        
        # Nueva fecha de vencimiento (próximo mes)
        nueva_fecha_vencimiento = (hoy + timedelta(days=30)).strftime('%Y-%m-%d')
        nueva_fecha_limite = (hoy + timedelta(days=35)).strftime('%Y-%m-%d')

        # 3. Registrar el asiento contable en la colección 'pagos'
        datos_pago = {
            'monto': float(servicio.get('monto') or servicio.get('precio_plan') or 0),
            'id_cliente': servicio.get('cliente_id') or servicio.get('id_cliente'),
            'id_servicio': servicio_id,
            'estado': 'Pagado',
            'fecha_pago': fecha_pago_str,
            'plan_info': {
                'nombre': servicio.get('plan_nombre') or (servicio.get('plan_info') or {}).get('nombre', 'Plan Cable'),
                'precio': float(servicio.get('monto') or 0)
            },
            'registrado_por': current_user.get('usuario', 'sistema')
        }

        # Guardar en pagos y actualizar el estado de la factura a 'Pagada'
        resultado_pago = firebase_service.registrar_pago(servicio_id, datos_pago)

        if not resultado_pago.get('success'):
            return jsonify({'success': False, 'message': 'Error registrando el cobro.'}), 500

        # 4. Actualizar la factura/servicio con las nuevas fechas extendidas
        datos_actualizacion = {
            'estado': 'Pagada',
            'fecha_vencimiento': nueva_fecha_vencimiento,
            'fecha_limite': nueva_fecha_limite,
            'fecha_ultimo_pago': fecha_pago_str
        }
        firebase_service.actualizar_servicio(servicio_id, datos_actualizacion)

        return jsonify({'success': True, 'message': 'Pago de factura registrado exitosamente.'}), 200

    except Exception as e:
        logger.exception(f"[Facturas] Error en pagar_factura {servicio_id}")
        return jsonify({'success': False, 'message': 'Error interno de cobro.', 'errors': [str(e)]}), 500