import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const MODELOS_ORDEN = ['ONIX','ONIX PLUS','TRACKER','SPIN','SPARK EUV','CAPTIVA','MONTANA','S10','SILVERADO','TRAILBLAZER','SONIC']

function groupByModelo(vehiculos) {
  const groups = {}
  vehiculos.forEach(v => {
    const key = v.modelo.toUpperCase()
    if (!groups[key]) groups[key] = []
    groups[key].push(v)
  })
  const sorted = {}
  MODELOS_ORDEN.forEach(m => { if (groups[m]) sorted[m] = groups[m] })
  Object.keys(groups).forEach(m => { if (!sorted[m]) sorted[m] = groups[m] })
  return sorted
}

export default function VehiculosIndex() {
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('modelo')
        .order('version')
      setVehiculos(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = vehiculos.filter(v =>
    `${v.modelo} ${v.version}`.toLowerCase().includes(search.toLowerCase())
  )

  const groups = groupByModelo(filtered)

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #003366 0%, #1a4d88 100%)',
        borderRadius: '16px',
        padding: '40px 48px',
        marginBottom: '36px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.06 }}>
          <svg width="220" height="220" viewBox="0 0 24 24" fill="white">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '36px', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.03em' }}>
          Cotizá tu 0km
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', maxWidth: '500px' }}>
          Seleccioná el vehículo, elegí la financiación y obtené el monto final de tus cuotas.
        </p>
        <div style={{ marginTop: '24px', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar modelo o versión..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 44px',
                borderRadius: '8px',
                border: '1.5px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontSize: '15px',
                fontFamily: "'Barlow', sans-serif",
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
          </div>
        </div>
      </div>

      {/* Vehículos agrupados por modelo */}
      {Object.keys(groups).length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <p>No se encontraron vehículos</p>
        </div>
      ) : (
        Object.entries(groups).map(([modelo, vehics]) => (
          <div key={modelo} style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '22px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {modelo}
              </h2>
              <div style={{ flex: 1, height: '1px', background: '#e2e6ec' }} />
              <span className="badge badge-navy">
                {vehics.length} {vehics.length === 1 ? 'versión' : 'versiones'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {vehics.map(v => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/vehiculo/${v.id}`)}
                  style={{
                    background: 'white',
                    border: '1.5px solid #e2e6ec',
                    borderRadius: '12px',
                    padding: '0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,51,102,0.06)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = '#003366'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,51,102,0.14)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = '#e2e6ec'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,51,102,0.06)'
                  }}
                >
                  <div style={{ height: '140px', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {v.imagen_url ? (
                      <img src={v.imagen_url} alt={`${v.modelo} ${v.version}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c8d0da" strokeWidth="1.2">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '15px', fontWeight: '600', color: '#8896a7', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Chevrolet {v.modelo}
                    </div>
                    <div style={{ fontSize: '14px', color: '#1a202c', fontWeight: '600', marginBottom: '10px' }}>
                      {v.version}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>desde</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#003366' }}>
                          ${Math.min(v.precio_chubut || 0, v.precio_santacruz || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ background: '#003366', color: 'white', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Cotizar
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}