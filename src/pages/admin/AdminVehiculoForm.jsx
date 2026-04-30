import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const MARCAS = ['CHEVROLET']
const MODELOS = ['ONIX','ONIX PLUS','TRACKER','SPIN','SPARK EUV','CAPTIVA','MONTANA','S10','SILVERADO','TRAILBLAZER','SONIC']
const TIPOS_PLAN = ['Plan convencional','Tasa 0%','Plan diferido','Plan especial (Tasa Fija/UVA)']

// Una fila de cuota dentro de un plan
function CuotaRow({ cuota, idx, onChange, onRemove }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 100px 140px 150px 120px 36px',
      gap: '8px',
      alignItems: 'flex-end',
      padding: '10px 12px',
      background: 'var(--gray-50)',
      borderRadius: '6px',
      marginBottom: '6px',
      border: '0.5px solid var(--gray-200)',
    }}>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: '10px' }}>Cuotas</label>
        <input
          type="number"
          className="form-input"
          value={cuota.cuotas}
          onChange={e => onChange(idx, 'cuotas', parseInt(e.target.value) || 0)}
          placeholder="12"
          min="1"
          style={{ padding: '6px 8px' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: '10px' }}>TNA %</label>
        <input
          type="number"
          step="0.01"
          className="form-input"
          value={cuota.tna}
          onChange={e => onChange(idx, 'tna', parseFloat(e.target.value) || 0)}
          placeholder="0"
          style={{ padding: '6px 8px' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: '10px' }}>Cuota / millón $</label>
        <input
          type="number"
          step="0.01"
          className="form-input"
          value={cuota.valor_cuota_por_millon}
          onChange={e => onChange(idx, 'valor_cuota_por_millon', parseFloat(e.target.value) || 0)}
          placeholder="55556"
          style={{ padding: '6px 8px' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: '10px' }}>Monto máx. $</label>
        <input
          type="number"
          className="form-input"
          value={cuota.monto_maximo || ''}
          onChange={e => onChange(idx, 'monto_maximo', parseFloat(e.target.value) || null)}
          placeholder="Sin límite"
          style={{ padding: '6px 8px' }}
        />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ fontSize: '10px' }}>Quebranto %</label>
        <input
          type="number"
          step="0.01"
          className="form-input"
          value={parseFloat((cuota.quebranto_pct * 100).toFixed(4))}
          onChange={e => onChange(idx, 'quebranto_pct', parseFloat(e.target.value) / 100 || 0)}
          placeholder="11"
          style={{ padding: '6px 8px' }}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(idx)}
        style={{
          width: '32px', height: '32px', border: 'none',
          background: '#FCEBEB', color: '#A32D2D',
          borderRadius: '6px', cursor: 'pointer',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          alignSelf: 'flex-end',
        }}
      >×</button>
    </div>
  )
}

