# backend/app/routes/clientes.py

import re
import logging
import pandas as pd
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from app.services.firebase_service import FirebaseService
from app.services.auth_middleware import token_required, role_required
from app.models.cliente import Cliente
from app.ml.utils.cleaner import corregir_distrito, imputar_plan_y_monto

logger = logging.getLogger(__name__)

clientes_bp = Blueprint('clientes', __name__)
firebase_service = FirebaseService()

TODOS_LOS_ROLES = ['vendedor', 'supervisor', 'administrador']
ROLES_SUPERVISION = ['supervisor', 'administrador']


def _validar_documento(tipo: str, numero: str) -> str | None:
    if not isinstance(numero, str):
        numero = str(numero)
    numero_limpio = numero.strip()
    if not re.fullmatch(r'\d+', numero_limpio):
        return f'El número de documento ({tipo}) debe contener únicamente dígitos.'
    if tipo.upper() == 'DNI' and len(numero_limpio) != 8:
        return 'El DNI debe tener exactamente 8 dígitos.'
    if tipo.upper() == 'RUC' and len(numero_limpio) != 11:
        return 'El RUC debe tener exactamente 11 dígitos.'
    return None


def _sanitizar_texto(valor: str, max_len: int = 200) -> str:
    if not isinstance(valor, str):
        return ''
    sanitizado = re.sub(r'[<>{}()\[\]\\;`\'"]', '', valor)
    return sanitizado.strip()[:max_len]


# ===================== ENDPOINTS =====================

@clientes_bp.route('/', methods=['GET'])
@token_required
@role_required(TODOS_LOS_ROLES)
def obtener_clientes():
    try:
        filtros = {}
        estado = request.args.get('estado', '').strip()
        buscar = request.args.get('buscar', '').strip()

        if estado:
            estados_validos = ['Activo', 'Inactivo', 'Suspendido']
            if estado not in estados_validos:
                return jsonify({'success': False, 'message': 'Estado inválido.'}), 400
            filtros['estado'] = estado

        clientes = firebase_service.obtener_clientes(filtros)

        if buscar:
            termino = _sanitizar_texto(buscar).lower()
            clientes = [
                c for c in clientes
                if termino in (c.get('nombre', '') + ' ' + c.get('apellido', '')).lower()
                or termino in str(c.get('numero_documento', '')).lower()
                or termino in (c.get('email', '')).lower()
            ]

        return jsonify({'success': True, 'data': clientes, 'total': len(clientes)}), 200

    except Exception as e:
        logger.exception("[Clientes] Error obteniendo clientes")
        return jsonify({'success': False, 'message': 'Error interno', 'errors': [str(e)]}), 500


@clientes_bp.route('/<cliente_id>', methods=['GET'])
@token_required
@role_required(TODOS_LOS_ROLES)
def obtener_cliente(cliente_id):
    """Obtener datos de un cliente específico por ID."""
    try:
        cliente_id = _sanitizar_texto(cliente_id, 50)
        if not cliente_id:
            return jsonify({'success': False, 'message': 'ID de cliente inválido.'}), 400

        cliente = firebase_service.obtener_cliente_por_id(cliente_id)

        if not cliente:
            return jsonify({'success': False, 'message': 'Cliente no encontrado.'}), 404

        return jsonify({'success': True, 'data': cliente}), 200

    except Exception as e:
        logger.exception(f"[Clientes] Error obteniendo cliente {cliente_id}")
        return jsonify({'success': False, 'message': 'Error interno', 'errors': [str(e)]}), 500


