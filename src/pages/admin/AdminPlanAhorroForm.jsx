import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const MARCAS = ['CHEVROLET', 'VOLKSWAGEN', 'FORD', 'FIAT', 'RENAULT', 'PEUGEOT', 'CITROËN', 'TOYOTA', 'HONDA']
const TIPOS_PLAN = ['70/30', '50/50', '60/40', '80/20']

const EMPTY_TRAMO = { label: '', monto: '', es_promo: false, orden: 0 }
const EMPTY_PROMO = { titulo: '', descripcion: '', activa: false, orden: 0 }

export default function AdminPlanAhorroForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(isEdit)
    const [toast, setToast] = useState(null)
    const [uploadingImg, setUploadingImg] = useState(false)
    const [planId, setPlanId] = useState(null)

    const [veh, setVeh] = useState({
        marca: 'CHEVROLET', modelo: '', version: '',
        imagen_url: '', valor_movil: '', tipo_plan: '70/30',
        plazo_cuotas: 84, activo: true, orden: 0,
    })

    const [plan, setPlan] = useState({
        sistema: '', adjudicacion: 'Por sorteo o licitación',
        integracion_minima: '30% del valor del vehículo',
        cuota_pura: '', cuota1_sin_promo: '', cuota1_con_promo: '',
        bonificacion_pct: '',
        gastos_texto: 'Derecho de adjudicación (1,5% + IVA), flete y patentamiento (aprox. 10%).',
        observaciones: '',
    })

    const [tramos, setTramos] = useState([
        { label: 'Cuota 1', monto: '', es_promo: true, orden: 0 },
        { label: '', monto: '', es_promo: false, orden: 1 },
    ])

    const [promos, setPromos] = useState([])

    // ── Carga en modo edición ──
    useEffect(() => {
        if (!isEdit) return
        async function fetchData() {
            const { data: v } = await supabase.from('pa_vehiculos').select('*').eq('id', id).single()
            if (!v) { navigate('/admin/plan-ahorro'); return }
            setVeh({
                marca: v.marca, modelo: v.modelo, version: v.version,
                imagen_url: v.imagen_url || '', valor_movil: v.valor_movil,
                tipo_plan: v.tipo_plan, plazo_cuotas: v.plazo_cuotas,
                activo: v.activo, orden: v.orden,
            })

            const { data: p } = await supabase.from('pa_planes').select('*').eq('vehiculo_id', id).single()
            if (p) {
                setPlanId(p.id)
                setPlan({
                    sistema: p.sistema, adjudicacion: p.adjudicacion,
                    integracion_minima: p.integracion_minima, cuota_pura: p.cuota_pura,
                    cuota1_sin_promo: p.cuota1_sin_promo || '', cuota1_con_promo: p.cuota1_con_promo || '',
                    bonificacion_pct: p.bonificacion_pct || '', gastos_texto: p.gastos_texto,
                    observaciones: p.observaciones || '',
                })

                const { data: tr } = await supabase.from('pa_cuota_tramos').select('*').eq('plan_id', p.id).order('orden')
                if (tr && tr.length > 0) {
                    setTramos(tr.map(t => ({ label: t.label, monto: t.monto, es_promo: t.es_promo, orden: t.orden })))
                }
            }

            const { data: pr } = await supabase.from('pa_promociones').select('*').eq('vehiculo_id', id).order('orden')
            if (pr && pr.length > 0) {
                setPromos(pr.map(p => ({ titulo: p.titulo, descripcion: p.descripcion, activa: p.activa, orden: p.orden })))
            }

            setLoading(false)
        }
        fetchData()
    }, [id])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const setV = (k, v) => setVeh(p => ({ ...p, [k]: v }))
    const setP = (k, v) => setPlan(p => ({ ...p, [k]: v }))

    async function handleImagen(e) {
        const file = e.target.files[0]
        if (!file) return
        setUploadingImg(true)
        const ext = file.name.split('.').pop()
        const path = `pa/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('vehiculos').upload(path, file, { upsert: true })
        if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('vehiculos').getPublicUrl(path)
            setV('imagen_url', publicUrl)
        } else {
            showToast('Error al subir imagen', 'error')
        }
        setUploadingImg(false)
    }

    const addTramo = () => setTramos(prev => [...prev, { ...EMPTY_TRAMO, orden: prev.length }])
    const removeTramo = i => setTramos(prev => prev.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, orden: idx })))
    const updateTramo = (i, k, v) => setTramos(prev => prev.map((t, idx) => idx === i ? { ...t, [k]: v } : t))

    const addPromo = () => setPromos(prev => [...prev, { ...EMPTY_PROMO, orden: prev.length }])
    const removePromo = i => setPromos(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, orden: idx })))
    const updatePromo = (i, k, v) => setPromos(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p))

    async function handleSave() {
        if (!veh.marca || !veh.modelo || !veh.version) {
            showToast('Completá marca, modelo y versión', 'error'); return
        }
        if (!veh.valor_movil) {
            showToast('Ingresá el valor móvil', 'error'); return
        }
        setSaving(true)
        try {
            // 1. Vehículo
            let vehiculoId = id
            const vehData = {
                marca: veh.marca.trim(), modelo: veh.modelo.trim(), version: veh.version.trim(),
                imagen_url: veh.imagen_url || null, valor_movil: parseFloat(veh.valor_movil) || 0,
                tipo_plan: veh.tipo_plan, plazo_cuotas: parseInt(veh.plazo_cuotas) || 84,
                activo: veh.activo, orden: parseInt(veh.orden) || 0,
                updated_at: new Date().toISOString(),
            }
            if (isEdit) {
                await supabase.from('pa_vehiculos').update(vehData).eq('id', id)
            } else {
                const { data: nv, error } = await supabase.from('pa_vehiculos').insert(vehData).select().single()
                if (error) throw error
                vehiculoId = nv.id
            }

            // 2. Plan
            const planData = {
                vehiculo_id: vehiculoId,
                sistema: plan.sistema.trim(),
                adjudicacion: plan.adjudicacion.trim(),
                integracion_minima: plan.integracion_minima.trim(),
                cuota_pura: parseFloat(plan.cuota_pura) || 0,
                cuota1_sin_promo: parseFloat(plan.cuota1_sin_promo) || 0,
                cuota1_con_promo: parseFloat(plan.cuota1_con_promo) || 0,
                bonificacion_pct: parseFloat(plan.bonificacion_pct) || 0,
                gastos_texto: plan.gastos_texto.trim(),
                observaciones: plan.observaciones.trim(),
                updated_at: new Date().toISOString(),
            }
            let currentPlanId = planId
            if (planId) {
                await supabase.from('pa_planes').update(planData).eq('id', planId)
            } else {
                const { data: np, error } = await supabase.from('pa_planes').insert(planData).select().single()
                if (error) throw error
                currentPlanId = np.id
                setPlanId(np.id)
            }

            // 3. Tramos: borrar y re-insertar
            await supabase.from('pa_cuota_tramos').delete().eq('plan_id', currentPlanId)
            const tramosData = tramos
                .filter(t => t.label)
                .map((t, i) => ({
                    plan_id: currentPlanId,
                    label: t.label.trim(),
                    monto: parseFloat(t.monto) || 0,
                    es_promo: t.es_promo,
                    orden: i,
                }))
            if (tramosData.length > 0) await supabase.from('pa_cuota_tramos').insert(tramosData)

            // 4. Promociones: borrar y re-insertar
            await supabase.from('pa_promociones').delete().eq('vehiculo_id', vehiculoId)
            const promosData = promos
                .filter(p => p.titulo)
                .map((p, i) => ({
                    vehiculo_id: vehiculoId,
                    titulo: p.titulo.trim(),
                    descripcion: p.descripcion.trim(),
                    activa: p.activa,
                    orden: i,
                }))
            if (promosData.length > 0) await supabase.from('pa_promociones').insert(promosData)

            showToast(isEdit ? 'Cambios guardados' : 'Vehículo creado')
            if (!isEdit) navigate('/admin/plan-ahorro')
        } catch (err) {
            console.error(err)
            showToast('Error al guardar: ' + (err.message || 'desconocido'), 'error')
        }
        setSaving(false)
    }

    if (loading) return <div className="loading-center"><div className="spinner" /></div>

    return (
        <div style={{ padding: '32px', maxWidth: '860px' }}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                <button onClick={() => navigate('/admin/plan-ahorro')} className="btn btn-ghost btn-sm btn-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '26px', fontWeight: '700', color: '#003366', lineHeight: 1 }}>
                        {isEdit ? 'Editar vehículo' : 'Nuevo vehículo'} — Plan de Ahorro
                    </h1>
                    <p style={{ color: '#8896a7', fontSize: '13px', marginTop: '3px' }}>
                        Todos los campos son de solo lectura para los vendedores
                    </p>
                </div>
            </div>

            {/* SECCIÓN 1: Datos del vehículo */}
            <Section title="Datos del vehículo">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <FormGroup label="Marca">
                        <select className="form-select" value={veh.marca} onChange={e => setV('marca', e.target.value)}>
                            {MARCAS.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </FormGroup>
                    <FormGroup label="Modelo">
                        <input className="form-input" value={veh.modelo} onChange={e => setV('modelo', e.target.value)} placeholder="SPIN" />
                    </FormGroup>
                    <FormGroup label="Versión">
                        <input className="form-input" value={veh.version} onChange={e => setV('version', e.target.value)} placeholder="1.8 LT MT 2026" />
                    </FormGroup>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: '14px', marginTop: '14px' }}>
                    <FormGroup label="Valor móvil vigente ($)">
                        <input className="form-input" type="number" value={veh.valor_movil} onChange={e => setV('valor_movil', e.target.value)} placeholder="35116900" />
                    </FormGroup>
                    <FormGroup label="Tipo de plan">
                        <select className="form-select" value={veh.tipo_plan} onChange={e => setV('tipo_plan', e.target.value)}>
                            {TIPOS_PLAN.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </FormGroup>
                    <FormGroup label="Plazo (cuotas)">
                        <input className="form-input" type="number" value={veh.plazo_cuotas} onChange={e => setV('plazo_cuotas', e.target.value)} placeholder="84" />
                    </FormGroup>
                    <FormGroup label="Orden">
                        <input className="form-input" type="number" value={veh.orden} onChange={e => setV('orden', e.target.value)} placeholder="0" />
                    </FormGroup>
                </div>

                <div style={{ marginTop: '14px' }}>
                    <FormGroup label="Imagen del vehículo">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            {veh.imagen_url && (
                                <img src={veh.imagen_url} alt="" style={{ width: '100px', height: '68px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e6ec' }} />
                            )}
                            <div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} className="btn btn-ghost btn-sm">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    {uploadingImg ? 'Subiendo...' : 'Subir imagen'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagen} disabled={uploadingImg} />
                                </label>
                                {veh.imagen_url && (
                                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: '6px', color: '#c0392b' }} onClick={() => setV('imagen_url', '')}>
                                        Quitar
                                    </button>
                                )}
                                <p style={{ fontSize: '11px', color: '#8896a7', marginTop: '4px' }}>JPG, PNG o WEBP. Recomendado: 400×280px</p>
                            </div>
                        </div>
                    </FormGroup>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f0f2f5' }}>
                    <Toggle checked={veh.activo} onChange={v => setV('activo', v)} />
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>Vehículo activo (visible para vendedores)</span>
                </div>
            </Section>

            {/* SECCIÓN 2: Características del plan */}
            <Section title="Características del plan">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FormGroup label="Sistema / nombre del plan">
                        <input className="form-input" value={plan.sistema} onChange={e => setP('sistema', e.target.value)} placeholder="Plan de Ahorro 70/30" />
                    </FormGroup>
                    <FormGroup label="Adjudicación">
                        <input className="form-input" value={plan.adjudicacion} onChange={e => setP('adjudicacion', e.target.value)} placeholder="Por sorteo o licitación" />
                    </FormGroup>
                    <FormGroup label="Integración mínima">
                        <input className="form-input" value={plan.integracion_minima} onChange={e => setP('integracion_minima', e.target.value)} placeholder="30% del valor del vehículo" />
                    </FormGroup>
                    <FormGroup label="Cuota pura actual ($)">
                        <input className="form-input" type="number" value={plan.cuota_pura} onChange={e => setP('cuota_pura', e.target.value)} placeholder="292640" />
                    </FormGroup>
                </div>
            </Section>

            {/* SECCIÓN 3: Cuota 1 */}
            <Section title="Cuota 1 — Promoción vigente">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                    <FormGroup label="Cuota 1 sin promo ($)">
                        <input className="form-input" type="number" value={plan.cuota1_sin_promo} onChange={e => setP('cuota1_sin_promo', e.target.value)} placeholder="473661" />
                    </FormGroup>
                    <FormGroup label="Bonificación (%)">
                        <input className="form-input" type="number" value={plan.bonificacion_pct} onChange={e => setP('bonificacion_pct', e.target.value)} placeholder="30" />
                    </FormGroup>
                    <FormGroup label="Cuota 1 con promo ($)">
                        <input className="form-input" type="number" value={plan.cuota1_con_promo} onChange={e => setP('cuota1_con_promo', e.target.value)} placeholder="331563" />
                    </FormGroup>
                </div>
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f5f7fa', borderRadius: '6px', fontSize: '12px', color: '#8896a7' }}>
                    💡 Si no hay promoción en Cuota 1, dejá los tres campos en 0.
                </div>
            </Section>

            {/* SECCIÓN 4: Esquema de cuotas */}
            <Section
                title="Esquema de cuotas"
                action={<button className="btn btn-ghost btn-sm" onClick={addTramo}>+ Agregar tramo</button>}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px 36px', gap: '8px', padding: '0 4px', marginBottom: '8px' }}>
                    <span style={labelSt}>Etiqueta del tramo</span>
                    <span style={labelSt}>Monto ($)</span>
                    <span style={labelSt}>Es promo</span>
                    <span />
                </div>
                {tramos.map((t, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px 36px', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <input className="form-input" value={t.label} onChange={e => updateTramo(i, 'label', e.target.value)} placeholder="Cuotas 2 a 6" style={{ padding: '8px 10px' }} />
                        <input className="form-input" type="number" value={t.monto} onChange={e => updateTramo(i, 'monto', e.target.value)} placeholder="435603" style={{ padding: '8px 10px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Toggle checked={t.es_promo} onChange={v => updateTramo(i, 'es_promo', v)} />
                            <span style={{ fontSize: '12px', color: '#8896a7' }}>{t.es_promo ? 'Sí' : 'No'}</span>
                        </div>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeTramo(i)} disabled={tramos.length <= 1}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                        </button>
                    </div>
                ))}
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f2f5' }}>
                    <FormGroup label="Texto de gastos no incluidos en la cuota">
                        <textarea className="form-textarea" value={plan.gastos_texto} onChange={e => setP('gastos_texto', e.target.value)} rows={2} />
                    </FormGroup>
                </div>
            </Section>

            {/* SECCIÓN 5: Promociones especiales */}
            <Section
                title="Promociones especiales"
                subtitle="Solo el administrador puede activarlas. Los vendedores las ven en modo solo lectura."
                action={<button className="btn btn-ghost btn-sm" onClick={addPromo}>+ Agregar promoción</button>}
            >
                {promos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#8896a7', fontSize: '13px' }}>
                        No hay promociones. Agregá una con el botón de arriba.
                    </div>
                )}
                {promos.map((p, i) => (
                    <div key={i} style={{
                        border: '1px solid #e2e6ec', borderRadius: '8px', padding: '14px 16px',
                        marginBottom: '10px', background: p.activa ? '#f0f8f0' : '#fafafa',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <FormGroup label="Título">
                                    <input className="form-input" value={p.titulo} onChange={e => updatePromo(i, 'titulo', e.target.value)} placeholder="50% off — primeros 3 meses de seguro" style={{ padding: '7px 10px' }} />
                                </FormGroup>
                                <FormGroup label="Descripción">
                                    <input className="form-input" value={p.descripcion} onChange={e => updatePromo(i, 'descripcion', e.target.value)} placeholder="Descripción breve..." style={{ padding: '7px 10px' }} />
                                </FormGroup>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
                                <Toggle checked={p.activa} onChange={v => updatePromo(i, 'activa', v)} />
                                <span style={{ fontSize: '11px', color: p.activa ? '#1a7a4a' : '#8896a7', fontWeight: '600' }}>
                                    {p.activa ? 'ACTIVA' : 'INACTIVA'}
                                </span>
                            </div>
                            <button className="btn btn-danger btn-sm btn-icon" style={{ marginTop: '2px' }} onClick={() => removePromo(i)}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </Section>

            {/* SECCIÓN 6: Observaciones */}
            <Section title="Observaciones">
                <FormGroup label="Notas para la cotización (visible al vendedor)">
                    <textarea
                        className="form-textarea"
                        value={plan.observaciones}
                        onChange={e => setP('observaciones', e.target.value)}
                        placeholder="Condiciones adicionales, aclaraciones especiales..."
                        rows={3}
                    />
                </FormGroup>
            </Section>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/admin/plan-ahorro')}>
                    Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving
                        ? <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Guardando...</>
                        : isEdit ? 'Guardar cambios' : 'Crear vehículo'
                    }
                </button>
            </div>
        </div>
    )
}

// ── Sub-componentes ──

function Section({ title, subtitle, children, action }) {
    return (
        <div style={{ background: 'white', border: '1px solid #e2e6ec', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,51,102,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
                <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '14px', fontWeight: '700', color: '#003366', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
                    {subtitle && <div style={{ fontSize: '12px', color: '#8896a7', marginTop: '2px' }}>{subtitle}</div>}
                </div>
                {action}
            </div>
            <div style={{ padding: '18px 20px' }}>{children}</div>
        </div>
    )
}

function FormGroup({ label, children }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {children}
        </div>
    )
}

function Toggle({ checked, onChange }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            style={{
                width: '36px', height: '20px',
                background: checked ? '#003366' : '#c8d0da',
                borderRadius: '10px', position: 'relative',
                transition: 'background .2s', flexShrink: 0,
                cursor: 'pointer', border: 'none', padding: 0,
            }}
        >
            <span style={{
                position: 'absolute', width: '14px', height: '14px',
                background: 'white', borderRadius: '50%',
                top: '3px', left: checked ? '19px' : '3px',
                transition: 'left .2s',
            }} />
        </button>
    )
}

const labelSt = {
    fontSize: '11px', fontWeight: '500', color: '#8896a7',
    textTransform: 'uppercase', letterSpacing: '0.05em',
}