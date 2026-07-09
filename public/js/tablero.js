/**
 * tablero.js — Dashboard principal
 * Cable Latín — Frontend
 */

let _chartActivePlans   = null;
let _chartNewClients    = null;
let _chartIncome        = null;
let _chartInactivePlans = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Proteger página
    const autorizado = await AuthAPI.protegerPagina();
    if (!autorizado) return;

    // 2. Cargar datos del dashboard
    await _cargarDashboard();
});

async function _cargarDashboard() {
    try {
        const respuesta = await ReportesAPI.obtenerDashboard();

        if (!respuesta || !respuesta.success) {
            _mostrarErrorTarjetas(respuesta?.message || 'No se pudieron cargar los datos.');
            return;
        }

        // Resolución tolerante a fallos de traducción de claves de la API
        const datos = respuesta.datos || respuesta.data || {};
        _renderizarTarjetas(datos);
        _renderizarGraficos(datos);

    } catch (error) {
        console.error('[Tablero] Error cargando dashboard:', error);
        _mostrarErrorTarjetas('Error de conexión con el servidor.');
    }
}

function _renderizarTarjetas(datos) {
    _setText('count-clientes',   datos.total_clientes   ?? '0');
    _setText('count-planes',     datos.total_servicios  ?? '0');
    _setText('count-pendientes', datos.servicios_suspendidos ?? '0');
    _setText('count-ingresos',   datos.ingresos_totales != null
        ? `S/ ${parseFloat(datos.ingresos_totales).toFixed(2)}`
        : 'S/ 0.00'
    );
}

function _mostrarErrorTarjetas(mensaje) {
    ['count-clientes', 'count-planes', 'count-pendientes', 'count-ingresos'].forEach(id => {
        _setText(id, 'Error');
    });
    console.warn('[Tablero]', mensaje);
}

function _renderizarGraficos(datos) {
    _renderActivePlans(datos.servicios_por_plan    || {});
    _renderNewClients(datos.clientes_por_mes       || {});
    _renderIncome(datos.ingresos_por_dia           || {});
    _renderInactivePlans(datos.suspendidos_por_plan || {});
}

function _renderActivePlans(serviciosPorPlan) {
    const ctx = document.getElementById('activePlansChart');
    if (!ctx) return;
    if (_chartActivePlans) _chartActivePlans.destroy();

    const labels = Object.keys(serviciosPorPlan);
    const valores = Object.values(serviciosPorPlan);

    if (labels.length === 0) {
        _mostrarMensajeVacio('container-activePlansChart', 'Sin datos de servicios activos');
        return;
    }

    _chartActivePlans = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                label: 'Servicios Activos',
                data: valores,
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#34D399'],
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function _renderNewClients(clientesPorMes) {
    const ctx = document.getElementById('newClientsChart');
    if (!ctx) return;
    if (_chartNewClients) _chartNewClients.destroy();

    const labels = Object.keys(clientesPorMes);
    const valores = Object.values(clientesPorMes);

    if (labels.length === 0) {
        _mostrarMensajeVacio('container-newClientsChart', 'Sin datos de nuevos clientes');
        return;
    }

    _chartNewClients = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Nuevos Clientes',
                data: valores,
                backgroundColor: '#3B82F6',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function _renderIncome(ingresosPorDia) {
    const ctx = document.getElementById('monthlyIncomeChart');
    if (!ctx) return;
    if (_chartIncome) _chartIncome.destroy();

    const labels = Object.keys(ingresosPorDia);
    const valores = Object.values(ingresosPorDia);

    if (labels.length === 0) {
        _mostrarMensajeVacio('container-monthlyIncomeChart', 'Sin datos de ingresos');
        return;
    }

    _chartIncome = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ingresos Diarios (S/)',
                data: valores,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function _renderInactivePlans(suspendidosPorPlan) {
    const ctx = document.getElementById('inactivePlansChart');
    if (!ctx) return;
    if (_chartInactivePlans) _chartInactivePlans.destroy();

    const labels = Object.keys(suspendidosPorPlan);
    const valores = Object.values(suspendidosPorPlan);

    if (labels.length === 0) {
        _mostrarMensajeVacio('container-inactivePlansChart', 'Sin servicios suspendidos');
        return;
    }

    _chartInactivePlans = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: 'Suspendidos por Plan',
                data: valores,
                backgroundColor: ['#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'],
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function _mostrarMensajeVacio(containerId, mensaje) {
    const contenedor = document.getElementById(containerId);
    if (contenedor) {
        contenedor.innerHTML = `<p class="text-center text-gray-400 py-8">${mensaje}</p>`;
    }
}

function _setText(id, valor) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = String(valor ?? '0');
    }
}