@clientes_bp.route('/', methods=['POST'])
@token_required
@role_required(TODOS_LOS_ROLES)
def crear_cliente():
    try:
        data = request.get_json(force=True, silent=True)
        current_user = getattr(g, 'current_user', {})

        if not data:
            return jsonify({'success': False, 'message': 'Cuerpo de la solicitud vacío.'}), 400

        campos_requeridos = ['nombre', 'apellido', 'tipo_documento', 'numero_documento']
        faltantes = [c for c in campos_requeridos if not data.get(c)]
        if faltantes:
            return jsonify({'success': False, 'message': f'Faltan campos: {", ".join(faltantes)}.'}), 400

        tipo_doc = data.get('tipo_documento', '').strip().upper()
        numero_doc = str(data.get('numero_documento', '')).strip()

        error_doc = _validar_documento(tipo_doc, numero_doc)
        if error_doc:
            return jsonify({'success': False, 'message': error_doc}), 400

        cliente = Cliente(
            nombre=data['nombre'].strip(),
            apellido=data['apellido'].strip(),
            tipo_documento=tipo_doc,
            numero_documento=numero_doc,
            email=data.get('email', '').strip().lower(),
            telefono=data.get('telefono', '').strip(),
            direccion=data.get('direccion', '').strip(),
            distrito=data.get('distrito', '').strip(),
            referencia=data.get('referencia', '').strip(),
            registrado_por=current_user.get('usuario', 'sistema')
        )

        errores_modelo = cliente.validate()
        if errores_modelo:
            return jsonify({'success': False, 'message': errores_modelo[0]}), 400

        datos_cliente = {
            'nombre': cliente.nombre,
            'apellido': cliente.apellido,
            'tipo_documento': cliente.tipo_documento,
            'numero_documento': cliente.numero_documento,
            'email': cliente.email,
            'telefono': cliente.telefono,
            'direccion': cliente.direccion,
            'distrito': cliente.distrito,
            'referencia': cliente.referencia,
            'estado': cliente.estado,
            'registrado_por': cliente.registrado_por,
            'tipo_cliente': data.get('tipo_cliente', 'Residencial'),
        }

        resultado = firebase_service.crear_cliente(datos_cliente)

        if resultado.get('success'):
            cliente_id = resultado.get('id')

            # Crear servicio inicial robusto y seguro si viene en el payload
            servicio_inicial = data.get('servicio_inicial')
            if servicio_inicial and cliente_id:
                
                # Helpers defensivos para evitar caídas por valores nulos, vacíos o NaN
                def parser_float(val, default=0.0):
                    try:
                        if val is None or str(val).strip().lower() in ['nan', 'null', 'undefined', '']:
                            return default
                        return float(val)
                    except (ValueError, TypeError):
                        return default

                def parser_int(val, default=15):
                    try:
                        if val is None or str(val).strip().lower() in ['nan', 'null', 'undefined', '']:
                            return default
                        return int(float(val))
                    except (ValueError, TypeError):
                        return default

                datos_servicio = {
                    'cliente_id': cliente_id, # Guardamos ambos para consistencia absoluta con los filtros
                    'id_cliente': cliente_id, 
                    'id_plan': servicio_inicial.get('id_plan') or '',
                    'plan_nombre': servicio_inicial.get('plan_nombre', ''),
                    'monto': parser_float(servicio_inicial.get('monto')),
                    'costo_adicional': parser_float(servicio_inicial.get('costo_adicional')),
                    'servicios_adicionales': servicio_inicial.get('servicios_adicionales') or 'Ninguno',
                    'fecha_inicio': servicio_inicial.get('fecha_inicio') or datetime.now(timezone.utc).isoformat()[:10],
                    'ciclo_facturacion': parser_int(servicio_inicial.get('ciclo_facturacion')),
                    'estado': servicio_inicial.get('estado') or 'Instalacion',
                    'observaciones': servicio_inicial.get('observaciones', ''),
                }
                
                res_serv = firebase_service.crear_servicio(datos_servicio)
                if not res_serv.get('success'):
                    logger.error(f"[Clientes] Falló la creación silenciosa de servicio inicial para {cliente_id}: {res_serv.get('message')}")

            return jsonify(resultado), 201

        return jsonify(resultado), 400

    except Exception as e:
        logger.exception("[Clientes] Error inesperado en crear_cliente")
        return jsonify({'success': False, 'message': 'Error interno al registrar cliente.', 'errors': [str(e)]}), 500


