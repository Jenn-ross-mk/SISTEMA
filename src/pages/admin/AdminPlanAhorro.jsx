import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminPlanAhorro() {
    const [vehiculos, setVehiculos] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [toast, setToast] = useState(null)

    async function load() {
        const { data } = await supabase
            .from('pa_vehiculos')
            .select('*, pa_planes(id, cuota_pura, cuota1_con_promo, bonificacion_pct)')
            .order('orden')
            .order('marca')
        setVehiculos(data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function toggleActivo(v) {
        await supabase.from('pa_vehiculos').update({ activo: !v.activo }).eq('id', v.id)
        setVehiculos(prev => prev.map(x => x.id === v.id ? { ...x, activo: !x.activo } : x))
        showToast(`Vehículo ${!v.activo ? 'activado' : 'desactivado'}`)
    }

    async function handleDelete(v) {
        if (!confirm(`¿Eliminar ${v.marca} ${v.modelo} ${v.version}?\nSe eliminarán también el plan, tramos y promociones asociados.`)) return
        setDeletingId(v.id)
        const { error } = await supabase.from('pa_vehiculos').delete().eq('id', v.id)
        if (!error) {
            setVehiculos(prev => prev.filter(x => x.id !== v.id))
            showToast('Vehículo eliminado')
        } else {
            showToast('No se pudo eliminar', 'error')
        }
        setDeletingId(null)
    }

    const filtered = vehiculos.filter(v =>
        `${v.marca} ${v.modelo} ${v.version}`.toLowerCase().includes(search.toLowerCase())
    )

    const fmtPeso = n => n ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '—'

    if (loading) return <div className="loading-center"><div className="spinner" /></div>

    return (
        <div style={{ padding: '32px' }}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366' }}>
                            Plan de Ahorro
                        </h1>
                        <span className="badge badge-navy" style={{ fontSize: '11px' }}>Catálogo independiente</span>
                    </div>
                    <p style={{ color: '#8896a7', fontSize: '14px' }}>
                        {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} cargado{vehiculos.length !== 1 ? 's' : ''} · Los datos son de solo lectura para los vendedores
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        className="form-input"
                        style={{ width: '220px' }}
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Link to="/admin/plan-ahorro/nuevo" className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nuevo vehículo
                    </Link>
                </div>
            </div>

            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: '#FFF8E1', border: '1px solid #FFD54F',
                borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
                fontSize: '13px', color: '#5D4037',
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                    Las <strong>promociones activas</strong> se configuran desde el formulario de cada vehículo.
                    Los vendedores las ven en modo <strong>solo lectura</strong>.
                </span>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                        </svg>
                        <p>
                            No hay vehículos de Plan de Ahorro.{' '}
                            <Link to="/admin/plan-ahorro/nuevo" style={{ color: '#003366' }}>Agregar el primero</Link>
                        </p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Imagen</th>
                                    <th>Marca / Modelo</th>
                                    <th>Versión</th>
                                    <th>Tipo de plan</th>
                                    <th>Valor móvil</th>
                                    <th>Cuota pura</th>
                                    <th>Cuota 1 c/promo</th>
                                    <th>Promociones</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(v => {
                                    const plan = v.pa_planes?.[0]
                                    return (
                                        <tr key={v.id}>
                                            <td style={{ width: '60px' }}>
                                                {v.imagen_url ? (
                                                    <img src={v.imagen_url} alt="" style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                                ) : (
                                                    <div style={{ width: '56px', height: '40px', background: '#f0f2f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                                                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                                                            <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '700', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', color: '#003366' }}>{v.marca}</div>
                                                <div style={{ fontSize: '13px', color: '#4a5568' }}>{v.modelo}</div>
                                            </td>
                                            <td style={{ fontSize: '13px' }}>{v.version}</td>
                                            <td>
                                                <span className="badge badge-navy">{v.tipo_plan}</span>
                                                <div style={{ fontSize: '11px', color: '#8896a7', marginTop: '3px' }}>{v.plazo_cuotas} cuotas</div>
                                            </td>
                                            <td style={{ fontWeight: '600', fontSize: '14px' }}>{fmtPeso(v.valor_movil)}</td>
                                            <td style={{ fontSize: '13px', color: '#4a5568' }}>
                                                {plan ? fmtPeso(plan.cuota_pura) : <span style={{ color: '#c8d0da' }}>Sin plan</span>}
                                            </td>
                                            <td>
                                                {plan?.cuota1_con_promo ? (
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#003366' }}>{fmtPeso(plan.cuota1_con_promo)}</div>
                                                        {plan.bonificacion_pct > 0 && (
                                                            <span className="badge badge-green" style={{ fontSize: '10px', marginTop: '2px' }}>-{plan.bonificacion_pct}%</span>
                                                        )}
                                                    </div>
                                                ) : <span style={{ color: '#c8d0da', fontSize: '13px' }}>—</span>}
                                            </td>
                                            <td><PromoCount vehiculoId={v.id} /></td>
                                            <td>
                                                <span className={`badge ${v.activo ? 'badge-green' : 'badge-red'}`}>
                                                    {v.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <Link to={`/admin/plan-ahorro/editar/${v.id}`} className="btn btn-ghost btn-sm btn-icon" title="Editar">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </Link>
                                                    <button onClick={() => toggleActivo(v)} className="btn btn-ghost btn-sm btn-icon" title={v.activo ? 'Desactivar' : 'Activar'}>
                                                        {v.activo ? (
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                        ) : (
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        )}
                                                    </button>
                                                    <button onClick={() => handleDelete(v)} className="btn btn-danger btn-sm btn-icon" disabled={deletingId === v.id} title="Eliminar">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

function PromoCount({ vehiculoId }) {
    const [counts, setCounts] = useState(null)
    useEffect(() => {
        supabase
            .from('pa_promociones')
            .select('activa')
            .eq('vehiculo_id', vehiculoId)
            .then(({ data }) => {
                const total = data?.length || 0
                const activa = data?.filter(p => p.activa).length || 0
                setCounts({ total, activa })
            })
    }, [vehiculoId])

    if (!counts) return <span style={{ color: '#c8d0da', fontSize: '12px' }}>—</span>
    if (counts.total === 0) return <span style={{ color: '#c8d0da', fontSize: '12px' }}>Sin promos</span>
    return (
        <div style={{ fontSize: '12px' }}>
            <span className="badge badge-green" style={{ fontSize: '10px' }}>{counts.activa} activa{counts.activa !== 1 ? 's' : ''}</span>
            {counts.total > counts.activa && (
                <span style={{ color: '#8896a7', marginLeft: '4px' }}>/ {counts.total}</span>
            )}
        </div>
    )
}