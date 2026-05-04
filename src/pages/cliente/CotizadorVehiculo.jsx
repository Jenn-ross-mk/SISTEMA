import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const BANCOS = { chubut: 0.012, santacruz: 0.014 }
const IVA_QUEBRANTO = 0.21
const UNIDAD_BASE = 1_000_000

function fmt(n) {
  return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMonto(str) {
  return parseFloat((str || '').replace(/\./g, '').replace(',', '.')) || 0
}

export default function CotizadorVehiculo() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const printRef = useRef()

  const [vehiculo, setVehiculo] = useState(null)
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)

  const [vendedor, setVendedor] = useState('')
  const [cliente, setCliente] = useState('')
  const [provincia, setProvincia] = useState('')
  const [entregaUsado, setEntregaUsado] = useState('')
  const [descuento, setDescuento] = useState('')
  const [banco, setBanco] = useState('chubut')
  const [observaciones, setObservaciones] = useState('')
  const [planState, setPlanState] = useState({})

  useEffect(() => {
    if (profile?.nombre) setVendedor(profile.nombre)
  }, [profile])

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }] = await Promise.all([
        supabase.from('vehiculos').select('*').eq('id', id).single(),
        supabase.from('planes_financiacion')
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
  const nombresPlanes = Object.keys(planesByNombre)

  const precioBase = provincia === 'chubut'
    ? (vehiculo?.precio_chubut || 0)
    : provincia === 'santacruz'
      ? (vehiculo?.precio_santacruz || 0)
      : 0

  const entregaNum = parseMonto(entregaUsado)
  const descuentoNum = parseMonto(descuento)

  const planActivoNombre = nombresPlanes.find(nombre => parseMonto(planState[nombre]?.monto) > 0) || null
  const planActivoState = planActivoNombre ? planState[planActivoNombre] : null
  const montoActivo = planActivoState ? parseMonto(planActivoState.monto) : 0

  const cuotaActivaRow = planActivoState
    ? planes.find(p => p.id === planActivoState.cuotaId)
    : null

  let valorCuota = 0
  if (cuotaActivaRow && montoActivo > 0) {
    valorCuota = (montoActivo / UNIDAD_BASE) * cuotaActivaRow.valor_cuota_por_millon
  }

  const quebrantoPct = cuotaActivaRow?.quebranto_pct || 0
  const quebranto = montoActivo * quebrantoPct * (1 + IVA_QUEBRANTO)

  const cuotasActivas = cuotaActivaRow?.cuotas || 0
  const totalCuotas = valorCuota * cuotasActivas
  const sellado = totalCuotas * (BANCOS[banco] || 0)

  const gastosBancarios = quebranto + sellado
  const saldoEfectivo = precioBase + gastosBancarios - entregaNum - montoActivo - descuentoNum

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
    if (!cliente || !provincia || !profile) return
    if (saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('cotizaciones').insert({
        vendedor_id: profile.id,
        vendedor_nombre: vendedor || profile.nombre,
        cliente_nombre: cliente,
        vehiculo_id: id,
        vehiculo_descripcion: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.version}`,
        provincia,
        precio_base: precioBase,
        entrega_usado: entregaNum,
        descuento: descuentoNum,
        plan_nombre: cuotaActivaRow
          ? `${cuotaActivaRow.nombre_plan} - ${cuotaActivaRow.cuotas} cuotas`
          : null,
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
    // Activamos modo impresión para ocultar planes inactivos
    setImprimiendo(true)
    await new Promise(r => setTimeout(r, 100))

    const { default: html2canvas } = await import('html2canvas')
    const { jsPDF } = await import('jspdf')
    const el = printRef.current
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const imgW = pageW - margin * 2
    const imgH = (canvas.height * imgW) / canvas.width
    const totalPages = Math.ceil(imgH / (pageH - margin * 2))
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()
      const offsetY = -(i * (pageH - margin * 2)) + margin
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, offsetY, imgW, imgH)
    }
    pdf.save(`${cliente || 'cotizacion'}.pdf`)

    // Restauramos vista normal
    setImprimiendo(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!vehiculo) return <div className="loading-center"><p>Vehículo no encontrado</p></div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ marginBottom: '20px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Volver
      </button>

      <div ref={printRef}>
        {/* Header */}
        <div style={{ background: '#003366', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: '700', fontSize: '22px', color: 'white', letterSpacing: '0.06em' }}>AKAR</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e6ec', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>

          {/* Vendedor / Cliente */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Vendedor</label>
              <input className="form-input" value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Nombre del vendedor" />
            </div>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <input className="form-input" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente" />
            </div>
          </div>

          {/* Vehículo + Precio base */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Modelo</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '26px', fontWeight: '700', color: '#003366', lineHeight: 1 }}>
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
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#003366' }}>${fmt(precioBase)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Entrega / Descuento */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e6ec', background: '#f8f9fb' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Cliente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Entrega de usado</label>
                <input className="form-input" value={entregaUsado} onChange={e => setEntregaUsado(e.target.value)} placeholder="$ 0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Descuento (si aplica)</label>
                <input className="form-input" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="$ 0.00" />
              </div>
            </div>
          </div>

          {/* Planes de financiación */}
          {nombresPlanes.map(nombrePlan => {
            const cuotasDelPlan = planesByNombre[nombrePlan]
            const state = planState[nombrePlan] || { monto: '', cuotaId: '' }
            const montoNum = parseMonto(state.monto)
            const cuotaRow = planes.find(p => p.id === state.cuotaId)

            let cuotaPreview = 0
            if (cuotaRow && montoNum > 0) {
              cuotaPreview = (montoNum / UNIDAD_BASE) * cuotaRow.valor_cuota_por_millon
            }

            const isActive = montoNum > 0
            const isDisabled = planActivoNombre !== null && planActivoNombre !== nombrePlan

            // Si estamos imprimiendo, ocultamos los planes que no están activos
            if (imprimiendo && isDisabled) return null

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {nombrePlan}
                  </div>
                  {cuotaRow && (
                    cuotaRow.tna === 0
                      ? <span className="badge badge-green">TASA 0%</span>
                      : <span className="badge badge-navy">TNA {cuotaRow.tna}%</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ minWidth: '200px' }}>
                    <label className="form-label">
                      Monto a financiar
                      {cuotaRow?.monto_maximo ? (
                        <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: '#8896a7', marginLeft: '6px', fontSize: '11px' }}>
                          máx. ${fmt(cuotaRow.monto_maximo)}
                        </span>
                      ) : null}
                    </label>
                    <input
                      className="form-input"
                      disabled={isDisabled}
                      value={state.monto}
                      onChange={e => handlePlanMontoChange(nombrePlan, e.target.value)}
                      placeholder="$ 0.00"
                    />
                  </div>

                  <div className="form-group" style={{ minWidth: '180px' }}>
                    <label className="form-label">Cuotas</label>
                    <select
                      className="form-select"
                      disabled={isDisabled}
                      value={state.cuotaId}
                      onChange={e => handleCuotaChange(nombrePlan, e.target.value)}
                    >
                      {cuotasDelPlan.map(p => {
                        const excedeMonto = montoNum > 0 && p.monto_maximo && montoNum > p.monto_maximo
                        return (
                          <option key={p.id} value={p.id} disabled={excedeMonto}>
                            {p.cuotas} — Máx. ${p.monto_maximo ? (p.monto_maximo / 1_000_000).toFixed(1) : '0.0'}M
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {cuotaPreview > 0 && (
                    <div style={{ paddingBottom: '2px' }}>
                      <div style={{ fontSize: '11px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cuota mensual</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: isActive ? '#003366' : '#8896a7' }}>
                        ${fmt(cuotaPreview)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Gastos bancarios */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e6ec', background: '#f8f9fb' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Gastos bancarios</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ minWidth: '200px' }}>
                <label className="form-label">Banco</label>
                <select className="form-select" value={banco} onChange={e => setBanco(e.target.value)}>
                  <option value="chubut">Banco Chubut (1.2%)</option>
                  <option value="santacruz">Banco Santa Cruz (1.4%)</option>
                </select>
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

          {/* Resumen + Observaciones */}
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Resumen</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Valor del vehículo', precioBase],
                  ['Gastos bancarios', gastosBancarios],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#4a5568' }}>{label}</span>
                    <span style={{ fontWeight: '600' }}>${fmt(val)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e2e6ec', margin: '4px 0' }} />
                {[
                  ['Entrega (usado)', entregaNum],
                  ['Monto a financiar', montoActivo],
                  ['Descuento', descuentoNum],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#4a5568' }}>{label}</span>
                    <span style={{ fontWeight: '600', color: val > 0 ? '#1a7a4a' : '#1a202c' }}>
                      {val > 0 ? '-' : ''}${fmt(val)}
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: '2px solid #003366', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', color: '#003366' }}>
                  <span>SALDO</span>
                  <span>${fmt(saldoEfectivo)}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Observaciones</div>
              <textarea
                className="form-textarea"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas adicionales para esta cotización..."
                style={{ minHeight: '150px', width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ padding: '10px 24px 20px', color: '#8896a7', fontSize: '12px', borderTop: '1px solid #e2e6ec' }}>
            Presupuesto válido por 5 días
          </div>
        </div>
      </div>

      {/* Botón PDF */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handlePDF}
          disabled={!cliente || !provincia || saving}
        >
          {saving
            ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'white' }} /> Guardando...</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar PDF</>
          }
        </button>
      </div>
    </div>
  )
}