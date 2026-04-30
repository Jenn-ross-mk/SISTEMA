import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, sub, color = '#003366', icon }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a202c', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#8896a7', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ vehiculos: 0, vendedores: 0, cotizaciones: 0, cotizacionesHoy: 0 })
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const hoy = new Date().toISOString().split('T')[0]
      const [{ count: v }, { count: ve }, { count: c }, { count: ch }, { data: r }] = await Promise.all([
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('rol', 'vendedor').eq('activo', true),
        supabase.from('cotizaciones').select('*', { count: 'exact', head: true }),
        supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).gte('created_at', hoy),
        supabase.from('cotizaciones').select('*, profiles(nombre)').order('created_at', { ascending: false }).limit(8),
      ])
      setStats({ vehiculos: v || 0, vendedores: ve || 0, cotizaciones: c || 0, cotizacionesHoy: ch || 0 })
      setRecientes(r || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: '#8896a7', fontSize: '14px' }}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Vehículos activos" value={stats.vehiculos} icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
        } />
        <StatCard label="Vendedores" value={stats.vendedores} color="#1a7a4a" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        } />
        <StatCard label="Cotizaciones totales" value={stats.cotizaciones} color="#8a6800" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        } />
        <StatCard label="Cotizaciones hoy" value={stats.cotizacionesHoy} color="#c0392b" sub="del día actual" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        } />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link to="/admin/vehiculos/nuevo" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo vehículo
        </Link>
        <Link to="/admin/vendedores" className="btn btn-outline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Gestionar vendedores
        </Link>
        <Link to="/admin/cotizaciones" className="btn btn-ghost">
          Ver todas las cotizaciones
        </Link>
      </div>

      {/* Recent cotizaciones */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e6ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366' }}>Cotizaciones recientes</h2>
          <Link to="/admin/cotizaciones" style={{ fontSize: '13px', color: '#003366', textDecoration: 'none', fontWeight: '600' }}>Ver todas →</Link>
        </div>
        {recientes.length === 0 ? (
          <div className="empty-state"><p>No hay cotizaciones aún</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Provincia</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontSize: '13px', color: '#8896a7' }}>{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                    <td style={{ fontWeight: '500' }}>{c.vendedor_nombre}</td>
                    <td>{c.cliente_nombre}</td>
                    <td style={{ fontSize: '13px' }}>{c.vehiculo_descripcion}</td>
                    <td><span className="badge badge-navy" style={{ textTransform: 'capitalize' }}>{c.provincia}</span></td>
                    <td className="text-right" style={{ fontWeight: '700', color: '#003366' }}>
                      ${c.saldo_efectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
