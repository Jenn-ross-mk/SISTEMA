import { esPlanAhorro, fechaHora } from './resumenCotizacion'
import { cargarLogo } from './ticketCotizacion'

const NAVY = 'FF003366'
const BLANCO = 'FFFFFFFF'
const CELESTE = 'FFE6F1FB'
const ZEBRA = 'FFF5F7FA'
const BORDE = 'FFD5DCE5'
const MONEDA = '"$"#,##0.00'
const PROVINCIAS = { chubut: 'Chubut', santacruz: 'Santa Cruz' }

// Excel guarda las fechas sin zona horaria: se corre la hora para que
// la planilla muestre la hora local y no la UTC.
function fechaLocal(iso) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
}

const relleno = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const centrado = { horizontal: 'center', vertical: 'middle', wrapText: true }
const bordeFino = { style: 'thin', color: { argb: BORDE } }
const bordes = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino }

// Columna A y la última quedan vacías y angostas, como márgenes a los lados.
// Las columnas con datos van de la B (2) a la `ultima`.
function prepararHoja(ws, anchos) {
  ws.columns = [{ width: 3 }, ...anchos.map(width => ({ width })), { width: 3 }]
  ws.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    horizontalCentered: true, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  }
  return anchos.length + 1
}

// Banner azul con el logo y el título, igual al encabezado del cotizador.
// El título se centra sobre las primeras `span` columnas para que se vea
// al abrir la planilla aunque la tabla sea muy ancha.
function banner(ws, ultima, span, logoId, subtitulo) {
  const finTitulo = Math.min(1 + span, ultima)
  ws.getRow(1).height = 10
  ws.getRow(2).height = 58
  ws.getRow(3).height = 22
  ws.getRow(4).height = 12
  for (let col = 2; col <= ultima; col++) {
    ws.getCell(2, col).fill = relleno(NAVY)
    ws.getCell(3, col).fill = relleno(CELESTE)
  }
  ws.mergeCells(2, 2, 2, finTitulo)
  const titulo = ws.getCell(2, 2)
  titulo.value = 'REGISTRO DE COTIZACIONES'
  titulo.font = { bold: true, size: 20, color: { argb: BLANCO } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }

  ws.mergeCells(3, 2, 3, finTitulo)
  const sub = ws.getCell(3, 2)
  sub.value = subtitulo
  sub.font = { size: 10, color: { argb: NAVY } }
  sub.alignment = { horizontal: 'center', vertical: 'middle' }

  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 1.08, row: 1.15 }, ext: { width: 146, height: 54 } })
  }
}

function encabezadoTabla(ws, fila, desde, valores) {
  const row = ws.getRow(fila)
  row.height = 34
  valores.forEach((v, i) => {
    const cell = row.getCell(desde + i)
    cell.value = v
    cell.font = { bold: true, color: { argb: BLANCO } }
    cell.fill = relleno(NAVY)
    cell.alignment = centrado
    cell.border = bordes
  })
}

function celdasTabla(ws, fila, desde, hasta, zebra) {
  for (let col = desde; col <= hasta; col++) {
    const cell = ws.getCell(fila, col)
    cell.alignment = centrado
    cell.border = bordes
    if (zebra) cell.fill = relleno(ZEBRA)
  }
}

async function logoParaExcel(wb) {
  const logo = await cargarLogo()
  return logo ? wb.addImage({ base64: logo, extension: 'png' }) : null
}

