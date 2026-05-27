import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CotizadorPlanAhorro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [vehiculo, setVehiculo] = useState(null)
  const [plan, setPlan]         = useState(null)
  const [tramos, setTramos]     = useState([])
  const [promos, setPromos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [cliente, setCliente]   = useState('')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: v } = await supabase
        .from('pa_vehiculos').select('*').eq('id', id).single()
      if (!v) { navigate('/plan-ahorro'); return }
      setVehiculo(v)

      const { data: p } = await supabase
        .from('pa_planes').select('*').eq('vehiculo_id', id).single()
      if (p) {
        setPlan(p)
        const { data: tr } = await supabase
          .from('pa_cuota_tramos').select('*').eq('plan_id', p.id).order('orden')
        setTramos(tr || [])
      }

      const { data: pr } = await supabase
        .from('pa_promociones').select('*').eq('vehiculo_id', id).order('orden')
      setPromos(pr || [])

      setLoading(false)
    }
    load()
  }, [id])

  const fmtPeso = n => n ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '—'
  const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  async function handleDescargarPDF() {
    setGenerando(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const elemento = document.getElementById('cotizacion-pa-print')
      const nombreArchivo = `cotizacion-plan-ahorro-${vehiculo.marca}-${vehiculo.modelo}-${fechaHoy.replace(/\//g, '-')}.pdf`
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: nombreArchivo,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(elemento)
        .save()
    } catch (err) {
      console.error(err)
      alert('Error al generar el PDF. Intentá de nuevo.')
    }
    setGenerando(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!vehiculo) return null

  return (
    <div style={{ padding: '20px 24px', maxWidth: '860px', margin: '0 auto' }}>

      {/* Botón volver */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/plan-ahorro')}
          className="btn btn-ghost btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Volver al catálogo
        </button>
      </div>

      {/* ── COTIZACIÓN (esto es lo que se convierte a PDF) ── */}
      <div id="cotizacion-pa-print" style={{ fontFamily: 'Arial, sans-serif', background: 'white' }}>

        {/* HEADER */}
        <div style={{ background: '#003366', borderRadius: '10px 10px 0 0', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontWeight: '700', fontSize: '20px', color: 'white', letterSpacing: '0.06em' }}>AKAR</div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Plan de Ahorro</div>
            <span style={{ background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Suscripción
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{fechaHoy}</div>
        </div>

        <div style={{ border: '0.5px solid #e2e6ec', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>

          {/* VENDEDOR / CLIENTE */}
          <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #e2e6ec' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={lbl}>Vendedor</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{profile?.nombre || '—'}</div>
              </div>
              <div>
                <div style={lbl}>Cliente</div>
                <input
                  style={{ width: '100%', border: '0.5px solid #c4cad5', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}
                  placeholder="Nombre del cliente"
                  value={cliente}
                  onChange={e => setCliente(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* VEHÍCULO */}
          <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #e2e6ec' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {vehiculo.imagen_url ? (
                <img src={vehiculo.imagen_url} alt="" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '120px', height: '80px', background: '#f0f2f5', borderRadius: '7px', border: '0.5px solid #e2e6ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                  </svg>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'inline-block', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: '700', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Modelo Inicial
                </div>
                <div style={{ fontSize: '17px', fontWeight: '600', color: '#003366', lineHeight: 1.2, marginBottom: '5px' }}>
                  {vehiculo.marca} {vehiculo.modelo} {vehiculo.version}
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={badgeBlue}>{vehiculo.tipo_plan}</span>
                  <span style={badgeBlue}>{vehiculo.plazo_cuotas} cuotas</span>
                  <span style={badgeOrange}>Plan de Ahorro</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={lbl}>Valor móvil vigente</div>
                <div style={{ fontSize: '17px', fontWeight: '600', color: '#003366' }}>{fmtPeso(vehiculo.valor_movil)}</div>
                <div style={{ fontSize: '10px', color: '#8896a7', marginTop: '2px' }}>Actualizable mensualmente</div>
              </div>
            </div>
          </div>

          {/* CUOTA 1 CON PROMO */}
          {plan && plan.cuota1_sin_promo > 0 && (
            <div style={{ padding: '10px 20px', background: '#f5f7fa', borderBottom: '0.5px solid #e2e6ec' }}>
              <div style={stitle}>Cuota 1 — Promoción vigente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 0.8fr auto 1fr', alignItems: 'center', gap: '0' }}>

                {/* Sin promo */}
                <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={lbl}>Cuota 1 sin promo</div>
                  <div style={{ fontSize: '18px', fontWeight: '500', color: '#8896a7', textDecoration: 'line-through', marginTop: '2px' }}>{fmtPeso(plan.cuota1_sin_promo)}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </div>

                {/* Bonificación — más pequeño */}
                <div style={{ background: '#003366', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Bonificación</div>
                  <div style={{ fontSize: '30px', fontWeight: '700', color: '#f0c040', lineHeight: 1 }}>{plan.bonificacion_pct}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Este mes</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </div>

                {/* Con promo */}
                <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '10px', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Cuota 1 con promo</div>
                  <div style={{ fontSize: '22px', fontWeight: '600', color: '#003366', marginTop: '2px' }}>{fmtPeso(plan.cuota1_con_promo)}</div>
                </div>

              </div>
            </div>
          )}

          {/* CARACTERÍSTICAS */}
          {plan && (
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #e2e6ec' }}>
              <div style={stitle}>Características del plan</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Sistema',            value: plan.sistema },
                  { label: 'Plazo',              value: `${vehiculo.plazo_cuotas} cuotas` },
                  { label: 'Financiación sobre', value: `${vehiculo.tipo_plan} del valor de la unidad` },
                  { label: 'Adjudicación',       value: plan.adjudicacion },
                  { label: 'Cuota pura actual',  value: fmtPeso(plan.cuota_pura) },
                  { label: 'Integración mínima', value: plan.integracion_minima },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div style={lbl}>{label}</div>
                    <div style={{ fontSize: '12px', color: '#111827', border: '0.5px solid #e2e6ec', borderRadius: '5px', padding: '6px 10px', background: '#fafbfc' }}>{value}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* ESQUEMA DE CUOTAS + PROMOCIONES */}
          <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #e2e6ec' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

              {/* Esquema */}
              <div>
                <div style={stitle}>Esquema de cuotas</div>
                <div style={{ border: '0.5px solid #e2e6ec', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', background: '#f5f7fa', padding: '5px 10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tramo</div>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuota</div>
                  </div>
                  {tramos.map((t, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1.4fr 1fr',
                      background: t.es_promo ? '#E6F1FB' : 'white',
                      borderBottom: i < tramos.length - 1 ? '0.5px solid #e2e6ec' : 'none',
                    }}>
                      <div style={{ padding: '6px 10px', fontSize: '12px', color: t.es_promo ? '#0C447C' : '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {t.label}
                        {t.es_promo && <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '9px', fontWeight: '600', padding: '1px 6px', borderRadius: '20px' }}>Promo</span>}
                      </div>
                      <div style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', color: '#003366' }}>{fmtPeso(t.monto)}</div>
                    </div>
                  ))}
                </div>

                {/* Notas en una sola línea cada una */}
                <div style={{ marginTop: '7px', borderLeft: '3px solid #003366', padding: '4px 8px', fontSize: '11px', color: '#6b7280' }}>
                  <strong style={{ color: '#111827' }}>Valor de cuotas:</strong> se actualiza según el valor del vehículo al momento de emisión.
                </div>
                <div style={{ marginTop: '5px', borderLeft: '3px solid #b45309', padding: '4px 8px', fontSize: '11px', color: '#6b7280' }}>
                  <strong style={{ color: '#111827' }}>Gastos no incluidos:</strong> {plan?.gastos_texto}
                </div>
              </div>

              {/* Promociones — sin aviso de solo lectura */}
              <div>
                <div style={stitle}>Promociones especiales</div>
                {promos.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#8896a7' }}>Sin promociones activas</div>
                ) : (
                  <div style={{ border: '0.5px solid #e2e6ec', borderRadius: '7px', overflow: 'hidden' }}>
                    {promos.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', borderBottom: i < promos.length - 1 ? '0.5px solid #e2e6ec' : 'none', opacity: p.activa ? 1 : 0.35 }}>
                        <div style={{ width: '28px', height: '16px', background: p.activa ? '#003366' : '#c8d0da', borderRadius: '8px', position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                          <span style={{ position: 'absolute', width: '10px', height: '10px', background: 'white', borderRadius: '50%', top: '3px', left: p.activa ? '15px' : '3px' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>{p.titulo}</div>
                          {p.descripcion && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{p.descripcion}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OBSERVACIONES */}
          {plan?.observaciones ? (
            <div style={{ padding: '10px 20px', borderBottom: '0.5px solid #e2e6ec' }}>
              <div style={stitle}>Observaciones</div>
              <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: 1.5 }}>{plan.observaciones}</div>
            </div>
          ) : null}

          {/* FOOTER */}
          <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#8896a7' }}>
              Presupuesto válido por <strong style={{ color: '#111827' }}>10 días</strong>
            </span>
            <button
              onClick={handleDescargarPDF}
              disabled={generando}
              style={{ background: '#003366', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif', cursor: generando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: generando ? 0.7 : 1 }}
            >
              {generando ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Generando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar PDF
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const lbl = {
  fontSize: '10px', fontWeight: '600', color: '#8896a7',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px',
}
const stitle = {
  fontSize: '11px', fontWeight: '700', color: '#003366',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px',
}
const badgeBlue   = { background: '#E6F1FB', color: '#0C447C', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }
const badgeOrange = { background: '#FFF3E0', color: '#7C4000', fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }