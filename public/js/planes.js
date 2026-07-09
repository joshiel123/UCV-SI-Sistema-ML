/**
 * planes.js — Gestión de Planes y Servicios
 * Cable Latín — Frontend
 *
 * Conecta directamente con Firebase SDK para operaciones en tiempo real sobre la colección 'planes'.
 * La autenticación es anónima para permitir el acceso de lectura/escritura a la colección pública.
 */

// --- Importaciones de Firebase ---
import { initializeApp }      from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Configuración de Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyDHrAEU4HI2onL1bRZpRfB5GAbsbD6_XBE",
    authDomain: "cablelatin-prueba.firebaseapp.com",
    projectId: "cablelatin-prueba",
    storageBucket: "cablelatin-prueba.firebasestorage.app",
    messagingSenderId: "370823325775",
    appId: "1:370823325775:web:cbd9142e612bc0a979623a",
    measurementId: "G-PV3NRMJBW2"
};

// --- Estado del módulo ---
let app, auth, db;
let isAuthReady = false;
let planesCollectionRef;
let _todosLosPlanes = [];

// --- Inicialización de Firebase ---
try {
    app  = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db   = getFirestore(app);
} catch (e) {
    console.error("[Planes] Error inicializando Firebase:", e);
}

// --- Autenticación Anónima ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        isAuthReady = true;
        planesCollectionRef = collection(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'planes');
        _escucharPlanes();
    } else {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("[Planes] Error en autenticación anónima:", error);
        }
    }
});


// ===================== GESTIÓN DE MODALES =====================

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
    setTimeout(() => { modal.style.display = 'none'; }, 280);
    if (modalId === 'modal-registrar-plan') {
        document.getElementById('form-registrar-plan')?.reset();
    }
};

function _showSuccess(message) {
    const modal      = document.getElementById('success-modal');
    const msgEl      = document.getElementById('success-message');
    if (!modal) return;
    if (msgEl) msgEl.textContent = message;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
    setTimeout(() => {
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }, 3200);
}

// Exponemos para compatibilidad con el HTML
window.showSuccessNotification = _showSuccess;


// ===================== CARGA Y RENDERIZADO =====================

