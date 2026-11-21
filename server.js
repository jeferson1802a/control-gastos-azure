'use strict';
const express = require('express');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const { ManagedIdentityCredential } = require('@azure/identity');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));

const endpoint = process.env.AZURE_BLOB_ENDPOINT;
const cuentaAutorizada = process.env.AZURE_STORAGE_OWNER_UPN?.trim().toLowerCase();
const contenedor = endpoint ? new BlobServiceClient(endpoint, new ManagedIdentityCredential())
  .getContainerClient('resumenes-demo') : null;

function puedeAcceder(req) {
  return Boolean(cuentaAutorizada && req.get('X-MS-CLIENT-PRINCIPAL-ID') &&
    req.get('X-MS-CLIENT-PRINCIPAL-IDP') === 'aad' &&
    req.get('X-MS-CLIENT-PRINCIPAL-NAME')?.toLowerCase() === cuentaAutorizada);
}

function protegerAlmacenamiento(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!puedeAcceder(req)) return res.status(401).json({ error: 'Inicia sesión con la cuenta autorizada.' });
  if (!contenedor) return res.status(503).json({ estado: 'no_configurado' });
  next();
}

app.get('/api/resumen', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    estado: 'activo',
    servicio: 'Azure App Service',
    almacenamiento: contenedor && cuentaAutorizada ? 'configurado' : 'sin configurar',
    autorizado: puedeAcceder(req),
    aplicacion: 'Mis Finanzas'
  });
});

app.post('/api/resumen', (req, res) => calcularResumen(req, res, false));
app.post('/api/almacenamiento', protegerAlmacenamiento, (req, res) => calcularResumen(req, res, true));

async function calcularResumen(req, res, guardarEnAzure) {
  const lista = req.body?.movimientos;
  if (!Array.isArray(lista) || lista.length > 1000) {
    return res.status(400).json({ error: 'Lista inválida' });
  }

  let entradas = 0;
  let salidas = 0;
  const porCategoria = Object.create(null);

  for (const movimiento of lista) {
    if (!movimiento || typeof movimiento.monto !== 'number' ||
        !Number.isFinite(movimiento.monto) || movimiento.monto <= 0 ||
        movimiento.monto > 1000000000 ||
        !['ingreso', 'gasto'].includes(movimiento.tipo) ||
        typeof movimiento.categoria !== 'string' ||
        movimiento.categoria.length > 80) {
      return res.status(400).json({ error: 'Movimiento inválido' });
    }
    const centimos = Math.round(movimiento.monto * 100);
    if (movimiento.tipo === 'ingreso') entradas += centimos;
    else {
      salidas += centimos;
      porCategoria[movimiento.categoria] =
        (porCategoria[movimiento.categoria] || 0) + centimos;
    }
  }

  const categorias = Object.create(null);
  for (const [nombre, centimos] of Object.entries(porCategoria)) {
    categorias[nombre] = centimos / 100;
  }

  const resumen = {
    ingresos: entradas / 100,
    gastos: salidas / 100,
    saldo: (entradas - salidas) / 100,
    cantidad: lista.length,
    categorias
  };

  let almacenamiento = 'no_configurado';
  if (guardarEnAzure) {
    try {
      const documento = JSON.stringify({
        ...resumen,
        actualizado: new Date().toISOString(),
        nota: 'Datos de demostración. No almacenar información sensible.'
      });
      await contenedor.getBlockBlobClient('ultimo-resumen.json').upload(
        documento, Buffer.byteLength(documento), {
          blobHTTPHeaders: { blobContentType: 'application/json' }
        }
      );
      almacenamiento = 'blob';
    } catch (error) {
      console.error('No se pudo guardar en Blob Storage:', error.message);
      return res.status(503).json({ error: 'No se pudo guardar el resumen en Azure.' });
    }
  }

  res.json({ ...resumen, almacenamiento, procesadoPor: 'Azure App Service' });
}

app.get('/api/almacenamiento', protegerAlmacenamiento, async (_req, res) => {
  try {
    const blob = contenedor.getBlockBlobClient('ultimo-resumen.json');
    if (!(await blob.exists())) {
      return res.json({ estado: 'conectado', registro: 'sin datos' });
    }
    const respuesta = await blob.download();
    const buffers = [];
    for await (const parte of respuesta.readableStreamBody) buffers.push(parte);
    res.json({ estado: 'conectado', servicio: 'Azure Blob Storage',
      ultimoResumen: JSON.parse(Buffer.concat(buffers).toString('utf8')) });
  } catch (error) {
    res.status(503).json({ estado: 'error', detalle: 'Error al consultar Blob Storage' });
  }
});

app.use(express.static(path.join(__dirname, 'src')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'src', 'index.html')));
const puerto = process.env.PORT || 8080;
app.listen(puerto, () => console.log('Mis Finanzas disponible en puerto ' + puerto));