@clientes_bp.route('/<cliente_id>', methods=['PUT'])
@token_required
@role_required(TODOS_LOS_ROLES)
def actualizar_cliente(cliente_id):
    try:
        data = request.get_json(force=True, silent=True)
        current_user = getattr(g, 'current_user', {})

        if not data:
            return jsonify({'success': False, 'message': 'Datos vacíos.'}), 400

        cliente_id = _sanitizar_texto(cliente_id, 50)

        if 'numero_documento' in data or 'tipo_documento' in data:
            tipo_doc = data.get('tipo_documento', '').strip().upper()
            numero_doc = str(data.get('numero_documento', '')).strip()
            if tipo_doc and numero_doc:
                error_doc = _validar_documento(tipo_doc, numero_doc)
                if error_doc:
                    return jsonify({'success': False, 'message': error_doc}), 400
                data['tipo_documento'] = tipo_doc
                data['numero_documento'] = numero_doc

        data['actualizado_por'] = current_user.get('usuario', 'sistema')

        resultado = firebase_service.actualizar_cliente(cliente_id, data)
        status = 200 if resultado.get('success') else 400
        return jsonify(resultado), status

    except Exception as e:
        logger.exception(f"[Clientes] Error actualizando cliente {cliente_id}")
        return jsonify({'success': False, 'message': 'Error interno', 'errors': [str(e)]}), 500


@clientes_bp.route('/<cliente_id>', methods=['DELETE'])
@token_required
@role_required(ROLES_SUPERVISION)
def eliminar_cliente(cliente_id):
    try:
        cliente_id = _sanitizar_texto(cliente_id, 50)
        resultado = firebase_service.eliminar_cliente(cliente_id)
        status = 200 if resultado.get('success') else 400
        return jsonify(resultado), status
    except Exception as e:
        logger.exception(f"[Clientes] Error eliminando cliente {cliente_id}")
        return jsonify({'success': False, 'message': 'Error interno', 'errors': [str(e)]}), 500


