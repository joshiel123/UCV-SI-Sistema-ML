/**
 * reportes.js — Reporte y Descarga de Excel desde el Backend Python
 * Cable Latín — Frontend
 */

const btnGenerarExcel = document.getElementById('btnGenerarExcel');
const fechaDesdeInput = document.getElementById('fechaDesde');
const fechaHastaInput = document.getElementById('fechaHasta');
const loaderIcon = document.getElementById('loader-icon');
const excelIcon = document.getElementById('excel-icon');
const btnExcelText = document.getElementById('btn-excel-text');
const tableBody = document.getElementById('reportes-table-body');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Proteger página para roles supervisores
    const autorizado = await AuthAPI.protegerPagina(['administrador', 'supervisor']);
    if (!autorizado) return;

    lucide.createIcons();
    await cargarResumenFinanciero();

    // Habilitar botón de descarga de Excel
    if (btnGenerarExcel) {
        btnGenerarExcel.disabled = false;
        if (btnExcelText) btnExcelText.textContent = 'Generar Excel';
        if (loaderIcon) loaderIcon.style.display = 'none';
        if (excelIcon) excelIcon.style.display = 'inline-block';
    }
});

async function cargarResumenFinanciero() {
    if (!tableBody) return;
    try {
        const respuesta = await ReportesAPI.obtenerDashboard();
        if (respuesta && respuesta.success) {
            const d = respuesta.data;
            tableBody.innerHTML = `
                <tr>
                    <td><strong>Ingresos Totales (Caja Activa)</strong></td>
                    <td>S/ ${parseFloat(d.ingresos_totales || 0).toFixed(2)}</td>
                    <td>Suma de todos los pagos registrados</td>
                    <td><span class="status-pill active" style="background:#d1e7dd; color:#0f5132; padding:3px 8px; border-radius:10px; font-size:0.8rem;">Estable</span></td>
                </tr>
                <tr>
                    <td><strong>Abonados Activos</strong></td>
                    <td>${d.total_clientes || 0} Clientes</td>
                    <td>Total de clientes con registro Activo</td>
                    <td><span style="color:#0d6efd; font-weight:bold;">Vigente</span></td>
                </tr>
                <tr>
                    <td><strong>Servicios Suspendidos</strong></td>
                    <td>${d.servicios_suspendidos || 0} Cortes</td>
                    <td>Abonados con corte temporal por mora</td>
                    <td><span class="status-pill inactive" style="background:#f8d7da; color:#842029; padding:3px 8px; border-radius:10px; font-size:0.8rem;">Pendiente</span></td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">No se pudo procesar el resumen contable.</td></tr>`;
        }
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error de conexión con el backend.</td></tr>`;
    }
}

if (btnGenerarExcel) {
    btnGenerarExcel.addEventListener('click', async () => {
        const fechaDesde = fechaDesdeInput?.value || '';
        const fechaHasta = fechaHastaInput?.value || '';

        if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
            alert('La fecha de inicio (Desde) no puede ser posterior a la fecha final (Hasta).');
            return;
        }

        btnGenerarExcel.disabled = true;
        if (btnExcelText) btnExcelText.textContent = 'Descargando...';
        if (loaderIcon) loaderIcon.style.display = 'inline-block';
        if (excelIcon) excelIcon.style.display = 'none';

        try {
            // Descarga de archivo de manera asíncrona nativa
            const resultado = await ReportesAPI.descargarExcel(fechaDesde, fechaHasta);

            if (!resultado.success) {
                alert('Error al compilar el reporte: ' + (resultado.mensaje || 'Error desconocido.'));
            }
        } catch (error) {
            console.error('[Reportes] Error de descarga:', error);
            alert('Error de conexión con el servidor.');
        } finally {
            btnGenerarExcel.disabled = false;
            if (btnExcelText) btnExcelText.textContent = 'Generar Excel';
            if (loaderIcon) loaderIcon.style.display = 'none';
            if (excelIcon) excelIcon.style.display = 'inline-block';
        }
    });
}