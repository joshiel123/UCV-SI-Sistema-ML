/**
 * login.js — Login Real contra API Python con JWT
 * Cable Latín — Frontend
 *
 * DETECCIÓN INTELIGENTE: Soporta IDs con 'n' y 'ñ' de manera simultánea
 * para evitar interrupciones por desajustes en el HTML.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar iconos si se usa lucide-icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const loginForm       = document.getElementById('loginForm');
    const loginBtn        = document.getElementById('loginBtn');
    const btnText         = loginBtn ? loginBtn.querySelector('.btn-text') : null;
    const msgBox          = document.getElementById('msg-box');

    // Tolerancia a fallos: busca selectores con 'n' y 'ñ' en el DOM
    const usuarioInput    = document.getElementById('usuario');
    const contrasenaInput = document.getElementById('contrasena') || document.getElementById('contraseña');

    // Redirección si ya hay una sesión activa en el navegador
    if (window.Session && Session.estaActiva()) {
        window.location.href = window.APP_ROUTES.TABLERO;
        return;
    }

    // Parámetros URL para advertencias
    const urlParams = new URLSearchParams(window.location.search);
    const razon = urlParams.get('razon');
    if (razon === 'sesion_expirada') {
        mostrarMensaje('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'error');
    } else if (razon === 'sin_sesion') {
        mostrarMensaje('Debes iniciar sesión para acceder a esta sección.', 'error');
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Resguardo seguro en caso de que algún nodo no se haya cargado
            const usuario    = usuarioInput ? usuarioInput.value.trim() : '';
            const contrasena = contrasenaInput ? contrasenaInput.value : '';

            if (!usuario || !contrasena) {
                mostrarMensaje('Por favor, ingrese usuario y contraseña.', 'error');
                return;
            }

            setLoading(true);

            try {
                const resultado = await AuthAPI.login(usuario, contrasena);

                if (resultado && resultado.success) {
                    mostrarMensaje(`¡Bienvenido, ${resultado.usuario?.nombre || usuario}!`, 'success');

                    setTimeout(() => {
                        window.location.href = window.APP_ROUTES.TABLERO;
                    }, 800);

                } else {
                    const codigo  = resultado?.codigo || '';
                    const mensaje =
                        resultado?.message ||
                        resultado?.mensaje ||
                        'Credenciales incorrectas.';

                    if (codigo === 'CUENTA_BLOQUEADA') {
                        const segundos = resultado.segundos_restantes || 30;
                        iniciarCountdown(segundos, mensaje);
                    } else {
                        mostrarMensaje(mensaje, 'error');
                        setLoading(false);
                    }
                }

            } catch (error) {
                console.error('[Login] Error en la conexión:', error);
                mostrarMensaje(
                    'No se pudo conectar con el servidor. Por favor, inténtelo de nuevo más tarde.',
                    'error'
                );
                setLoading(false);
            }
        });
    }

    function iniciarCountdown(segundos, mensajeInicial) {
        setLoading(false);
        setFormDisabled(true);
        mostrarMensaje(mensajeInicial, 'error');

        let restantes = segundos;
        const interval = setInterval(() => {
            restantes--;
            if (restantes > 0) {
                mostrarMensaje(`Cuenta bloqueada temporalmente. Espere ${restantes} segundos.`, 'error');
            } else {
                clearInterval(interval);
                mostrarMensaje('Puede intentarlo de nuevo.', 'success');
                setFormDisabled(false);
                setTimeout(() => {
                    if (msgBox && msgBox.classList.contains('show')) {
                        msgBox.classList.remove('show');
                    }
                }, 3000);
            }
        }, 1000);
    }

    function mostrarMensaje(mensaje, tipo = 'error') {
        if (!msgBox) return;
        msgBox.textContent = mensaje;
        msgBox.classList.add('show');
        msgBox.classList.toggle('success', tipo === 'success');
        msgBox.classList.toggle('error', tipo !== 'success');
    }

    function setLoading(isLoading) {
        if (!loginBtn) return;
        if (isLoading) {
            loginBtn.classList.add('loading');
            if (btnText) btnText.textContent = 'VERIFICANDO...';
        } else {
            loginBtn.classList.remove('loading');
            if (btnText) btnText.textContent = 'INGRESAR';
        }
        setFormDisabled(isLoading);
    }

    function setFormDisabled(disabled) {
        if (usuarioInput)    usuarioInput.disabled    = disabled;
        if (contrasenaInput) contrasenaInput.disabled = disabled;
        if (loginBtn) {
            loginBtn.disabled     = disabled;
            loginBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        }
    }
});