@clientes_bp.route('/importar-ml', methods=['POST'])
@token_required
@role_required(ROLES_SUPERVISION)
def importar_clientes_ml():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No se envió ningún archivo.'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'Nombre de archivo vacío.'}), 400

        # Leer archivo Excel en un DataFrame de Pandas
        df = pd.read_excel(file)

        importados = 0
        corregidos = 0
        omitivos = 0
        detalles_correcciones = []

        # Contadores de Calidad de Datos
        analizados = 0
        campos_incompletos = 0
        errores_tipograficos = 0
        duplicados = 0
        dni_invalidos = 0
        inconsistencias_logicas = 0
        distritos_corregidos = 0
        planes_autocompletados = 0
        descartados = 0

        seen_docs = set()

        current_user = getattr(g, 'current_user', {})
        usuario_sistema = current_user.get('usuario', 'sistema')

        for index, row in df.iterrows():
            analizados += 1

            nombre = str(row.get('Nombre', '')).strip()
            apellido = str(row.get('Apellido', '')).strip()
            tipo_documento = str(row.get('Tipo Documento', 'DNI')).strip().upper()
            numero_documento = str(row.get('Documento', '')).strip()
            telefono = str(row.get('Telefono', '')).strip()
            direccion = str(row.get('Direccion', '')).strip()
            distrito_sucio = str(row.get('Distrito', '')).strip()
            monto_raw = row.get('Monto')
            plan_raw = row.get('Plan')

            # --- CÁLCULO DE MÉTRICAS DE CALIDAD ---

            # 1. Información incompleta (campos obligatorios vacíos de acuerdo a las reglas del sistema)
            campos_obligatorios = [nombre, apellido, tipo_documento, numero_documento]
            if any(not c or c.lower() == 'nan' for c in campos_obligatorios):
                campos_incompletos += 1

            # 2. Documentos inválidos (formato: dígitos e indicativos de longitud)
            if numero_documento and numero_documento.lower() != 'nan':
                if not numero_documento.isdigit() or (tipo_documento == 'DNI' and len(numero_documento) != 8) or (tipo_documento == 'RUC' and len(numero_documento) != 11):
                    dni_invalidos += 1

            # 3. Registros duplicados (identificador de documento único en el lote)
            if numero_documento and numero_documento.lower() != 'nan':
                if numero_documento in seen_docs:
                    duplicados += 1
                else:
                    seen_docs.add(numero_documento)

            # 4. Inconsistencias lógicas
            es_inconsistente = False
            # Tipo de documento incompatible con su longitud
            if numero_documento and numero_documento.lower() != 'nan':
                if (tipo_documento == 'DNI' and len(numero_documento) != 8) or (tipo_documento == 'RUC' and len(numero_documento) != 11):
                    es_inconsistente = True
            # Correspondencia incorrecta entre Plan y Monto cuando ambos están presentes
            if plan_raw and not pd.isna(plan_raw) and monto_raw and not pd.isna(monto_raw):
                try:
                    monto_val = float(monto_raw)
                    plan_str = str(plan_raw).strip().lower()
                    if "básico" in plan_str or "basico" in plan_str:
                        if abs(monto_val - 50.0) >= 5.0:
                            es_inconsistente = True
                    elif "estándar" in plan_str or "estandar" in plan_str:
                        if abs(monto_val - 80.0) >= 5.0:
                            es_inconsistente = True
                    elif "premium" in plan_str:
                        if abs(monto_val - 120.0) >= 5.0:
                            es_inconsistente = True
                except Exception:
                    pass
            if es_inconsistente:
                inconsistencias_logicas += 1

            # 1. Validaciones críticas (Filtrado de datos corruptos)
            if not nombre or nombre.lower() == 'nan' or not numero_documento or numero_documento.lower() == 'nan':
                omitivos += 1
                descartados += 1
                continue
                
            if not numero_documento.isdigit() or len(numero_documento) not in [8, 11]:
                omitivos += 1
                descartados += 1
                continue # Omitir DNI corrupto con letras o longitud errónea

            # 2. Aplicar corrección ortográfica de distritos (NLP ligero)
            distrito_limpio, fue_corregido = corregir_distrito(distrito_sucio)
            if fue_corregido:
                corregidos += 1
                distritos_corregidos += 1
                errores_tipograficos += 1  # Errores ortográficos corregidos con similitud de cadenas (difflib)
                detalles_correcciones.append(f"Fila {index+2}: Corregido distrito '{distrito_sucio}' a '{distrito_limpio}'")

            # 3. Aplicar imputación de plan/monto
            monto, id_plan, plan_nombre = imputar_plan_y_monto(monto_raw, plan_raw)
            if not plan_raw or str(plan_raw).lower() == 'nan':
                planes_autocompletados += 1
                detalles_correcciones.append(f"Fila {index+2}: Se autodetectó el plan '{plan_nombre}' para el precio S/ {monto}")

            # 4. Guardar Cliente en Firestore
            datos_cliente = {
                'nombre': nombre,
                'apellido': apellido,
                'tipo_documento': tipo_documento,
                'numero_documento': numero_documento,
                'email': str(row.get('Email', '')).strip().lower(),
                'telefono': telefono,
                'direccion': f"{direccion}, {distrito_limpio}, Lima, Lima",
                'distrito': distrito_limpio,
                'estado': 'Activo',
                'registrado_por': usuario_sistema,
                'tipo_cliente': 'Residencial',
                'fecha_registro': datetime.now(timezone.utc).isoformat()
            }
            
            res_cli = firebase_service.crear_cliente(datos_cliente)
            
            if res_cli.get('success'):
                cliente_id = res_cli.get('id')
                # Crear su servicio/factura asociada
                datos_servicio = {
                    'cliente_id': cliente_id,
                    'id_cliente': cliente_id,
                    'id_plan': id_plan,
                    'plan_nombre': plan_nombre,
                    'monto': monto,
                    'costo_adicional': 0.0,
                    'servicios_adicionales': 'Ninguno',
                    'fecha_inicio': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    'ciclo_facturacion': 15,
                    'estado': 'Pendiente Pago',
                    'fecha_creacion': datetime.now(timezone.utc).isoformat()
                }
                firebase_service.crear_servicio(datos_servicio)
                importados += 1
            else:
                omitivos += 1
                descartados += 1

        return jsonify({
            'success': True,
            'resumen': {
                'analizados': analizados,
                'importados': importados,
                'campos_incompletos': campos_incompletos,
                'errores_tipograficos': errores_tipograficos,
                'duplicados': duplicados,
                'dni_invalidos': dni_invalidos,
                'inconsistencias_logicas': inconsistencias_logicas,
                'distritos_corregidos': distritos_corregidos,
                'planes_autocompletados': planes_autocompletados,
                'descartados': descartados,
                'detalles': detalles_correcciones
            }
        }), 200

    except Exception as e:
        logger.exception("[Clientes] Error en importación con ML")
        return jsonify({'success': False, 'message': f'Error interno en el procesamiento: {str(e)}'}), 500