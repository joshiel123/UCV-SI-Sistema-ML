/**
 * clientes.js — Gestión de clientes
 * Cable Latín — Frontend
 *
 * Consume ClientesAPI (api.js). No accede directamente a Firebase.
 */

// ===================== ESTADO MÓDULO =====================

let _todosLosClientes  = [];
let _clientesFiltrados = [];
let _paginaActual      = 1;
let _itemsPorPagina    = 10;


// ===================== INICIALIZACIÓN =====================

document.addEventListener('DOMContentLoaded', async () => {

    const autorizado = await AuthAPI.protegerPagina();
    if (!autorizado) return;

    _inicializarSidebarEmbebido();
    await _cargarClientes();
    _inicializarControles();
    _inicializarFormularios();
});


// ===================== CARGA DE DATOS =====================

async function _cargarClientes() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:30px; color:#6c757d;">
                <i class="fas fa-spinner fa-spin"></i> Cargando clientes...
            </td>
        </tr>`;

    try {
        const respuesta = await ClientesAPI.listar();

        if (!respuesta || !respuesta.success) {
            _renderizarError(tbody, respuesta?.message || 'No se pudieron cargar los clientes.');
            return;
        }

        _todosLosClientes = respuesta.data || [];
        _aplicarFiltrosYRenderizar();

    } catch (error) {
        console.error('[Clientes] Error cargando clientes:', error);
        _renderizarError(tbody, 'Error de conexión con el servidor.');
    }
}


// ===================== FILTRADO Y PAGINACIÓN =====================

function _aplicarFiltrosYRenderizar() {
    const termino = (document.getElementById('search-table')?.value || '').toLowerCase().trim();

    _clientesFiltrados = _todosLosClientes.filter(c => {
        const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
        const doc            = (c.numero_documento || c.dni || '').toLowerCase();
        return nombreCompleto.includes(termino) || doc.includes(termino);
    });

    _paginaActual = 1;
    _renderizarPaginaActual();
}

function _renderizarPaginaActual() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    const total      = _clientesFiltrados.length;
    const totalPags  = Math.ceil(total / _itemsPorPagina) || 1;
    _paginaActual    = Math.max(1, Math.min(_paginaActual, totalPags));

    const inicio     = (_paginaActual - 1) * _itemsPorPagina;
    const fin        = inicio + _itemsPorPagina;
    const pagina     = _clientesFiltrados.slice(inicio, fin);

    tbody.innerHTML  = '';

    if (pagina.length === 0) {
        const msg = document.getElementById('search-table')?.value
            ? 'No se encontraron clientes con ese criterio.'
            : 'No hay clientes registrados.';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#6c757d;">${msg}</td></tr>`;
    } else {
        pagina.forEach(c => tbody.appendChild(_crearFilaCliente(c)));
    }

    _renderizarPaginacion(total, totalPags);
}

