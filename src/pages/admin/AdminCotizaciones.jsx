import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { resumenCotizacion } from '../../lib/resumenCotizacion'
import { descargarTicket } from '../../lib/ticketCotizacion'

const LOCALIDADES = ['Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Esquel']

function fmt(n) {
  return (n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export default function AdminCotizaciones() {
  const { profile } = useAuth()
  const puedeVerTodo = profile?.rol === 'admin' || profile?.rol === 'supervisor'
  const esAdmin = profile?.rol === 'admin'
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroLocalidad, setFiltroLocalidad] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [vendedores, setVendedores] = useState([])
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [descargando, setDescargando] = useState(false)

  async function load() {
    let query = supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false })

    if (!puedeVerTodo) query = query.eq('vendedor_id', profile.id)

    const { data } = await query
    setCotizaciones(data || [])

    if (puedeVerTodo) {
      const { data: v } = await supabase.from('profiles').select('id, nombre, localidad, activo').order('nombre')
      setVendedores(v || [])
    }
    setLoading(false)
  }

  useEffect(() => { if (profile) load() }, [profile])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDelete(c) {
    if (!confirm(`¿Eliminar la cotización de ${c.cliente_nombre}?`)) return
    await supabase.from('cotizaciones').delete().eq('id', c.id)
    setCotizaciones(prev => prev.filter(x => x.id !== c.id))
    if (selected?.id === c.id) setSelected(null)
    showToast('Cotización eliminada')
  }

  const vendedoresDeLaLocalidad = filtroLocalidad
    ? vendedores.filter(v => v.localidad === filtroLocalidad).map(v => v.id)
    : null

  const vendedoresFiltrados = (filtroLocalidad
    ? vendedores.filter(v => v.localidad === filtroLocalidad)
    : vendedores
  ).filter(v => v.activo)

  const filtered = cotizaciones.filter(c => {
    const txt = `${c.cliente_nombre} ${c.vehiculo_descripcion} ${c.vendedor_nombre}`.toLowerCase()
    if (search && !txt.includes(search.toLowerCase())) return false
    if (filtroLocalidad && vendedoresDeLaLocalidad && !vendedoresDeLaLocalidad.includes(c.vendedor_id)) return false
    if (filtroVendedor && c.vendedor_id !== filtroVendedor) return false
    if (filtroFechaDesde && c.created_at < filtroFechaDesde) return false
    if (filtroFechaHasta && c.created_at > filtroFechaHasta + 'T23:59:59') return false
    if (filtroTipo === 'plan_ahorro') {
      if (!c.plan_nombre?.toLowerCase().includes('plan de ahorro')) return false
    }
    if (filtroTipo === 'convencional') {
      if (c.plan_nombre?.toLowerCase().includes('plan de ahorro')) return false
    }
    return true
  })

  const totalSaldo = filtered.reduce((s, c) => s + (c.saldo_efectivo || 0), 0)

  async function handleTicket(c, localidad) {
    setDescargando(true)
    try {
      await descargarTicket(c, localidad)
    } catch (err) {
      console.error('Error al generar el ticket:', err)
      showToast('No se pudo generar el ticket', 'error')
    } finally {
      setDescargando(false)
    }
  }

  function handleLocalidadChange(val) {
    setFiltroLocalidad(val)
    if (val && filtroVendedor) {
      const vend = vendedores.find(v => v.id === filtroVendedor)
      if (vend?.localidad !== val) setFiltroVendedor('')
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ padding: '32px' }}>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>
          {puedeVerTodo ? 'Todas las cotizaciones' : 'Mis cotizaciones'}
        </h1>
        <p style={{ color: '#8896a7', fontSize: '14px' }}>{filtered.length} cotizaciones{filtroVendedor || filtroLocalidad || search || filtroTipo ? ' (filtradas)' : ''}</p>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: '200px', flex: 1 }}>
          <label className="form-label">Buscar</label>
          <input className="form-input" placeholder="Cliente, vehículo, vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="form-group" style={{ minWidth: '180px' }}>
          <label className="form-label">Tipo</label>
          <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="convencional">Convencional</option>
            <option value="plan_ahorro">Plan de Ahorro</option>
          </select>
        </div>

        {puedeVerTodo && (
          <>
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label">Localidad</label>
              <select className="form-select" value={filtroLocalidad} onChange={e => handleLocalidadChange(e.target.value)}>
                <option value="">Todas</option>
                {LOCALIDADES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label">Vendedor</label>
              <select className="form-select" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}>
                <option value="">Todos</option>
                {vendedoresFiltrados.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-group" style={{ minWidth: '150px' }}>
          <label className="form-label">Desde</label>
          <input type="date" className="form-input" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: '150px' }}>
          <label className="form-label">Hasta</label>
          <input type="date" className="form-input" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
        </div>
        {(search || filtroVendedor || filtroLocalidad || filtroFechaDesde || filtroFechaHasta || filtroTipo) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFiltroVendedor(''); setFiltroLocalidad(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); setFiltroTipo('') }} style={{ alignSelf: 'flex-end' }}>
            Limpiar
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        {/* Table */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>No hay cotizaciones</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      {puedeVerTodo && <th>Vendedor</th>}
                      <th>Cliente</th>
                      <th>Vehículo</th>
                      <th>Tipo</th>
                      <th>Localidad</th>
                      <th className="text-right">Saldo</th>
                      <th style={{ textAlign: 'center' }}>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const vendedorInfo = vendedores.find(v => v.id === c.vendedor_id)
                      const esPlanAhorro = c.plan_nombre?.toLowerCase().includes('plan de ahorro')
                      return (
                        <tr key={c.id} onClick={() => setSelected(c)} style={{ cursor: 'pointer', background: selected?.id === c.id ? 'rgba(0,51,102,0.04)' : undefined }}>
                          <td style={{ fontSize: '13px', color: '#8896a7', whiteSpace: 'nowrap' }}>
                            {new Date(c.created_at).toLocaleDateString('es-AR')}
                            <div style={{ fontSize: '11px' }}>{new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          {puedeVerTodo && <td style={{ fontWeight: '500', fontSize: '13px' }}>{c.vendedor_nombre}</td>}
                          <td style={{ fontWeight: '500' }}>{c.cliente_nombre}</td>
                          <td style={{ fontSize: '13px', maxWidth: '180px' }}>{c.vehiculo_descripcion}</td>
                          <td>
                            {esPlanAhorro
                              ? <span className="badge badge-gold">Plan Ahorro</span>
                              : <span className="badge badge-navy">Convencional</span>
                            }
                          </td>
                          <td>
                            {vendedorInfo?.localidad
                              ? <span className="badge badge-navy">{vendedorInfo.localidad}</span>
                              : <span style={{ fontSize: '12px', color: '#8896a7' }}>—</span>
                            }
                          </td>
                          <td className="text-right" style={{ fontWeight: '700', color: '#003366', whiteSpace: 'nowrap' }}>${fmt(c.saldo_efectivo)}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button onClick={() => setSelected(c)} className="btn btn-ghost btn-sm btn-icon" title="Ver detalle">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              {esAdmin && (
                                <button onClick={() => handleDelete(c)} className="btn btn-danger btn-sm btn-icon" title="Eliminar">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Total */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e6ec', display: 'flex', justifyContent: 'flex-end', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: '#8896a7' }}>Total saldos filtrados:</span>
                <span style={{ fontWeight: '700', color: '#003366' }}>${fmt(totalSaldo)}</span>
              </div>
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const vendedorInfo = vendedores.find(v => v.id === selected.vendedor_id)
          const esPlanAhorro = selected.plan_nombre?.toLowerCase().includes('plan de ahorro')
          const resumen = resumenCotizacion(selected, vendedorInfo?.localidad)
          return (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)', position: 'sticky', top: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e6ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366' }}>Detalle</h3>
                  {esPlanAhorro
                    ? <span className="badge badge-gold">Plan Ahorro</span>
                    : <span className="badge badge-navy">Convencional</span>
                  }
                </div>
                <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm btn-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ padding: '16px 20px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                {resumen.secciones.map((sec, i) => (
                  <div key={sec.titulo} style={{ borderTop: i > 0 ? '1px solid #e2e6ec' : 'none', paddingTop: i > 0 ? '12px' : 0, marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{sec.titulo}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sec.filas.map(([k, v], j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
                          <span style={{ color: '#4a5568' }}>{k}</span>
                          <span style={{ fontWeight: '600', textAlign: 'right', overflowWrap: 'anywhere' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ borderTop: '2px solid #003366', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#003366', fontSize: '16px' }}>
                  <span>{resumen.total.label}</span>
                  <span>{resumen.total.valor}</span>
                </div>

                {resumen.observaciones.map(([titulo, texto]) => (
                  <div key={titulo} style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{titulo}</div>
                    <div style={{ fontSize: '13px', color: '#4a5568', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{texto}</div>
                  </div>
                ))}

                <div style={{ fontSize: '12px', color: '#8896a7', marginTop: '14px' }}>
                  Presupuesto válido por {resumen.validez}
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e6ec' }}>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={descargando} onClick={() => handleTicket(selected, vendedorInfo?.localidad)}>
                  {descargando
                    ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'white' }} /> Generando...</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar ticket</>
                  }
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}