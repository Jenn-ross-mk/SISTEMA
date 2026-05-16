import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmt } from '../../lib/pdfUtils'

const ESTADOS_CIVILES = ['Soltero', 'Concubino', 'Casado (legal)', 'Viudo', 'Divorciado (legal)']
const TIPOS_DOC = ['DNI', 'LC', 'LE', 'Pasaporte']
const CONDICIONES_IVA = ['Responsable Inscripto', 'Responsable No Inscripto', 'Monotributo', 'Consumidor Final', 'Exento', 'Inscripto sin percepción']
const TIPOS_ACTIVIDAD = ['Relación de dependencia', 'Comerciante', 'Independiente', 'Profesional', 'PyME', 'Jubilado', 'Ama de casa', 'Organismo público']
const TIPOS_FORMULARIO = [
    { value: 'hoja_datos', label: 'Hoja de datos — Persona Física' },
    { value: 'gpat', label: 'Solicitud de crédito GPAT' },
    { value: 'persona_juridica', label: 'Persona Jurídica' },
]

function numStr(n) { return n ? `#${String(n).padStart(3, '0')}` : '—' }

// Componente radio pills
function RadioGroup({ options, value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    style={{
                        background: value === opt ? '#003366' : '#f0f2f5',
                        color: value === opt ? 'white' : '#4a5568',
                        border: `0.5px solid ${value === opt ? '#003366' : '#d1d8e0'}`,
                        borderRadius: '5px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    {opt}
                </button>
            ))}
        </div>
    )
}

function SeccionHeader({ color = '#003366', icon, title, note }) {
    return (
        <div style={{ background: color, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            {icon}
            <span style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: "'Barlow Condensed', sans-serif" }}>{title}</span>
            {note && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.45)', marginLeft: 'auto' }}>{note}</span>}
        </div>
    )
}

function Campo({ label, required, children, span }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', gridColumn: span ? '1/-1' : undefined }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {label}{required && <span style={{ color: '#c0392b', marginLeft: '2px' }}>*</span>}
            </label>
            {children}
        </div>
    )
}

function Input({ value, onChange, placeholder, type = 'text', style }) {
    return (
        <input
            type={type}
            className="form-input"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={style}
        />
    )
}

function Select({ value, onChange, options }) {
    return (
        <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Seleccionar...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    )
}