function filaCotizacion(c, sucursal, modeloCatalogo) {
  const d = c.detalle || {}
  const pa = esPlanAhorro(c)
  const tna = d.plan?.tna
  return {
    fecha: fechaLocal(c.created_at),
    vendedor: c.vendedor_nombre,
    sucursal: sucursal || d.localidad || '',
    cliente: c.cliente_nombre,
    telefono: c.telefono || d.telefono || '',
    tipo: pa ? 'Plan de Ahorro' : 'Convencional',
    vehiculo: c.vehiculo_descripcion,
    modelo: d.vehiculo?.modelo || modeloCatalogo || '',
    provincia: pa ? '' : (PROVINCIAS[c.provincia] || c.provincia || ''),
    precio: c.precio_base || 0,
    plan: c.plan_nombre || '',
    cuotas: c.cuotas || null,
    tasa: tna === undefined || tna === null ? '' : (Number(tna) === 0 ? 'Tasa 0%' : `TNA ${tna}%`),
    monto: pa ? null : (c.monto_financiado || 0),
    cuota: c.valor_cuota || 0,
    banco: d.banco_nombre || '',
    quebranto: pa ? null : (c.quebranto || 0),
    sellado: pa ? null : (c.sellado || 0),
    gastos: pa ? null : (c.quebranto || 0) + (c.sellado || 0),
    entrega: pa ? null : (c.entrega_usado || 0),
    descuento: pa ? null : (c.descuento || 0),
    bonificacion: pa ? (d.bonificacion_pct ?? c.descuento ?? null) : null,
    saldo: c.saldo_efectivo || 0,
    observaciones: [d.observaciones, d.observaciones_plan].filter(t => t?.trim()).join(' | '),
  }
}

