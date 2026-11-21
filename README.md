# Mis Finanzas — Control de gastos personales en Microsoft Azure

Proyecto académico: **dos servicios integrados de Microsoft Azure**.

- **Azure App Service (plan F1 Free):** ejecuta el sitio web y una API Node.js/Express.
- **Azure Blob Storage (cuenta Storage):** la API guarda de manera privada el último resumen de demostración en el blob `resumenes-demo/ultimo-resumen.json`.

El formulario permite registrar movimientos y ver ingresos, gastos, saldo e importes por categoría. Los movimientos individuales se mantienen en `localStorage` del navegador. La API guarda en Blob **únicamente un resumen numérico**, sin conceptos ni fechas. Es una demostración pública sin autenticación: no introduzcas información real o sensible.

## Pasos para desplegar

1. Abre Azure Portal → **App Services → Crear → Aplicación web**.
2. Suscripción: **Azure for Students**. Grupo de recursos: `rg-control-gastos`.
3. Nombre: `mis-finanzas-web` (si está libre). **Código**, runtime **Node 20 LTS** (o una versión LTS disponible), **Windows**, región **Brazil South**, **Canada Central** o cualquiera de las autorizadas para tu suscripción.
4. Selecciona el plan **Free F1** y verifica precio antes de continuar. Si F1 no está disponible en esa región, comprueba otra permitida; **no aceptes un plan pagado por error**.
5. Revisa y crea. Cuando termine: App Service → **Centro de implementación / Deployment Center** → GitHub → `jeferson1802a/control-gastos-azure`, rama `main`. Guarda para iniciar el despliegue.
6. Comprueba que la web se abra en la dirección generada por App Service, con dominio `azurewebsites.net`.

## Conectar Azure Blob Storage

1. Azure Portal → **Cuentas de almacenamiento → Crear**. Usa la misma suscripción/grupo, región permitida, **StorageV2**, **Standard** y **LRS**. Revisa el precio: el almacenamiento puede consumir crédito si no está cubierto por una cuota gratuita.
2. Dentro de la cuenta de almacenamiento, ve a **Claves de acceso → Mostrar → Cadena de conexión**. **No compartas la cadena ni la subas a GitHub.**
3. App Service → **Variables de entorno / Configuración → Configuración de aplicación → Agregar**, nombre:
   `AZURE_STORAGE_CONNECTION_STRING`
   y pega la cadena de conexión en el campo valor. Guarda y reinicia la aplicación.
4. Registra movimientos ficticios o haz clic en **Cargar ejemplo**. Se esperan ingresos S/ 2,500; gastos S/ 560; saldo S/ 1,940.
5. Abre `https://<TU-DOMINIO>.azurewebsites.net/api/almacenamiento`. Debe mostrar `estado: conectado` y el último resumen guardado en Azure Blob Storage.

## API
- `GET /api/resumen`: comprobar el servicio.
- `POST /api/resumen`: calcular totales de los movimientos y guardar resumen en Azure Blob Storage.
- `GET /api/almacenamiento`: verificar que el blob existe y recuperar el último resumen.

## Código
- `server.js`: servidor de Azure App Service con API Express y conexión a Blob Storage.
- `package.json`: dependencias e instrucción `npm start`.
- `src/index.html`, `src/styles.css`, `src/app.js`: interfaz.
- `api/`: variante anterior para Static Web Apps (no se utiliza en esta modalidad de App Service).

## Seguridad y costos
La API de demostración es pública y no dispone de autenticación. Nunca guardes datos bancarios reales en este proyecto. Los movimientos solo residen en tu navegador; el archivo de Blob Storage contiene totales de demostración que se sobrescriben. Los cargos dependen de las cuotas del plan y el consumo de almacenamiento. El servicio web debe configurarse con plan F1 gratis.
