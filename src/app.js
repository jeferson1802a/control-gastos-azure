'use strict';
const CLAVE = 'mis-finanzas-azure-v1';
const $ = (id) => document.getElementById(id);
const dinero = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
let movimientos = [];
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE) || '[]');
  if (Array.isArray(guardado)) movimientos = guardado;
} catch (_) { movimientos = []; }

function fechaLocal() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}
$('fecha').value = fechaLocal();

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(movimientos)); }
  catch (_) { $('mensajes').textContent = 'No se pudieron guardar los cambios en este navegador.'; }
}

function calculoLocal() {
  const resumen = { ingresos: 0, gastos: 0, saldo: 0, cantidad: 0, categorias: {} };
  let ingresoCents = 0, gastoCents = 0;
  for (const m of movimientos) {
    const cents = Math.round(Number(m.monto) * 100);
    if (!Number.isFinite(cents) || cents <= 0) continue;
    if (m.tipo === 'ingreso') ingresoCents += cents;
    if (m.tipo === 'gasto') {
      gastoCents += cents;
      resumen.categorias[m.categoria] = (resumen.categorias[m.categoria] || 0) + cents / 100;
    }
  }
  resumen.ingresos = ingresoCents / 100;
  resumen.gastos = gastoCents / 100;
  resumen.saldo = (ingresoCents - gastoCents) / 100;
  resumen.cantidad = movimientos.length;
  return resumen;
}

function mostrarResumen(data) {
  $('totalIngresos').textContent = dinero(data.ingresos);
  $('totalGastos').textContent = dinero(data.gastos);
  $('totalSaldo').textContent = dinero(data.saldo);
  const grafico = $('graficoCategorias');
  grafico.replaceChildren();
  const categorias = Object.entries(data.categorias || {}).sort((a, b) => b[1] - a[1]);
  if (!categorias.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Registra un gasto para ver el gráfico.';
    grafico.appendChild(e);
    return;
  }
  for (const [categoria, importe] of categorias) {
    const row = document.createElement('div'); row.className = 'categoryrow';
    const top = document.createElement('div'); top.className = 'categorytext';
    const name = document.createElement('span'); name.textContent = categoria;
    const amount = document.createElement('strong'); amount.textContent = dinero(importe);
    top.append(name, amount);
    const track = document.createElement('div'); track.className = 'track';
    const fill = document.createElement('div'); fill.className = 'fill';
    fill.style.width = (data.gastos > 0 ? Math.max(0, Math.min(100, importe / data.gastos * 100)) : 0) + '%';
    track.appendChild(fill); row.append(top, track); grafico.appendChild(row);
  }
}

function mostrarHistorial() {
  const tabla = $('tablaMovimientos'); tabla.replaceChildren();
  if (!movimientos.length) {
    const tr = document.createElement('tr'); const td = tr.insertCell();
    td.colSpan = 6; td.className = 'empty'; td.textContent = 'Aún no hay movimientos registrados.';
    tabla.appendChild(tr); return;
  }
  [...movimientos].reverse().forEach((m) => {
    const tr = document.createElement('tr');
    const fecha = tr.insertCell(); fecha.textContent = m.fecha || '—';
    const concepto = tr.insertCell(); const strong = document.createElement('strong'); strong.textContent = m.concepto; concepto.appendChild(strong);
    tr.insertCell().textContent = m.categoria;
    const tipo = tr.insertCell(); const pill = document.createElement('span');
    pill.className = 'pill ' + (m.tipo === 'ingreso' ? 'income' : 'expense');
    pill.textContent = m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'; tipo.appendChild(pill);
    const monto = tr.insertCell(); monto.className = 'right'; monto.textContent = dinero(m.monto);
    const accion = tr.insertCell(); const btn = document.createElement('button');
    btn.className = 'remove'; btn.textContent = 'Eliminar'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Eliminar ' + m.concepto);
    btn.addEventListener('click', () => { movimientos = movimientos.filter(x => x.id !== m.id); guardar(); actualizar(); });
    accion.appendChild(btn); tabla.appendChild(tr);
  });
}

