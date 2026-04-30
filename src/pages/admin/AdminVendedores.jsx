import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminVendedores() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'vendedor' })
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('nombre')
    setVendedores(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    // Create user via Supabase admin — needs service role key for production
    // With anon key, users sign up themselves. For admin creation, use signUp:
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nombre: form.nombre, rol: form.rol }
      }
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    showToast('Usuario creado. Recibirá un email de confirmación.')
    setShowModal(false)
    setForm({ nombre: '', email: '', password: '', rol: 'vendedor' })
    setTimeout(load, 1000)
    setSaving(false)
  }

  async function toggleActivo(v) {
    await supabase.from('profiles').update({ activo: !v.activo }).eq('id', v.id)
    setVendedores(prev => prev.map(x => x.id === v.id ? { ...x, activo: !x.activo } : x))
    showToast(`Usuario ${!v.activo ? 'activado' : 'desactivado'}`)
  }

  async function handleCambiarRol(v) {
    const nuevoRol = v.rol === 'admin' ? 'vendedor' : 'admin'
    if (!confirm(`¿Cambiar el rol de ${v.nombre} a ${nuevoRol}?`)) return
    await supabase.from('profiles').update({ rol: nuevoRol }).eq('id', v.id)
    setVendedores(prev => prev.map(x => x.id === v.id ? { ...x, rol: nuevoRol } : x))
    showToast('Rol actualizado')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ padding: '32px' }}>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>Vendedores</h1>
          <p style={{ color: '#8896a7', fontSize: '14px' }}>{vendedores.filter(v => v.rol === 'vendedor').length} vendedores · {vendedores.filter(v => v.rol === 'admin').length} admins</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo usuario
        </button>
      </div>

      {/* Info note */}
      <div style={{ background: 'rgba(0,51,102,0.06)', border: '1px solid rgba(0,51,102,0.15)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#003366' }}>
        <strong>Nota:</strong> Al crear un usuario, recibirá un email de confirmación en su casilla. Una vez confirmado, podrá ingresar con su email y contraseña.
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
        {vendedores.length === 0 ? (
          <div className="empty-state"><p>No hay usuarios registrados</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Desde</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: v.rol === 'admin' ? 'rgba(0,51,102,0.12)' : 'rgba(26,122,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', color: v.rol === 'admin' ? '#003366' : '#1a7a4a', flexShrink: 0 }}>
                          {v.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500' }}>{v.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${v.rol === 'admin' ? 'badge-navy' : 'badge-green'}`}>
                        {v.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${v.activo ? 'badge-green' : 'badge-red'}`}>
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#8896a7' }}>
                      {new Date(v.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => toggleActivo(v)} className="btn btn-ghost btn-sm" title={v.activo ? 'Desactivar' : 'Activar'}>
                          {v.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => handleCambiarRol(v)} className="btn btn-ghost btn-sm" title="Cambiar rol">
                          → {v.rol === 'admin' ? 'Vendedor' : 'Admin'}
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

      {/* Modal nuevo usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>Nuevo usuario</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm btn-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre completo *</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan Pérez" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="juan@akar.com.ar" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña *</label>
                  <input type="password" className="form-input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-select" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {error && <div style={{ padding: '10px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '6px', color: '#c0392b', fontSize: '13px' }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
