/**
 * setup-user.js — Lógica de Configuración Inicial
 * Cable Latín — Frontend
 *
 * Crea el primer usuario del sistema directamente en:
 *   1. Firebase Authentication (email + contraseña)
 *   2. Firestore — colección 'personal' bajo la ruta estándar del proyecto
 *
 * IMPORTANTE: Esta página es solo para configuración inicial.
 * Debe ser eliminada o restringida antes de despliegue en producción.
 */

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ===================== CONFIGURACIÓN FIREBASE =====================
const firebaseConfig = {
    apiKey:            "AIzaSyDHrAEU4HI2onL1bRZpRfB5GAbsbD6_XBE",
    authDomain:        "cablelatin-prueba.firebaseapp.com",
    projectId:         "cablelatin-prueba",
    storageBucket:     "cablelatin-prueba.firebasestorage.app",
    messagingSenderId: "370823325775",
    appId:             "1:370823325775:web:cbd9142e612bc0a979623a",
    measurementId:     "G-PV3NRMJBW2"
};

const app   = initializeApp(firebaseConfig);
const auth  = getAuth(app);
const db    = getFirestore(app);
const appId = firebaseConfig.projectId;


// ===================== LÓGICA DE CREACIÓN =====================

async function crearUsuario() {
    const nombre   = document.getElementById('nombre').value.trim();
    const usuario  = document.getElementById('usuario').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rol      = document.getElementById('rol').value;

    // Referencias UI
    const btn             = document.getElementById('crearBtn');
    const btnText         = document.getElementById('btnText');
    const btnSpinner      = document.getElementById('btnSpinner');
    const formContainer   = document.getElementById('formContainer');
    const successContainer = document.getElementById('successContainer');

    // Validaciones
    if (!nombre || !usuario || !email || !password) {
        mostrarError('Por favor completa todos los campos obligatorios.');
        return;
    }
    if (password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    // Estado de carga
    ocultarError();
    btn.disabled    = true;
    btnText.textContent = 'Creando...';
    btnSpinner.classList.remove('hidden');

    try {
        // 1. Crear en Firebase Auth
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const userId     = credential.user.uid;

        // 2. Guardar perfil en Firestore
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'personal', userId);
        await setDoc(userDocRef, {
            nombre:          nombre,
            usuario:         usuario,
            email:           email,
            rol:             rol,
            estado:          'Activo',
            telefono:        '',
            fecha_creacion:  serverTimestamp()
        });

        // 3. Mostrar éxito
        formContainer.classList.add('hidden');
        successContainer.classList.remove('hidden');
        document.getElementById('usuarioFinal').textContent  = usuario;
        document.getElementById('passwordFinal').textContent = password;

    } catch (error) {
        console.error('[Setup] Error al crear usuario:', error);

        let errorMsg = 'Ocurrió un error inesperado. Revisa la consola.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMsg = 'Este correo electrónico ya está registrado en Firebase.'; break;
            case 'auth/invalid-email':
                errorMsg = 'El correo electrónico no tiene un formato válido.'; break;
            case 'auth/weak-password':
                errorMsg = 'La contraseña es demasiado débil. Usa al menos 6 caracteres.'; break;
            case 'auth/network-request-failed':
                errorMsg = 'Error de red. Verifica tu conexión a Internet.'; break;
        }

        mostrarError(errorMsg);
        btn.disabled = false;
        btnText.textContent = 'Crear Usuario';
        btnSpinner.classList.add('hidden');
    }
}

// ===================== HELPERS UI =====================

function mostrarError(msg) {
    const el   = document.getElementById('errorMsg');
    const text = document.getElementById('errorText');
    if (!el || !text) return;
    text.textContent = msg;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function ocultarError() {
    document.getElementById('errorMsg')?.classList.add('hidden');
}

// ===================== EVENT LISTENERS =====================

document.addEventListener('DOMContentLoaded', () => {

    // Botón principal de crear
    document.getElementById('crearBtn')?.addEventListener('click', crearUsuario);

    // Toggle visibilidad de contraseña
    const toggleBtn  = document.getElementById('togglePassword');
    const passwordEl = document.getElementById('password');
    const toggleIcon = document.getElementById('togglePasswordIcon');

    if (toggleBtn && passwordEl && toggleIcon) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = passwordEl.type === 'password';
            passwordEl.type        = isHidden ? 'text' : 'password';
            toggleIcon.className   = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    // Enviar con Enter en cualquier campo del formulario
    document.getElementById('formContainer')?.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') crearUsuario();
        });
    });

    // Limpiar error al modificar cualquier campo
    document.getElementById('formContainer')?.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('input', ocultarError);
    });
});
