/**
 * api.js — Servicio Global de Comunicación con el Backend Python
 * Cable Latín — Frontend
 *
 * Centraliza todas las llamadas HTTP al backend Flask.
 */

const API_BASE_URL = 'http://localhost:5000/api';

// ===================== RUTAS DE LA APLICACIÓN =====================
// Detección dinámica del prefijo de ruta para evitar problemas entre desarrollo y producción.
const _basePath = window.location.pathname.includes('/public/') ? '/public' : '';

window.APP_ROUTES = {
    LOGIN: `${_basePath}/login.html`,
    TABLERO: `${_basePath}/tablero.html`
};

// ===================== GESTIÓN DE SESIÓN =====================

const Session = {
    guardar(token, usuario) {
        localStorage.setItem('cl_token', token);
        localStorage.setItem('cl_usuario', JSON.stringify(usuario));
    },

    obtenerToken() {
        return localStorage.getItem('cl_token');
    },

    obtenerUsuario() {
        try {
            return JSON.parse(localStorage.getItem('cl_usuario') || 'null');
        } catch {
            return null;
        }
    },

    estaActiva() {
        return !!localStorage.getItem('cl_token');
    },

    cerrar() {
        localStorage.removeItem('cl_token');
        localStorage.removeItem('cl_usuario');
    },

    tieneRol(...roles) {
        const usuario = this.obtenerUsuario();
        if (!usuario) return false;
        return roles.map(r => r.toLowerCase()).includes((usuario.rol || '').toLowerCase());
    }
};

// ===================== CLIENTE HTTP CENTRAL =====================

async function _fetchAPI(endpoint, opciones = {}) {
    const token = Session.obtenerToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opciones.headers || {})
    };

    const config = {
        ...opciones,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Parseo seguro de respuesta en una sola operación para no bloquear el stream
        let datos = null;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            try {
                datos = await response.json();
            } catch (e) {
                datos = null;
            }
        } else if (contentType.includes('application/vnd.openxmlformats')) {
            datos = await response.blob();
        } else {
            try {
                datos = await response.text();
            } catch (e) {
                datos = null;
            }
        }

        // Manejar sesión expirada o no autorizada (401), exceptuando la ruta de login
        if (response.status === 401) {
            const codigo = datos?.codigo || '';
            const esRutaAutenticacion = endpoint.includes('/auth/login');

            if (!esRutaAutenticacion && (codigo === 'TOKEN_EXPIRADO' || codigo === 'TOKEN_INVALIDO' || !token)) {
                Session.cerrar();
                const url = window.location.href;
                if (!url.includes(window.APP_ROUTES.LOGIN)) {
                    window.location.href = `${window.APP_ROUTES.LOGIN}?razon=sesion_expirada&from=${encodeURIComponent(url)}`;
                }
            }
        }

        return { ok: response.ok, status: response.status, datos };

    } catch (error) {
        console.error(`[API] Error de red en ${endpoint}:`, error);
        throw new Error(`Error de conexión con el servidor: ${error.message}`);
    }
}

// ===================== API DE AUTENTICACIÓN =====================

const AuthAPI = {
    async login(usuario, contrasena) {
        const res = await _fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ usuario, contrasena })
        });

        if (res.ok && res.datos && res.datos.success) {
            Session.guardar(res.datos.token, res.datos.usuario);
        }

        return res.datos;
    },

    logout() {
        Session.cerrar();
        window.location.href = window.APP_ROUTES.LOGIN;
    },

    async verificarSesion() {
        try {
            const res = await _fetchAPI('/auth/verificar-token');
            return res.ok && res.datos?.valido === true;
        } catch {
            return false;
        }
    },

    async protegerPagina(rolesPermitidos = []) {
        if (!Session.estaActiva()) {
            window.location.href = `${window.APP_ROUTES.LOGIN}?razon=sin_sesion`;
            return false;
        }

        if (rolesPermitidos.length > 0) {
            if (!Session.tieneRol(...rolesPermitidos)) {
                alert('No tienes permisos para acceder a esta sección.');
                window.location.href = window.APP_ROUTES.TABLERO;
                return false;
            }
        }

        return true;
    }
};

// ===================== API DE CLIENTES =====================

const ClientesAPI = {
    async listar(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const res = await _fetchAPI(`/clientes/${params ? '?' + params : ''}`);
        return res.datos;
    },

    async obtener(id) {
        const res = await _fetchAPI(`/clientes/${id}`);
        return res.datos;
    },

    async crear(datos) {
        const res = await _fetchAPI('/clientes/', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        return res.datos;
    },

    async actualizar(id, datos) {
        const res = await _fetchAPI(`/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        return res.datos;
    },

    async eliminar(id) {
        const res = await _fetchAPI(`/clientes/${id}`, { method: 'DELETE' });
        return res.datos;
    }
};

// ===================== API DE FACTURAS =====================

const FacturasAPI = {
    async listar(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const res = await _fetchAPI(`/facturas/${params ? '?' + params : ''}`);
        return res.datos;
    },

    async crear(datos) {
        const res = await _fetchAPI('/facturas/crear', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        return res.datos;
    },

    async obtener(id) {
        const res = await _fetchAPI(`/facturas/${id}`);
        return res.datos;
    },

    async actualizar(id, datos) {
        const res = await _fetchAPI(`/facturas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        return res.datos;
    },

    async pagar(id) {
        const res = await _fetchAPI(`/facturas/${id}/pagar`, {
            method: 'PUT'
        });
        return res.datos;
    }
};

// ===================== API DE PAGOS =====================

const PagosAPI = {
    async listar(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const res = await _fetchAPI(`/pagos/${params ? '?' + params : ''}`);
        return res.datos;
    },

    async processar(datos) {
        const res = await _fetchAPI('/pagos/procesar', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        return res.datos;
    }
};

// ===================== API DE REPORTES =====================

const ReportesAPI = {
    async obtenerDashboard() {
        const res = await _fetchAPI('/reportes/dashboard');
        return res.datos;
    },

    async descargarExcel(fechaDesde = '', fechaHasta = '') {
        const params = new URLSearchParams();
        if (fechaDesde) params.append('fechaDesde', fechaDesde);
        if (fechaHasta) params.append('fechaHasta', fechaHasta);

        const token = Session.obtenerToken();
        const url = `${API_BASE_URL}/reportes/generar-excel${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.mensaje || `Error ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Reporte_CableLatin_${new Date().toISOString().slice(0,10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            return { success: true };
        } catch (error) {
            console.error('[API] Error descargando Excel:', error);
            return { success: false, mensaje: error.message };
        }
    }
};

// Exportar todo para uso global en páginas HTML
window.Session      = Session;
window.AuthAPI      = AuthAPI;
window.ClientesAPI  = ClientesAPI;
window.FacturasAPI  = FacturasAPI;
window.PagosAPI     = PagosAPI;
window.ReportesAPI  = ReportesAPI;