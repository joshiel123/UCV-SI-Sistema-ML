/**
 * sidebar.js — Módulo unificado para inyección y gestión interactiva del Sidebar.
 * Cable Latín — Frontend
 * 
 * MEJORA: Sincronización robusta de colapsado mediante clase en el body para 
 * evitar que se rompa la cuadrícula del tablero y los gráficos.
 */

document.addEventListener('DOMContentLoaded', () => {
    _inyectarSidebarDinamico();
    _inicializarEventosSidebar();
});

/** Inyecta dinámicamente la estructura del sidebar adaptada a tablero.css */
function _inyectarSidebarDinamico() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    // Detectar página actual para iluminar el ítem activo
    const pathname = window.location.pathname;
    const paginaActual = pathname.substring(pathname.lastIndexOf('/') + 1) || 'tablero.html';

    // Determinar estados de expansión por módulo basados en la URL
    const moduloAdmin = ['usuario.html', 'planes.html'].includes(paginaActual);
    const moduloClientes = ['clientes.html', 'facturas.html', 'pagos.html', 'registrar_cliente.html'].includes(paginaActual);
    const moduloReportes = ['reportes.html'].includes(paginaActual);

    // Inyección de HTML usando las clases exactas de tablero.css
    container.innerHTML = `
        <div id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <i class="fas fa-tv"></i>
                    <span class="logo-text">CABLE LATIN</span>
                </div>
                <!-- Botón de colapso original -->
                <i id="sidebar-toggle-internal" class="fas fa-chevron-left sidebar-toggle-btn"></i>
            </div>
            
            <nav class="sidebar-nav">
                <ul>
                    <li>
                        <a href="tablero.html" class="nav-item ${paginaActual === 'tablero.html' ? 'active' : ''}">
                            <i class="fas fa-tachometer-alt"></i>
                            <span class="link-text">Dashboard</span>
                        </a>
                    </li>

                    <!-- Módulo Administración -->
                    <li class="has-submenu ${moduloAdmin ? 'open' : ''}">
                        <div class="submenu-header nav-item">
                            <i class="fas fa-cogs"></i>
                            <span class="link-text">Administración</span>
                            <i class="fas fa-chevron-right arrow-icon"></i>
                        </div>
                        <ul class="submenu" style="display: ${moduloAdmin ? 'block' : 'none'}; max-height: ${moduloAdmin ? '500px' : '0px'}">
                            <li><a href="usuario.html">Usuarios</a></li>
                            <li><a href="planes.html">Planes y Servicios</a></li>
                        </ul>
                    </li>

                    <!-- Módulo Clientes -->
                    <li class="has-submenu ${moduloClientes ? 'open' : ''}">
                        <div class="submenu-header nav-item">
                            <i class="fas fa-address-book"></i>
                            <span class="link-text">Clientes</span>
                            <i class="fas fa-chevron-right arrow-icon"></i>
                        </div>
                        <ul class="submenu" style="display: ${moduloClientes ? 'block' : 'none'}; max-height: ${moduloClientes ? '500px' : '0px'}">
                            <li><a href="clientes.html">Clientes</a></li>
                            <li><a href="facturas.html">Facturas</a></li>
                            <li><a href="pagos.html">Pagos</a></li>
                        </ul>
                    </li>

                    <!-- Módulo Reportes -->
                    <li class="has-submenu ${moduloReportes ? 'open' : ''}">
                        <div class="submenu-header nav-item">
                            <i class="fas fa-chart-bar"></i>
                            <span class="link-text">Reportes</span>
                            <i class="fas fa-chevron-right arrow-icon"></i>
                        </div>
                        <ul class="submenu" style="display: ${moduloReportes ? 'block' : 'none'}; max-height: ${moduloReportes ? '500px' : '0px'}">
                            <li><a href="reportes.html">Reportes</a></li>
                        </ul>
                    </li>
                    
                    <li class="separator-item">
                        <hr style="margin: 10px 20px; border: 0; border-top: 1px solid var(--border-color, #e9ecef);">
                    </li>

                    <li>
                        <a href="perfil.html" class="nav-item ${paginaActual === 'perfil.html' ? 'active' : ''}">
                            <i class="fas fa-user-circle"></i>
                            <span class="link-text">Perfil</span>
                        </a>
                    </li>

                    <li>
                        <a href="#" id="signout-btn" class="nav-item" style="color: #dc3545;">
                            <i class="fas fa-sign-out-alt"></i>
                            <span class="link-text">Cerrar Sesión</span>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;
}

/** Inicializa controladores de eventos */
function _inicializarEventosSidebar() {
    // 1. Control de submenús desplegables
    document.querySelectorAll(".has-submenu").forEach((item) => {
        const header = item.querySelector(".submenu-header");
        const submenu = item.querySelector(".submenu");
        
        if (header && submenu) {
            header.addEventListener("click", () => {
                // Si la barra lateral está colapsada, no desplegar acordeones
                const sidebar = document.getElementById("sidebar");
                if (sidebar && sidebar.classList.contains("collapsed")) return;

                // Colapsar otros submenús abiertos para mantener orden visual
                document.querySelectorAll(".has-submenu.open").forEach((openItem) => {
                    if (openItem !== item) {
                        openItem.classList.remove("open");
                        const openSub = openItem.querySelector(".submenu");
                        if (openSub) {
                            openSub.style.display = "none";
                            openSub.style.maxHeight = "0px";
                        }
                    }
                });

                // Alternar estado del elemento actual
                const isOpen = item.classList.toggle("open");
                submenu.style.display = isOpen ? "block" : "none";
                submenu.style.maxHeight = isOpen ? "500px" : "0px";
            });
        }
    });

    // 2. Control de colapsado horizontal robusto
    const toggleBtn = document.getElementById("sidebar-toggle-internal");
    const sidebar = document.getElementById("sidebar");
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener("click", () => {
            const isCollapsed = sidebar.classList.toggle("collapsed");
            
            // Toggle de clase en la etiqueta body para el reajuste del main-content (100% de navegadores)
            document.body.classList.toggle("sidebar-collapsed", isCollapsed);
            
            if (isCollapsed) {
                sidebar.style.width = "80px";
                // Modificar la dirección del icono
                toggleBtn.classList.replace("fa-chevron-left", "fa-chevron-right");
            } else {
                sidebar.style.width = ""; // Retorna al valor base
                toggleBtn.classList.replace("fa-chevron-right", "fa-chevron-left");
            }
        });
    }

    // 3. Soporte para toggle de menú móvil (Overlay)
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebarContainer = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileToggle && sidebarContainer && overlay) {
        mobileToggle.addEventListener('click', () => {
            sidebarContainer.classList.remove('hidden');
            overlay.classList.remove('hidden');
        });
    }

    // 4. Procesamiento seguro de cierre de sesión
    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.Session) Session.cerrar();
            window.location.href = window.APP_ROUTES ? window.APP_ROUTES.LOGIN : 'login.html';
        });
    }
}

// Métodos globales de respaldo para llamadas inline de vistas legacy
window.closeMobileSidebar = function() {
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar-container')?.classList.add('hidden');
        document.getElementById('sidebar-overlay')?.classList.add('hidden');
    }
};