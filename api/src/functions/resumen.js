'use strict';
const { app } = require('@azure/functions');

app.http('resumen', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'resumen',
  handler: async (request) => {
    if (request.method === 'GET') {
      return {
        jsonBody: {
          estado: 'activo',
          servicio: 'Azure Functions',
          aplicacion: 'Mis Finanzas',
          mensaje: 'La API esta funcionando correctamente'
        }
      };
    }

    let datos;
    try { datos = await request.json(); }
    catch (_) { return { status: 400, jsonBody: { error: 'JSON inválido' } }; }
    const movimientos = datos && datos.movimientos;
    if (!Array.isArray(movimientos) || movimientos.length > 1000) {
      return { status: 400, jsonBody: { error: 'Lista de movimientos inválida (máx. 1000)' } };
    }

    let ingresosCentimos = 0;
    let gastosCentimos = 0;
    const categoriasCentimos = Object.create(null);
    for (const m of movimientos) {
      if (!m || !['ingreso', 'gasto'].includes(m.tipo) || typeof m.monto !== 'number' ||
          !Number.isFinite(m.monto) || m.monto <= 0 || m.monto > 1000000000 ||
          typeof m.categoria !== 'string' || m.categoria.length > 80) {
        return { status: 400, jsonBody: { error: 'Movimiento inválido' } };
      }
      const cents = Math.round(m.monto * 100);
      if (m.tipo === 'ingreso') ingresosCentimos += cents;
      else {
        gastosCentimos += cents;
        categoriasCentimos[m.categoria] = (categoriasCentimos[m.categoria] || 0) + cents;
      }
    }
    const categorias = {};
    for (const [k, cents] of Object.entries(categoriasCentimos)) categorias[k] = cents / 100;
    return {
      jsonBody: {
        ingresos: ingresosCentimos / 100,
        gastos: gastosCentimos / 100,
        saldo: (ingresosCentimos - gastosCentimos) / 100,
        cantidad: movimientos.length,
        categorias,
        procesadoPor: 'Azure Functions'
      }
    };
  }
});
