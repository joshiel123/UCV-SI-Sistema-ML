/**
 * registrar_cliente.js — Registro de clientes y servicios asociados
 * Cable Latín — Frontend
 */

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Proteger ruta
    const autorizado = await AuthAPI.protegerPagina(['administrador', 'vendedor', 'supervisor']);
    if (!autorizado) return;

    // --- Referencias del DOM ---
    const tabItems          = document.querySelectorAll('.tab-navigation .tab-item');
    const multiStepForm     = document.getElementById('multiStepForm');
    const steps             = document.querySelectorAll('.form-step');
    const successModal      = document.getElementById('successModal');
    const errorModal        = document.getElementById('errorModal');
    const closeModalSuccess = document.getElementById('closeModalSuccess');
    const closeModalError   = document.getElementById('closeModalError');
    const errorModalMessage = document.getElementById('errorModalMessage');
    const customerNameDisplay = document.getElementById('customerNameDisplay');

    // Inputs Paso 1
    const nombresInput        = document.getElementById('nombres');
    const apellidosInput      = document.getElementById('apellidos');
    const tipoClienteRadios   = document.querySelectorAll('input[name="tipoCliente"]');
    const tipoDocumentoSelect = document.getElementById('tipoDocumento');
    const nDocumentoInput     = document.getElementById('nDocumento');
    const nDocumentoLabel     = document.querySelector('label[for="nDocumento"]');

    // Inputs Paso 2
    const planSelect      = document.getElementById('tipoPlan');
    const precioPlanInput = document.getElementById('precioPlan');
    const submitButton    = document.getElementById('btnSubmit');

    // Fecha por defecto
    const fechaInicioInput = document.getElementById('fechaInicio');
    if (fechaInicioInput) {
        fechaInicioInput.value = new Date().toISOString().split('T')[0];
    }

    // Solo dígitos en el campo de documento
    if (nDocumentoInput) {
        nDocumentoInput.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // Inicializar y actualizar precio al cambiar plan
    const _actualizarMontoPlan = () => {
        if (planSelect && precioPlanInput) {
            const selected = planSelect.options[planSelect.selectedIndex];
            precioPlanInput.value = selected?.dataset?.price || '0.00';
        }
    };
    
    if (planSelect) {
        planSelect.addEventListener('change', _actualizarMontoPlan);
        _actualizarMontoPlan(); // Inicialización inmediata en carga
    }

    // --- Control de pestañas ---
    const updateTabsAndSteps = (targetStep) => {
        tabItems.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.step == targetStep);
        });
        steps.forEach(step => {
            step.classList.toggle('active', step.dataset.step == targetStep);
        });
    };

    const esDocumentoValido = () => {
        const valor = nDocumentoInput.value.trim();
        const tipo  = tipoDocumentoSelect.value;
        return tipo === 'DNI' ? /^\d{8}$/.test(valor) : /^\d{11}$/.test(valor);
    };

    const validarPaso1 = () => {
        const inputs = document.querySelectorAll('.form-step[data-step="1"] [required]');
        let valido = true;
        inputs.forEach(input => {
            if (!input.value.trim()) {
                valido = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '';
            }
        });
        if (valido && !esDocumentoValido()) {
            valido = false;
            nDocumentoInput.style.borderColor = '#ef4444';
            _mostrarError(`El número de documento debe tener ${tipoDocumentoSelect.value === 'DNI' ? '8' : '11'} dígitos numéricos.`);
        }
        return valido;
    };

    const validarPaso2 = () => {
        const inputs = document.querySelectorAll('.form-step[data-step="2"] [required]');
        let valido = true;
        inputs.forEach(input => {
            if (!input.value.trim()) {
                valido = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '';
            }
        });
        return valido;
    };

    document.querySelectorAll('.btn-next, .btn-prev').forEach(button => {
        button.addEventListener('click', e => {
            e.preventDefault();
            const targetStep = button.dataset.targetStep;
            if (targetStep == 2) {
                if (!validarPaso1()) return; // Solución definitiva del error tipográfico
                if (customerNameDisplay) {
                    customerNameDisplay.textContent =
                        `${nombresInput.value.trim()} ${apellidosInput.value.trim()}`;
                }
            }
            updateTabsAndSteps(targetStep);
            window.scrollTo(0, 0);
        });
    });

    // --- Envío del formulario ---
    if (multiStepForm) {
        multiStepForm.addEventListener('submit', async e => {
            e.preventDefault();

            if (!validarPaso1() || !validarPaso2()) return;

            const formData = new FormData(multiStepForm);

            const nombre          = nombresInput.value.trim();
            const apellido        = apellidosInput.value.trim();
            const tipoDocumento   = tipoDocumentoSelect.value;
            const numeroDocumento = nDocumentoInput.value.trim();
            const selectedPlanId  = planSelect.value;

            const direccionCompleta = [
                formData.get('direccionCompleta'),
                formData.get('distrito'),
                formData.get('provincia'),
                formData.get('departamento')
            ].filter(Boolean).join(', ');

            // Corrección de valores NaN o vacíos antes del envío
            const parseFormFloat = (rawVal) => {
                if (!rawVal) return 0.0;
                const parseado = parseFloat(rawVal);
                return isNaN(parseado) ? 0.0 : parseado;
            };

            const payloadCliente = {
                nombre,
                apellido,
                tipo_documento:   tipoDocumento,
                numero_documento: numeroDocumento,
                email:            document.getElementById('email')?.value?.trim()    || '',
                telefono:         document.getElementById('telefono')?.value?.trim() || '',
                direccion:        direccionCompleta,
                distrito:         formData.get('distrito')   || '',
                referencia:       formData.get('referencia') || '',
                tipo_cliente:     document.querySelector('input[name="tipoCliente"]:checked')?.value || 'Residencia',
                estado:           'Activo',

                servicio_inicial: {
                    id_plan:               selectedPlanId,
                    plan_nombre:           planSelect.options[planSelect.selectedIndex]?.text?.split('(')[0]?.trim() || '',
                    monto:                 parseFormFloat(precioPlanInput?.value),
                    costo_adicional:       parseFormFloat(formData.get('costoAdicional')),
                    servicios_adicionales: formData.get('serviciosAdicionales') || 'Ninguno',
                    fecha_inicio:          formData.get('fechaInicio')          || '',
                    ciclo_facturacion:     parseInt(formData.get('cicloFacturacion') || 15, 10),
                    estado:                formData.get('estadoServicio')       || 'Instalacion',
                    observaciones:         formData.get('observaciones')        || ''
                }
            };

            submitButton.disabled   = true;
            submitButton.innerHTML  = 'Guardando... <i class="fas fa-spinner fa-spin"></i>';

            try {
                const respuesta = await ClientesAPI.crear(payloadCliente);

                if (respuesta && respuesta.success) {
                    successModal.classList.remove('hidden');
                    successModal.classList.add('open');
                } else {
                    _mostrarError(respuesta?.message || 'Error registrando el cliente.');
                }
            } catch (err) {
                _mostrarError('Error de conexión con el servidor. Verifique que el backend esté activo.');
            } finally {
                submitButton.disabled  = false;
                submitButton.innerHTML = 'Registrar Cliente y Servicio &check;';
            }
        });
    }

    // --- Cierre de modales ---
    if (closeModalSuccess) {
        closeModalSuccess.addEventListener('click', () => {
            successModal.classList.remove('open');
            setTimeout(() => {
                successModal.classList.add('hidden');
                window.location.href = 'clientes.html';
            }, 300);
        });
    }

    if (closeModalError) {
        closeModalError.addEventListener('click', () => {
            errorModal.classList.remove('open');
            setTimeout(() => errorModal.classList.add('hidden'), 300);
        });
    }

    // --- Lógica tipo cliente / documento ---
    const actualizarTipoDocumento = () => {
        const checked     = document.querySelector('input[name="tipoCliente"]:checked');
        const tipoCliente = checked ? checked.value : 'Residencia';

        if (tipoCliente === 'Empresarial') {
            tipoDocumentoSelect.value    = 'RUC';
            tipoDocumentoSelect.disabled = true;
            nDocumentoLabel.textContent  = 'Nº de RUC:';
            nDocumentoInput.setAttribute('maxlength', '11');
            nDocumentoInput.placeholder  = '11 dígitos numéricos';
        } else {
            tipoDocumentoSelect.value    = 'DNI';
            tipoDocumentoSelect.disabled = false;
            nDocumentoLabel.textContent  = 'Nº de Documento:';
            nDocumentoInput.setAttribute('maxlength', '8');
            nDocumentoInput.placeholder  = '8 dígitos numéricos';
        }
    };

    tipoClienteRadios.forEach(r => r.addEventListener('change', actualizarTipoDocumento));
    actualizarTipoDocumento();

    // --- Utilidad interna ---
    function _mostrarError(mensaje) {
        if (errorModalMessage) errorModalMessage.textContent = mensaje;
        if (errorModal) {
            errorModal.classList.remove('hidden');
            errorModal.classList.add('open');
        }
    }
});