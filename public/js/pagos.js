/**
 * pagos.js — Lógica del módulo de Pagos
 * Cable Latín — Frontend
 */

let _todosPagos = [];
let _registrosPorPagina = 20;

const DOM = {
    get tableBody()      { return document.getElementById('pagos-table-body'); },
    get footerInfo()     { return document.getElementById('table-footer-info'); },
    get dateFrom()       { return document.getElementById('date-from'); },
    get dateTo()         { return document.getElementById('date-to'); },
    get searchInput()    { return document.getElementById('search-table-main'); },
    get btnFiltrar()     { return document.getElementById('btn-filtrar'); },
    get btnMostrarTodo() { return document.getElementById('btn-mostrar-todo'); },
    get showEntries()    { return document.getElementById('show-entries'); },
    get btnLogout()      { return document.getElementById('btn-logout'); },
    get navbarUsername() { return document.getElementById('navbar-username'); },
};

document.addEventListener('DOMContentLoaded', async () => {
    // Proteger página (Solo roles administrativos)
    const acceso = await AuthAPI.protegerPagina(['supervisor', 'administrador']);
    if (!acceso) return;

    _mostrarNombreUsuario();
    _registrarEventos();
    await _cargarPagos();
});

function _mostrarNombreUsuario() {
    const usuario = Session.obtenerUsuario();
    if (usuario && DOM.navbarUsername) {
        DOM.navbarUsername.textContent = usuario.nombre || usuario.usuario || '';
    }
}

function _registrarEventos() {
    DOM.btnFiltrar?.addEventListener('click', _aplicarFiltros);
    DOM.btnMostrarTodo?.addEventListener('click', _limpiarFiltros);
    DOM.searchInput?.addEventListener('input', _aplicarBusqueda);
    DOM.showEntries?.addEventListener('change', (e) => {
        _registrosPorPagina = parseInt(e.target.value, 10);
        _renderizarTabla(_obtenerPagosFiltrados());
    });
    DOM.btnLogout?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthAPI.logout();
    });
}

async function _cargarPagos() {
    _mostrarCargando();
    try {
        const respuesta = await PagosAPI.listar();

        if (!respuesta || !respuesta.success) {
            _mostrarError(respuesta?.message || 'Error al obtener el historial de caja.');
            return;
        }

        _todosPagos = Array.isArray(respuesta.data) ? respuesta.data : [];
        _renderizarTabla(_todosPagos);

    } catch (error) {
        console.error('[Pagos] Error de red:', error);
        _mostrarError('No se pudo establecer conexión con el servidor.');
    }
}

function _aplicarFiltros() {
    const desde = DOM.dateFrom?.value || '';
    const hasta = DOM.dateTo?.value || '';

    const pagosFiltrados = _todosPagos.filter((pago) => {
        const fechaPago = (pago.fecha_pago || '').substring(0, 10);
        const cumpleDesde = desde ? fechaPago >= desde : true;
        const cumpleHasta = hasta ? fechaPago <= hasta : true;
        return cumpleDesde && cumpleHasta;
    });

    _renderizarTabla(pagosFiltrados);
}

function _limpiarFiltros() {
    if (DOM.dateFrom)  DOM.dateFrom.value  = '';
    if (DOM.dateTo)    DOM.dateTo.value    = '';
    if (DOM.searchInput) DOM.searchInput.value = '';
    _renderizarTabla(_todosPagos);
}

function _aplicarBusqueda() {
    _renderizarTabla(_obtenerPagosFiltrados());
}

