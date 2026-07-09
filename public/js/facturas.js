/**
 * facturas.js — Gestión de Búsqueda y Cobro de Facturas
 * Cable Latín — Frontend
 */

let _todasLasFacturas = [];
let _itemsPorPagina = 10;
let _idFacturaSeleccionada = null;

const tableBody = document.getElementById('facturas-table-body');
const filterCliente = document.getElementById('buscar-cliente');
const filterDesde = document.getElementById('date-from');
const filterHasta = document.getElementById('date-to');
const filterResetBtn = document.getElementById('btn-reset-filters');
const showEntriesSelect = document.getElementById('show-entries');

const modal = document.getElementById('payment-modal');
const modalClientName = document.getElementById('modal-client-name');
const modalPaymentAmount = document.getElementById('modal-payment-amount');
const confirmModalBtn = document.getElementById('modal-confirm-btn');

document.addEventListener('DOMContentLoaded', async () => {
    // Proteger página para roles con acceso de facturación
    const autorizado = await AuthAPI.protegerPagina(['administrador', 'vendedor', 'supervisor']);
    if (!autorizado) return;

    cargarFacturas();
    inicializarEventos();
});

async function cargarFacturas() {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando facturas...</td></tr>`;
    try {
        const respuesta = await FacturasAPI.listar();
        if (respuesta && respuesta.success) {
            _todasLasFacturas = respuesta.data || [];
            renderizarTabla(_todasLasFacturas);
        } else {
            renderizarError(respuesta.message || 'Error al recuperar facturas del servidor.');
        }
    } catch (error) {
        renderizarError('No se pudo conectar con el servidor.');
    }
}

function renderizarTabla(facturas) {
    tableBody.innerHTML = '';
    if (facturas.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">No se encontraron facturas registradas.</td></tr>`;
        return;
    }

    facturas.slice(0, _itemsPorPagina).forEach(f => {
        const idCorto = f.id ? f.id.substring(0, 8) + '...' : 'N/A';
        const clienteNombre = esc(`${f.cliente_nombre || 'Cliente Desconocido'}`);
        const clienteDNI = esc(f.cliente_dni || 'N/A');
        const plan = esc(f.plan_nombre || 'N/A');
        const monto = parseFloat(f.monto || 0).toFixed(2);
        
        const fechaCreacion = f.fecha_creacion ? f.fecha_creacion.split('T')[0] : 'N/A';
        const vencimiento = f.fecha_vencimiento || 'N/A';
        const limite = f.fecha_limite || 'N/A';
        
        const estado = (f.estado || 'Pendiente').trim();
        const estadoLower = estado.toLowerCase();
        const esPagada = estadoLower === 'pagada' || estadoLower === 'pagado';
        
        let estadoClass = 'pending';
        if (esPagada) {
            estadoClass = 'active';
        } else if (estadoLower === 'vencida' || estadoLower === 'suspendido' || estadoLower === 'cortado') {
            estadoClass = 'inactive';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><i class="fas fa-file-invoice" style="color: #0d6efd; margin-right: 5px;"></i> ${idCorto}</td>
            <td>${fechaCreacion}</td>
            <td>${clienteDNI}</td>
            <td>${clienteNombre}</td>
            <td>${plan}</td>
            <td><strong>S/ ${monto}</strong></td>
            <td>${vencimiento}</td>
            <td>${limite}</td>
            <td><span class="status-pill ${estadoClass}">${estado}</span></td>
            <td class="table-actions" style="text-align: center;">
                ${!esPagada ? 
                    `<i class="fas fa-dollar-sign icon-success" title="Registrar Pago" data-id="${f.id}" data-cliente="${clienteNombre}" data-monto="${monto}"></i>` : 
                    `<i class="fas fa-check-circle" style="color:#198754; cursor:default;" title="Factura Pagada"></i>`
                }
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function inicializarEventos() {
    // Captura clic en el botón de pagar dentro de la tabla
    tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('.fa-dollar-sign');
        if (target) {
            _idFacturaSeleccionada = target.dataset.id;
            modalClientName.textContent = target.dataset.cliente;
            modalPaymentAmount.textContent = `S/ ${target.dataset.monto}`;
            
            modal.style.display = 'block';
        }
    });

    confirmModalBtn.addEventListener('click', procesarPagoConfirmado);

    // Filtros dinámicos del lado del cliente
    filterCliente.addEventListener('input', filtrarUI);
    filterDesde.addEventListener('change', filtrarUI);
    filterHasta.addEventListener('change', filtrarUI);

    filterResetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        filterCliente.value = '';
        filterDesde.value = '';
        filterHasta.value = '';
        renderizarTabla(_todasLasFacturas);
    });

    showEntriesSelect.addEventListener('change', (e) => {
        _itemsPorPagina = parseInt(e.target.value, 10);
        filtrarUI();
    });
}

async function procesarPagoConfirmado() {
    if (!_idFacturaSeleccionada) return;

    confirmModalBtn.disabled = true;
    confirmModalBtn.innerHTML = 'Procesando... <i class="fas fa-spinner fa-spin"></i>';

    try {
        // Llama de forma segura al endpoint de cobros del Backend Python
        const respuesta = await FacturasAPI.pagar(_idFacturaSeleccionada);
        if (respuesta && respuesta.success) {
            alert('¡Pago registrado con éxito!');
            closePaymentModal();
            cargarFacturas(); // Recarga la grilla actualizada
        } else {
            alert(respuesta.message || 'No se pudo procesar el pago.');
        }
    } catch (error) {
        alert('Error al comunicar con el servidor.');
    } finally {
        confirmModalBtn.disabled = false;
        confirmModalBtn.innerHTML = 'Confirmar Pago';
    }
}

window.closePaymentModal = () => {
    modal.style.display = 'none';
    _idFacturaSeleccionada = null;
};

function filtrarUI() {
    const busqueda = filterCliente.value.toLowerCase().trim();
    const desde = filterDesde.value;
    const hasta = filterHasta.value;

    const filtradas = _todasLasFacturas.filter(f => {
        const cumpleNombre = !busqueda || 
            (f.cliente_nombre || '').toLowerCase().includes(busqueda) || 
            (f.cliente_dni || '').includes(busqueda) ||
            (f.id || '').toLowerCase().includes(busqueda);
            
        const fecha = f.fecha_creacion ? f.fecha_creacion.split('T')[0] : '';
        const cumpleDesde = !desde || fecha >= desde;
        const cumpleHasta = !hasta || fecha <= hasta;

        return cumpleNombre && cumpleDesde && cumpleHasta;
    });

    renderizarTabla(filtradas);
}

function renderizarError(msg) {
    tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--danger-color); padding: 20px; font-weight: 500;"><i class="fas fa-exclamation-triangle"></i> ${esc(msg)}</td></tr>`;
}

function esc(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}