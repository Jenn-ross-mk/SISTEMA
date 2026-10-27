import { fmt } from './pdfUtils'

const PROVINCIAS = { chubut: 'Chubut', santacruz: 'Santa Cruz' }

const peso = n => `$${fmt(n)}`
const vacio = v => v === null || v === undefined || v === ''

export function esPlanAhorro(c) {
  return !!c?.plan_nombre?.toLowerCase().includes('plan de ahorro')
}

// Inserta la cotización con el detalle completo. Si la columna `detalle`
// todavía no existe en la base (falta correr la migración), guarda igual
// sin ella para no cortar el flujo del vendedor.
export async function insertarCotizacion(supabase, datos) {
  const { error } = await supabase.from('cotizaciones').insert(datos)
  if (error && datos.detalle && /detalle/i.test(error.message || '')) {
    console.warn('La columna "detalle" no existe todavía; se guarda sin el detalle completo.')
    const { detalle, ...resto } = datos
    return supabase.from('cotizaciones').insert(resto)
  }
  return { error }
}

// Arma todos los campos de una cotización agrupados en secciones.
// Lo usan el panel de detalle y el ticket descargable, así muestran lo mismo.
// Las cotizaciones viejas (sin `detalle`) se arman con las columnas que hay.
export function resumenCotizacion(c, localidad) {
  const d = c.detalle || {}
  const pa = esPlanAhorro(c)
  const secciones = []

  secciones.push({
    titulo: 'Datos generales',
    filas: [
      ['Fecha', new Date(c.created_at).toLocaleString('es-AR')],
      ['Vendedor', c.vendedor_nombre],
      ['Localidad', localidad || d.localidad || '-'],
      ['Cliente', c.cliente_nombre],
      ['Teléfono', c.telefono || d.telefono],
    ],
  })

  if (pa) {
    secciones.push({
      titulo: 'Vehículo',
      filas: [
        ['Modelo', c.vehiculo_descripcion],
        ['Tipo de plan', d.tipo_plan],
        ['Plazo', c.cuotas ? `${c.cuotas} cuotas` : null],
        ['Valor móvil', peso(c.precio_base)],
      ],
    })
    secciones.push({
      titulo: 'Cuota 1 - Promoción',
      filas: [
        ['Cuota 1 sin promo', vacio(d.cuota1_sin_promo) ? null : peso(d.cuota1_sin_promo)],
        ['Bonificación', `${d.bonificacion_pct ?? c.descuento ?? 0}%`],
        ['Cuota 1 con promo', peso(c.valor_cuota)],
      ],
    })
    secciones.push({
      titulo: 'Características del plan',
      filas: [
        ['Sistema', d.sistema],
        ['Financiación sobre', d.tipo_plan ? `${d.tipo_plan} del valor de la unidad` : null],
        ['Adjudicación', d.adjudicacion],
        ['Cuota pura actual', vacio(d.cuota_pura) ? null : peso(d.cuota_pura)],
        ['Integración mínima', d.integracion_minima],
      ],
    })
    if (d.tramos?.length) {
      secciones.push({
        titulo: 'Esquema de cuotas',
        filas: d.tramos.map(t => [`${t.label}${t.es_promo ? ' (promo)' : ''}`, peso(t.monto)]),
      })
    }
    if (d.promociones?.length) {
      secciones.push({
        titulo: 'Promociones especiales',
        filas: d.promociones.map(p => [p.titulo, p.descripcion || '']),
      })
    }
  } else {
    const plan = d.plan || {}
    secciones.push({
      titulo: 'Vehículo',
      filas: [
        ['Modelo', c.vehiculo_descripcion],
        ['Provincia', PROVINCIAS[c.provincia] || c.provincia],
        ['Precio base', peso(c.precio_base)],
      ],
    })
    if (c.plan_nombre || c.monto_financiado > 0) {
      secciones.push({
        titulo: 'Financiación',
        filas: [
          ['Plan', plan.nombre || c.plan_nombre],
          ['Monto financiado', peso(c.monto_financiado)],
          ['Cuotas', c.cuotas || null],
          ['Tasa', vacio(plan.tna) ? null : (Number(plan.tna) === 0 ? 'Tasa 0%' : `TNA ${plan.tna}%`)],
          ['Valor de cuota', peso(c.valor_cuota)],
          ['Total en cuotas', vacio(plan.total_cuotas) ? null : peso(plan.total_cuotas)],
        ],
      })
      secciones.push({
        titulo: 'Gastos bancarios',
        filas: [
          ['Banco', d.banco_nombre],
          ['Quebranto', peso(c.quebranto)],
          ['Sellado', peso(c.sellado)],
          ['Total gastos bancarios', peso((c.quebranto || 0) + (c.sellado || 0))],
        ],
      })
    }
    secciones.push({
      titulo: 'Resumen',
      filas: [
        ['Valor del vehículo', peso(c.precio_base)],
        ['Gastos bancarios', `+ ${peso((c.quebranto || 0) + (c.sellado || 0))}`],
        ['Entrega (usado)', `- ${peso(c.entrega_usado)}`],
        ['Monto financiado', `- ${peso(c.monto_financiado)}`],
        ['Descuento', `- ${peso(c.descuento)}`],
      ],
    })
  }

  for (const s of secciones) s.filas = s.filas.filter(([, v]) => !vacio(v))

  return {
    tipo: pa ? 'Plan de Ahorro' : 'Convencional',
    secciones: secciones.filter(s => s.filas.length),
    total: { label: pa ? 'CUOTA 1' : 'SALDO', valor: peso(c.saldo_efectivo) },
    observaciones: [
      ['Observaciones', d.observaciones],
      ['Observaciones del plan', d.observaciones_plan],
    ].filter(([, texto]) => texto?.trim()),
    validez: d.validez || (pa ? '10 días' : '5 días'),
  }
}
