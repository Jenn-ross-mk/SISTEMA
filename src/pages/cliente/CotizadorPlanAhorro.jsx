import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CotizadorPlanAhorro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [vehiculo, setVehiculo]   = useState(null)
  const [plan, setPlan]           = useState(null)
  const [tramos, setTramos]       = useState([])
  const [promos, setPromos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [cliente, setCliente]     = useState('')
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

      {/* Botón volver — no entra en el PDF */}
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

      {/* ── ÁREA QUE SE CONVIERTE A PDF ── */}
      <div id="cotizacion-pa-print" style={{ fontFamily: 'Arial, sans-serif', background: 'white' }}>

        {/* HEADER */}
        <div style={{ background: '#003366', borderRadius: '10px 10px 0 0', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: 'white', letterSpacing: '0.06em' }}>AKAR</div>
            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan de Ahorro</div>
            <span style={{ background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Suscripción</span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{fechaHoy}</div>
        </div>

        <div style={{ border: '0.5px solid #dde2ea', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>

          {/* VENDEDOR / CLIENTE */}
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #dde2ea', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={lbl}>Vendedor</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{profile?.nombre || '—'}</div>
            </div>
            <div>
              <div style={lbl}>Cliente</div>
              {/* Input visible en pantalla, texto plano en PDF */}
              <input
                id="input-cliente"
                style={{ width: '100%', border: '0.5px solid #c4cad5', borderRadius: '5px', padding: '5px 9px', fontSize: '13px', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }}
                placeholder="Nombre del cliente"
                value={cliente}
                onChange={e => {
                  setCliente(e.target.value)
                  const span = document.getElementById('span-cliente')
                  if (span) span.textContent = e.target.value || 'Nombre del cliente'
                }}
              />
              {/* Este span reemplaza al input en el PDF */}
              <span
                id="span-cliente"
                style={{ display: 'none', fontSize: '13px', fontWeight: '500', color: '#111827' }}
              >
                {cliente || 'Nombre del cliente'}
              </span>
            </div>
          </div>

          {/* VEHÍCULO */}
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #dde2ea', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {vehiculo.imagen_url ? (
              <img src={vehiculo.imagen_url} alt="" style={{ width: '130px', height: '88px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '130px', height: '88px', background: '#f0f2f5', borderRadius: '7px', border: '0.5px solid #dde2ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                  <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                </svg>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-block', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '5px', padding: '2px 7px', fontSize: '10px', fontWeight: '600', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Modelo Inicial
              </div>
              <div style={{ fontSize: '17px', fontWeight: '500', color: '#003366', marginBottom: '8px', lineHeight: 1.2 }}>
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
              <div style={{ fontSize: '17px', fontWeight: '500', color: '#003366' }}>{fmtPeso(vehiculo.valor_movil)}</div>
              <div style={{ fontSize: '10px', color: '#8896a7', marginTop: '3px' }}>Actualizable mensualmente</div>
            </div>
          </div>

          {/* CUOTA 1 CON PROMO */}
          {plan && plan.cuota1_sin_promo > 0 && (
            <div style={{ padding: '14px 20px', background: '#f5f7fa', borderBottom: '0.5px solid #dde2ea' }}>
              <div style={stitle}>Cuota 1 — Promoción vigente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'white', border: '0.5px solid #dde2ea', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={lbl}>Cuota 1 sin promo</div>
                  <div style={{ fontSize: '20px', fontWeight: '500', color: '#8896a7', textDecoration: 'line-through', marginTop: '4px' }}>{fmtPeso(plan.cuota1_sin_promo)}</div>
                </div>
                <div style={{ background: '#003366', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Bonificación del</div>
                  <div style={{ fontSize: '32px', fontWeight: '500', color: '#f0c040', lineHeight: 1 }}>{plan.bonificacion_pct}%</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Este mes</div>
                </div>
                <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '10px', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cuota 1 con promo</div>
                  <div style={{ fontSize: '20px', fontWeight: '500', color: '#003366', marginTop: '4px' }}>{fmtPeso(plan.cuota1_con_promo)}</div>
                </div>
              </div>
            </div>
          )}

          {/* CARACTERÍSTICAS */}
          {plan && (
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #dde2ea' }}>
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
                    <div style={{ fontSize: '12px', color: '#111827', border: '0.5px solid #dde2ea', borderRadius: '5px', padding: '5px 9px', background: '#fafbfc' }}>{value}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {/* ESQUEMA DE CUOTAS + PROMOCIONES */}
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #dde2ea' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

              {/* Esquema */}
              <div>
                <div style={stitle}>Esquema de cuotas</div>
                <div style={{ border: '0.5px solid #dde2ea', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', background: '#f5f7fa', padding: '5px 10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase' }}>Tramo</div>
                    <div style={{ fontSize: '10px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase' }}>Cuota</div>
                  </div>
                  {tramos.map((t, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1.4fr 1fr',
                      background: t.es_promo ? '#E6F1FB' : 'white',
                      borderBottom: i < tramos.length - 1 ? '0.5px solid #dde2ea' : 'none',
                    }}>
                      <div style={{ padding: '6px 10px', fontSize: '12px', color: t.es_promo ? '#0C447C' : '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {t.label}
                        {t.es_promo && (
                          <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '9px', fontWeight: '600', padding: '1px 6px', borderRadius: '20px' }}>Promo</span>
                        )}
                      </div>
                      <div style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', color: '#003366' }}>{fmtPeso(t.monto)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promociones */}
              <div>
                <div style={stitle}>Promociones especiales</div>
                {promos.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#8896a7' }}>Sin promociones activas</div>
                ) : (
                  <div style={{ border: '0.5px solid #dde2ea', borderRadius: '7px', overflow: 'hidden' }}>
                    {promos.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 12px', borderBottom: i < promos.length - 1 ? '0.5px solid #dde2ea' : 'none', opacity: p.activa ? 1 : 0.35 }}>
                        <div style={{ width: '28px', height: '16px', background: p.activa ? '#003366' : '#c8d0da', borderRadius: '8px', position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                          <span style={{ position: 'absolute', width: '10px', height: '10px', background: 'white', borderRadius: '50%', top: '3px', left: p.activa ? '15px' : '3px' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{p.titulo}</div>
                          {p.descripcion && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{p.descripcion}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notas ancho completo */}
            <div style={{ marginTop: '10px', borderLeft: '3px solid #003366', padding: '4px 10px', fontSize: '11px', color: '#6b7280' }}>
              <strong style={{ color: '#111827' }}>Valor de cuotas:</strong> se actualiza dependiendo del valor del vehículo al momento de emisión de las mismas.
            </div>
            <div style={{ marginTop: '5px', borderLeft: '3px solid #b45309', padding: '4px 10px', fontSize: '11px', color: '#6b7280' }}>
              <strong style={{ color: '#111827' }}>Gastos no incluidos en la cuota:</strong> Derecho de adjudicación (1,5% + IVA), flete y patentamiento (aprox. 10%).
            </div>
          </div>

          {/* OBSERVACIONES */}
          {plan?.observaciones ? (
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #dde2ea' }}>
              <div style={stitle}>Observaciones</div>
              <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: 1.5 }}>{plan.observaciones}</div>
            </div>
          ) : null}

          {/* FOOTER */}
          <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#8896a7' }}>
              Presupuesto válido por <strong style={{ color: '#111827' }}>10 días</strong>
            </span>
            <button
              onClick={async () => {
                // Antes de generar: mostrar span, ocultar input
                const input = document.getElementById('input-cliente')
                const span  = document.getElementById('span-cliente')
                if (input) input.style.display = 'none'
                if (span)  span.style.display  = 'inline'
                await handleDescargarPDF()
                // Restaurar después
                if (input) input.style.display = ''
                if (span)  span.style.display  = 'none'
              }}
              disabled={generando}
              style={{ background: '#003366', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: '500', fontFamily: 'Arial, sans-serif', cursor: generando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px', opacity: generando ? 0.7 : 1 }}
            >
              {generando ? (
                <>
                  <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Generando...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

const lbl     = { fontSize: '10px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }
const stitle  = { fontSize: '11px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }
const badgeBlue   = { background: '#E6F1FB', color: '#0C447C', fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px' }
const badgeOrange = { background: '#FFF3E0', color: '#7C4000', fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px' }