function actualizar() {
  mostrarHistorial();
  mostrarResumen(calculoLocal());
}

async function revisarAzure() {
  const estado = $('apiEstado');
  try {
    const respuesta = await fetch('/api/resumen', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('Servicio no disponible');
    const datos = await respuesta.json();
    const configurado = datos.almacenamiento === 'configurado';
    estado.textContent = configurado ? 'Azure Blob Storage disponible' : 'Guardado en Azure pendiente de configurar';
    $('accionesAzure').hidden = !configurado;
    $('loginAzure').hidden = !configurado || datos.autorizado;
    $('guardarAzure').hidden = !configurado || !datos.autorizado;
    $('leerAzure').hidden = !configurado || !datos.autorizado;
  } catch {
    estado.textContent = 'Azure no disponible. Puedes seguir usando el panel local.';
  }
}

$('guardarAzure').addEventListener('click', async () => {
  const mensaje = $('resumenAzure');
  const boton = $('guardarAzure');
  boton.disabled = true;
  try {
    const datos = movimientos.map(({ monto, tipo, categoria }) => ({ monto, tipo, categoria }));
    const respuesta = await fetch('/api/almacenamiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movimientos: datos })
    });
    mensaje.textContent = respuesta.ok ? 'Resumen guardado en Azure.' :
      respuesta.status === 401 ? 'Vuelve a iniciar sesión para guardar.' : 'No se pudo guardar el resumen en Azure.';
  } catch {
    mensaje.textContent = 'No se pudo guardar el resumen en Azure.';
  } finally {
    boton.disabled = false;
  }
});

$('leerAzure').addEventListener('click', async () => {
  const mensaje = $('resumenAzure');
  try {
    const respuesta = await fetch('/api/almacenamiento', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('Resumen no disponible');
    const { ultimoResumen } = await respuesta.json();
    mensaje.textContent = ultimoResumen ?
      'Último resumen guardado. Ingresos ' + dinero(ultimoResumen.ingresos) +
      ', gastos ' + dinero(ultimoResumen.gastos) + ', saldo ' + dinero(ultimoResumen.saldo) + '.' :
      'Todavía no hay un resumen guardado.';
  } catch {
    mensaje.textContent = 'No se pudo consultar el resumen guardado.';
  }
});

$('formMovimiento').addEventListener('submit', (event) => {
  event.preventDefault();
  const concepto = $('concepto').value.trim();
  const monto = Number($('monto').value);
  const fecha = $('fecha').value;
  if (!concepto || !Number.isFinite(monto) || monto <= 0 || monto > 1000000000 || !fecha) {
    $('mensajes').textContent = 'Revisa el concepto, monto y fecha.'; return;
  }
  const id = (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random();
  movimientos.push({id, concepto, monto: Math.round(monto * 100) / 100, tipo: $('tipo').value, categoria: $('categoria').value, fecha});
  guardar(); $('formMovimiento').reset(); $('fecha').value = fechaLocal();
  $('mensajes').textContent = 'Movimiento registrado correctamente.';
  actualizar();
});

$('demo').addEventListener('click', () => {
  if (movimientos.length && !confirm('¿Agregar los movimientos de ejemplo a los actuales?')) return;
  const fecha = fechaLocal();
  for (const [concepto, tipo, monto, categoria] of [
    ['Sueldo', 'ingreso', 2500, 'Trabajo'],
    ['Alimentación', 'gasto', 350, 'Alimentación'],
    ['Transporte', 'gasto', 120, 'Transporte'],
    ['Internet', 'gasto', 90, 'Vivienda']
  ]) {
    movimientos.push({id: crypto.randomUUID(), concepto, tipo, monto, categoria, fecha});
  }
  guardar(); actualizar();
});

$('vaciar').addEventListener('click', () => {
  if (!movimientos.length || !confirm('¿Eliminar todos los movimientos de este navegador?')) return;
  movimientos = []; guardar(); actualizar();
});
actualizar();
revisarAzure();