function _obtenerPagosFiltrados() {
    const termino = (DOM.searchInput?.value || '').toLowerCase().trim();
    return _todosPagos.filter(p => {
        const doc = (p.n_documento || p.numero_documento || '').toLowerCase();
        const plan = (p.plan_info?.nombre || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return doc.includes(termino) || plan.includes(termino) || id.includes(termino);
    });
}

function _renderizarTabla(pagos) {
    const tableBody  = DOM.tableBody;
    const footerInfo = DOM.footerInfo;

    if (!tableBody || !footerInfo) return;

    tableBody.innerHTML = '';

    if (!pagos || pagos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="p-6 text-center text-gray-500">
                    No se encontraron pagos registrados en este periodo.
                </td>
            </tr>`;
        footerInfo.textContent = 'Mostrando 0 de 0 registros';
        return;
    }

    // Orden cronológico inverso (Más recientes primero)
    const pagosOrdenados = [...pagos].sort((a, b) => {
        return new Date(b.fecha_pago || 0) - new Date(a.fecha_pago || 0);
    });

    const pagosAMostrar = pagosOrdenados.slice(0, _registrosPorPagina);

    pagosAMostrar.forEach((pago) => {
        tableBody.appendChild(_crearFilaPago(pago));
    });

    footerInfo.textContent = `Mostrando ${pagosAMostrar.length} de ${pagos.length} registros`;
}

function _crearFilaPago(pago) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 border-b border-gray-100';

    const esPagado     = (pago.estado || '').toLowerCase() === 'pagado';
    const estadoClase  = esPagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    
    const idCorto      = (pago.id || 'N/A').substring(0, 8);
    const fechaPago    = _formatearFecha(pago.fecha_pago);
    const documento    = _escaparHTML(pago.n_documento || pago.numero_documento || 'N/A');
    const planNombre   = _escaparHTML(pago.plan_info?.nombre || 'N/A');
    const planPrecio   = parseFloat(pago.plan_info?.precio || pago.monto || 0).toFixed(2);
    const estado       = _escaparHTML(pago.estado || 'N/A');

    tr.innerHTML = `
        <td class="p-4 text-sm text-gray-700 font-mono" title="${_escaparHTML(pago.id || '')}">${idCorto}...</td>
        <td class="p-4 text-sm text-gray-700">${fechaPago}</td>
        <td class="p-4 text-sm text-gray-700">${documento}</td>
        <td class="p-4 text-sm text-gray-700">${planNombre}</td>
        <td class="p-4 text-sm text-gray-700 font-semibold">S/ ${planPrecio}</td>
        <td class="p-4 text-sm">
            <span class="status-pill ${estadoClase} px-3 py-1 rounded-full text-xs font-semibold">
                ${estado}
            </span>
        </td>
    `;

    const tdAccion = document.createElement('td');
    tdAccion.className = 'p-4 text-sm table-actions';

    const btnPDF = document.createElement('button');
    btnPDF.className = 'btn-icon hover:text-blue-600 transition';
    btnPDF.title = 'Generar comprobante PDF';
    btnPDF.innerHTML = '<i class="fas fa-file-pdf text-lg"></i>';
    btnPDF.addEventListener('click', () => generarComprobantePDF(pago));

    tdAccion.appendChild(btnPDF);
    tr.appendChild(tdAccion);

    return tr;
}

function _mostrarCargando() {
    if (!DOM.tableBody) return;
    DOM.tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="p-6 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>Cargando transacciones de caja...
            </td>
        </tr>`;
}

function _mostrarError(mensaje) {
    if (!DOM.tableBody) return;
    DOM.tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="p-6 text-center text-red-600 font-medium">
                <i class="fas fa-exclamation-triangle mr-2"></i>${_escaparHTML(mensaje)}
            </td>
        </tr>`;
    if (DOM.footerInfo) DOM.footerInfo.textContent = 'Error de comunicación';
}

function generarComprobantePDF(pago) {
    if (typeof window.jspdf === 'undefined') {
        alert('Librería de PDF no cargada aún. Intente de nuevo.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ format: 'a6' }); // Tamaño boleta chica

        const idCorto    = (pago.id || 'N/A').substring(0, 8);
        const planNombre = pago.plan_info?.nombre || 'Servicio Cable';
        const precio     = parseFloat(pago.plan_info?.precio || pago.monto || 0).toFixed(2);
        const fecha      = _formatearFecha(pago.fecha_pago);

        // Cabecera Comercial
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('CABLE LATÍN S.A.C', 52, 15, { align: 'center' });
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Servicio de Cable e Internet Banda Ancha', 52, 20, { align: 'center' });

        pdf.setLineWidth(0.3);
        pdf.line(10, 24, 95, 24);

        // Boleta de Venta
        pdf.setFont('helvetica', 'bold');
        pdf.text(`R.U.C. 20601234567`, 10, 30);
        pdf.text(`BOLETA ELECTRÓNICA: B001-${idCorto}`, 10, 35);
        pdf.setFont('helvetica', 'normal');

        pdf.text(`Fecha Emisión: ${fecha}`, 10, 42);
        pdf.text(`DNI Abonado: ${pago.n_documento || pago.numero_documento || 'N/A'}`, 10, 47);

        // Línea divisoria
        pdf.line(10, 52, 95, 52);

        // Tabla
        pdf.autoTable({
            startY: 56,
            margin: { left: 10, right: 10 },
            head: [['Concepto / Plan', 'Importe']],
            body: [[planNombre, `S/ ${precio}`]],
            theme: 'plain',
            styles: { fontSize: 8 },
            headStyles: { fontStyle: 'bold' }
        });

        const totalY = pdf.lastAutoTable.finalY + 12;
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOTAL CANCELADO:', 10, totalY);
        pdf.text(`S/ ${precio}`, 95, totalY, { align: 'right' });

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Representación impresa de la Boleta de Venta Electrónica.', 52, totalY + 15, { align: 'center' });
        pdf.text('Conserve este comprobante para cualquier reclamo técnico.', 52, totalY + 19, { align: 'center' });

        pdf.save(`Boleta-${idCorto}.pdf`);

    } catch (error) {
        console.error('[PDF] Error:', error);
        alert('No se pudo compilar el archivo PDF.');
    }
}

function _formatearFecha(fechaISO) {
    if (!fechaISO) return 'N/A';
    try {
        const d = new Date(fechaISO);
        if (isNaN(d.getTime())) return fechaISO;
        return d.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return fechaISO;
    }
}

function _escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = String(texto ?? '');
    return div.innerHTML;
}