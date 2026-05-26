import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function PlanAhorroIndex() {
    const [vehiculos, setVehiculos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('pa_vehiculos')
                .select('*, pa_planes(cuota_pura, cuota1_con_promo, bonificacion_pct)')
                .eq('activo', true)
                .order('orden')
                .order('marca')
            setVehiculos(data || [])
            setLoading(false)
        }
        load()
    }, [])

    const filtered = vehiculos.filter(v =>
        `${v.marca} ${v.modelo} ${v.version}`.toLowerCase().includes(search.toLowerCase())
    )

    const fmtPeso = n => n ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '—'

    if (loading) return <div className="loading-center"><div className="spinner" /></div>

    return (
        <div style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>

            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', lineHeight: 1 }}>
                        Plan de Ahorro
                    </h1>
                    <span style={{ background: '#FFF3E0', color: '#7C4000', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>
                        Suscripción
                    </span>
                </div>
                <p style={{ color: '#8896a7', fontSize: '14px' }}>
                    Seleccioná un vehículo para ver la cotización completa
                </p>
            </div>

            <input
                className="form-input"
                style={{ width: '100%', marginBottom: '16px' }}
                placeholder="Buscar por marca, modelo o versión..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#8896a7' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom: '12px', opacity: 0.4 }}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    <p style={{ fontSize: '14px' }}>No hay vehículos disponibles</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filtered.map(v => {
                        const plan = v.pa_planes?.[0]
                        return (
                            <div
                                key={v.id}
                                onClick={() => navigate(`/plan-ahorro/${v.id}`)}
                                style={{
                                    background: 'white',
                                    border: '1px solid #e2e6ec',
                                    borderRadius: '12px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    gap: '16px',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    boxShadow: '0 1px 4px rgba(0,51,102,0.04)',
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.borderColor = '#003366'
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,51,102,0.1)'
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.borderColor = '#e2e6ec'
                                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,51,102,0.04)'
                                }}
                            >
                                {/* Imagen */}
                                {v.imagen_url ? (
                                    <img src={v.imagen_url} alt="" style={{ width: '90px', height: '62px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: '90px', height: '62px', background: '#f0f2f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                            <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                                        </svg>
                                    </div>
                                )}

                                {/* Info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366', lineHeight: 1, marginBottom: '4px' }}>
                                        {v.marca} {v.modelo}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '8px' }}>{v.version}</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>{v.tipo_plan}</span>
                                        <span style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>{v.plazo_cuotas} cuotas</span>
                                        <span style={{ background: '#FFF3E0', color: '#7C4000', fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>Plan de Ahorro</span>
                                    </div>
                                </div>

                                {/* Precio */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '11px', color: '#8896a7', marginBottom: '2px' }}>Valor móvil</div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#003366' }}>{fmtPeso(v.valor_movil)}</div>
                                    {plan?.cuota1_con_promo > 0 && (
                                        <div style={{ marginTop: '4px' }}>
                                            <div style={{ fontSize: '10px', color: '#8896a7' }}>Cuota 1 c/promo</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a7a4a' }}>{fmtPeso(plan.cuota1_con_promo)}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Flecha */}
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="2" style={{ flexShrink: 0 }}>
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}