// filtros: lista de [etiqueta, valor] con los filtros aplicados en pantalla.
// vehiculos: catálogo (id, modelo) para completar el modelo de cotizaciones viejas.
export async function descargarInformeExcel(cotizaciones, vendedores, filtros, vehiculos = []) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AKAR'
  wb.created = new Date()
  const logoId = await logoParaExcel(wb)

  const localidadDe = id => vendedores.find(v => v.id === id)?.localidad || ''
  const modeloDe = id => vehiculos.find(v => v.id === id)?.modelo || ''
  const generado = fechaHora(new Date())
  const subtitulo = [...filtros.map(([k, v]) => `${k}: ${v}`), `Generado: ${generado}`].join('   ·   ')

  // --- Hoja Resumen por vendedor ---
  const res = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  const ultRes = prepararHoja(res, [28, 22, 15, 17, 17, 24, 26])
  banner(res, ultRes, 7, logoId, 'Resumen por vendedor')

  // Filtros aplicados, en una tabla chica de dos filas
  const bloques = [[2, 2], [3, 3], [4, 4], [5, 6], [7, 8]]
  const datosFiltros = [...filtros.slice(0, 4), ['Generado', generado]]
  datosFiltros.forEach(([k, v], i) => {
    const [ini, fin] = bloques[i]
    if (fin > ini) { res.mergeCells(5, ini, 5, fin); res.mergeCells(6, ini, 6, fin) }
    const label = res.getCell(5, ini)
    label.value = k.toUpperCase()
    label.font = { bold: true, size: 9, color: { argb: NAVY } }
    const valor = res.getCell(6, ini)
    valor.value = v
    valor.font = { bold: true }
    for (let col = ini; col <= fin; col++) {
      res.getCell(5, col).fill = relleno(CELESTE)
      for (const f of [5, 6]) {
        res.getCell(f, col).alignment = centrado
        res.getCell(f, col).border = bordes
      }
    }
  })
  res.getRow(5).height = 20
  res.getRow(6).height = 24
  res.getRow(7).height = 14

  const porVendedor = new Map()
  for (const c of cotizaciones) {
    const key = c.vendedor_id || c.vendedor_nombre
    if (!porVendedor.has(key)) {
      porVendedor.set(key, { nombre: c.vendedor_nombre, localidad: localidadDe(c.vendedor_id), total: 0, conv: 0, pa: 0, monto: 0, saldo: 0 })
    }
    const v = porVendedor.get(key)
    v.total++
    if (esPlanAhorro(c)) {
      v.pa++
    } else {
      v.conv++
      v.monto += c.monto_financiado || 0
      v.saldo += c.saldo_efectivo || 0
    }
  }
  const resumen = [...porVendedor.values()].sort((a, b) => b.total - a.total)

  encabezadoTabla(res, 8, 2, ['Vendedor', 'Sucursal', 'Cotizaciones', 'Convencionales', 'Plan de Ahorro', 'Monto financiado total', 'Saldo total (convencional)'])
  let fila = 9
  resumen.forEach((v, i) => {
    res.getRow(fila).values = [null, v.nombre, v.localidad, v.total, v.conv, v.pa, v.monto, v.saldo]
    celdasTabla(res, fila, 2, ultRes, i % 2 === 1)
    res.getRow(fila).height = 22
    fila++
  })
  const tot = resumen.reduce((t, v) => ({
    total: t.total + v.total, conv: t.conv + v.conv, pa: t.pa + v.pa, monto: t.monto + v.monto, saldo: t.saldo + v.saldo,
  }), { total: 0, conv: 0, pa: 0, monto: 0, saldo: 0 })
  res.getRow(fila).values = [null, 'TOTAL', '', tot.total, tot.conv, tot.pa, tot.monto, tot.saldo]
  celdasTabla(res, fila, 2, ultRes, false)
  res.getRow(fila).height = 26
  for (let col = 2; col <= ultRes; col++) {
    const cell = res.getCell(fila, col)
    cell.font = { bold: true, color: { argb: NAVY } }
    cell.fill = relleno(CELESTE)
    cell.border = { ...bordes, top: { style: 'medium', color: { argb: NAVY } } }
  }
  for (let f = 9; f <= fila; f++) {
    res.getCell(f, 7).numFmt = MONEDA
    res.getCell(f, 8).numFmt = MONEDA
  }

  // --- Hoja con todas las cotizaciones y todos sus campos ---
  const columnas = [
    ['Fecha', 'fecha', 17, 'dd/mm/yyyy hh:mm'],
    ['Vendedor', 'vendedor', 22],
    ['Sucursal', 'sucursal', 20],
    ['Cliente', 'cliente', 24],
    ['Teléfono', 'telefono', 14],
    ['Tipo', 'tipo', 16],
    ['Vehículo', 'vehiculo', 30],
    ['Modelo', 'modelo', 14],
    ['Provincia', 'provincia', 12],
    ['Precio base / Valor móvil', 'precio', 18, MONEDA],
    ['Plan', 'plan', 34],
    ['Cuotas', 'cuotas', 9],
    ['Tasa', 'tasa', 11],
    ['Monto financiado', 'monto', 18, MONEDA],
    ['Valor cuota / Cuota 1', 'cuota', 18, MONEDA],
    ['Banco', 'banco', 22],
    ['Quebranto', 'quebranto', 16, MONEDA],
    ['Sellado', 'sellado', 16, MONEDA],
    ['Gastos bancarios', 'gastos', 18, MONEDA],
    ['Entrega usado', 'entrega', 18, MONEDA],
    ['Descuento', 'descuento', 16, MONEDA],
    ['Bonificación %', 'bonificacion', 13],
    ['Saldo / Cuota 1', 'saldo', 18, MONEDA],
    ['Observaciones', 'observaciones', 50],
  ]
  const hoja = wb.addWorksheet('Cotizaciones', { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }] })
  const ultHoja = prepararHoja(hoja, columnas.map(c => c[2]))
  banner(hoja, ultHoja, 8, logoId, subtitulo)

  encabezadoTabla(hoja, 5, 2, columnas.map(c => c[0]))
  cotizaciones.forEach((c, i) => {
    const datos = filaCotizacion(c, localidadDe(c.vendedor_id), modeloDe(c.vehiculo_id))
    const f = 6 + i
    const row = hoja.getRow(f)
    columnas.forEach(([, key, , numFmt], j) => {
      const cell = row.getCell(2 + j)
      cell.value = datos[key] ?? null
      if (numFmt) cell.numFmt = numFmt
    })
    celdasTabla(hoja, f, 2, ultHoja, i % 2 === 1)
    // Alto según el texto más largo, para que las observaciones no queden cortadas
    const lineas = Math.max(1, ...columnas.map(([, key, ancho]) => Math.ceil((datos[key] instanceof Date ? 1 : String(datos[key] ?? '').length) / (ancho - 2))))
    row.height = Math.max(22, lineas * 15 + 6)
  })
  hoja.autoFilter = { from: { row: 5, column: 2 }, to: { row: 5, column: ultHoja } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  const unico = resumen.length === 1 ? resumen[0].nombre : 'todos'
  const nombre = `informe-cotizaciones-${unico}-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}`
    .replace(/[^\p{L}\p{N}-]+/gu, '-')

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