function _crearFilaCliente(cliente) {
    const uid    = cliente.id || '';
    const doc    = _esc(cliente.numero_documento || cliente.dni || 'N/A');
    const nombre = `${_esc(cliente.apellido || '')}, ${_esc(cliente.nombre || '')}`.replace(/^,\s*$/, 'N/A');
    const estado = (cliente.estado || 'inactivo').toLowerCase();

    const claseEstado = {
        activo:     'activo',
        suspendido: 'suspendido',
        inactivo:   'inactivo',
        cortado:    'cortado',
        pendiente:  'pendiente',
        instalacion:'instalacion'
    }[estado] || 'inactivo';

    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td>${_esc(uid.substring(0, 8))}...</td>
        <td><div class="user-photo-placeholder"><i class="fas fa-user"></i></div></td>
        <td>${doc}</td>
        <td>${nombre}</td>
        <td>${_esc(cliente.telefono || 'N/A')}</td>
        <td>${_esc((cliente.direccion || 'N/A').substring(0, 30))}${(cliente.direccion || '').length > 30 ? '...' : ''}</td>
        <td><span class="status-pill ${claseEstado}">${_esc(cliente.estado || 'N/A')}</span></td>
        <td class="table-actions">
            <button class="btn-icon edit"    title="Editar Cliente"  data-id="${uid}"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn-icon service" title="Editar Servicio" data-id="${uid}" data-nombre="${nombre}"><i class="fas fa-wifi"></i></button>
            <button class="btn-icon delete"  title="Desactivar"      data-id="${uid}" data-nombre="${nombre}"><i class="fas fa-trash-alt"></i></button>
        </td>
    `;

    fila.querySelector('.edit').addEventListener('click',    () => _abrirModalEditarCliente(cliente));
    fila.querySelector('.service').addEventListener('click', () => _abrirModalEditarServicio(uid, nombre));
    fila.querySelector('.delete').addEventListener('click',  () => _confirmarDesactivar(uid, nombre));

    return fila;
}

function _renderizarPaginacion(total, totalPags) {
    const footerInfo = document.getElementById('footer-info');
    const paginacion = document.getElementById('pagination');
    if (!footerInfo || !paginacion) return;

    const inicio = total === 0 ? 0 : (_paginaActual - 1) * _itemsPorPagina + 1;
    const fin    = Math.min(_paginaActual * _itemsPorPagina, total);
    footerInfo.textContent = `Mostrando ${inicio} a ${fin} de ${total} registros`;

    const pageNumbers = paginacion.querySelector('#page-numbers');
    const prevLink    = paginacion.querySelector('[data-action="prev"]');
    const nextLink    = paginacion.querySelector('[data-action="next"]');
    if (!pageNumbers || !prevLink || !nextLink) return;

    pageNumbers.innerHTML = '';

    const maxPags = 5;
    let desde = Math.max(1, _paginaActual - Math.floor(maxPags / 2));
    let hasta  = Math.min(totalPags, desde + maxPags - 1);
    if (hasta - desde + 1 < maxPags) desde = Math.max(1, hasta - maxPags + 1);

    if (desde > 1) {
        pageNumbers.appendChild(_crearLinkPagina(1));
        if (desde > 2) pageNumbers.appendChild(_crearEllipsis());
    }

    for (let i = desde; i <= hasta; i++) {
        const link = _crearLinkPagina(i);
        if (i === _paginaActual) link.classList.add('active');
        pageNumbers.appendChild(link);
    }

    if (hasta < totalPags) {
        if (hasta < totalPags - 1) pageNumbers.appendChild(_crearEllipsis());
        pageNumbers.appendChild(_crearLinkPagina(totalPags));
    }

    prevLink.classList.toggle('disabled', _paginaActual === 1);
    nextLink.classList.toggle('disabled', _paginaActual >= totalPags);

    paginacion.querySelectorAll('.page-link').forEach(link => {
        const nuevo = link.cloneNode(true);
        link.parentNode.replaceChild(nuevo, link);
        if (!nuevo.classList.contains('disabled') && !nuevo.classList.contains('ellipsis')) {
            nuevo.addEventListener('click', e => {
                e.preventDefault();
                const accion = nuevo.dataset.action;
                const pagina = nuevo.dataset.page;
                if (accion === 'prev')       _paginaActual--;
                else if (accion === 'next')  _paginaActual++;
                else if (pagina)             _paginaActual = parseInt(pagina, 10);
                _renderizarPaginaActual();
            });
        }
    });
}

function _crearLinkPagina(num) {
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = num;
    a.classList.add('page-link');
    a.dataset.page = num;
    return a;
}

function _crearEllipsis() {
    const s = document.createElement('span');
    s.textContent = '...';
    s.classList.add('ellipsis');
    s.style.cssText = 'padding:6px 10px;color:#6c757d;';
    return s;
}


// ===================== MODAL EDITAR CLIENTE =====================

function _abrirModalEditarCliente(cliente) {
    const form = document.getElementById('form-editar-cliente');
    if (!form) return;
    form.reset();

    document.getElementById('edit-cliente-id').value         = cliente.id        || '';
    document.getElementById('edit-nombre').value             = cliente.nombre    || '';
    document.getElementById('edit-apellido').value           = cliente.apellido  || '';
    document.getElementById('edit-dni').value                = cliente.numero_documento || cliente.dni || '';
    document.getElementById('edit-email').value              = cliente.email     || '';
    document.getElementById('edit-telefono').value           = cliente.telefono  || '';
    document.getElementById('edit-estado-cliente').value     = cliente.estado    || 'Activo';
    document.getElementById('edit-direccion').value          = cliente.direccion || '';
    document.getElementById('edit-referencia').value         = cliente.referencia || '';

    const tipoCliente = cliente.tipo_cliente || 'Residencia';
    form.querySelectorAll('input[name="tipo_cliente"]').forEach(r => {
        r.checked = r.value === tipoCliente;
    });

    openModal('modal-editar-cliente');
}


// ===================== MODAL EDITAR SERVICIO =====================

function _hidratarOpcionesPlanes(elementoSelect, idPlanSeleccionado) {
    if (!elementoSelect) return;
    
    const planes = [
        { id: 'basico_cable', nombre: 'Plan Básico Cable', precio: '50.00' },
        { id: 'estandar_cable', nombre: 'Plan Estándar Cable', precio: '75.00' },
        { id: 'estelar_cable', nombre: 'Plan Estelar Cable', precio: '110.00' },
        { id: 'duo_basico', nombre: 'Dúo Básico (Cable + 50Mbps)', precio: '90.00' },
        { id: 'duo_avanzado',  nombre: 'Duo Avanzado (Cable + 100Mbps)', precio: '130.00' }
    ];

    elementoSelect.innerHTML = '<option value="">-- Seleccione Plan --</option>';
    planes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.dataset.price = p.precio;
        opt.textContent = `${p.nombre} (S/ ${p.precio})`;
        if (p.id === idPlanSeleccionado) {
            opt.selected = true;
        }
        elementoSelect.appendChild(opt);
    });
}

async function _abrirModalEditarServicio(clienteId, nombreCliente) {
    const form     = document.getElementById('form-editar-servicio');
    const nombreEl = document.getElementById('edit-servicio-nombre-cliente');
    const selectPlan = document.getElementById('edit-plan-tipo');
    if (!form) return;

    form.reset();
    if (nombreEl) nombreEl.textContent = nombreCliente;

    try {
        const respuesta = await FacturasAPI.listar({ cliente_id: clienteId });

        if (!respuesta?.success || !respuesta.data?.length) {
            _mostrarNotificacion('info', 'Sin Servicio', 'Este cliente no tiene un servicio asociado registrado.');
            return;
        }

        const servicio = respuesta.data[0];

        _hidratarOpcionesPlanes(selectPlan, servicio.id_plan);

        document.getElementById('edit-servicio-doc-id').value       = servicio.id                    || '';
        document.getElementById('edit-servicio-cliente-id').value   = clienteId;
        document.getElementById('edit-precio-plan').value           = servicio.monto                 || '0.00';
        document.getElementById('edit-servicios-adicionales').value = servicio.servicios_adicionales || 'Ninguno';
        document.getElementById('edit-costo-adicional').value       = servicio.costo_adicional       || '0.00';
        document.getElementById('edit-fecha-inicio').value          = servicio.fecha_inicio          || '';
        document.getElementById('edit-ciclo-facturacion').value     = servicio.ciclo_facturacion     || '';
        document.getElementById('edit-estado-servicio').value       = servicio.estado               || 'Activo';
        document.getElementById('edit-observaciones-tecnicas').value = servicio.observaciones        || '';

        openModal('modal-editar-servicio');

    } catch (error) {
        console.error('[Clientes] Error cargando servicio:', error);
        _mostrarNotificacion('error', 'Error', 'No se pudo cargar el servicio del cliente.');
    }
}


// ===================== CONFIRMAR DESACTIVAR =====================

function _confirmarDesactivar(clienteId, nombre) {
    const msgEl = document.getElementById('confirm-message');
    const btnEl = document.getElementById('confirm-action-button');
    if (!msgEl || !btnEl) return;

    msgEl.innerHTML = `Está a punto de desactivar al cliente <strong>${_esc(nombre)}</strong>. El cliente pasará a estado Inactivo.`;

    btnEl.onclick = async () => {
        closeModal('modal-confirm');
        await _desactivarCliente(clienteId, nombre);
    };

    openModal('modal-confirm');
}

async function _desactivarCliente(clienteId, nombre) {
    try {
        const respuesta = await ClientesAPI.eliminar(clienteId);

        if (respuesta?.success) {
            _mostrarNotificacion('success', 'Cliente Desactivado',
                `El cliente "${_esc(nombre)}" fue desactivado correctamente.`);
            await _cargarClientes();
        } else {
            _mostrarNotificacion('error', 'Error',
                respuesta?.message || 'No se pudo desactivar el cliente.');
        }
    } catch (error) {
        console.error('[Clientes] Error desactivando:', error);
        _mostrarNotificacion('error', 'Error de Conexión', 'No se pudo conectar con el servidor.');
    }
}


// ===================== FORMULARIOS =====================

function _inicializarFormularios() {

    document.getElementById('form-editar-cliente')
        ?.addEventListener('submit', async e => {
            e.preventDefault();
            const fd        = new FormData(e.target);
            const clienteId = fd.get('id');
            if (!clienteId) return;

            const datos = {
                nombre:           fd.get('nombre'),
                apellido:         fd.get('apellido'),
                numero_documento: fd.get('dni'),
                email:            fd.get('correo'),
                telefono:         fd.get('telefono'),
                direccion:        fd.get('direccion'),
                referencia:       fd.get('referencia'),
                estado:           fd.get('estado'),
                tipo_cliente:     e.target.querySelector('input[name="tipoCliente"]:checked')?.value || 'Residencial'
            };

            try {
                const respuesta = await ClientesAPI.actualizar(clienteId, datos);
                if (respuesta?.success) {
                    closeModal('modal-editar-cliente');
                    _mostrarNotificacion('success', 'Cliente Actualizado', 'Datos guardados correctamente.');
                    await _cargarClientes();
                } else {
                    _mostrarNotificacion('error', 'Error', respuesta?.message || 'No se pudo actualizar.');
                }
            } catch (error) {
                console.error('[Clientes] Error actualizando:', error);
                _mostrarNotificacion('error', 'Error de Conexión', 'No se pudo conectar con el servidor.');
            }
        });

    // Formulario de edición de servicios (Reescrito robustamente con selectores DOM nativos directos)
    document.getElementById('form-editar-servicio')
        ?.addEventListener('submit', async e => {
            e.preventDefault();
            
            const servicioId = document.getElementById('edit-servicio-doc-id')?.value;
            if (!servicioId) {
                _mostrarNotificacion('error', 'Error de Formulario', 'No se pudo encontrar el identificador del servicio.');
                return;
            }

            const selectPlan = document.getElementById('edit-plan-tipo');
            const planNombre = selectPlan && selectPlan.selectedIndex >= 0
                ? selectPlan.options[selectPlan.selectedIndex].text.split('(')[0].trim()
                : '';

            const datos = {
                id_plan:               document.getElementById('edit-plan-tipo')?.value || '',
                plan_nombre:           planNombre,
                monto:                 parseFloat(document.getElementById('edit-precio-plan')?.value || 0),
                costo_adicional:       parseFloat(document.getElementById('edit-costo-adicional')?.value || 0),
                servicios_adicionales: document.getElementById('edit-servicios-adicionales')?.value || 'Ninguno',
                fecha_inicio:          document.getElementById('edit-fecha-inicio')?.value || '',
                ciclo_facturacion:     parseInt(document.getElementById('edit-ciclo-facturacion')?.value || 15, 10),
                estado:                document.getElementById('edit-estado-servicio')?.value || 'Activo',
                observaciones:         document.getElementById('edit-observaciones-tecnicas')?.value || ''
            };

            try {
                const respuesta = await FacturasAPI.actualizar(servicioId, datos);
                if (respuesta?.success) {
                    closeModal('modal-editar-servicio');
                    _mostrarNotificacion('success', 'Servicio Actualizado', 'Los datos del servicio se guardaron correctamente.');
                    await _cargarClientes();
                } else {
                    _mostrarNotificacion('error', 'Error', respuesta?.message || 'No se pudo actualizar el servicio.');
                }
            } catch (error) {
                console.error('[Clientes] Error actualizando servicio:', error);
                _mostrarNotificacion('error', 'Error de Conexión', 'No se pudo conectar con el servidor.');
            }
        });
}


// ===================== CONTROLES DE TABLA =====================

function _inicializarControles() {
    document.getElementById('search-table')
        ?.addEventListener('input', _aplicarFiltrosYRenderizar);

    document.getElementById('show-entries')
        ?.addEventListener('change', e => {
            _itemsPorPagina = parseInt(e.target.value, 10);
            _paginaActual   = 1;
            _renderizarPaginaActual();
        });

    // Evento de cambio para actualizar el precio del plan seleccionado en la edición
    const selectPlan = document.getElementById('edit-plan-tipo');
    const inputPrecio = document.getElementById('edit-precio-plan');
    if (selectPlan && inputPrecio) {
        selectPlan.addEventListener('change', () => {
            const selected = selectPlan.options[selectPlan.selectedIndex];
            inputPrecio.value = selected?.dataset?.price || '0.00';
        });
    }
}


// ===================== SIDEBAR EMBEBIDO =====================

function _inicializarSidebarEmbebido() {
    const btnMain = document.getElementById('sidebar-toggle-main');
    const sidebar = document.getElementById('sidebar');
    if (btnMain && sidebar) {
        btnMain.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    document.addEventListener('click', e => {
        if (window.innerWidth > 768) return;
        if (!sidebar || !sidebar.classList.contains('active')) return;
        if (!sidebar.contains(e.target) && !btnMain?.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}


// ===================== MODALES =====================

window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
};

window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
    if (modalId === 'modal-confirm') {
        const btn = document.getElementById('confirm-action-button');
        if (btn) btn.onclick = null;
    }
};

function _mostrarNotificacion(tipo, titulo, mensaje) {
    const modal = document.getElementById('modal-notification');
    if (!modal) return;

    const esExito = tipo === 'success';
    const esInfo  = tipo === 'info';
    const iconClass = esExito ? 'fa-check-circle' : esInfo ? 'fa-info-circle' : 'fa-exclamation-triangle';
    const color     = esExito ? 'var(--success-color)' : esInfo ? 'var(--info-color)' : 'var(--danger-color)';
    const btnClass  = esExito ? 'btn-primary' : esInfo ? 'btn-secondary' : 'btn-danger';

    modal.innerHTML = `
        <div class="modal-content ${esExito ? 'notification-success' : 'notification-error'}">
            <div class="notification-icon" style="color:${color}"><i class="fas ${iconClass}"></i></div>
            <div class="notification-title">${_esc(titulo)}</div>
            <div class="notification-message">${_esc(mensaje)}</div>
            <div class="notification-buttons">
                <button type="button" class="btn ${btnClass}" onclick="closeModal('modal-notification')">Aceptar</button>
            </div>
        </div>`;

    openModal('modal-notification');
}


// ===================== UTILIDADES =====================

function _esc(texto) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(texto ?? '')));
    return d.innerHTML;
}

function _renderizarError(tbody, mensaje) {
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center;padding:30px;color:#dc3545;font-weight:600;">
                <i class="fas fa-exclamation-triangle"></i> ${_esc(mensaje)}
            </td>
        </tr>`;
}


