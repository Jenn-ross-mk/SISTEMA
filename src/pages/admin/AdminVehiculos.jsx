import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminVehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  async function load() {
    const { data } = await supabase.from('vehiculos').select('*').order('marca').order('modelo').order('version')
    setVehiculos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleActivo(v) {
    await supabase.from('vehiculos').update({ activo: !v.activo }).eq('id', v.id)
    setVehiculos(prev => prev.map(x => x.id === v.id ? { ...x, activo: !x.activo } : x))
    showToast(`Vehículo ${!v.activo ? 'activado' : 'desactivado'}`)
  }

  async function handleDelete(v) {
    if (!confirm(`¿Eliminar ${v.marca} ${v.modelo} ${v.version}? Esta acción no se puede deshacer.`)) return
    setDeletingId(v.id)
    const { error } = await supabase.from('vehiculos').delete().eq('id', v.id)
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

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ padding: '32px' }}>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>Vehículos</h1>
          <p style={{ color: '#8896a7', fontSize: '14px' }}>{vehiculos.length} vehículos cargados</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input className="form-input" style={{ width: '220px' }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          <Link to="/admin/vehiculos/nuevo" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo vehículo
          </Link>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
            <p>No hay vehículos. <Link to="/admin/vehiculos/nuevo" style={{ color: '#003366' }}>Agregar el primero</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Marca / Modelo</th>
                  <th>Versión</th>
                  <th>Precio Chubut</th>
                  <th>Precio S.Cruz</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td style={{ width: '60px' }}>
                      {v.imagen_url ? (
                        <img src={v.imagen_url} alt="" style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <div style={{ width: '56px', height: '40px', background: '#f0f2f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.5">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                          </svg>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', color: '#003366' }}>{v.marca}</div>
                      <div style={{ fontSize: '13px', color: '#4a5568' }}>{v.modelo}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{v.version}</td>
                    <td style={{ fontWeight: '600', fontSize: '14px' }}>
                      ${v.precio_chubut.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                    </td>
                    <td style={{ fontWeight: '600', fontSize: '14px' }}>
                      ${v.precio_santacruz.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                    </td>
                    <td>
                      <span className={`badge ${v.activo ? 'badge-green' : 'badge-red'}`}>
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <Link to={`/admin/vehiculos/editar/${v.id}`} className="btn btn-ghost btn-sm btn-icon" title="Editar">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>
                        <button onClick={() => toggleActivo(v)} className="btn btn-ghost btn-sm btn-icon" title={v.activo ? 'Desactivar' : 'Activar'}>
                          {v.activo ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          )}
                        </button>
                        <button onClick={() => handleDelete(v)} className="btn btn-danger btn-sm btn-icon" disabled={deletingId === v.id} title="Eliminar">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