function _escucharPlanes() {
    if (!planesCollectionRef) return;

    onSnapshot(planesCollectionRef, (snapshot) => {
        _todosLosPlanes = [];
        snapshot.forEach(doc => {
            _todosLosPlanes.push({ id: doc.id, ...doc.data() });
        });
        _todosLosPlanes.sort((a, b) => (b.fecha_creacion?.seconds || 0) - (a.fecha_creacion?.seconds || 0));
        _renderizarTabla(_todosLosPlanes);
    }, (error) => {
        console.error("[Planes] Error en onSnapshot:", error);
        const tbody = document.getElementById('planes-table-body');
        if (tbody) tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center p-8 text-red-500 font-semibold">
                    <i class="fas fa-exclamation-triangle mr-2"></i> Error al cargar planes desde Firebase.
                </td>
            </tr>`;
    });
}

function _renderizarTabla(planes) {
    const tbody  = document.getElementById('planes-table-body');
    const footer = document.getElementById('footer-info');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (planes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center p-8 text-gray-500">
                    No se encontraron planes registrados.
                </td>
            </tr>`;
        if (footer) footer.textContent = 'Mostrando 0 de 0 registros';
        return;
    }

    planes.forEach(plan => {
        const estadoClass = {
            'Activo':   'activo',
            'Inactivo': 'inactivo',
            'Obsoleto': 'obsoleto'
        }[plan.estado] || 'inactivo';

        // Codificamos los datos del plan para pasar al modal de edición de forma segura
        const planJson = JSON.stringify({
            ...plan,
            precio:      parseFloat(plan.precio || 0),
            instalacion: parseFloat(plan.precioInstalacion || 0)
        }).replace(/"/g, '&quot;');

        const row = document.createElement('tr');
        row.className = 'border-b border-gray-100 hover:bg-gray-50 transition-colors';
        row.innerHTML = `
            <td class="p-4">
                <span class="id-badge">...${plan.id.slice(-6)}</span>
            </td>
            <td class="p-4 font-medium text-gray-800">${plan.nombre || '—'}</td>
            <td class="p-4 text-gray-600 max-w-xs">
                <span class="block truncate" title="${plan.descripcion || ''}">${plan.descripcion || '—'}</span>
            </td>
            <td class="p-4 font-semibold text-green-700">S/ ${parseFloat(plan.precio || 0).toFixed(2)}</td>
            <td class="p-4 text-gray-600">S/ ${parseFloat(plan.precioInstalacion || 0).toFixed(2)}</td>
            <td class="p-4 text-gray-600">${plan.condicion || '—'}</td>
            <td class="p-4">
                <span class="status-pill ${estadoClass}">${plan.estado || 'Inactivo'}</span>
            </td>
            <td class="p-4 text-center whitespace-nowrap">
                <button class="btn-accion edit" title="Editar Plan" onclick="openEditModal('${planJson}')">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn-accion delete ml-1" title="Eliminar Plan" onclick="openConfirmDelete('${plan.id}', '${plan.nombre}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>`;
        tbody.appendChild(row);
    });

    if (footer) footer.textContent = `Mostrando ${planes.length} de ${_todosLosPlanes.length} registros`;
}


// ===================== MODALES DE GESTIÓN =====================

window.openEditModal = (planDataJson) => {
    try {
        const plan = JSON.parse(planDataJson.replace(/&quot;/g, '"'));

        document.getElementById('edit-plan-id').value         = plan.id;
        document.getElementById('edit-plan-id-display').value = plan.id;
        document.getElementById('edit-plan-nombre').value     = plan.nombre;
        document.getElementById('edit-plan-condicion').value  = plan.condicion;
        document.getElementById('edit-plan-precio').value     = plan.precio;
        document.getElementById('edit-plan-instalacion').value= plan.instalacion;
        document.getElementById('edit-plan-estado').value     = plan.estado;
        document.getElementById('edit-plan-descripcion').value= plan.descripcion;

        openModal('modal-editar-plan');
    } catch (e) {
        console.error("[Planes] Error parseando datos del plan:", e);
    }
};

window.openConfirmDelete = (id, nombre) => {
    const modal     = document.getElementById('confirm-modal');
    const message   = document.getElementById('confirm-modal-message');
    const btnOk     = modal.querySelector('.btn-confirm-delete');
    const btnCancel = modal.querySelector('.btn-cancel-delete');

    if (message) message.textContent = `¿Eliminar el plan "${nombre}" (ID: ...${id.slice(-6)})? Esta acción no se puede deshacer.`;

    btnOk.onclick     = () => _deletePlan(id, nombre);
    btnCancel.onclick = () => closeModal('confirm-modal');

    openModal('confirm-modal');
};

async function _deletePlan(id, nombre) {
    if (!planesCollectionRef) return;
    try {
        await deleteDoc(doc(planesCollectionRef, id));
        closeModal('confirm-modal');
        _showSuccess(`¡Plan "${nombre}" eliminado correctamente!`);
    } catch (error) {
        console.error("[Planes] Error eliminando plan:", error);
        closeModal('confirm-modal');
    }
}


// ===================== EVENT LISTENERS DE FORMULARIOS =====================

document.addEventListener('DOMContentLoaded', () => {

    // --- Formulario Registrar Plan ---
    const formRegistro = document.getElementById('form-registrar-plan');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isAuthReady || !planesCollectionRef) {
                console.error("[Planes] Firebase no listo aún."); return;
            }

            const formData  = new FormData(formRegistro);
            const nuevoPlan = Object.fromEntries(formData.entries());

            nuevoPlan.precio            = parseFloat(nuevoPlan.precio)            || 0;
            nuevoPlan.precioInstalacion = parseFloat(nuevoPlan.precioInstalacion) || 0;
            nuevoPlan.fecha_creacion    = serverTimestamp();

            try {
                await addDoc(planesCollectionRef, nuevoPlan);
                closeModal('modal-registrar-plan');
                _showSuccess(`¡Plan "${nuevoPlan.nombre}" registrado con éxito!`);
            } catch (error) {
                console.error("[Planes] Error registrando plan:", error);
            }
        });
    }

    // --- Formulario Editar Plan ---
    const formEdicion = document.getElementById('form-editar-plan');
    if (formEdicion) {
        formEdicion.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isAuthReady || !planesCollectionRef) {
                console.error("[Planes] Firebase no listo aún."); return;
            }

            const formData   = new FormData(formEdicion);
            const planEditado = Object.fromEntries(formData.entries());
            const planId     = planEditado.id;
            delete planEditado.id;

            planEditado.precio            = parseFloat(planEditado.precio)            || 0;
            planEditado.precioInstalacion = parseFloat(planEditado.precioInstalacion) || 0;
            planEditado.fecha_actualizacion = serverTimestamp();

            try {
                await updateDoc(doc(planesCollectionRef, planId), planEditado);
                closeModal('modal-editar-plan');
                _showSuccess(`¡Plan actualizado correctamente!`);
            } catch (error) {
                console.error("[Planes] Error editando plan:", error);
            }
        });
    }

    // --- Buscador en tiempo real ---
    const searchInput = document.getElementById('search-table');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const termino = searchInput.value.toLowerCase().trim();
            const filtrados = _todosLosPlanes.filter(p =>
                (p.nombre       || '').toLowerCase().includes(termino) ||
                (p.descripcion  || '').toLowerCase().includes(termino) ||
                (p.condicion    || '').toLowerCase().includes(termino) ||
                (p.estado       || '').toLowerCase().includes(termino)
            );
            _renderizarTabla(filtrados);
        });
    }
});