async function importarExcelConML(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Mostrar loader/cargando
    console.log("Procesando Excel con Machine Learning...");
    
    try {
        const token = localStorage.getItem('cl_token');
        const respuestaRaw = await fetch('http://localhost:5000/api/clientes/importar-ml', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const res = await respuestaRaw.json();

        if (res.success) {
            alert(`🤖 Validación Inteligente Finalizada

----------------------------------------

Registros analizados: ${res.resumen.analizados}

Importados correctamente: ${res.resumen.importados}

Información incompleta: ${res.resumen.campos_incompletos}

Errores tipográficos: ${res.resumen.errores_tipograficos}

Registros duplicados: ${res.resumen.duplicados}

Documentos inválidos: ${res.resumen.dni_invalidos}

Inconsistencias lógicas: ${res.resumen.inconsistencias_logicas}

----------------------------------------

Correcciones automáticas

Distritos corregidos: ${res.resumen.distritos_corregidos}

Planes autocompletados: ${res.resumen.planes_autocompletados}

Registros descartados: ${res.resumen.descartados}

----------------------------------------

Proceso completado correctamente.`);
            
            // Recargar la tabla de clientes para ver los nuevos registros
            if (typeof _cargarClientes === 'function') {
                _cargarClientes();
            } else if (typeof cargarClientes === 'function') {
                cargarClientes();
            } else {
                window.location.reload();
            }
        } else {
            alert(`Error en el modelo: ${res.message}`);
        }
    } catch (error) {
        console.error("Error importando:", error);
        alert("Error de conexión con el servidor de Machine Learning.");
    } finally {
        // Limpiar el input para permitir volver a cargar
        event.target.value = '';
    }
}