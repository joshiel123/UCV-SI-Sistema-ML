function initSidebarEvents() {
    
    // --- Referencias del DOM del Sidebar (se buscan DESPUÉS del fetch) ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleMobile = document.getElementById('sidebar-toggle-mobile'); // En el sidebar
    const sidebarToggleMain = document.getElementById('sidebar-toggle-mobile-main'); // En el header principal
    const allNavItems = document.querySelectorAll('#sidebar .nav-item'); // Busca dentro del sidebar cargado
    const menuToggles = document.querySelectorAll('#sidebar .nav-item.is-parent');
    const nonParentItems = document.querySelectorAll('#sidebar .nav-item:not(.is-parent)');

    // --- Lógica del Menú Lateral (Sidebar) ---
    const setAllInactive = () => {
        allNavItems.forEach(item => {
            item.classList.remove('active', 'open');
        });
        menuToggles.forEach(toggle => {
            const submenu = toggle.nextElementSibling;
            if (submenu && submenu.classList.contains('submenu-container')) {
                submenu.classList.remove('open');
            }
            const arrow = toggle.querySelector('.submenu-arrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        });
    };

    menuToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            // Evita que el clic en un item del submenú cierre el submenú
            if (e.target.closest('.submenu-item')) return; 

            const submenu = toggle.nextElementSibling;
            const arrow = toggle.querySelector('.submenu-arrow');
            const wasOpen = submenu && submenu.classList.contains('open');
            
            setAllInactive(); // Cierra todo primero
            
            if (!wasOpen && submenu) {
                submenu.classList.add('open');
                toggle.classList.add('open', 'active'); // Marca el padre como activo también
                if (arrow) arrow.style.transform = 'rotate(90deg)';
            }
        });
    });

    nonParentItems.forEach(item => {
        item.addEventListener('click', () => {
            setAllInactive();
            item.classList.add('active');
            // Cierra el sidebar en móvil si se hace clic en un item sin submenú
            if (window.innerWidth <= 1023 && sidebar) {
                sidebar.classList.remove('open');
            }
        });
    });
    
    // Activa el item inicial (ej: Configuración > Mi Perfil)
    const initialActiveParent = document.querySelector('#sidebar .initial-active');
    const initialActiveSub = document.querySelector('#sidebar .initial-active-sub');
    
    if (initialActiveParent) {
         initialActiveParent.classList.add('active', 'open');
         const initialSubmenu = initialActiveParent.nextElementSibling;
         const initialArrow = initialActiveParent.querySelector('.submenu-arrow');
         if(initialSubmenu) initialSubmenu.classList.add('open');
         if(initialArrow) initialArrow.style.transform = 'rotate(90deg)';
         
         if (initialActiveSub) {
             initialActiveSub.classList.add('active'); // Marca el subitem
         }
    } else if (initialActiveSub) { // Si solo hay subitem activo (raro)
        initialActiveSub.classList.add('active');
        const parentLi = initialActiveSub.closest('.submenu-container')?.previousElementSibling;
        if(parentLi) parentLi.classList.add('active');
    }

    const toggleSidebar = () => sidebar?.classList.toggle('open');
    if (sidebarToggleMobile) sidebarToggleMobile.addEventListener('click', toggleSidebar);
    if (sidebarToggleMain) sidebarToggleMain.addEventListener('click', toggleSidebar);
}

