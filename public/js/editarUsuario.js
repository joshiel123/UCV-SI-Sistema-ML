/**
 * editarUsuario.js — Lógica para editar usuarios existentes en Firebase
 * Cable Latín — Frontend
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración Firebase (debe coincidir con otros módulos)
const firebaseConfig = {
    apiKey: "AIzaSyDHrAEU4HI2onL1bRZpRfB5GAbsbD6_XBE",
    authDomain: "cablelatin-prueba.firebaseapp.com",
    projectId: "cablelatin-prueba",
    storageBucket: "cablelatin-prueba.firebasestorage.app",
    messagingSenderId: "370823325775",
    appId: "1:370823325775:web:cbd9142e612bc0a979623a",
    measurementId: "G-PV3NRMJBW2"
};

let app, auth, db;
let adminUserId = null; // UID del admin autenticado
let isReady = false;

function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("[EditarUsuario] Firebase inicializado");
        initAuth();
    } catch (e) {
        console.error("[EditarUsuario] Error inicializando Firebase:", e);
        showModal(false, "Error de Conexión", "No se pudo conectar a Firebase. Recargue la página.");
    }
}

function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            adminUserId = user.uid;
            isReady = true;
            console.log("[EditarUsuario] Admin autenticado:", adminUserId);
            loadUserData();
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("[EditarUsuario] Auth anónima falló:", error);
                showModal(false, "Error de Autenticación", "No se pudo iniciar sesión anónimamente.");
            }
        }
    });
}

/** UI Helpers **/
function setLoading(isLoading) {
    const btnGuardar = document.getElementById('btnGuardar');
    const btnText = document.getElementById('btn-text');
    const iconSave = btnGuardar.querySelector('.icon-save');
    const iconLoader = btnGuardar.querySelector('.icon-loader');
    if (isLoading) {
        btnGuardar.disabled = true;
        btnText.textContent = "Actualizando...";
        iconSave.style.display = 'none';
        iconLoader.style.display = 'inline-block';
    } else {
        btnGuardar.disabled = false;
        btnText.textContent = "Actualizar";
        iconSave.style.display = 'inline-block';
        iconLoader.style.display = 'none';
    }
}

function showModal(isSuccess, title, message) {
    const modal = document.getElementById('feedbackModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalClose = document.getElementById('modalClose');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (isSuccess) {
        modalIcon.setAttribute('data-lucide', 'check-circle');
        modalIcon.className = 'w-16 h-16 mx-auto mb-4 text-green-500';
    } else {
        modalIcon.setAttribute('data-lucide', 'alert-triangle');
        modalIcon.className = 'w-16 h-16 mx-auto mb-4 text-red-500';
    }
    lucide.createIcons();
    modal.classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.add('hidden');
});

/** Helpers **/
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadUserData() {
    const uid = getQueryParam('uid');
    if (!uid) {
        document.getElementById('loader').classList.add('hidden');
        const errDiv = document.getElementById('error');
        errDiv.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = 'UID no proporcionado en la URL.';
        return;
    }

    try {
        const userDocRef = doc(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'personal', uid);
        const snapshot = await getDoc(userDocRef);
        if (!snapshot.exists()) {
            throw new Error('Usuario no encontrado en Firestore.');
        }
        const data = snapshot.data();
        // Populate form fields
        document.getElementById('idUsuario').value = uid;
        document.getElementById('nombre').value = data.nombre || '';
        document.getElementById('usuario').value = data.usuario || '';
        document.getElementById('correo').value = data.email || '';
        document.getElementById('telefono').value = data.telefono || '';
        document.getElementById('rol').value = data.rol || 'vendedor';
        document.getElementById('estado').value = data.estado || 'Activo';
        // Show form, hide loader
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('editarUsuarioForm').classList.remove('hidden');
    } catch (error) {
        console.error('[EditarUsuario] Error cargando datos:', error);
        document.getElementById('loader').classList.add('hidden');
        const errDiv = document.getElementById('error');
        errDiv.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = error.message;
    }
}

function attachFormHandler() {
    const form = document.getElementById('editarUsuarioForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isReady) {
            showModal(false, 'Error', 'El sistema no está listo. Recargue la página.');
            return;
        }
        const uid = document.getElementById('idUsuario').value;
        setLoading(true);
        const formData = new FormData(form);
        const updates = {
            nombre: formData.get('nombre'),
            usuario: formData.get('usuario'),
            telefono: formData.get('telefono'),
            rol: formData.get('rol'),
            estado: formData.get('estado'),
            fecha_modificacion: serverTimestamp()
        };
        try {
            const userDocRef = doc(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'personal', uid);
            await updateDoc(userDocRef, updates);
            showModal(true, '¡Actualizado!', 'Los cambios fueron guardados exitosamente.');
        } catch (error) {
            console.error('[EditarUsuario] Error actualizando usuario:', error);
            showModal(false, 'Error al Guardar', error.message);
        } finally {
            setLoading(false);
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    attachFormHandler();
    lucide.createIcons();
});