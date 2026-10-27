import { esPlanAhorro, fechaHora } from './resumenCotizacion'

const NAVY = 'FF003366'
const MONEDA = '"$"#,##0.00'
const PROVINCIAS = { chubut: 'Chubut', santacruz: 'Santa Cruz' }

// Excel guarda las fechas sin zona horaria: se corre la hora para que
// la planilla muestre la hora local y no la UTC.
function fechaLocal(iso) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
}

function estilizarEncabezado(fila) {
  fila.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  fila.height = 30
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

  const localidadDe = id => vendedores.find(v => v.id === id)?.localidad || ''
  const modeloDe = id => vehiculos.find(v => v.id === id)?.modelo || ''

  // --- Hoja Resumen por vendedor ---
  const res = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  res.columns = [
    { width: 28 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 22 },
  ]
  res.addRow(['Informe de cotizaciones - AKAR']).font = { bold: true, size: 16, color: { argb: NAVY } }
  for (const [k, v] of filtros) {
    const r = res.addRow([k, v])
    r.getCell(1).font = { bold: true }
  }
  res.addRow(['Generado', fechaHora(new Date())]).getCell(1).font = { bold: true }
  res.addRow([])

  const encabezadoRes = res.addRow(['Vendedor', 'Sucursal', 'Cotizaciones', 'Convencionales', 'Plan de Ahorro', 'Monto financiado total', 'Saldo total (convencional)'])
  estilizarEncabezado(encabezadoRes)

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
  for (const v of resumen) {
    res.addRow([v.nombre, v.localidad, v.total, v.conv, v.pa, v.monto, v.saldo])
  }
  const tot = resumen.reduce((t, v) => ({
    total: t.total + v.total, conv: t.conv + v.conv, pa: t.pa + v.pa, monto: t.monto + v.monto, saldo: t.saldo + v.saldo,
  }), { total: 0, conv: 0, pa: 0, monto: 0, saldo: 0 })
  const filaTotal = res.addRow(['TOTAL', '', tot.total, tot.conv, tot.pa, tot.monto, tot.saldo])
  filaTotal.font = { bold: true }
  filaTotal.eachCell(cell => { cell.border = { top: { style: 'medium', color: { argb: NAVY } } } })
  res.getColumn(6).numFmt = MONEDA
  res.getColumn(7).numFmt = MONEDA

  // --- Hoja con todas las cotizaciones y todos sus campos ---
  const hoja = wb.addWorksheet('Cotizaciones', { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = [
    { header: 'Fecha', key: 'fecha', width: 17, style: { numFmt: 'dd/mm/yyyy hh:mm' } },
    { header: 'Vendedor', key: 'vendedor', width: 22 },
    { header: 'Sucursal', key: 'sucursal', width: 20 },
    { header: 'Cliente', key: 'cliente', width: 24 },
    { header: 'Teléfono', key: 'telefono', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Vehículo', key: 'vehiculo', width: 30 },
    { header: 'Modelo', key: 'modelo', width: 14 },
    { header: 'Provincia', key: 'provincia', width: 12 },
    { header: 'Precio base / Valor móvil', key: 'precio', width: 18, style: { numFmt: MONEDA } },
    { header: 'Plan', key: 'plan', width: 34 },
    { header: 'Cuotas', key: 'cuotas', width: 9 },
    { header: 'Tasa', key: 'tasa', width: 11 },
    { header: 'Monto financiado', key: 'monto', width: 18, style: { numFmt: MONEDA } },
    { header: 'Valor cuota / Cuota 1', key: 'cuota', width: 18, style: { numFmt: MONEDA } },
    { header: 'Banco', key: 'banco', width: 22 },
    { header: 'Quebranto', key: 'quebranto', width: 16, style: { numFmt: MONEDA } },
    { header: 'Sellado', key: 'sellado', width: 16, style: { numFmt: MONEDA } },
    { header: 'Gastos bancarios', key: 'gastos', width: 18, style: { numFmt: MONEDA } },
    { header: 'Entrega usado', key: 'entrega', width: 18, style: { numFmt: MONEDA } },
    { header: 'Descuento', key: 'descuento', width: 16, style: { numFmt: MONEDA } },
    { header: 'Bonificación %', key: 'bonificacion', width: 13 },
    { header: 'Saldo / Cuota 1', key: 'saldo', width: 18, style: { numFmt: MONEDA } },
    { header: 'Observaciones', key: 'observaciones', width: 50 },
  ]
  estilizarEncabezado(hoja.getRow(1))
  for (const c of cotizaciones) hoja.addRow(filaCotizacion(c, localidadDe(c.vendedor_id), modeloDe(c.vehiculo_id)))
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } }

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
