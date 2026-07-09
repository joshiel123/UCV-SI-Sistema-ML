"""
Servicio de Firebase - Conexión y operaciones con Firestore + Firebase Auth REST
Cable Latín - Backend Python
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
import json
import os
import math
import requests as http_requests
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

PROYECTO_ID = os.getenv('PROYECTO_ID', 'cablelatin-prueba')
FIREBASE_WEB_API_KEY = os.getenv('FIREBASE_WEB_API_KEY', '')


def _col_path(db, coleccion: str):
    """Helper para construir la ruta de colección del proyecto."""
    return (db.collection('artifacts')
              .document(PROYECTO_ID)
              .collection('public')
              .document('data')
              .collection(coleccion))


def _safe_float(val, default=0.0) -> float:
    """Conversor robusto a float que previene corrupción de sumas por valores NaN o Inf."""
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


class FirebaseService:
    """Singleton para manejar todas las operaciones con Firebase."""

    _instance = None
    _db = None
    _auth = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Inicializar Firebase Admin SDK."""
        try:
            if not firebase_admin._apps:
                creds_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')
                if os.path.exists(creds_path):
                    cred = credentials.Certificate(creds_path)
                    firebase_admin.initialize_app(cred)
                else:
                    firebase_admin.initialize_app()

            self._db = firestore.client()
            self._auth = auth
            print("✅ Firebase initialized correctly")
        except Exception as e:
            print(f"❌ Error initializing Firebase: {e}")
            raise

    @property
    def db(self):
        return self._db

    @property
    def auth(self):
        return self._auth

    # ===================== AUTENTICACIÓN =====================

    def autenticar_con_firebase_auth(self, email: str, password: str) -> dict:
        api_key = FIREBASE_WEB_API_KEY
        if not api_key:
            return {'success': False, 'message': 'Configuración de Firebase incompleta.'}

        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }

        try:
            resp = http_requests.post(url, json=payload, timeout=10)
            resp_data = resp.json()

            if resp.status_code == 200:
                return {
                    'success': True,
                    'uid': resp_data.get('localId'),
                    'email': resp_data.get('email')
                }
            else:
                error_msg = resp_data.get('error', {}).get('message', 'CREDENCIALES_INVALIDAS')
                if 'INVALID_PASSWORD' in error_msg or 'INVALID_LOGIN_CREDENTIALS' in error_msg:
                    return {'success': False, 'message': 'Contraseña incorrecta.'}
                elif 'EMAIL_NOT_FOUND' in error_msg:
                    return {'success': False, 'message': 'Usuario no encontrado.'}
                elif 'USER_DISABLED' in error_msg:
                    return {'success': False, 'message': 'Cuenta deshabilitada.'}
                elif 'TOO_MANY_ATTEMPTS_TRY_LATER' in error_msg:
                    return {'success': False, 'message': 'Cuenta bloqueada temporalmente.'}
                else:
                    return {'success': False, 'message': f'Error: {error_msg}'}

        except http_requests.exceptions.Timeout:
            return {'success': False, 'message': 'Tiempo de espera agotado.'}
        except Exception as e:
            return {'success': False, 'message': f'Error de red: {str(e)}'}

    # ===================== USUARIOS =====================

    def obtener_usuario_por_username(self, username: str) -> dict | None:
        try:
            docs = _col_path(self._db, 'personal').where('usuario', '==', username).stream()
            for doc in docs:
                return {**doc.to_dict(), 'uid': doc.id}
            return None
        except Exception as e:
            print(f"Error buscando usuario: {e}")
            return None

    def obtener_usuario_por_id(self, uid: str) -> dict | None:
        try:
            doc = _col_path(self._db, 'personal').document(uid).get()
            if doc.exists:
                return {**doc.to_dict(), 'uid': uid}
            return None
        except Exception as e:
            print(f"Error obteniendo usuario: {e}")
            return None

    def crear_usuario(self, email: str, password: str, datos_perfil: dict) -> dict:
        try:
            user = self._auth.create_user(email=email, password=password)
            perfil_data = {
                'email': email,
                'estado': 'Activo',
                'fecha_creacion': datetime.now(timezone.utc).isoformat(),
                **datos_perfil
            }
            _col_path(self._db, 'personal').document(user.uid).set(perfil_data)
            return {'success': True, 'uid': user.uid, 'message': 'Usuario creado exitosamente'}
        except Exception as e:
            return {'success': False, 'uid': None, 'message': str(e)}

    def actualizar_usuario(self, uid: str, datos: dict) -> dict:
        try:
            datos['fecha_actualizacion'] = datetime.now(timezone.utc).isoformat()
            _col_path(self._db, 'personal').document(uid).update(datos)
            return {'success': True, 'message': 'Usuario actualizado'}
        except Exception as e:
            return {'success': False, 'message': 'Error interno', 'errors': [str(e)]}

    def listar_usuarios(self) -> list:
        try:
            usuarios = []
            for doc in _col_path(self._db, 'personal').stream():
                u = doc.to_dict()
                u['uid'] = doc.id
                u.pop('contraseña', None)
                u.pop('contrasena', None)
                usuarios.append(u)
            return usuarios
        except Exception as e:
            print(f"Error listando usuarios: {e}")
            return []

    # ===================== CLIENTES =====================

    def obtener_clientes(self, filtros: dict = None) -> list:
        try:
            query = _col_path(self._db, 'clientes')
            if filtros:
                if 'estado' in filtros:
                    query = query.where('estado', '==', filtros['estado'])
            clientes = []
            for doc in query.stream():
                c = doc.to_dict()
                c['id'] = doc.id
                clientes.append(c)
            return clientes
        except Exception as e:
            print(f"Error obteniendo clientes: {e}")
            return []

    def obtener_cliente_por_id(self, cliente_id: str) -> dict | None:
        try:
            doc = _col_path(self._db, 'clientes').document(cliente_id).get()
            if doc.exists:
                return {**doc.to_dict(), 'id': doc.id}
            return None
        except Exception as e:
            print(f"Error obteniendo cliente: {e}")
            return None

    def crear_cliente(self, datos_cliente: dict) -> dict:
        try:
            ref = _col_path(self._db, 'clientes').document()
            datos_cliente['fecha_registro'] = datetime.now(timezone.utc).isoformat()
            datos_cliente['estado'] = datos_cliente.get('estado', 'Activo')
            ref.set(datos_cliente)
            return {'success': True, 'id': ref.id, 'message': 'Cliente registrado exitosamente'}
        except Exception as e:
            return {'success': False, 'message': 'Error interno', 'errors': [str(e)]}

    def actualizar_cliente(self, cliente_id: str, datos: dict) -> dict:
        try:
            datos['fecha_actualizacion'] = datetime.now(timezone.utc).isoformat()
            _col_path(self._db, 'clientes').document(cliente_id).update(datos)
            return {'success': True, 'message': 'Cliente actualizado'}
        except Exception as e:
            return {'success': False, 'message': 'Error interno', 'errors': [str(e)]}

    def eliminar_cliente(self, cliente_id: str) -> dict:
        try:
            _col_path(self._db, 'clientes').document(cliente_id).update({
                'estado': 'Inactivo',
                'fecha_baja': datetime.now(timezone.utc).isoformat()
            })
            return {'success': True, 'message': 'Cliente desactivado'}
        except Exception as e:
            return {'success': False, 'message': 'Error interno', 'errors': [str(e)]}

    # ===================== SERVICIOS / FACTURAS =====================

    def obtener_servicios(self, filtros: dict = None) -> list:
        """Obtener servicios/facturas con filtros opcionales."""
        try:
            query = _col_path(self._db, 'servicios_clientes')
            if filtros:
                if 'estado' in filtros:
                    query = query.where('estado', '==', filtros['estado'])
                
                # Tolerancia de filtros: busca por cliente_id e id_cliente
                if 'cliente_id' in filtros:
                    query = query.where('cliente_id', '==', filtros['cliente_id'])
                elif 'id_cliente' in filtros:
                    query = query.where('id_cliente', '==', filtros['id_cliente'])
                    
            servicios = []
            for doc in query.stream():
                s = doc.to_dict()
                s['id'] = doc.id
                servicios.append(s)
            return servicios
        except Exception as e:
            print(f"Error obteniendo servicios: {e}")
            return []

    def obtener_servicio_por_id(self, servicio_id: str) -> dict | None:
        try:
            doc = _col_path(self._db, 'servicios_clientes').document(servicio_id).get()
            if doc.exists:
                return {**doc.to_dict(), 'id': doc.id}
            return None
        except Exception as e:
            print(f"Error obteniendo servicio: {e}")
            return None

    def crear_servicio(self, datos_servicio: dict) -> dict:
        try:
            ref = _col_path(self._db, 'servicios_clientes').document()
            datos_servicio['fecha_creacion'] = datetime.now(timezone.utc).isoformat()
            datos_servicio['estado'] = datos_servicio.get('estado', 'Pendiente')
            ref.set(datos_servicio)
            return {'success': True, 'id': ref.id, 'message': 'Servicio creado'}
        except Exception as e:
            print(f"Error en crear_servicio: {e}")
            return {'success': False, 'message': 'Error interno al registrar servicio.', 'errors': [str(e)]}

    def actualizar_servicio(self, servicio_id: str, datos: dict) -> dict:
        try:
            datos['fecha_actualizacion'] = datetime.now(timezone.utc).isoformat()
            _col_path(self._db, 'servicios_clientes').document(servicio_id).update(datos)
            return {'success': True, 'message': 'Servicio actualizado'}
        except Exception as e:
            return {'success': False, 'message': 'Error interno', 'errors': [str(e)]}

    # ===================== PAGOS =====================

    def obtener_pagos(self, filtros: dict = None) -> list:
        try:
            query = _col_path(self._db, 'pagos')
            if filtros and 'servicio_id' in filtros:
                query = query.where('servicio_id', '==', filtros['servicio_id'])
            pagos = []
            for doc in query.stream():
                p = doc.to_dict()
                p['id'] = doc.id
                pagos.append(p)
            return pagos
        except Exception as e:
            print(f"Error obteniendo pagos: {e}")
            return []

    def registrar_pago(self, servicio_id: str, datos_pago: dict) -> dict:
        try:
            monto_val = _safe_float(datos_pago.get('monto'))

            _col_path(self._db, 'servicios_clientes').document(servicio_id).update({
                'estado': 'Activo',
                'fecha_ultimo_pago': datetime.now(timezone.utc).isoformat(),
                'monto_pagado': monto_val
            })

            pago_ref = _col_path(self._db, 'pagos').document()
            datos_pago['servicio_id'] = servicio_id
            datos_pago['fecha_pago']  = datos_pago.get('fecha_pago') or datetime.now(timezone.utc).isoformat()
            pago_ref.set(datos_pago)

            return {'success': True, 'id': pago_ref.id, 'message': 'Pago registrado exitosamente.'}
        except Exception as e:
            print(f"Error en registrar_pago: {e}")
            return {'success': False, 'message': 'Error interno de base de datos.', 'errors': [str(e)]}

    # ===================== REPORTES =====================

    def obtener_datos_reporte(self, fecha_desde: str = None, fecha_hasta: str = None) -> dict:
        try:
            clientes = self.obtener_clientes()
            servicios = self.obtener_servicios()
            pagos = self.obtener_pagos()

            if fecha_desde:
                servicios = [s for s in servicios if s.get('fecha_creacion', '') >= fecha_desde]
                pagos     = [p for p in pagos     if p.get('fecha_pago', '')    >= fecha_desde]
            if fecha_hasta:
                fecha_hasta_completa = fecha_hasta + 'T23:59:59'
                servicios = [s for s in servicios if s.get('fecha_creacion', '') <= fecha_hasta_completa]
                pagos     = [p for p in pagos     if p.get('fecha_pago', '')    <= fecha_hasta_completa]

            return {'clientes': clientes, 'servicios': servicios, 'pagos': pagos}
        except Exception as e:
            print(f"Error obteniendo datos de reporte: {e}")
            return {'clientes': [], 'servicios': [], 'pagos': []}

    def obtener_resumen_dashboard(self) -> dict:
        """Obtener datos de resumen para el dashboard."""
        try:
            clientes  = self.obtener_clientes()
            servicios = self.obtener_servicios()
            pagos     = self.obtener_pagos()

            total_clientes = len(clientes)

            total_servicios_activos = sum(
                1 for s in servicios
                if str(s.get('estado', '')).lower() in ['activo', 'instalacion', 'instalación', 'pagado', 'pagada']
            )

            servicios_suspendidos = sum(
                1 for s in servicios
                if str(s.get('estado', '')).lower() in ['suspendido', 'cortado']
            )

            ingresos_totales = 0.0
            for p in pagos:
                plan_info = p.get('plan_info') or {}
                val_pago = (
                    p.get('monto') or
                    p.get('precio') or
                    plan_info.get('precio') or
                    plan_info.get('monto') or
                    0
                )
                ingresos_totales += _safe_float(val_pago)

            ingresos_totales = round(ingresos_totales, 2)

            servicios_por_plan = {}
            for s in servicios:
                if str(s.get('estado', '')).lower() in ['activo', 'instalacion', 'instalación', 'pagado', 'pagada']:
                    plan = (
                        s.get('plan_nombre')
                        or (s.get('plan_info') or {}).get('nombre')
                        or 'Sin Plan'
                    )
                    servicios_por_plan[plan] = servicios_por_plan.get(plan, 0) + 1

            ahora = datetime.now(timezone.utc)
            clientes_por_mes = {}
            for i in range(5, -1, -1):
                mes  = (ahora.month - i - 1) % 12 + 1
                anio = default_year = ahora.year - ((ahora.month - i - 1) // 12)
                nombre_mes = datetime(anio, mes, 1).strftime('%b').capitalize()
                clientes_por_mes[nombre_mes] = 0

            for c in clientes:
                fecha_data = c.get('fecha_registro')
                if not fecha_data:
                    continue
                try:
                    if hasattr(fecha_data, 'seconds'):
                        fecha = datetime.fromtimestamp(fecha_data.seconds, tz=timezone.utc)
                    elif isinstance(fecha_data, str):
                        fecha = datetime.fromisoformat(fecha_data.replace('Z', '+00:00'))
                    else:
                        continue
                    nombre_mes = fecha.strftime('%b').capitalize()
                    if nombre_mes in clientes_por_mes:
                        clientes_por_mes[nombre_mes] += 1
                except Exception:
                    continue

            ingresos_por_dia = {}
            for i in range(30, -1, -1):
                dia = (ahora - timedelta(days=i)).strftime('%Y-%m-%d')
                ingresos_por_dia[dia] = 0.0

            for p in pagos:
                fecha_pago_raw = p.get('fecha_pago')
                if not fecha_pago_raw:
                    continue
                try:
                    if hasattr(fecha_pago_raw, 'seconds'):
                        fecha_pago = datetime.fromtimestamp(fecha_pago_raw.seconds, tz=timezone.utc).strftime('%Y-%m-%d')
                    else:
                        fecha_pago = str(fecha_pago_raw)[:10]
                    if fecha_pago in ingresos_por_dia:
                        plan_info = p.get('plan_info') or {}
                        val_pago  = (
                            p.get('monto') or
                            p.get('precio') or
                            plan_info.get('precio') or
                            plan_info.get('monto') or
                            0
                        )
                        ingresos_por_dia[fecha_pago] = round(
                            ingresos_por_dia[fecha_pago] + _safe_float(val_pago), 2
                        )
                except Exception:
                    continue

            suspendidos_por_plan = {}
            for s in servicios:
                if str(s.get('estado', '')).lower() in ['suspendido', 'cortado']:
                    plan = (
                        s.get('plan_nombre')
                        or (s.get('plan_info') or {}).get('nombre')
                        or 'Sin Plan'
                    )
                    suspendidos_por_plan[plan] = suspendidos_por_plan.get(plan, 0) + 1

            return {
                'total_clientes':        total_clientes,
                'total_servicios':       total_servicios_activos,
                'servicios_suspendidos': servicios_suspendidos,
                'ingresos_totales':      ingresos_totales,
                'servicios_por_plan':    servicios_por_plan,
                'clientes_por_mes':      clientes_por_mes,
                'ingresos_por_dia':      ingresos_por_dia,
                'suspendidos_por_plan':  suspendidos_por_plan,
            }

        except Exception as e:
            print(f"Error en dashboard: {e}")
            return {
                'total_clientes':        0,
                'total_servicios':       0,
                'servicios_suspendidos': 0,
                'ingresos_totales':      0.0,
                'servicios_por_plan':    {},
                'clientes_por_mes':      {},
                'ingresos_por_dia':      {},
                'suspendidos_por_plan':  {},
            }