// Un bloque de plan completo con sus cuotas
function PlanBlock({ plan, planIdx, onChange, onRemove, onAddCuota, onChangeCuota, onRemoveCuota }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--gray-200)',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '14px',
    }}>
      {/* Header del plan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Tipo / nombre del plan</label>
          <input
            className="form-input"
            list={`plan-tipos-${planIdx}`}
            value={plan.nombre_plan}
            onChange={e => onChange(planIdx, 'nombre_plan', e.target.value)}
            placeholder="Ej: Plan convencional"
            style={{ marginTop: '4px' }}
          />
          <datalist id={`plan-tipos-${planIdx}`}>
            {TIPOS_PLAN.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <button
          type="button"
          onClick={() => onRemove(planIdx)}
          className="btn btn-danger btn-sm"
          style={{ alignSelf: 'flex-end', marginTop: '4px' }}
        >
          Eliminar plan
        </button>
      </div>

      {/* Cuotas del plan */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 100px 140px 150px 120px 36px',
          gap: '8px',
          padding: '4px 12px',
          marginBottom: '4px',
        }}>
          {['Cuotas', 'TNA %', 'Cuota/millón', 'Monto máx.', 'Quebranto %', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: '700', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {h}
            </div>
          ))}
        </div>

        {plan.cuotas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--gray-500)', fontSize: '13px', background: 'var(--gray-50)', borderRadius: '6px' }}>
            No hay cuotas. Hacé clic en "Agregar cuota".
          </div>
        ) : (
          plan.cuotas.map((cuota, cuotaIdx) => (
            <CuotaRow
              key={cuotaIdx}
              cuota={cuota}
              idx={cuotaIdx}
              onChange={(i, field, val) => onChangeCuota(planIdx, i, field, val)}
              onRemove={(i) => onRemoveCuota(planIdx, i)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddCuota(planIdx)}
        className="btn btn-ghost btn-sm"
        style={{ fontSize: '12px' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Agregar cuota
      </button>
    </div>
  )
}

const CUOTA_EMPTY = { cuotas: 12, tna: 0, valor_cuota_por_millon: 0, monto_maximo: null, quebranto_pct: 0.11 }
const PLAN_EMPTY = { nombre_plan: '', cuotas: [{ ...CUOTA_EMPTY }] }

export default function AdminVehiculoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [form, setForm] = useState({
    marca: 'CHEVROLET', modelo: '', version: '',
    precio_base: '', gastos_chubut: '', gastos_santacruz: '',
    activo: true, orden: 0,
  })

  // planes: array de { nombre_plan, cuotas: [...] }
  const [planes, setPlanes] = useState([{ ...PLAN_EMPTY, cuotas: [{ ...CUOTA_EMPTY }] }])
  const [planesOriginales, setPlanesOriginales] = useState([]) // para saber qué borrar en edición
  const [imagen, setImagen] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [imagenExistente, setImagenExistente] = useState(null)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    if (!isEditing) return
    async function load() {
      const [{ data: v }, { data: p }] = await Promise.all([
        supabase.from('vehiculos').select('*').eq('id', id).single(),
        supabase.from('planes_financiacion').select('*').eq('vehiculo_id', id).order('nombre_plan').order('cuotas'),
      ])
      if (v) {
        // Calculamos gastos desde precios almacenados
        // precio_chubut = precio_base + gastos_chubut
        // Necesitamos guardar precio_base, gastos_chubut, gastos_santacruz por separado
        // Si vienen del schema antiguo, usamos precio_chubut como base y 0 de gastos
        setForm({
          marca: v.marca || 'CHEVROLET',
          modelo: v.modelo || '',
          version: v.version || '',
          precio_base: v.precio_base || v.precio_chubut || '',
          gastos_chubut: v.gastos_chubut || '',
          gastos_santacruz: v.gastos_santacruz || '',
          activo: v.activo,
          orden: v.orden || 0,
        })
        setImagenExistente(v.imagen_url)
      }
      if (p && p.length > 0) {
        // Agrupar por nombre_plan
        const grouped = {}
        p.forEach(row => {
          if (!grouped[row.nombre_plan]) grouped[row.nombre_plan] = { nombre_plan: row.nombre_plan, cuotas: [] }
          grouped[row.nombre_plan].cuotas.push({
            id: row.id,
            cuotas: row.cuotas,
            tna: row.tna,
            valor_cuota_por_millon: row.valor_cuota_por_millon,
            monto_maximo: row.monto_maximo,
            quebranto_pct: row.quebranto_pct,
          })
        })
        const planesArr = Object.values(grouped)
        setPlanes(planesArr)
        setPlanesOriginales(p.map(r => r.id))
      }
      setLoading(false)
    }
    load()
  }, [id, isEditing])

  // --- Handlers de planes ---
  function addPlan() {
    setPlanes(prev => [...prev, { ...PLAN_EMPTY, cuotas: [{ ...CUOTA_EMPTY }] }])
  }
  function removePlan(planIdx) {
    setPlanes(prev => prev.filter((_, i) => i !== planIdx))
  }
  function changePlan(planIdx, field, value) {
    setPlanes(prev => prev.map((p, i) => i === planIdx ? { ...p, [field]: value } : p))
  }
  function addCuota(planIdx) {
    setPlanes(prev => prev.map((p, i) => i === planIdx
      ? { ...p, cuotas: [...p.cuotas, { ...CUOTA_EMPTY }] }
      : p
    ))
  }
  function removeCuota(planIdx, cuotaIdx) {
    setPlanes(prev => prev.map((p, i) => i === planIdx
      ? { ...p, cuotas: p.cuotas.filter((_, ci) => ci !== cuotaIdx) }
      : p
    ))
  }
  function changeCuota(planIdx, cuotaIdx, field, value) {
    setPlanes(prev => prev.map((p, i) => {
      if (i !== planIdx) return p
      return {
        ...p,
        cuotas: p.cuotas.map((c, ci) => ci === cuotaIdx ? { ...c, [field]: value } : c)
      }
    }))
  }

  function handleImagen(e) {
    const file = e.target.files[0]
    if (!file) return
    setImagen(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  // Precio base y gastos
  const precioBase = parseFloat(String(form.precio_base).replace(/\./g, '').replace(',', '.')) || 0
  const gastosCh = parseFloat(String(form.gastos_chubut).replace(/\./g, '').replace(',', '.')) || 0
  const gastosSc = parseFloat(String(form.gastos_santacruz).replace(/\./g, '').replace(',', '.')) || 0
  const precioTotalChubut = precioBase + gastosCh
  const precioTotalSantaCruz = precioBase + gastosSc

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let imagen_url = imagenExistente
      if (imagen) {
        const ext = imagen.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('vehiculos').upload(path, imagen)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('vehiculos').getPublicUrl(path)
        imagen_url = publicUrl
      }

      const vehiculoData = {
        marca: form.marca.toUpperCase(),
        modelo: form.modelo.toUpperCase(),
        version: form.version,
        precio_base: precioBase,
        gastos_chubut: gastosCh,
        gastos_santacruz: gastosSc,
        precio_chubut: precioTotalChubut,
        precio_santacruz: precioTotalSantaCruz,
        activo: form.activo,
        orden: parseInt(form.orden) || 0,
        imagen_url,
        updated_at: new Date().toISOString(),
      }

      let vehiculoId = id
      if (isEditing) {
        await supabase.from('vehiculos').update(vehiculoData).eq('id', id)
        // Borrar todos los planes existentes y re-insertar
        await supabase.from('planes_financiacion').delete().eq('vehiculo_id', id)
      } else {
        const { data } = await supabase.from('vehiculos').insert(vehiculoData).select().single()
        vehiculoId = data.id
      }

      // Insertar todos los planes/cuotas
      const rowsToInsert = []
      planes.forEach(plan => {
        if (!plan.nombre_plan) return
        plan.cuotas.forEach(cuota => {
          rowsToInsert.push({
            vehiculo_id: vehiculoId,
            nombre_plan: plan.nombre_plan,
            cuotas: cuota.cuotas,
            tna: cuota.tna,
            valor_cuota_por_millon: cuota.valor_cuota_por_millon,
            monto_maximo: cuota.monto_maximo || null,
            quebranto_pct: cuota.quebranto_pct,
            tiene_quebranto: true,
            activo: true,
          })
        })
      })
      if (rowsToInsert.length > 0) {
        await supabase.from('planes_financiacion').insert(rowsToInsert)
      }

      showToast(isEditing ? 'Vehículo actualizado' : 'Vehículo creado')
      setTimeout(() => navigate('/admin/vehiculos'), 1500)
    } catch (err) {
      console.error(err)
      showToast('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/vehiculos')} style={{ marginBottom: '12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Volver
        </button>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366' }}>
          {isEditing ? 'Editar vehículo' : 'Nuevo vehículo'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>

        {/* DATOS DEL VEHÍCULO */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Datos del vehículo
          </h2>

          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Marca</label>
              <div className="form-input" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)', cursor: 'default' }}>
                CHEVROLET
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Modelo *</label>
              <select className="form-select" value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {MODELOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Versión *</label>
              <input className="form-input" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="Ej: 1.0T LT MT" required />
            </div>
          </div>

          {/* Precios */}
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '14px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
              Precios
            </div>
            <div className="grid-3" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Precio base $ *</label>
                <input type="number" step="0.01" className="form-input" value={form.precio_base} onChange={e => setForm(p => ({ ...p, precio_base: e.target.value }))} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label className="form-label">Gastos CyO Chubut $</label>
                <input type="number" step="0.01" className="form-input" value={form.gastos_chubut} onChange={e => setForm(p => ({ ...p, gastos_chubut: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Gastos CyO Santa Cruz $</label>
                <input type="number" step="0.01" className="form-input" value={form.gastos_santacruz} onChange={e => setForm(p => ({ ...p, gastos_santacruz: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            {precioBase > 0 && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Total Chubut: </span>
                  <strong style={{ color: '#003366' }}>${precioTotalChubut.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Total Santa Cruz: </span>
                  <strong style={{ color: '#003366' }}>${precioTotalSantaCruz.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="form-group" style={{ width: '140px' }}>
              <label className="form-label">Orden</label>
              <input type="number" className="form-input" value={form.orden} onChange={e => setForm(p => ({ ...p, orden: e.target.value }))} placeholder="0" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="activo" style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--gray-700)' }}>Vehículo activo</label>
            </div>
          </div>
        </div>

        {/* IMAGEN */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Imagen
          </h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ width: '160px', height: '110px', background: 'var(--gray-100)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(imagenPreview || imagenExistente) ? (
                <img src={imagenPreview || imagenExistente} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Foto del vehículo</label>
              <input type="file" accept="image/*" onChange={handleImagen} style={{ fontSize: '14px' }} />
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '6px' }}>JPG, PNG o WEBP. Recomendado: 800×500px</p>
              {(imagenExistente || imagenPreview) && (
                <button type="button" onClick={() => { setImagenExistente(null); setImagenPreview(null); setImagen(null) }} className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }}>
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PLANES DE FINANCIACIÓN */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--gray-200)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '18px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Planes de financiación
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
                Agregá planes ilimitados, cada uno con sus propias cuotas
              </p>
            </div>
            <button type="button" onClick={addPlan} className="btn btn-outline btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo plan
            </button>
          </div>

          <div style={{ background: 'var(--gray-50)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--gray-700)' }}>
            <strong>Cómo funciona el cálculo:</strong> cuota mensual = (monto financiado ÷ 1.000.000) × valor cuota/millón.
            El quebranto se calcula sobre el monto financiado y se suma a los gastos bancarios (incluye IVA 21%).
          </div>

          {planes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-500)', fontSize: '14px' }}>
              No hay planes. Hacé clic en "Nuevo plan".
            </div>
          ) : (
            planes.map((plan, planIdx) => (
              <PlanBlock
                key={planIdx}
                plan={plan}
                planIdx={planIdx}
                onChange={changePlan}
                onRemove={removePlan}
                onAddCuota={addCuota}
                onChangeCuota={changeCuota}
                onRemoveCuota={removeCuota}
              />
            ))
          )}
        </div>

        {/* ACCIONES */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/vehiculos')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: 'white' }} /> Guardando...</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> {isEditing ? 'Guardar cambios' : 'Crear vehículo'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
