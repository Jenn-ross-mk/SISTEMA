import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ClienteLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fb' }}>
      {/* Header */}
      <header style={{
        background: '#003366',
        padding: '0 16px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: '700', fontSize: '22px', color: 'white', letterSpacing: '0.06em' }}>
            AKAR
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginLeft: '2px' }}>Cotizador</span>
        </Link>

        {/* Desktop nav */}
        <div className="header-desktop" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {profile?.rol === 'admin' && (
            <Link to="/admin" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
              onMouseOver={e => e.currentTarget.style.color = 'white'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Panel Admin
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '13px', fontWeight: '700',
            }}>
              {profile?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{profile?.nombre}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{profile?.rol}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white' }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          >
            Salir
          </button>
        </div>

        {/* Mobile burger */}
        <button
          className="header-mobile"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Menú"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="header-mobile" style={{
          position: 'fixed', top: '60px', left: 0, right: 0,
          background: '#00224d',
          zIndex: 199,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {/* User info */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '16px', fontWeight: '700', flexShrink: 0,
            }}>
              {profile?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '15px', fontWeight: '600' }}>{profile?.nombre}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{profile?.rol}</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ padding: '8px 0' }}>
            {profile?.rol === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 20px', color: 'rgba(255,255,255,0.85)',
                  textDecoration: 'none', fontSize: '15px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                Panel Admin
              </Link>
            )}
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', color: 'rgba(255,255,255,0.85)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px',
                textAlign: 'left',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Overlay para cerrar menú al tocar afuera */}
      {menuOpen && (
        <div
          className="header-mobile"
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, top: '60px', zIndex: 198, background: 'transparent' }}
        />
      )}

      {/* Content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: '#003366', padding: '14px 24px', textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>© 2025 Akar Automotores. Todos los derechos reservados.</span>
      </footer>
    </div>
  )
}