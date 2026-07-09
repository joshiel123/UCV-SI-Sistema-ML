/**
 * crearUsuario.js — Lógica para crear usuarios en Firebase
 * Cable Latín — Frontend
 */

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuración Firebase (idéntica a la usada en otros módulos)
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
let adminUserId = null; // UID del admin que usa el formulario
let isReady = false;

function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("[CrearUsuario] Firebase inicializado");
        initAuth();
    } catch (e) {
        console.error("[CrearUsuario] Error inicializando Firebase:", e);
        showModal(false, "Error de Conexión", "No se pudo conectar a Firebase. Recargue la página.");
    }
}

function initAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            adminUserId = user.uid;
            isReady = true;
            console.log("[CrearUsuario] Admin autenticado:", adminUserId);
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("[CrearUsuario] Auth anónima falló:", error);
                showModal(false, "Error de Autenticación", "No se pudo iniciar sesión anónimamente.");
            }
        }
    });
}

/** UI helpers **/
function setLoading(isLoading) {
    const btnGuardar = document.getElementById('btnGuardar');
    const btnText = document.getElementById('btn-text');
    const iconSave = btnGuardar.querySelector('.icon-save');
    const iconLoader = btnGuardar.querySelector('.icon-loader');
    if (isLoading) {
        btnGuardar.disabled = true;
        btnText.textContent = "Guardando...";
        iconSave.style.display = 'none';
        iconLoader.style.display = 'inline-block';
    } else {
        btnGuardar.disabled = false;
        btnText.textContent = "Guardar";
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
        modalClose.className = 'bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full';
    } else {
        modalIcon.setAttribute('data-lucide', 'alert-triangle');
        modalIcon.className = 'w-16 h-16 mx-auto mb-4 text-red-500';
        modalClose.className = 'bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 w-full';
    }
    lucide.createIcons();
    modal.classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('feedbackModal').classList.add('hidden');
});

/** Form handling **/
function attachFormHandler() {
    const form = document.getElementById('crearUsuarioForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isReady) {
            showModal(false, "Error", "El sistema no está listo. Recargue la página.");
            return;
        }
        setLoading(true);
        const formData = new FormData(form);
        const email = formData.get('correo');
        const password = formData.get('contrasena');
        const profileData = {
            nombre: formData.get('nombre'),
            usuario: formData.get('usuario'),
            telefono: formData.get('telefono'),
            rol: formData.get('rol'),
            estado: formData.get('estado'),
            email: email,
            fecha_creacion: serverTimestamp()
        };
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;
            const userDocRef = doc(db, 'artifacts', firebaseConfig.projectId, 'public', 'data', 'personal', uid);
            await setDoc(userDocRef, profileData);
            showModal(true, "¡Usuario Creado!", "El nuevo usuario ha sido registrado exitosamente.");
            form.reset();
        } catch (error) {
            console.error("[CrearUsuario] Error al crear usuario:", error);
            let msg = "Ocurrió un error desconocido.";
            if (error.code === 'auth/email-already-in-use') msg = "El correo electrónico ya está registrado.";
            else if (error.code === 'auth/weak-password') msg = "La contraseña es muy débil. Debe tener al menos 6 caracteres.";
            else if (error.code === 'auth/invalid-email') msg = "El formato del correo electrónico no es válido.";
            showModal(false, "Error al Guardar", msg);
        } finally {
            setLoading(false);
        }
    });
}

// Inicialización al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    attachFormHandler();
    lucide.createIcons(); // icons for modal/buttons
});