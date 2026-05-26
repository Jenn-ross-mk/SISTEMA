import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CotizadorPlanAhorro() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { profile } = useAuth()

    const [vehiculo, setVehiculo] = useState(null)
    const [plan, setPlan] = useState(null)
    const [tramos, setTramos] = useState([])
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)
    const [cliente, setCliente] = useState('')

    useEffect(() => {
        async function load() {
            const { data: v } = await supabase
                .from('pa_vehiculos')
                .select('*')
                .eq('id', id)
                .single()
            if (!v) { navigate('/plan-ahorro'); return }
            setVehiculo(v)

            const { data: p } = await supabase
                .from('pa_planes')
                .select('*')
                .eq('vehiculo_id', id)
                .single()
            if (p) {
                setPlan(p)

                const { data: tr } = await supabase
                    .from('pa_cuota_tramos')
                    .select('*')
                    .eq('plan_id', p.id)
                    .order('orden')
                setTramos(tr || [])
            }

            const { data: pr } = await supabase
                .from('pa_promociones')
                .select('*')
                .eq('vehiculo_id', id)
                .order('orden')
            setPromos(pr || [])

            setLoading(false)
        }
        load()
    }, [id])

    const fmtPeso = n => n ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '—'

    const fechaHoy = new Date().toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    })

    function handlePrint() {
        window.print()
    }

    if (loading) return <div className="loading-center"><div className="spinner" /></div>
    if (!vehiculo) return null

    return (
        <>
            <style>{`
        @media print {
          body * { visibility: hidden; }
          .cotizacion-pa, .cotizacion-pa * { visibility: visible; }
          .cotizacion-pa { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

            <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>

                {/* Botón volver */}
                <div className="no-print" style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => navigate('/plan-ahorro')}
                        className="btn btn-ghost btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                        </svg>
                        Volver al catálogo
                    </button>
                </div>

                {/* ── COTIZACIÓN ── */}
                <div className="cotizacion-pa" style={{ fontFamily: "'Barlow', sans-serif" }}>

                    {/* Header */}
                    <div style={{ background: '#003366', borderRadius: '12px 12px 0 0', padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: '700', fontSize: '22px', color: 'white', letterSpacing: '0.06em' }}>AKAR</div>
                            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Plan de Ahorro</div>
                                <span style={{ background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    Suscripción
                                </span>
                            </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{fechaHoy}</div>
                    </div>

                    {/* Cuerpo */}
                    <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

                        {/* Vendedor / Cliente */}
                        <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #e2e6ec' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Vendedor</div>
                                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>{profile?.nombre || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cliente</div>
                                    <input
                                        className="no-print"
                                        style={{ width: '100%', border: '0.5px solid #c4cad5', borderRadius: '6px', padding: '7px 10px', fontSize: '14px', fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box' }}
                                        placeholder="Nombre del cliente"
                                        value={cliente}
                                        onChange={e => setCliente(e.target.value)}
                                    />
                                    <div className="print-only" style={{ display: 'none', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{cliente}</div>
                                </div>
                            </div>
                        </div>

                        {/* Vehículo */}
                        <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #e2e6ec' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                {vehiculo.imagen_url ? (
                                    <img src={vehiculo.imagen_url} alt="" style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: '150px', height: '100px', background: '#f0f2f5', borderRadius: '8px', border: '0.5px solid #e2e6ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                            <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                                        </svg>
                                        <div style={{ fontSize: '11px', color: '#c8d0da', marginTop: '4px' }}>Sin imagen</div>
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                        Modelo Inicial
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '500', color: '#003366', lineHeight: 1.2, marginBottom: '8px' }}>
                                        {vehiculo.marca} {vehiculo.modelo} {vehiculo.version}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>{vehiculo.tipo_plan}</span>
                                        <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>{vehiculo.plazo_cuotas} cuotas</span>
                                        <span style={{ background: '#FFF3E0', color: '#7C4000', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>Plan de Ahorro</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '11px', color: '#8896a7', marginBottom: '2px' }}>Valor móvil vigente</div>
                                    <div style={{ fontSize: '20px', fontWeight: '500', color: '#003366' }}>{fmtPeso(vehiculo.valor_movil)}</div>
                                    <div style={{ fontSize: '11px', color: '#8896a7', marginTop: '2px' }}>Actualizable mensualmente</div>
                                </div>
                            </div>
                        </div>

                        {/* Cuota 1 con promo */}
                        {plan && plan.cuota1_sin_promo > 0 && (
                            <div style={{ padding: '16px 22px', background: '#f5f7fa', borderBottom: '0.5px solid #e2e6ec' }}>
                                <div style={{ fontSize: '12px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                    Cuota 1 — Promoción vigente
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'stretch', gap: '0' }}>
                                    <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '11px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cuota 1 sin promo</div>
                                        <div style={{ fontSize: '24px', fontWeight: '500', color: '#8896a7', textDecoration: 'line-through', marginTop: '4px' }}>{fmtPeso(plan.cuota1_sin_promo)}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                                    </div>
                                    <div style={{ background: '#003366', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Bonificación</div>
                                        <div style={{ fontSize: '48px', fontWeight: '500', color: '#f0c040', lineHeight: 1 }}>{plan.bonificacion_pct}%</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Este mes</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
                                    </div>
                                    <div style={{ background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '11px', color: '#0C447C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cuota 1 con promo</div>
                                        <div style={{ fontSize: '28px', fontWeight: '500', color: '#003366', marginTop: '4px' }}>{fmtPeso(plan.cuota1_con_promo)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Características */}
                        {plan && (
                            <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #e2e6ec' }}>
                                <div style={{ fontSize: '12px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                    Características del plan
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {[
                                        { label: 'Sistema', value: plan.sistema },
                                        { label: 'Plazo', value: `${vehiculo.plazo_cuotas} cuotas` },
                                        { label: 'Financiación sobre', value: `${vehiculo.tipo_plan} del valor de la unidad` },
                                        { label: 'Adjudicación', value: plan.adjudicacion },
                                        { label: 'Cuota pura actual', value: fmtPeso(plan.cuota_pura) },
                                        { label: 'Integración mínima', value: plan.integracion_minima },
                                    ].map(({ label, value }) => value ? (
                                        <div key={label}>
                                            <div style={{ fontSize: '11px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                                            <div style={{ fontSize: '14px', color: '#111827', border: '0.5px solid #e2e6ec', borderRadius: '6px', padding: '8px 10px', background: '#fafbfc' }}>{value}</div>
                                        </div>
                                    ) : null)}
                                </div>
                            </div>
                        )}

                        {/* Esquema de cuotas */}
                        {tramos.length > 0 && (
                            <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #e2e6ec' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                            Esquema de cuotas
                                        </div>
                                        <div style={{ border: '0.5px solid #e2e6ec', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', background: '#f5f7fa', padding: '8px 14px' }}>
                                                <div style={{ fontSize: '11px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tramo</div>
                                                <div style={{ fontSize: '11px', fontWeight: '500', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuota</div>
                                            </div>
                                            {tramos.map((t, i) => (
                                                <div key={i} style={{
                                                    display: 'grid', gridTemplateColumns: '1.4fr 1fr',
                                                    background: t.es_promo ? '#E6F1FB' : 'white',
                                                    borderBottom: i < tramos.length - 1 ? '0.5px solid #e2e6ec' : 'none',
                                                }}>
                                                    <div style={{ padding: '9px 14px', fontSize: '13px', color: t.es_promo ? '#0C447C' : '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {t.label}
                                                        {t.es_promo && <span style={{ background: '#EAF3DE', color: '#27500A', fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px' }}>Promo</span>}
                                                    </div>
                                                    <div style={{ padding: '9px 14px', fontSize: '13px', fontWeight: '500', color: '#003366' }}>{fmtPeso(t.monto)}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Nota valor de cuotas */}
                                        <div style={{ marginTop: '10px', background: '#f5f7fa', borderLeft: '3px solid #003366', borderRadius: '0 6px 6px 0', padding: '8px 12px', fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
                                            <strong style={{ color: '#111827' }}>Valor de cuotas:</strong> se actualiza dependiendo del valor del vehículo al momento de emisión de las mismas.
                                        </div>

                                        {/* Nota gastos no incluidos */}
                                        <div style={{ marginTop: '8px', background: '#f5f7fa', borderLeft: '3px solid #b45309', borderRadius: '0 6px 6px 0', padding: '8px 12px', fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
                                            <strong style={{ color: '#111827' }}>Gastos no incluidos en la cuota:</strong> {plan?.gastos_texto}
                                        </div>
                                    </div>

                                    {/* Promociones especiales */}
                                    {promos.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                Promociones especiales
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#FFF8E1', border: '0.5px solid #FFD54F', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#5D4037', marginBottom: '10px' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                                                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                                Configuradas por el administrador · solo lectura
                                            </div>
                                            <div style={{ border: '0.5px solid #e2e6ec', borderRadius: '8px', overflow: 'hidden' }}>
                                                {promos.map((p, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', borderBottom: i < promos.length - 1 ? '0.5px solid #e2e6ec' : 'none', opacity: p.activa ? 1 : 0.45 }}>
                                                        <div style={{ width: '28px', height: '16px', background: p.activa ? '#003366' : '#c8d0da', borderRadius: '8px', position: 'relative', flexShrink: 0, marginTop: '2px' }}>
                                                            <span style={{ position: 'absolute', width: '10px', height: '10px', background: 'white', borderRadius: '50%', top: '3px', left: p.activa ? '15px' : '3px', transition: 'left 0.2s' }} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{p.titulo}</div>
                                                            {p.descripcion && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{p.descripcion}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Observaciones */}
                        {plan?.observaciones && (
                            <div style={{ padding: '16px 22px', borderBottom: '0.5px solid #e2e6ec' }}>
                                <div style={{ fontSize: '12px', fontWeight: '500', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Observaciones</div>
                                <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6 }}>{plan.observaciones}</div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ padding: '12px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#8896a7' }}>
                                Presupuesto válido por <strong style={{ color: '#111827' }}>10 días</strong>
                            </span>
                            <button
                                className="no-print"
                                onClick={handlePrint}
                                style={{ background: '#003366', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '13px', fontWeight: '500', fontFamily: "'Barlow', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Descargar PDF
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}