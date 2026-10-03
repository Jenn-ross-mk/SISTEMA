import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { CORP as canal } from './config'
import './corporativo.css'

const BANCOS = { chubut: 0.012, santacruz: 0.014 }
const IVA_QUEBRANTO = 0.21
const UNIDAD_BASE = 1_000_000

const ORDEN_PLANES = [
  'Plan convencional',
  'Tasa 0%',
  'Plan diferido',
  'Plan especial - Tasa Fija',
  'Plan especial - UVA',
]

function fmt(n) {
  return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Acepta "17.947.800,50", "17947800,50", "17947800.50" y "17947800".
// Un único punto seguido de 1 o 2 dígitos al final se toma como decimal;
// en cualquier otro caso los puntos son separadores de miles.
function parseMonto(str) {
  const s = String(str || '').replace(/[$\s]/g, '')
  if (!s) return 0
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s) || 0
  return parseFloat(s.replace(/\./g, '')) || 0
}

// En planes a tasa 0% la cuota es exactamente monto / cuotas, sin depender
// del coeficiente "cuota por millón" (que viene redondeado o con errores,
// ej. 41647 en lugar de 41666,67 a 24 cuotas). En planes con interés se usa
// el coeficiente de la circular (incluye amortización, intereses e IVA).
//
// En ventas corporativas el coeficiente es opcional: si no está cargado, la
// cuota también es monto / cuotas. Además se le suma el IVA del plan, si tiene.
function calcularCuota(monto, plan) {
  if (!plan || monto <= 0) return 0
  let cuota
  if (plan.cuotas > 0 && (Number(plan.tna) === 0 || !Number(plan.valor_cuota_por_millon))) cuota = monto / plan.cuotas
  else cuota = (monto / UNIDAD_BASE) * (plan.valor_cuota_por_millon || 0)
  if (Number(plan.iva_pct) > 0) cuota *= 1 + Number(plan.iva_pct)
  return cuota
}

// CUIT: 11 dígitos con dígito verificador (módulo 11).
function cuitValido(str) {
  const d = String(str || '').replace(/\D/g, '')
  if (d.length !== 11) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((s, p, i) => s + p * Number(d[i]), 0)
  let verif = 11 - (suma % 11)
  if (verif === 11) verif = 0
  if (verif === 10) return false
  return verif === Number(d[10])
}

