/**
 * usuario.js — Gestión de Usuarios del Sistema
 * Cable Latín — Frontend
 *
 * Conecta directamente con Firebase SDK para operaciones en tiempo real sobre la colección 'personal'.
 * La autenticación es anónima para permitir el acceso de lectura, y luego se verifica el rol del usuario
 * autenticado en la app (si existe sesión guardada) para mostrar botones de edición/eliminación.
 */

// --- Importaciones de Firebase ---
import { initializeApp }      from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    deleteDoc,
    onSnapshot
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

// --- Inicialización de Firebase (PRIMERO) ---
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// --- Estado del módulo ---
let isAdmin          = false;
let isAuthReady      = false;
let userIdToDelete   = null;
let _todosLosUsuarios = [];


// ===================== FUNCIONES AUXILIARES =====================

function loadCurrentUserProfile() {
    // El usuario real se guarda en localStorage por api.js al hacer login.
    // No usamos el UID anónimo de Firebase porque signInAnonymously genera
    // un UID distinto al del usuario autenticado en la app.
    try {
        const raw = localStorage.getItem('cl_usuario');
        if (raw) {
            const userData = JSON.parse(raw);
            isAdmin = userData.rol && userData.rol.toString().trim().toLowerCase() === 'administrador';
            console.log('[Usuarios] Rol del usuario actual:', userData.rol, '| isAdmin:', isAdmin);
        }
    } catch (err) {
        console.warn('[Usuarios] No se pudo leer el perfil desde localStorage:', err);
    }
}


// ===================== AUTH LISTENER =====================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        isAuthReady = true;
        loadCurrentUserProfile();   // sincrónico, no necesita await
        _escucharUsuarios();
    } else {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error('[Usuarios] Error en autenticación anónima:', error);
            _renderizarError('Error de autenticación. Revisa las reglas de seguridad de Firebase.');
        }
    }
});


// ===================== CARGA Y RENDERIZADO =====================

function _escucharUsuarios() {
    const colRef = collection(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'personal');

    onSnapshot(colRef, (snapshot) => {
        _todosLosUsuarios = [];
        snapshot.forEach(d => {
            _todosLosUsuarios.push({ uid: d.id, ...d.data() });
        });
        _renderizarTabla(_todosLosUsuarios);
    }, (error) => {
        console.error('[Usuarios] Error en onSnapshot:', error);
        const msg = error.code === 'permission-denied'
            ? 'Error de permisos. Revisa las reglas de seguridad de Firestore.'
            : 'No se pudieron cargar los datos de usuarios.';
        _renderizarError(msg);
    });
}

function _renderizarTabla(usuarios) {
    const tbody  = document.getElementById('usuarios-table-body');
    const footer = document.getElementById('footer-info');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center p-8 text-gray-500">
                    No se encontraron usuarios.
                    <a href="crearUsuario.html" class="text-blue-600 hover:underline ml-1">¡Crea el primero!</a>
                </td>
            </tr>`;
        if (footer) footer.textContent = 'Mostrando 0 de 0 registros';
        return;
    }

    if (footer) footer.textContent = `Mostrando ${usuarios.length} de ${_todosLosUsuarios.length} registros`;

    usuarios.forEach(user => {
        const estado    = user.estado || 'Inactivo';
        const rol       = user.rol    || 'N/A';
        const estadoClass = estado === 'Activo' ? 'active' : 'inactive';
        const rolClass    = rol.toLowerCase().replace(/\s/g, '');

        const accionesHTML = isAdmin
            ? `<a href="editarUsuario.html?uid=${user.uid}" class="btn-accion-usr edit" title="Editar usuario">
                    <i class="fas fa-pencil-alt"></i>
               </a>
               <button class="btn-accion-usr delete ml-1 btn-delete"
                    data-id="${user.uid}"
                    data-name="${user.nombre || user.usuario || 'Usuario'}"
                    title="Eliminar usuario">
                    <i class="fas fa-trash-alt"></i>
               </button>`
            : `<span class="text-gray-500 italic">Solo admin</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-4">
                <span class="id-badge">...${user.uid.slice(-6)}</span>
            </td>
            <td class="p-4 font-medium text-gray-800">${user.usuario || 'N/A'}</td>
            <td class="p-4 text-gray-700">${user.nombre || 'N/A'}</td>
            <td class="p-4 text-gray-600">${user.email || 'N/A'}</td>
            <td class="p-4 text-gray-600">${user.telefono || 'N/A'}</td>
            <td class="p-4">
                <span class="role-pill ${rolClass}">${rol}</span>
            </td>
            <td class="p-4">
                <span class="status-pill ${estadoClass}">${estado}</span>
            </td>
            <td class="p-4 text-center whitespace-nowrap">
                ${accionesHTML}
            </td>`;
        tbody.appendChild(row);
    });
}

function _renderizarError(message) {
    const tbody = document.getElementById('usuarios-table-body');
    if (tbody) tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center p-8 text-red-500 font-semibold">
                <i class="fas fa-exclamation-triangle mr-2"></i> ${message}
            </td>
        </tr>`;
    const footer = document.getElementById('footer-info');
    if (footer) footer.textContent = 'Error al cargar';
}


// ===================== MODAL DE CONFIRMACIÓN =====================

function _openDeleteModal(id, name) {
    userIdToDelete = id;
    const msg = document.getElementById('modalDeleteMessage');
    if (msg) msg.textContent = `¿Estás seguro de que deseas eliminar a "${name}" (ID: ...${id.slice(-6)})? Esta acción no se puede deshacer.`;
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('open'), 10);
    }
}

function _closeDeleteModal() {
    userIdToDelete = null;
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }
}

async function _deleteUser() {
    if (!userIdToDelete || !isAuthReady) return;

    try {
        await deleteDoc(doc(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'personal', userIdToDelete));
        _closeDeleteModal();
    } catch (error) {
        console.error('[Usuarios] Error eliminando usuario:', error);
        _closeDeleteModal();
    }
}


// ===================== EVENT LISTENERS =====================

document.addEventListener('DOMContentLoaded', () => {

    // Delegación de eventos en la tabla para el botón de borrar
    const tbody = document.getElementById('usuarios-table-body');
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete');
            if (btn) {
                e.preventDefault();
                _openDeleteModal(btn.dataset.id, btn.dataset.name);
            }
        });
    }

    // Botones del modal
    document.getElementById('modalCancelDelete')?.addEventListener('click', _closeDeleteModal);
    document.getElementById('modalConfirmDelete')?.addEventListener('click', _deleteUser);

    // Buscador en tiempo real
    const searchInput = document.getElementById('search-table');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const termino = searchInput.value.toLowerCase().trim();
            const filtrados = _todosLosUsuarios.filter(u =>
                (u.nombre   || '').toLowerCase().includes(termino) ||
                (u.usuario  || '').toLowerCase().includes(termino) ||
                (u.email    || '').toLowerCase().includes(termino) ||
                (u.rol      || '').toLowerCase().includes(termino)
            );
            _renderizarTabla(filtrados);
        });
    }
});