function DocInput({ tipo, numero, onTipo, onNumero }) {
    return (
        <div style={{ display: 'flex', gap: '6px' }}>
            <select className="form-select" style={{ width: '80px', flexShrink: 0 }} value={tipo || ''} onChange={e => onTipo(e.target.value)}>
                {TIPOS_DOC.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input className="form-input" value={numero || ''} onChange={e => onNumero(e.target.value)} />
        </div>
    )
}

// ---- Secciones del formulario ----

function SeccionHojaDatos({ f, set }) {
    const casado = f.estado_civil === 'Casado (legal)' || f.estado_civil === 'Concubino'
    return (
        <>
            {/* Datos personales */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
                <SeccionHeader title="Datos personales" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Apellido y nombre completo" required span><Input value={f.apellido_nombre} onChange={v => set('apellido_nombre', v)} /></Campo>
                    <Campo label="Tipo y N° documento" required>
                        <DocInput tipo={f.tipo_doc} numero={f.nro_doc} onTipo={v => set('tipo_doc', v)} onNumero={v => set('nro_doc', v)} />
                    </Campo>
                    <Campo label="Fecha de nacimiento"><Input value={f.fecha_nacimiento} onChange={v => set('fecha_nacimiento', v)} /></Campo>
                    <Campo label="Domicilio real" required span><Input value={f.domicilio} onChange={v => set('domicilio', v)} /></Campo>
                    <Campo label="Profesión u oficio" required><Input value={f.profesion} onChange={v => set('profesion', v)} /></Campo>
                    <Campo label="Lugar de trabajo"><Input value={f.lugar_trabajo} onChange={v => set('lugar_trabajo', v)} /></Campo>
                    <Campo label="Teléfono fijo"><Input value={f.tel_fijo} onChange={v => set('tel_fijo', v)} /></Campo>
                    <Campo label="Celular" required><Input value={f.celular} onChange={v => set('celular', v)} /></Campo>
                    <Campo label="Correo electrónico" required span><Input value={f.email} onChange={v => set('email', v)} type="email" /></Campo>
                    <Campo label="Estado civil" required span>
                        <RadioGroup options={ESTADOS_CIVILES} value={f.estado_civil} onChange={v => set('estado_civil', v)} />
                    </Campo>
                </div>
            </div>

            {/* Cónyuge */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#1a4d88" title="Datos del cónyuge" note="Solo si casado / concubino" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Apellido y nombre" span><Input value={f.conyuge_nombre} onChange={v => set('conyuge_nombre', v)} /></Campo>
                    <Campo label="Tipo y N° documento">
                        <DocInput tipo={f.conyuge_tipo_doc} numero={f.conyuge_nro_doc} onTipo={v => set('conyuge_tipo_doc', v)} onNumero={v => set('conyuge_nro_doc', v)} />
                    </Campo>
                </div>
            </div>

            {/* OnStar */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#444444" title="OnStar — personas de referencia" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.94 3.19 2 2 0 0 1 3.9 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Dato 1 — apellido y nombre"><Input value={f.onstar1_nombre} onChange={v => set('onstar1_nombre', v)} /></Campo>
                    <Campo label="Teléfono"><Input value={f.onstar1_tel} onChange={v => set('onstar1_tel', v)} /></Campo>
                    <Campo label="Dato 2 — apellido y nombre"><Input value={f.onstar2_nombre} onChange={v => set('onstar2_nombre', v)} /></Campo>
                    <Campo label="Teléfono"><Input value={f.onstar2_tel} onChange={v => set('onstar2_tel', v)} /></Campo>
                </div>
            </div>

            {/* Cédula azul */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#444444" title="Solicitud de cédula azul" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        { key: 'cedula_sin_cargo', label: 'Sin cargo' },
                        { key: 'cedula_con_cargo_1', label: 'Con cargo' },
                        { key: 'cedula_con_cargo_2', label: 'Con cargo' },
                    ].map(({ key, label }) => (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: '8px', alignItems: 'end' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#8896a7', paddingBottom: '8px' }}>{label}</div>
                            <Campo label="Apellido y nombre"><Input value={f[`${key}_nombre`]} onChange={v => set(`${key}_nombre`, v)} /></Campo>
                            <Campo label="DNI"><Input value={f[`${key}_dni`]} onChange={v => set(`${key}_dni`, v)} /></Campo>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}

function SeccionGPAT({ f, set }) {
    return (
        <>
            {/* Datos solicitante */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
                <SeccionHeader title="Datos del solicitante" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Apellido" required><Input value={f.apellido} onChange={v => set('apellido', v)} /></Campo>
                    <Campo label="Nombre" required><Input value={f.nombre} onChange={v => set('nombre', v)} /></Campo>
                    <Campo label="Tipo doc.">
                        <select className="form-select" value={f.tipo_doc || 'DNI'} onChange={e => set('tipo_doc', e.target.value)}>
                            {TIPOS_DOC.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </Campo>
                    <Campo label="N° documento" required><Input value={f.nro_doc} onChange={v => set('nro_doc', v)} /></Campo>
                    <Campo label="Fecha de nacimiento"><Input value={f.fecha_nacimiento} onChange={v => set('fecha_nacimiento', v)} /></Campo>
                    <Campo label="CUIL/CUIT"><Input value={f.cuil} onChange={v => set('cuil', v)} /></Campo>
                    <Campo label="Condición IVA" required span>
                        <RadioGroup options={CONDICIONES_IVA} value={f.condicion_iva} onChange={v => set('condicion_iva', v)} />
                    </Campo>
                    <Campo label="Estado civil" required span>
                        <RadioGroup options={['Soltero', 'Casado', 'Viudo', 'Separado']} value={f.estado_civil} onChange={v => set('estado_civil', v)} />
                    </Campo>
                    <Campo label="Hijos (cantidad)"><Input value={f.hijos} onChange={v => set('hijos', v)} /></Campo>
                    <Campo label="Profesión u ocupación" required><Input value={f.profesion} onChange={v => set('profesion', v)} /></Campo>
                </div>
            </div>

            {/* Domicilio */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#1a4d88" title="Domicilio" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px', gap: '10px' }}>
                    <Campo label="Calle" required><Input value={f.calle} onChange={v => set('calle', v)} /></Campo>
                    <Campo label="Número" required><Input value={f.numero_dom} onChange={v => set('numero_dom', v)} /></Campo>
                    <Campo label="Piso"><Input value={f.piso} onChange={v => set('piso', v)} /></Campo>
                    <Campo label="Depto"><Input value={f.depto} onChange={v => set('depto', v)} /></Campo>
                    <Campo label="Localidad" required style={{ gridColumn: '1/3' }}><Input value={f.localidad} onChange={v => set('localidad', v)} /></Campo>
                    <Campo label="Provincia"><Input value={f.provincia} onChange={v => set('provincia', v)} /></Campo>
                    <Campo label="Cód. postal"><Input value={f.cp} onChange={v => set('cp', v)} /></Campo>
                    <Campo label="Tel. fijo" style={{ gridColumn: '1/3' }}><Input value={f.tel_fijo} onChange={v => set('tel_fijo', v)} /></Campo>
                    <Campo label="Celular" required style={{ gridColumn: '3/5' }}><Input value={f.celular} onChange={v => set('celular', v)} /></Campo>
                    <Campo label="Correo electrónico" required span><Input value={f.email} onChange={v => set('email', v)} type="email" /></Campo>
                </div>
            </div>

            {/* Empleo solicitante */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#0f6e56" title="Ingresos y actividad — solicitante" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Tipo de actividad" required span>
                        <RadioGroup options={TIPOS_ACTIVIDAD} value={f.tipo_actividad} onChange={v => set('tipo_actividad', v)} />
                    </Campo>
                    <Campo label="Nombre o razón social del empleador" required span><Input value={f.empleador} onChange={v => set('empleador', v)} /></Campo>
                    <Campo label="Teléfono laboral"><Input value={f.tel_laboral} onChange={v => set('tel_laboral', v)} /></Campo>
                    <Campo label="Ingreso mensual neto" required><Input value={f.ingreso_neto} onChange={v => set('ingreso_neto', v)} /></Campo>
                    <Campo label="Fecha de ingreso" required><Input value={f.fecha_ingreso} onChange={v => set('fecha_ingreso', v)} /></Campo>
                    <Campo label="Antigüedad"><Input value={f.antiguedad} onChange={v => set('antiguedad', v)} /></Campo>
                    <Campo label="Otra actividad" span><Input value={f.otra_actividad} onChange={v => set('otra_actividad', v)} /></Campo>
                </div>
            </div>

            {/* Empleo cónyuge */}
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#0f6e56" title="Datos del cónyuge — empleo" note="Solo si casado" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Apellido y nombre" span><Input value={f.conyuge_nombre} onChange={v => set('conyuge_nombre', v)} /></Campo>
                    <Campo label="Tipo y N° documento">
                        <DocInput tipo={f.conyuge_tipo_doc} numero={f.conyuge_nro_doc} onTipo={v => set('conyuge_tipo_doc', v)} onNumero={v => set('conyuge_nro_doc', v)} />
                    </Campo>
                    <Campo label="CUIL/CUIT"><Input value={f.conyuge_cuil} onChange={v => set('conyuge_cuil', v)} /></Campo>
                    <Campo label="Tipo de actividad" required span>
                        <RadioGroup options={TIPOS_ACTIVIDAD} value={f.conyuge_tipo_actividad} onChange={v => set('conyuge_tipo_actividad', v)} />
                    </Campo>
                    <Campo label="Nombre o razón social" required span><Input value={f.conyuge_empleador} onChange={v => set('conyuge_empleador', v)} /></Campo>
                    <Campo label="Teléfono"><Input value={f.conyuge_tel} onChange={v => set('conyuge_tel', v)} /></Campo>
                    <Campo label="Ingreso mensual neto" required><Input value={f.conyuge_ingreso} onChange={v => set('conyuge_ingreso', v)} /></Campo>
                    <Campo label="Fecha de ingreso" required><Input value={f.conyuge_fecha_ingreso} onChange={v => set('conyuge_fecha_ingreso', v)} /></Campo>
                    <Campo label="Antigüedad"><Input value={f.conyuge_antiguedad} onChange={v => set('conyuge_antiguedad', v)} /></Campo>
                    <Campo label="Otra actividad"><Input value={f.conyuge_otra_actividad} onChange={v => set('conyuge_otra_actividad', v)} /></Campo>
                </div>
            </div>
        </>
    )
}

function SeccionPersonaJuridica({ f, set }) {
    return (
        <>
            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
                <SeccionHeader title="Datos de la empresa" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Razón social" required span><Input value={f.razon_social} onChange={v => set('razon_social', v)} /></Campo>
                    <Campo label="CUIT" required span><Input value={f.cuit} onChange={v => set('cuit', v)} /></Campo>
                    <Campo label="Domicilio" required span><Input value={f.domicilio} onChange={v => set('domicilio', v)} /></Campo>
                    <Campo label="Apoderado" required span><Input value={f.apoderado} onChange={v => set('apoderado', v)} /></Campo>
                </div>
            </div>

            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#1a4d88" title="Datos del apoderado" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Campo label="Apellido" required><Input value={f.apod_apellido} onChange={v => set('apod_apellido', v)} /></Campo>
                    <Campo label="Nombre" required><Input value={f.apod_nombre} onChange={v => set('apod_nombre', v)} /></Campo>
                    <Campo label="N° documento" required>
                        <DocInput tipo={f.apod_tipo_doc} numero={f.apod_nro_doc} onTipo={v => set('apod_tipo_doc', v)} onNumero={v => set('apod_nro_doc', v)} />
                    </Campo>
                    <Campo label="Fecha de nacimiento"><Input value={f.apod_fecha_nac} onChange={v => set('apod_fecha_nac', v)} /></Campo>
                    <Campo label="Teléfono" required><Input value={f.apod_tel} onChange={v => set('apod_tel', v)} /></Campo>
                    <Campo label="Email" required><Input value={f.apod_email} onChange={v => set('apod_email', v)} type="email" /></Campo>
                    <Campo label="Código postal"><Input value={f.apod_cp} onChange={v => set('apod_cp', v)} /></Campo>
                    <Campo label="CUIL/CUIT"><Input value={f.apod_cuil} onChange={v => set('apod_cuil', v)} /></Campo>
                    <Campo label="Estado civil" required span>
                        <RadioGroup options={['Soltero', 'Casado', 'Viudo', 'Separado']} value={f.apod_estado_civil} onChange={v => set('apod_estado_civil', v)} />
                    </Campo>
                </div>
            </div>

            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' }}>
                <SeccionHeader color="#444444" title="Documentación requerida" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>} />
                <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '12px', color: '#8896a7' }}>Se deberá adjuntar: constitución social, estatuto completo y poder correspondiente (si aplica).</p>
                </div>
            </div>
        </>
    )
}

// ---- Modal principal ----

function FormModal({ cotizaciones, onClose, onSave }) {
    const { profile } = useAuth()
    const [tipo, setTipo] = useState('hoja_datos')
    const [cotizacionId, setCotizacionId] = useState('')
    const [adjuntos, setAdjuntos] = useState([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [fields, setFields] = useState({})

    function set(k, v) { setFields(p => ({ ...p, [k]: v })) }

    function handleFile(e) {
        setAdjuntos(prev => [...prev, ...Array.from(e.target.files)])
    }

    async function handleSubmit(estado) {
        // Validación mínima
        const nombre = fields.apellido_nombre || (fields.apellido && fields.nombre ? `${fields.apellido}, ${fields.nombre}` : '') || fields.razon_social || ''
        if (!nombre) { setError('El nombre / razón social es requerido'); return }
        setSaving(true)
        setError('')
        try {
            const cotizacionElegida = cotizaciones.find(c => c.id === cotizacionId)
            const adjuntosUrls = []
            for (const file of adjuntos) {
                const ext = file.name.split('.').pop()
                const path = `${profile.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
                const { error: uploadErr } = await supabase.storage.from('formularios').upload(path, file)
                if (uploadErr) throw uploadErr
                const { data: { publicUrl } } = supabase.storage.from('formularios').getPublicUrl(path)
                adjuntosUrls.push(publicUrl)
            }

            const payload = {
                vendedor_id: profile.id,
                vendedor_nombre: profile.nombre,
                estado,
                tipo_formulario: tipo,
                apellido_nombre: nombre,
                cotizacion_id: cotizacionId || null,
                cotizacion_numero: cotizacionElegida?.numero || null,
                cotizacion_descripcion: cotizacionElegida
                    ? `${cotizacionElegida.cliente_nombre} — ${cotizacionElegida.vehiculo_descripcion} — $${fmt(cotizacionElegida.saldo_efectivo)}`
                    : null,
                datos: fields,
                adjuntos_urls: adjuntosUrls,
            }

            const { error: err } = await supabase.from('formularios').insert(payload)
            if (err) throw err
            onSave()
        } catch (err) {
            console.error(err)
            setError('Error al guardar: ' + err.message)
        }
        setSaving(false)
    }

    const cotizacionElegida = cotizaciones.find(c => c.id === cotizacionId)

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="modal" style={{ maxWidth: '820px' }}>
                <div className="modal-header">
                    <h2>Nuevo formulario</h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Tipo */}
                    <div className="form-group">
                        <label className="form-label">Tipo de formulario *</label>
                        <select className="form-select" value={tipo} onChange={e => { setTipo(e.target.value); setFields({}) }}>
                            {TIPOS_FORMULARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Cotización vinculada */}
                    <div style={{ background: '#f0f4fa', border: '1px solid #d0daea', borderRadius: '8px', padding: '10px 14px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Cotización vinculada (opcional)</label>
                        <select className="form-select" value={cotizacionId} onChange={e => setCotizacionId(e.target.value)}>
                            <option value="">Seleccionar cotización...</option>
                            {cotizaciones.map(c => (
                                <option key={c.id} value={c.id}>
                                    {numStr(c.numero)} — {c.cliente_nombre} — {c.vehiculo_descripcion} — ${fmt(c.saldo_efectivo)}
                                </option>
                            ))}
                        </select>
                        {cotizacionElegida && (
                            <div style={{ marginTop: '7px', fontSize: '12px', color: '#003366', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span style={{ background: '#003366', color: 'white', borderRadius: '4px', padding: '1px 7px', fontFamily: 'monospace', fontWeight: '800', fontSize: '11px' }}>{numStr(cotizacionElegida.numero)}</span>
                                {cotizacionElegida.cliente_nombre} · {cotizacionElegida.vehiculo_descripcion} · ${fmt(cotizacionElegida.saldo_efectivo)}
                            </div>
                        )}
                    </div>

                    {/* Secciones según tipo */}
                    {tipo === 'hoja_datos' && <SeccionHojaDatos f={fields} set={set} />}
                    {tipo === 'gpat' && <SeccionGPAT f={fields} set={set} />}
                    {tipo === 'persona_juridica' && <SeccionPersonaJuridica f={fields} set={set} />}

                    {/* Adjuntos */}
                    <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                        <SeccionHeader color="#444444" title="Archivos adjuntos (opcional)" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>} />
                        <div style={{ padding: '12px 14px' }}>
                            {adjuntos.map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 9px', background: '#f8f9fb', borderRadius: '6px', border: '0.5px solid #e2e6ec', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '12px', flex: 1 }}>{f.name}</span>
                                    <span style={{ fontSize: '11px', color: '#8896a7' }}>{(f.size / 1024).toFixed(0)} KB</span>
                                    <button type="button" onClick={() => setAdjuntos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '16px' }}>×</button>
                                </div>
                            ))}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', background: '#f8f9fb', border: '1.5px dashed #c0c8d0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#8896a7' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Subir archivo(s)
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFile} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', borderRadius: '6px', color: '#c0392b', fontSize: '13px' }}>
                            {error}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => handleSubmit('borrador')}>
                        {saving ? 'Guardando...' : 'Guardar borrador'}
                    </button>
                    <button type="button" className="btn btn-primary" disabled={saving} onClick={() => handleSubmit('enviado')}>
                        {saving
                            ? <><div className="spinner" style={{ width: '15px', height: '15px', borderWidth: '2px', borderTopColor: 'white' }} /> Enviando...</>
                            : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> Enviar formulario</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---- Página principal vendedor ----

const BADGE = { borrador: 'badge-gold', enviado: 'badge-green' }
const LABEL = { borrador: 'Borrador', enviado: 'Enviado' }
const TIPO_LABEL = { hoja_datos: 'Hoja datos', gpat: 'GPAT', persona_juridica: 'P. Jurídica' }

export default function FormulariosPage() {
    const { profile } = useAuth()
    const isAdmin = profile?.rol === 'admin'
    const [formularios, setFormularios] = useState([])
    const [cotizaciones, setCotizaciones] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [toast, setToast] = useState(null)

    async function load() {
        const [{ data: f }, { data: c }] = await Promise.all([
            supabase.from('formularios').select('*')
                .eq('vendedor_id', profile.id)
                .order('created_at', { ascending: false }),
            supabase.from('cotizaciones').select('*')
                .eq('vendedor_id', profile.id)
                .order('created_at', { ascending: false }),
        ])
        setFormularios(f || [])
        setCotizaciones(c || [])
        setLoading(false)
    }

    useEffect(() => { if (profile) load() }, [profile])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    function handleSaved() {
        setShowModal(false)
        showToast('Formulario guardado correctamente')
        load()
    }

    if (loading) return <div className="loading-center"><div className="spinner" /></div>

    const total = formularios.length
    const pendientes = formularios.filter(f => f.estado === 'borrador').length
    const enviados = formularios.filter(f => f.estado === 'enviado').length

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>Formularios</h1>
                    <p style={{ color: '#8896a7', fontSize: '14px' }}>Completá y enviá hojas de datos del cliente</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo formulario
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
                {[['Mis formularios', total, '#003366'], ['Borradores', pendientes, '#8a6800'], ['Enviados', enviados, '#1a7a4a']].map(([label, val, color]) => (
                    <div key={label} style={{ background: 'white', border: '1px solid #e2e6ec', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,51,102,.05)' }}>
                        <div style={{ fontSize: '11px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: '600', marginBottom: '6px' }}>{label}</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{val}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,.06)' }}>
                {formularios.length === 0 ? (
                    <div className="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <p>No tenés formularios. <button onClick={() => setShowModal(true)} style={{ background: 'none', border: 'none', color: '#003366', cursor: 'pointer', fontWeight: '600', fontSize: 'inherit' }}>Crear el primero</button></p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Tipo</th>
                                    <th>Cliente / Razón social</th>
                                    <th>Cotización</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formularios.map(f => (
                                    <tr key={f.id}>
                                        <td><span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '12px', background: '#003366', color: 'white', borderRadius: '4px', padding: '2px 7px' }}>{numStr(f.numero)}</span></td>
                                        <td><span style={{ background: '#f0f2f5', color: '#4a5568', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>{TIPO_LABEL[f.tipo_formulario] || f.tipo_formulario}</span></td>
                                        <td style={{ fontWeight: '500' }}>{f.apellido_nombre || <span style={{ color: '#8896a7' }}>Sin nombre</span>}</td>
                                        <td>
                                            {f.cotizacion_numero
                                                ? <span style={{ background: '#e6edf5', color: '#003366', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}>{numStr(f.cotizacion_numero)}</span>
                                                : <span style={{ color: '#c0c8d0', fontSize: '12px' }}>—</span>
                                            }
                                        </td>
                                        <td><span className={`badge ${BADGE[f.estado] || 'badge-navy'}`}>{LABEL[f.estado] || f.estado}</span></td>
                                        <td style={{ fontSize: '12px', color: '#8896a7' }}>{new Date(f.created_at).toLocaleDateString('es-AR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <FormModal
                    cotizaciones={cotizaciones}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaved}
                />
            )}
        </div>
    )
}