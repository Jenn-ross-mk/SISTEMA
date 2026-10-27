import { fechaHora, resumenCotizacion } from './resumenCotizacion'

const ANCHO = 80 // mm, ancho de un ticket de impresora térmica
const MARGEN = 5
const UTIL = ANCHO - MARGEN * 2
const NAVY = [0, 51, 102]
const PT_A_MM = 0.3528

async function cargarLogo() {
  try {
    const res = await fetch('/logo-akar.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Recorre el ticket completo. Con pintar=false sólo mide, para saber
// el alto exacto de la página antes de dibujarlo.
function dibujar(doc, r, c, logo, pintar) {
  let y = 0

  const alto = size => size * PT_A_MM * 1.3

  function fuente(size, bold) {
    doc.setFont('courier', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
  }

  function texto(str, { size = 8, bold = false, align = 'left' } = {}) {
    fuente(size, bold)
    const x = align === 'center' ? ANCHO / 2 : align === 'right' ? ANCHO - MARGEN : MARGEN
    for (const linea of doc.splitTextToSize(String(str), UTIL)) {
      y += alto(size)
      if (pintar) doc.text(linea, x, y, { align })
    }
  }

  function fila(label, valor, { size = 8, bold = false } = {}) {
    fuente(size, bold)
    const l = String(label)
    const v = String(valor)
    if (!v) return texto(l, { size, bold })
    if (doc.getTextWidth(l) + doc.getTextWidth(v) + 2 <= UTIL) {
      y += alto(size)
      if (pintar) {
        doc.text(l, MARGEN, y)
        doc.text(v, ANCHO - MARGEN, y, { align: 'right' })
      }
    } else {
      texto(l, { size, bold })
      texto(v, { size, bold, align: 'right' })
    }
  }

  function separador(doble = false) {
    y += 2.5
    if (pintar) {
      doc.setDrawColor(0)
      doc.setLineWidth(0.2)
      doc.setLineDashPattern(doble ? [] : [1, 1], 0)
      doc.line(MARGEN, y, ANCHO - MARGEN, y)
      if (doble) doc.line(MARGEN, y + 0.8, ANCHO - MARGEN, y + 0.8)
      doc.setLineDashPattern([], 0)
    }
    y += doble ? 1.5 : 0.7
  }

  // Encabezado con logo
  const bandaH = 22
  if (pintar) {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, ANCHO, bandaH, 'F')
    if (logo) {
      const w = 52
      const h = w * (315 / 851)
      doc.addImage(logo, 'PNG', (ANCHO - w) / 2, (bandaH - h) / 2, w, h)
    } else {
      fuente(12, true)
      doc.setTextColor(255)
      doc.text('AKAR AUTOMOTORES', ANCHO / 2, bandaH / 2 + 1.5, { align: 'center' })
      doc.setTextColor(0)
    }
  }
  y = bandaH + 2

  texto('RESUMEN DE COTIZACIÓN', { size: 10, bold: true, align: 'center' })
  texto(r.tipo.toUpperCase(), { size: 8, align: 'center' })
  texto(`Nro. ${String(c.id || '').slice(0, 8).toUpperCase()}`, { size: 8, align: 'center' })

  for (const s of r.secciones) {
    separador()
    texto(s.titulo.toUpperCase(), { size: 8, bold: true })
    y += 0.5
    for (const [label, valor] of s.filas) fila(label, valor)
  }

  separador(true)
  fila(r.total.label, r.total.valor, { size: 11, bold: true })
  separador(true)

  for (const [titulo, obs] of r.observaciones) {
    texto(titulo.toUpperCase(), { size: 8, bold: true })
    texto(obs, { size: 8 })
    separador()
  }

  y += 1
  texto(`Presupuesto válido por ${r.validez}`, { size: 7, align: 'center' })
  texto(`Emitido: ${fechaHora(new Date())}`, { size: 7, align: 'center' })

  return y + MARGEN
}

export async function descargarTicket(c, localidad) {
  const { jsPDF } = await import('jspdf')
  const r = resumenCotizacion(c, localidad)
  const logo = await cargarLogo()

  const medidor = new jsPDF({ unit: 'mm', format: [ANCHO, 2000] })
  const altoTotal = Math.max(dibujar(medidor, r, c, logo, false), 100)

  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, altoTotal] })
  dibujar(doc, r, c, logo, true)

  const fecha = new Date(c.created_at).toLocaleDateString('es-AR').replace(/\//g, '-')
  const cliente = (c.cliente_nombre || 'cotizacion').replace(/[^\p{L}\p{N}]+/gu, '-')
  doc.save(`ticket-${cliente}-${fecha}.pdf`)
}
