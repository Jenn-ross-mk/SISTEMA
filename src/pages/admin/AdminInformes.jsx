import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { esPlanAhorro } from '../../lib/resumenCotizacion'
import { descargarInformeExcel } from '../../lib/informeExcel'

const LOCALIDADES = ['Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Esquel']
const LOTE = 1000

const pad = n => String(n).padStart(2, '0')
const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fechaArg = iso => iso.split('-').reverse().join('/')

const PERIODOS = [
  ['Todo', () => ['', '']],
  ['Últimos 7 días', () => { const h = new Date(); const d = new Date(); d.setDate(h.getDate() - 6); return [isoLocal(d), isoLocal(h)] }],
  ['Este mes', () => { const h = new Date(); return [isoLocal(new Date(h.getFullYear(), h.getMonth(), 1)), isoLocal(h)] }],
  ['Mes anterior', () => { const h = new Date(); return [isoLocal(new Date(h.getFullYear(), h.getMonth() - 1, 1)), isoLocal(new Date(h.getFullYear(), h.getMonth(), 0))] }],
]

// Supabase devuelve como máximo 1000 filas por consulta: se pide por lotes.
async function cargarTodas() {
  const todas = []
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .range(desde, desde + LOTE - 1)
    if (error) throw error
    todas.push(...(data || []))
    if (!data || data.length < LOTE) return todas
  }
}

export default function AdminInformes() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sucursal, setSucursal] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [tipo, setTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cots, { data: v }, { data: veh }] = await Promise.all([
          cargarTodas(),
          supabase.from('profiles').select('id, nombre, localidad, activo').order('nombre'),
          supabase.from('vehiculos').select('id, modelo'),
        ])
        setCotizaciones(cots)
        setVendedores(v || [])
        setVehiculos(veh || [])
      } catch (err) {
        console.error('Error al cargar cotizaciones:', err)
        setError('No se pudieron cargar las cotizaciones.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const localidadDe = id => vendedores.find(v => v.id === id)?.localidad || ''
  const conCotizaciones = new Set(cotizaciones.map(c => c.vendedor_id))

  const vendedoresOpciones = vendedores
    .filter(v => v.activo || conCotizaciones.has(v.id))
    .filter(v => !sucursal || v.localidad === sucursal)

  const filtradas = cotizaciones.filter(c => {
    if (sucursal && localidadDe(c.vendedor_id) !== sucursal) return false
    if (vendedor && c.vendedor_id !== vendedor) return false
    if (tipo === 'plan_ahorro' && !esPlanAhorro(c)) return false
    if (tipo === 'convencional' && esPlanAhorro(c)) return false
    const dia = isoLocal(new Date(c.created_at))
    if (desde && dia < desde) return false
    if (hasta && dia > hasta) return false
    return true
  })

  const porVendedor = new Map()
  for (const c of filtradas) {
    const key = c.vendedor_id || c.vendedor_nombre
    if (!porVendedor.has(key)) porVendedor.set(key, { nombre: c.vendedor_nombre, sucursal: localidadDe(c.vendedor_id), total: 0, conv: 0, pa: 0 })
    const v = porVendedor.get(key)
    v.total++
    esPlanAhorro(c) ? v.pa++ : v.conv++
  }
  const resumen = [...porVendedor.values()].sort((a, b) => b.total - a.total)

  function handleSucursal(val) {
    setSucursal(val)
    if (val && vendedor && localidadDe(vendedor) !== val) setVendedor('')
  }

  function limpiar() {
    setSucursal(''); setVendedor(''); setTipo(''); setDesde(''); setHasta('')
  }

  async function handleDescargar() {
    const filtros = [
      ['Sucursal', sucursal || 'Todas'],
      ['Vendedor', vendedores.find(v => v.id === vendedor)?.nombre || 'Todos'],
      ['Tipo', tipo === 'plan_ahorro' ? 'Plan de Ahorro' : tipo === 'convencional' ? 'Convencional' : 'Todos'],
      ['Período', desde || hasta ? `${desde ? fechaArg(desde) : 'inicio'} al ${hasta ? fechaArg(hasta) : 'hoy'}` : 'Todo'],
    ]
    setGenerando(true)
    try {
      await descargarInformeExcel(filtradas, vendedores, filtros, vehiculos)
    } catch (err) {
      console.error('Error al generar el Excel:', err)
      alert('No se pudo generar el Excel. Intentá de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const hayFiltros = sucursal || vendedor || tipo || desde || hasta

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>
          Informes
        </h1>
        <p style={{ color: '#8896a7', fontSize: '14px' }}>Elegí los filtros y descargá las cotizaciones en Excel.</p>
      </div>

      {error && <div style={{ background: '#fdecea', color: '#c0392b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

      {/* Filtros */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: '190px', flex: 1 }}>
            <label className="form-label">Sucursal</label>
            <select className="form-select" value={sucursal} onChange={e => handleSucursal(e.target.value)}>
              <option value="">Todas</option>
              {LOCALIDADES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '190px', flex: 1 }}>
            <label className="form-label">Vendedor</label>
            <select className="form-select" value={vendedor} onChange={e => setVendedor(e.target.value)}>
              <option value="">Todos</option>
              {vendedoresOpciones.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}{v.activo ? '' : ' (inactivo)'}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '170px', flex: 1 }}>
            <label className="form-label">Tipo</label>
            <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="convencional">Convencional</option>
              <option value="plan_ahorro">Plan de Ahorro</option>
            </select>
          </div>
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#8896a7', marginRight: '4px' }}>Período rápido:</span>
          {PERIODOS.map(([label, rango]) => {
            const [d, h] = rango()
            const activo = d === desde && h === hasta
            return (
              <button key={label} className={`btn btn-sm ${activo ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setDesde(d); setHasta(h) }}>
                {label}
              </button>
            )
          })}
          {hayFiltros && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={limpiar}>Limpiar filtros</button>
          )}
        </div>
      </div>

      {/* Vista previa + descarga */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,0.06)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e6ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '20px', fontWeight: '700', color: '#003366' }}>
              {filtradas.length} {filtradas.length === 1 ? 'cotización' : 'cotizaciones'}
            </div>
            <div style={{ fontSize: '13px', color: '#8896a7' }}>
              El Excel incluye fecha, vendedor, sucursal, cliente, teléfono, tipo, vehículo, modelo, plan, cuotas, montos y observaciones.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleDescargar} disabled={generando || filtradas.length === 0}>
            {generando
              ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'white' }} /> Generando...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar Excel</>
            }
          </button>
        </div>

        {resumen.length === 0 ? (
          <div className="empty-state"><p>No hay cotizaciones con estos filtros</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Sucursal</th>
                  <th className="text-right">Convencionales</th>
                  <th className="text-right">Plan de Ahorro</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map(v => (
                  <tr key={v.nombre + v.sucursal}>
                    <td style={{ fontWeight: '500' }}>{v.nombre}</td>
                    <td>{v.sucursal ? <span className="badge badge-navy">{v.sucursal}</span> : <span style={{ fontSize: '12px', color: '#8896a7' }}>—</span>}</td>
                    <td className="text-right">{v.conv}</td>
                    <td className="text-right">{v.pa}</td>
                    <td className="text-right" style={{ fontWeight: '700', color: '#003366' }}>{v.total}</td>
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
