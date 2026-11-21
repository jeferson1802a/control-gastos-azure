# Mis Finanzas — Control de gastos personales en Azure

Aplicación académica para registrar ingresos y gastos en soles peruanos.

## Servicios de Azure
1. **Azure Static Web Apps:** publica la interfaz HTML, CSS y JavaScript por HTTPS.
2. **Azure Functions (API integrada):** procesa los movimientos y calcula ingresos, gastos, saldo y distribución por categoría.

La versión demo guarda los movimientos en localStorage del navegador. No uses datos financieros sensibles.

## Despliegue en Azure
1. En portal.azure.com selecciona **Static Web Apps → Crear**.
2. Elige la suscripción **Azure for Students** y el plan **Free**.
3. Conecta GitHub, repositorio **jeferson1802a/control-gastos-azure**, rama **main**.
4. Build preset: **Custom**. App location: **src**. API location: **api**. Output location: dejar vacío.
5. Crea el recurso, comprueba en GitHub Actions que el despliegue termine correctamente y copia la URL pública desde Azure.

## Pruebas
Haz clic en **Cargar ejemplo**. Se esperan ingresos de S/ 2,500; gastos de S/ 560; saldo de S/ 1,940.
El indicador debe mostrar **Azure Functions conectado**.
La ruta **/api/resumen** muestra el estado de la API.

**Nota:** la API integrada puede aparecer en Azure como un solo recurso de Static Web Apps, aunque use ambos servicios. Si tu docente exige dos recursos independientes, consulta esa condición antes de entregar.