function formatearCuit(str) {
  const d = String(str || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

const DIAS_VALIDEZ = 5
const CONDICIONES_DEFAULT = '• Forma de pago: saldo contra entrega, transferencia bancaria.\n• Plazo de entrega estimado: a confirmar.\n• Precios sujetos a modificación por parte de la fábrica.'

function telefonoValido(str) {
  return /^\d{8,10}$/.test(str || '')
}

export default function CorpCotizador() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const printRef = useRef()

  const [vehiculo, setVehiculo] = useState(null)
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [vendedor, setVendedor] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [provincia, setProvincia] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [descuento, setDescuento] = useState('')
  const [banco, setBanco] = useState('chubut')
  const [observaciones, setObservaciones] = useState(CONDICIONES_DEFAULT)
  const [propuesta] = useState(() => {
    const ahora = new Date()
    const pad = n => String(n).padStart(2, '0')
    const vence = new Date(ahora)
    vence.setDate(vence.getDate() + DIAS_VALIDEZ)
    return {
      numero: `PC-${String(ahora.getFullYear()).slice(2)}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}`,
      emitida: ahora.toLocaleDateString('es-AR'),
      vence: vence.toLocaleDateString('es-AR'),
    }
  })
  const [planState, setPlanState] = useState({})
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    if (profile?.nombre) setVendedor(profile.nombre)
  }, [profile])

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }] = await Promise.all([
        supabase.from(canal.tablaVehiculos).select('*').eq('id', id).single(),
        supabase.from(canal.tablaPlanes)
          .select('*')
          .eq('vehiculo_id', id)
          .eq('activo', true)
          .order('nombre_plan')
          .order('cuotas'),
      ])
      setVehiculo(v)
      const rows = p || []
      setPlanes(rows)
      const nombresUnicos = [...new Set(rows.map(r => r.nombre_plan))]
      const inicial = {}
      nombresUnicos.forEach(nombre => {
        const primera = rows.find(r => r.nombre_plan === nombre)
        inicial[nombre] = { monto: '', cuotaId: primera?.id || '' }
      })
      setPlanState(inicial)
      setLoading(false)
    }
    load()
  }, [id])

  const planesByNombre = {}
  planes.forEach(p => {
    if (!planesByNombre[p.nombre_plan]) planesByNombre[p.nombre_plan] = []
    planesByNombre[p.nombre_plan].push(p)
  })

  const nombresPlanes = [
    ...ORDEN_PLANES.filter(p => planesByNombre[p]),
    ...Object.keys(planesByNombre).filter(p => !ORDEN_PLANES.includes(p)),
  ]

  const precioBase = provincia === 'chubut'
    ? (vehiculo?.precio_chubut || 0)
    : provincia === 'santacruz'
      ? (vehiculo?.precio_santacruz || 0)
      : 0

  const entregaNum = 0
  const descuentoNum = parseMonto(descuento)

  const planActivoNombre = nombresPlanes.find(nombre => parseMonto(planState[nombre]?.monto) > 0) || null
  const planActivoState = planActivoNombre ? planState[planActivoNombre] : null
  const montoActivo = planActivoState ? parseMonto(planActivoState.monto) : 0

  const cuotaActivaRow = planActivoState
    ? planes.find(p => p.id === planActivoState.cuotaId)
    : null

  const valorCuota = calcularCuota(montoActivo, cuotaActivaRow)

  const quebrantoPct = cuotaActivaRow?.quebranto_pct || 0
  const quebranto = montoActivo * quebrantoPct * (1 + IVA_QUEBRANTO)
  const cuotasActivas = cuotaActivaRow?.cuotas || 0
  const totalCuotas = valorCuota * cuotasActivas
  const sellado = totalCuotas * (BANCOS[banco] || 0)
  const gastosBancarios = quebranto + sellado
  const saldoEfectivo = precioBase + gastosBancarios - entregaNum - montoActivo - descuentoNum

  // Flota: cada unidad se cotiza igual y los totales se multiplican.
  const unidades = Math.max(1, parseInt(cantidad) || 1)
  const esFlota = unidades > 1
  const cuitOk = cuitValido(cuit)
  const puedeGuardar = razonSocial.trim() && cuitOk && provincia && telefonoValido(telefono)

  function handlePlanMontoChange(nombrePlan, value) {
    setPlanState(prev => ({
      ...prev,
      [nombrePlan]: { ...prev[nombrePlan], monto: value }
    }))
  }

  function handleCuotaChange(nombrePlan, cuotaId) {
    setPlanState(prev => ({
      ...prev,
      [nombrePlan]: { ...prev[nombrePlan], cuotaId }
    }))
  }

  async function handleSave() {
    if (!puedeGuardar || !profile) return
    if (saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('cotizaciones').insert({
        vendedor_id: profile.id,
        vendedor_nombre: vendedor || profile.nombre,
        cliente_nombre: `${razonSocial.trim()} (CUIT ${formatearCuit(cuit)})`,
        telefono,
        // Los vehículos corporativos viven en otra tabla: no pueden
        // referenciarse con la FK de cotizaciones.vehiculo_id.
        vehiculo_id: null,
        vehiculo_descripcion: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.version}${esFlota ? ` × ${unidades} unidades` : ''}`,
        provincia,
        precio_base: precioBase,
        entrega_usado: entregaNum,
        descuento: descuentoNum,
        plan_nombre: `${canal.prefijoPlan} - ${cuotaActivaRow ? `${cuotaActivaRow.nombre_plan} - ${cuotaActivaRow.cuotas} cuotas` : 'Contado'}`,
        monto_financiado: montoActivo,
        cuotas: cuotasActivas,
        valor_cuota: valorCuota,
        quebranto,
        sellado,
        saldo_efectivo: saldoEfectivo,
      })
      if (error) throw error
    } catch (err) {
      console.error('Error al guardar cotización:', err)
      alert('No se pudo guardar la cotización. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePDF() {
    await handleSave()
    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    setIsPrinting(true)
    await new Promise(r => setTimeout(r, 80))
    const el = printRef.current
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
    setIsPrinting(false)
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const usableW = pageW - margin * 2
    const usableH = pageH - margin * 2
    const canvasPageH = Math.floor((canvas.width / usableW) * usableH)
    let yOffset = 0
    while (yOffset < canvas.height) {
      const sliceH = Math.min(canvasPageH, canvas.height - yOffset)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceH
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, -yOffset)
      const imgData = pageCanvas.toDataURL('image/png')
      const imgH = (sliceH * usableW) / canvas.width
      if (yOffset > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, margin, usableW, imgH)
      yOffset += sliceH
    }
    pdf.save(`Propuesta ${propuesta.numero} - ${razonSocial.trim() || 'empresa'}.pdf`)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!vehiculo) return <div className="loading-center"><p>Vehículo no encontrado</p></div>

  return (
    <div className="tema-corporativo" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(canal.basePath)} style={{ marginBottom: '20px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Volver
      </button>

      <div ref={printRef}>
        {/* Header con logo */}
        <div style={{ background: 'var(--header-bg)', borderBottom: '2px solid var(--accent-line)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
          <img src="/logo-akar.png" alt="Akar Automotores" style={{ height: '64px' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '13px', fontWeight: '700', color: '#e3bc4a', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Propuesta comercial</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '24px', fontWeight: '700', color: 'white', letterSpacing: '0.04em' }}>N° {propuesta.numero}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>Emitida {propuesta.emitida} · Válida hasta {propuesta.vence}</div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e6ec', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>

          {/* Empresa */}
          {isPrinting ? (
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <div className="corp-titulo">Para</div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#1a202c' }}>{razonSocial}</div>
                <div style={{ fontSize: '13px', color: '#8896a7' }}>CUIT {formatearCuit(cuit)}</div>
                {contacto && <div style={{ fontSize: '13px', color: '#8896a7', marginTop: '6px' }}>At. {contacto}</div>}
                <div style={{ fontSize: '13px', color: '#8896a7' }}>{[telefono, email].filter(Boolean).join(' · ')}</div>
              </div>
              <div>
                <div className="corp-titulo">Ejecutivo de cuentas</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a202c' }}>{vendedor}</div>
                <div style={{ fontSize: '13px', color: '#8896a7' }}>Ventas corporativas · Akar Automotores</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec' }}>
              <div className="corp-titulo">Empresa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Razón social *</label>
                  <input className="form-input" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Nombre de la empresa" />
                </div>
                <div className="form-group">
                  <label className="form-label">CUIT *</label>
                  <input className="form-input" inputMode="numeric" value={cuit} onChange={e => setCuit(formatearCuit(e.target.value))} placeholder="30-12345678-9" />
                  {cuit.replace(/\D/g, '').length === 11 && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: cuitOk ? '#1a7a4a' : '#c0392b' }}>
                      {cuitOk ? '✓ CUIT válido' : 'CUIT inválido, revisá los números'}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Contacto</label>
                  <input className="form-input" value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Nombre y área" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input
                    className="form-input"
                    type="tel"
                    inputMode="numeric"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Ej: 2974123456"
                    maxLength={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="compras@empresa.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ejecutivo de cuentas</label>
                  <input className="form-input" value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Nombre del vendedor" />
                </div>
              </div>
            </div>
          )}

          {/* Vehículo + Precio base */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Modelo</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '26px', fontWeight: '700', color: 'var(--navy)', lineHeight: 1 }}>
                  CHEVROLET {vehiculo.modelo?.toUpperCase()}
                </div>
                <div style={{ fontSize: '15px', color: '#4a5568', marginTop: '4px' }}>{vehiculo.version}</div>
              </div>
              {vehiculo.imagen_url && (
                <img src={vehiculo.imagen_url} alt={vehiculo.modelo} style={{ height: '90px', width: '160px', objectFit: 'cover', borderRadius: '8px' }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ minWidth: '280px' }}>
                <label className="form-label">Precio base — Gastos CyO</label>
                <select className="form-select" value={provincia} onChange={e => setProvincia(e.target.value)}>
                  <option value="">Seleccionar provincia</option>
                  <option value="chubut">Chubut — ${fmt(vehiculo.precio_chubut)}</option>
                  <option value="santacruz">Santa Cruz — ${fmt(vehiculo.precio_santacruz)}</option>
                </select>
              </div>
              {precioBase > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Precio base</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>${fmt(precioBase)}</div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Cantidad de unidades</label>
                {isPrinting
                  ? <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c' }}>{unidades}</div>
                  : (
                    <div className="corp-cantidad">
                      <button type="button" onClick={() => setCantidad(Math.max(1, unidades - 1))}>−</button>
                      <input value={cantidad} inputMode="numeric" onChange={e => setCantidad(e.target.value.replace(/\D/g, '').slice(0, 3))} onBlur={() => setCantidad(unidades)} />
                      <button type="button" onClick={() => setCantidad(unidades + 1)}>+</button>
                    </div>
                  )}
              </div>
              {esFlota && precioBase > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total flota</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--navy)' }}>${fmt(precioBase * unidades)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Bonificación */}
          {(!isPrinting || descuentoNum > 0) && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec', background: '#f8f9fb' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Bonificación</div>
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label className="form-label">Descuento por unidad (si aplica)</label>
              {isPrinting
                ? <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c' }}>${fmt(descuentoNum)}</div>
                : <input className="form-input" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="$ 0.00" />}
            </div>
          </div>
          )}

          {/* Planes de financiación */}
          {nombresPlanes.map(nombrePlan => {
            const cuotasDelPlan = planesByNombre[nombrePlan]
            const state = planState[nombrePlan] || { monto: '', cuotaId: '' }
            const montoNum = parseMonto(state.monto)
            const isActive = montoNum > 0
            const isDisabled = planActivoNombre !== null && planActivoNombre !== nombrePlan
            const cuotaSeleccionada = planes.find(p => p.id === state.cuotaId)

            if (isPrinting && !isActive) return null

            return (
              <div
                key={nombrePlan}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e2e6ec',
                  opacity: isDisabled ? 0.4 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Encabezado del plan */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {nombrePlan}
                  </div>
                  {cuotaSeleccionada && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {cuotaSeleccionada.tna === 0
                        ? <span className="badge badge-green">TASA 0%</span>
                        : <span className="badge badge-navy">TNA {cuotaSeleccionada.tna}%</span>}
                      {Number(cuotaSeleccionada.iva_pct) > 0 && (
                        <span className="badge badge-navy">+ IVA {parseFloat((cuotaSeleccionada.iva_pct * 100).toFixed(2))}%</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Monto a financiar */}
                <div className="form-group" style={{ maxWidth: '260px', marginBottom: '14px' }}>
                  <label className="form-label">Monto a financiar por unidad</label>
                  {isPrinting
                    ? <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c' }}>${fmt(montoNum)}</div>
                    : <input
                        className="form-input"
                        disabled={isDisabled}
                        value={state.monto}
                        onChange={e => handlePlanMontoChange(nombrePlan, e.target.value)}
                        placeholder="$ 0.00"
                      />
                  }
                </div>

                {/* Tarjetitas de cuotas */}
                {isPrinting ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {cuotasDelPlan.map(p => {
                      const cuotaVal = calcularCuota(montoNum, p)
                      const isSelected = p.id === state.cuotaId
                      const excede = montoNum > 0 && p.monto_maximo && montoNum > p.monto_maximo
                      return (
                        <div
                          key={p.id}
                          style={{
                            border: isSelected ? '2px solid var(--navy)' : '1px solid #e2e6ec',
                            background: isSelected ? 'var(--navy)' : '#f8f9fb',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            textAlign: 'center',
                            minWidth: '110px',
                            opacity: excede ? 0.45 : 1,
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.75)' : '#8896a7', marginBottom: '4px' }}>
                            {p.cuotas} cuotas
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: isSelected ? 'white' : '#1a202c' }}>
                            {cuotaVal > 0 ? `$${fmt(cuotaVal)}` : '—'}
                          </div>
                          {p.monto_maximo && (
                            <div style={{ fontSize: '10px', color: isSelected ? 'rgba(255,255,255,0.5)' : '#8896a7', marginTop: '3px' }}>
                              máx. ${(p.monto_maximo / 1_000_000).toFixed(1)}M
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {cuotasDelPlan.map(p => {
                      const cuotaVal = calcularCuota(montoNum, p)
                      const isSelected = p.id === state.cuotaId
                      const excede = montoNum > 0 && p.monto_maximo && montoNum > p.monto_maximo

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isDisabled || excede}
                          onClick={() => !excede && handleCuotaChange(nombrePlan, p.id)}
                          style={{
                            border: isSelected ? '2px solid var(--navy)' : '1.5px solid #d1d8e0',
                            background: isSelected ? 'var(--navy)' : 'white',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            textAlign: 'center',
                            minWidth: '110px',
                            cursor: excede ? 'not-allowed' : 'pointer',
                            opacity: excede ? 0.4 : 1,
                            transition: 'all 0.15s',
                          }}
                          onMouseOver={e => {
                            if (!isSelected && !excede && !isDisabled) {
                              e.currentTarget.style.borderColor = 'var(--navy)'
                              e.currentTarget.style.background = '#f0f4fa'
                            }
                          }}
                          onMouseOut={e => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#d1d8e0'
                              e.currentTarget.style.background = 'white'
                            }
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.75)' : '#8896a7', marginBottom: '4px' }}>
                            {p.cuotas} cuotas
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: isSelected ? 'white' : (cuotaVal > 0 ? 'var(--navy)' : '#c0c8d0') }}>
                            {cuotaVal > 0 ? `$${fmt(cuotaVal)}` : '—'}
                          </div>
                          {p.monto_maximo && (
                            <div style={{ fontSize: '10px', marginTop: '4px', color: excede ? '#c0392b' : (isSelected ? 'rgba(255,255,255,0.5)' : '#8896a7') }}>
                              {excede ? 'supera el máx.' : `máx. $${(p.monto_maximo / 1_000_000).toFixed(1)}M`}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Gastos bancarios */}
          {(!isPrinting || montoActivo > 0) && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e6ec', background: '#f8f9fb' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Gastos bancarios</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ minWidth: '200px' }}>
                <label className="form-label">Banco</label>
                {isPrinting
                  ? <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c' }}>{banco === 'chubut' ? 'Banco Chubut (1.2%)' : 'Banco Santa Cruz (1.4%)'}</div>
                  : <select className="form-select" value={banco} onChange={e => setBanco(e.target.value)}>
                      <option value="chubut">Banco Chubut (1.2%)</option>
                      <option value="santacruz">Banco Santa Cruz (1.4%)</option>
                    </select>
                }
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quebranto</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c' }}>${fmt(quebranto)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sellado</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a202c' }}>${fmt(sellado)}</div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Resumen + Observaciones */}
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: '700', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Resumen</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Valor del vehículo', precioBase],
                  ...(montoActivo > 0 ? [['Gastos bancarios', gastosBancarios]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#4a5568' }}>{label}</span>
                    <span style={{ fontWeight: '600' }}>${fmt(val)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e6ec', margin: '4px 0' }} />
                {[
                  ...(entregaNum > 0 ? [['Entrega (usado)', entregaNum]] : []),
                  ...(montoActivo > 0 ? [['Monto a financiar', montoActivo]] : []),
                  ...(descuentoNum > 0 ? [['Descuento', descuentoNum]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#4a5568' }}>{label}</span>
                    <span style={{ fontWeight: '600', color: val > 0 ? '#1a7a4a' : '#1a202c' }}>
                      {val > 0 ? '-' : ''}${fmt(val)}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: '2px solid var(--navy)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: 'var(--navy)' }}>
                  <span>SALDO</span>
                  <span>${fmt(saldoEfectivo)}</span>
                </div>
                {esFlota && (
                  <div className="corp-flota">
                    <div className="corp-flota-titulo">Total flota · {unidades} unidades</div>
                    <div className="corp-flota-fila"><span>Saldo total</span><b>${fmt(saldoEfectivo * unidades)}</b></div>
                    {montoActivo > 0 && (
                      <>
                        <div className="corp-flota-fila"><span>Monto financiado total</span><b>${fmt(montoActivo * unidades)}</b></div>
                        <div className="corp-flota-fila corp-flota-cuota">
                          <span>Cuota mensual total<small>{cuotasActivas} cuotas · {unidades} × ${fmt(valorCuota)}</small></span>
                          <b>${fmt(valorCuota * unidades)}</b>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(!isPrinting || observaciones.trim()) && (
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: '700', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Condiciones comerciales</div>
              {isPrinting
                ? <div style={{ fontSize: '14px', color: '#1a202c', whiteSpace: 'pre-wrap' }}>{observaciones}</div>
                : <textarea
                    className="form-textarea"
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Forma de pago, plazo de entrega, etc."
                    style={{ minHeight: '150px', width: '100%', resize: 'vertical' }}
                  />
              }
            </div>
            )}
          </div>

          <div style={{ padding: '10px 24px 20px', color: '#8896a7', fontSize: '12px', borderTop: '1px solid #e2e6ec' }}>
            Propuesta válida hasta el {propuesta.vence}
          </div>
        </div>
      </div>

      {/* Botón PDF */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handlePDF}
          disabled={!puedeGuardar || saving}
        >
          {saving
            ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'white' }} /> Guardando...</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar propuesta PDF</>
          }
        </button>
      </div>
    </div>
  )
}