// --- Lógica del Formulario y Modal de Perfil ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const profileForm = document.getElementById('profileForm');
    const profileModal = document.getElementById('profileSuccessModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModal');
    const passCurrentInput = document.getElementById('passCurrent');
    const passNewInput = document.getElementById('passNew');

    // --- Cargar datos del usuario ---
    function cargarDatosUsuario() {
        try {
            // Se asume que los datos del usuario se guardan en sessionStorage tras el login
            // con una clave 'usuarioLogueado'.
            const usuarioString = sessionStorage.getItem('usuarioLogueado');
            
            if (!usuarioString) {
                console.warn('No se encontró información del usuario en la sesión. Mostrando campos vacíos.');
                // Opcional: Redirigir al login si no hay sesión
                // window.location.href = 'login.html'; 
                return;
            }

            const usuario = JSON.parse(usuarioString);

            // Rellenar el formulario con los datos del usuario
            document.getElementById('fullName').value = usuario.nombreCompleto || '';
            document.getElementById('username').value = usuario.username || '';
            document.getElementById('email').value = usuario.email || '';
            document.getElementById('role').value = usuario.rol || '';

        } catch (error) {
            console.error('Error al cargar y procesar los datos del perfil:', error);
            alert('Hubo un error al cargar tu perfil. Por favor, intenta recargar la página.');
        }
    }

    const closeProfileModal = () => {
        if (profileModal) {
            profileModal.classList.remove('open');
            setTimeout(() => {
                profileModal.classList.add('hidden');
            }, 300);
            
            if(passCurrentInput) passCurrentInput.value = '';
            if(passNewInput) passNewInput.value = '';
        }
    }
    
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => { // Removed async
            e.preventDefault();
            
            // --- Lógica para guardar los datos ---
            // En una aplicación real, aquí harías un fetch a tu API para guardar los cambios.
            // Por ahora, simularemos el guardado y actualizaremos sessionStorage.
            console.log("Simulando guardado de datos...");

            // Removed loader logic as it's not needed for client-side simulation
            // const btnSave = document.getElementById('btnSave');
            // const loader = btnSave.querySelector('.loader');
            // const btnText = document.getElementById('btn-text');
            // btnSave.disabled = true;
            // loader.style.display = 'inline-block';
            // btnText.textContent = 'Guardando...';

            try {
                const usuarioString = sessionStorage.getItem('usuarioLogueado');
                if (!usuarioString) {
                    alert("Sesión expirada. Por favor inicie sesión nuevamente.");
                    return;
                }
                let usuario = JSON.parse(usuarioString); // Use let to allow modification

                // Actualizar solo los campos que han cambiado
                usuario.nombreCompleto = document.getElementById('fullName').value;
                usuario.email = document.getElementById('email').value;
                
                // Actualizar sessionStorage
                sessionStorage.setItem('usuarioLogueado', JSON.stringify(usuario));

                console.log("Datos actualizados en sessionStorage:", usuario);

                // Mostrar el modal de éxito
                if (profileModal) {
                    profileModal.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        profileModal.classList.add('open');
                    });
                    lucide.createIcons();
                }

            } catch (error) {
                console.error("Error al guardar el perfil:", error);
                alert("Hubo un error al guardar los cambios.");
            } finally {
                // Removed loader logic
                // btnSave.disabled = false;
                // loader.style.display = 'none';
                // btnText.textContent = 'Guardar Cambios';
            }
        });
    }
        if (closeProfileModalBtn) { closeProfileModalBtn.addEventListener('click', closeProfileModal); }
    
    if (profileModal) {
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) { 
                closeProfileModal();
            }
        });
    }

    // --- Carga del Sidebar ---
    fetch("sidebar.html")
        .then(res => {
            if (!res.ok) throw new Error('No se encontró sidebar.html'); 
            return res.text();
        })
        .then(html => {
            const sidebarContainer = document.getElementById("sidebar-container");
            if(sidebarContainer) {
                sidebarContainer.innerHTML = html;
                initSidebarEvents();
                lucide.createIcons({ nodes: [sidebarContainer] });
            }
        })
        .catch(err => {
            console.error("Error al cargar el sidebar:", err);
            const sidebarContainer = document.getElementById("sidebar-container");
            if(sidebarContainer) {
                sidebarContainer.innerHTML = `<p style="color: red; padding: 20px;">Error al cargar el menú: ${err.message}</p>`;
            }
        });

    // --- Cargar datos del usuario al iniciar la página ---
    cargarDatosUsuario();

}); // Fin del DOMContentLoaded