import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { generatePDFFromElement, fmt } from "../../lib/pdfUtils";
import { useAuth } from "../../context/AuthContext";

const LOCALIDADES = ["Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel"];
const ESTADOS = { borrador: "Borrador", enviado: "Enviado" };
const BADGE = { borrador: "badge-gold", enviado: "badge-green" };
const TIPO_LABEL = {
    hoja_datos: "Hoja datos",
    gpat: "GPAT",
    persona_juridica: "P. Jurídica",
};
const TIPOS_FORMULARIO = [
    { value: "hoja_datos", label: "Hoja de datos — Persona Física" },
    { value: "gpat", label: "Solicitud de crédito GPAT" },
    { value: "persona_juridica", label: "Persona Jurídica" },
];
const TIPOS_DOC = ["DNI", "LC", "LE", "Pasaporte"];
const CONDICIONES_IVA = [
    "Responsable Inscripto",
    "Responsable No Inscripto",
    "Monotributo",
    "Consumidor Final",
    "Exento",
    "Inscripto sin percepción",
];
const TIPOS_ACTIVIDAD = [
    "Relación de dependencia",
    "Comerciante",
    "Independiente",
    "Profesional",
    "PyME",
    "Jubilado",
    "Ama de casa",
    "Organismo público",
];
const ESTADOS_CIVILES_FISICA = [
    "Soltero",
    "Concubino",
    "Casado (legal)",
    "Viudo",
    "Divorciado (legal)",
];
const ESTADOS_CIVILES_GPAT = ["Soltero", "Casado", "Viudo", "Separado"];

function numStr(n) {
    return n ? `#${String(n).padStart(3, "0")}` : "—";
}

function Fila({ label, value }) {
    if (!value) return null;
    return (
        <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", color: "#8896a7", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "2px" }}>
                {label}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a202c" }}>
                {value}
            </div>
        </div>
    );
}

function SeccionDetalle({ title, color = "#003366", children }) {
    return (
        <div style={{ background: "white", border: "0.5px solid #e2e6ec", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
            <div style={{ background: color, padding: "6px 13px" }}>
                <span style={{ color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {title}
                </span>
            </div>
            <div style={{ padding: "12px 13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {children}
            </div>
        </div>
    );
}

function RadioGroup({ options, value, onChange }) {
    return (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    style={{
                        background: value === opt ? "#003366" : "#f0f2f5",
                        color: value === opt ? "white" : "#4a5568",
                        border: `0.5px solid ${value === opt ? "#003366" : "#d1d8e0"}`,
                        borderRadius: "5px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                    }}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

function Campo({ label, required, children, span }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", gridColumn: span ? "1/-1" : undefined }}>
            <label style={{ fontSize: "10px", fontWeight: "700", color: "#8896a7", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {label}
                {required && <span style={{ color: "#c0392b", marginLeft: "2px" }}>*</span>}
            </label>
            {children}
        </div>
    );
}

function ShHead({ color, title, note }) {
    return (
        <div style={{ background: color, padding: "7px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "white", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Barlow Condensed', sans-serif" }}>
                {title}
            </span>
            {note && <span style={{ fontSize: "10px", color: "rgba(255,255,255,.45)" }}>{note}</span>}
        </div>
    );
}

function buildPDFHTML(f) {
    const d = f.datos || {};
    const tipo = f.tipo_formulario;
    const isGPAT = tipo === "gpat";
    const isJuridica = tipo === "persona_juridica";
    const tipoLabel = TIPO_LABEL[tipo] || tipo;

    const row = (label, value) =>
        value
            ? `<div style="margin-bottom:8px;">
      <div style="font-size:10px;color:#8896a7;text-transform:uppercase;letter-spacing:.05em;margin-bottom:1px;">${label}</div>
      <div style="font-size:13px;font-weight:600;color:#1a202c;">${value}</div>
    </div>`
            : "";

    const seccion = (title, color, content) => `
    <div style="background:white;border:0.5px solid #e2e6ec;border-radius:8px;overflow:hidden;margin-bottom:10px;">
      <div style="background:${color};padding:6px 13px;">
        <span style="color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-family:'Barlow Condensed',sans-serif;">${title}</span>
      </div>
      <div style="padding:12px 13px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">${content}</div>
    </div>`;

    let body = "";

    if (isGPAT) {
        body += seccion("Datos del solicitante", "#003366", `
      ${row("Apellido y nombre", `${d.apellido || ""} ${d.nombre || ""}`)}
      ${row("Tipo y N° documento", `${d.tipo_doc || "DNI"} ${d.nro_doc || ""}`)}
      ${row("Fecha de nacimiento", d.fecha_nacimiento)}
      ${row("CUIL/CUIT", d.cuil)}
      ${row("Condición IVA", d.condicion_iva)}
      ${row("Estado civil", d.estado_civil)}
      ${row("Hijos", d.hijos)}
      ${row("Profesión u ocupación", d.profesion)}
    `);
        body += seccion("Domicilio", "#1a4d88", `
      ${row("Calle y número", `${d.calle || ""} ${d.numero_dom || ""}`)}
      ${row("Piso / Depto", `${d.piso || ""} ${d.depto || ""}`)}
      ${row("Localidad", d.localidad)}
      ${row("Provincia", d.provincia)}
      ${row("Cód. postal", d.cp)}
      ${row("Tel. fijo", d.tel_fijo)}
      ${row("Celular", d.celular)}
      ${row("Email", d.email)}
    `);
        body += seccion("Ingresos y actividad — solicitante", "#0f6e56", `
      ${row("Tipo de actividad", d.tipo_actividad)}
      ${row("Empleador", d.empleador)}
      ${row("Tel. laboral", d.tel_laboral)}
      ${row("Ingreso mensual neto", d.ingreso_neto)}
      ${row("Fecha de ingreso", d.fecha_ingreso)}
      ${row("Antigüedad", d.antiguedad)}
      ${row("Otra actividad", d.otra_actividad)}
    `);
        if (d.conyuge_nombre || d.conyuge_empleador) {
            body += seccion("Datos del cónyuge — empleo", "#0f6e56", `
        ${row("Apellido y nombre", d.conyuge_nombre)}
        ${row("Documento", `${d.conyuge_tipo_doc || ""} ${d.conyuge_nro_doc || ""}`)}
        ${row("CUIL/CUIT", d.conyuge_cuil)}
        ${row("Tipo de actividad", d.conyuge_tipo_actividad)}
        ${row("Empleador", d.conyuge_empleador)}
        ${row("Ingreso mensual neto", d.conyuge_ingreso)}
        ${row("Fecha de ingreso", d.conyuge_fecha_ingreso)}
        ${row("Antigüedad", d.conyuge_antiguedad)}
        ${row("Otra actividad", d.conyuge_otra_actividad)}
      `);
        }
    } else if (isJuridica) {
        body += seccion("Datos de la empresa", "#003366", `
      ${row("Razón social", d.razon_social)}
      ${row("CUIT", d.cuit)}
      ${row("Domicilio", d.domicilio)}
      ${row("Apoderado", d.apoderado)}
    `);
        body += seccion("Datos del apoderado", "#1a4d88", `
      ${row("Apellido", d.apod_apellido)}
      ${row("Nombre", d.apod_nombre)}
      ${row("Documento", `${d.apod_tipo_doc || "DNI"} ${d.apod_nro_doc || ""}`)}
      ${row("Fecha de nacimiento", d.apod_fecha_nac)}
      ${row("Teléfono", d.apod_tel)}
      ${row("Email", d.apod_email)}
      ${row("Código postal", d.apod_cp)}
      ${row("CUIL/CUIT", d.apod_cuil)}
      ${row("Estado civil", d.apod_estado_civil)}
    `);
    } else {
        body += seccion("Datos personales", "#003366", `
      ${row("Apellido y nombre", d.apellido_nombre)}
      ${row("Tipo y N° documento", `${d.tipo_doc || "DNI"} ${d.nro_doc || ""}`)}
      ${row("Fecha de nacimiento", d.fecha_nacimiento)}
      ${row("Estado civil", d.estado_civil)}
      ${row("Profesión u oficio", d.profesion)}
      ${row("Lugar de trabajo", d.lugar_trabajo)}
      ${row("Tel. fijo", d.tel_fijo)}
      ${row("Celular", d.celular)}
      ${row("Domicilio real", d.domicilio)}
      ${row("Email", d.email)}
    `);
        if (d.conyuge_nombre) {
            body += seccion("Datos del cónyuge", "#1a4d88", `
        ${row("Apellido y nombre", d.conyuge_nombre)}
        ${row("Documento", `${d.conyuge_tipo_doc || ""} ${d.conyuge_nro_doc || ""}`)}
      `);
        }
        if (d.onstar1_nombre || d.onstar2_nombre) {
            body += seccion("OnStar — personas de referencia", "#444444", `
        ${row("Dato 1 — nombre", d.onstar1_nombre)}
        ${row("Dato 1 — teléfono", d.onstar1_tel)}
        ${row("Dato 2 — nombre", d.onstar2_nombre)}
        ${row("Dato 2 — teléfono", d.onstar2_tel)}
      `);
        }
        const cedulas = [
            d.cedula_sin_cargo_nombre && `Sin cargo: ${d.cedula_sin_cargo_nombre} — DNI: ${d.cedula_sin_cargo_dni || ""}`,
            d.cedula_con_cargo_1_nombre && `Con cargo: ${d.cedula_con_cargo_1_nombre} — DNI: ${d.cedula_con_cargo_1_dni || ""}`,
            d.cedula_con_cargo_2_nombre && `Con cargo: ${d.cedula_con_cargo_2_nombre} — DNI: ${d.cedula_con_cargo_2_dni || ""}`,
        ].filter(Boolean);
        if (cedulas.length) {
            body += `
        <div style="background:white;border:0.5px solid #e2e6ec;border-radius:8px;overflow:hidden;margin-bottom:10px;">
          <div style="background:#444;padding:6px 13px;"><span style="color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-family:'Barlow Condensed',sans-serif;">Solicitud de cédula azul</span></div>
          <div style="padding:12px 13px;">${cedulas.map((c) => `<div style="font-size:12px;margin-bottom:5px;">${c}</div>`).join("")}</div>
        </div>`;
        }
    }

    return `
    <div style="background:white;width:900px;font-family:'Barlow',sans-serif;padding:0;">
      <div style="background:#003366;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:12px 12px 0 0;">
        <div style="color:white;font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:700;letter-spacing:.06em;">AKAR</div>
        <div style="color:rgba(255,255,255,.7);font-size:13px;text-align:right;">
          <div style="font-size:16px;font-weight:700;color:white;">${tipoLabel} ${numStr(f.numero)}</div>
          <div>${new Date(f.created_at).toLocaleDateString("es-AR")}</div>
          <div style="margin-top:2px;">Vendedor: ${f.vendedor_nombre}</div>
        </div>
      </div>
      <div style="border:1px solid #e2e6ec;border-top:none;border-radius:0 0 12px 12px;padding:16px 20px;">
        ${f.cotizacion_numero
            ? `<div style="background:#f0f4fa;border:1px solid #d0daea;border-radius:8px;padding:9px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
          <div style="background:#003366;color:white;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:800;font-family:monospace;">${numStr(f.cotizacion_numero)}</div>
          <div style="font-size:13px;color:#1a202c;">${f.cotizacion_descripcion || ""}</div>
        </div>`
            : ""
        }
        ${body}
        <div style="border-top:0.5px solid #e2e6ec;margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;font-size:11px;color:#8896a7;">
          <span>Formulario ${numStr(f.numero)} · ${tipoLabel}</span>
          <span>Enviado por ${f.vendedor_nombre} el ${new Date(f.created_at).toLocaleString("es-AR")}</span>
        </div>
      </div>
    </div>`;
}

function PanelDetalle({ f, onClose, onDownload, downloadingId }) {
    const d = f.datos || {}
    const tipo = f.tipo_formulario
    const isGPAT = tipo === 'gpat'
    const isJuridica = tipo === 'persona_juridica'

    return (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,.06)', position: 'sticky', top: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e6ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '17px', fontWeight: '700', color: '#003366' }}>{TIPO_LABEL[tipo] || tipo}</h3>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '11px', background: '#003366', color: 'white', borderRadius: '4px', padding: '2px 6px' }}>{numStr(f.numero)}</span>
                    <span className={`badge ${BADGE[f.estado] || 'badge-navy'}`}>{ESTADOS[f.estado]}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => onDownload(f)} className="btn btn-ghost btn-sm" disabled={downloadingId === f.id}>
                        {downloadingId === f.id
                            ? <div className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} />
                            : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> PDF</>
                        }
                    </button>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            </div>

            <div style={{ padding: '14px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <Fila label="Vendedor" value={f.vendedor_nombre} />
                    <Fila label="Enviado" value={new Date(f.created_at).toLocaleString('es-AR')} />
                </div>

                {f.cotizacion_numero && (
                    <div style={{ background: '#f0f4fa', border: '1px solid #d0daea', borderRadius: '7px', padding: '8px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '11px', background: '#003366', color: 'white', borderRadius: '4px', padding: '2px 6px' }}>{numStr(f.cotizacion_numero)}</span>
                        <span style={{ fontSize: '12px', color: '#1a202c' }}>{f.cotizacion_descripcion}</span>
                    </div>
                )}

                {!isGPAT && !isJuridica && (
                    <>
                        <SeccionDetalle title="Datos personales">
                            <Fila label="Apellido y nombre" value={d.apellido_nombre} />
                            <Fila label="Documento" value={`${d.tipo_doc || 'DNI'} ${d.nro_doc || ''}`} />
                            <Fila label="Fecha de nacimiento" value={d.fecha_nacimiento} />
                            <Fila label="Estado civil" value={d.estado_civil} />
                            <Fila label="Profesión u oficio" value={d.profesion} />
                            <Fila label="Lugar de trabajo" value={d.lugar_trabajo} />
                            <Fila label="Celular" value={d.celular} />
                            <Fila label="Tel. fijo" value={d.tel_fijo} />
                            <div style={{ gridColumn: '1/-1' }}><Fila label="Domicilio real" value={d.domicilio} /></div>
                            <div style={{ gridColumn: '1/-1' }}><Fila label="Email" value={d.email} /></div>
                        </SeccionDetalle>
                        {d.conyuge_nombre && (
                            <SeccionDetalle title="Cónyuge" color="#1a4d88">
                                <Fila label="Apellido y nombre" value={d.conyuge_nombre} />
                                <Fila label="Documento" value={`${d.conyuge_tipo_doc || ''} ${d.conyuge_nro_doc || ''}`} />
                            </SeccionDetalle>
                        )}
                        {(d.onstar1_nombre || d.onstar2_nombre) && (
                            <SeccionDetalle title="OnStar" color="#444444">
                                <Fila label="Dato 1" value={d.onstar1_nombre} />
                                <Fila label="Teléfono" value={d.onstar1_tel} />
                                <Fila label="Dato 2" value={d.onstar2_nombre} />
                                <Fila label="Teléfono" value={d.onstar2_tel} />
                            </SeccionDetalle>
                        )}
                    </>
                )}

                {isGPAT && (
                    <>
                        <SeccionDetalle title="Datos del solicitante">
                            <Fila label="Apellido y nombre" value={`${d.apellido || ''} ${d.nombre || ''}`} />
                            <Fila label="Documento" value={`${d.tipo_doc || 'DNI'} ${d.nro_doc || ''}`} />
                            <Fila label="CUIL/CUIT" value={d.cuil} />
                            <Fila label="Estado civil" value={d.estado_civil} />
                            <Fila label="Condición IVA" value={d.condicion_iva} />
                            <Fila label="Profesión" value={d.profesion} />
                            <Fila label="Celular" value={d.celular} />
                            <Fila label="Email" value={d.email} />
                            <div style={{ gridColumn: '1/-1' }}><Fila label="Domicilio" value={`${d.calle || ''} ${d.numero_dom || ''}, ${d.localidad || ''}`} /></div>
                        </SeccionDetalle>
                        <SeccionDetalle title="Empleo — solicitante" color="#0f6e56">
                            <Fila label="Actividad" value={d.tipo_actividad} />
                            <Fila label="Empleador" value={d.empleador} />
                            <Fila label="Ingreso neto" value={d.ingreso_neto} />
                            <Fila label="Fecha ingreso" value={d.fecha_ingreso} />
                            <Fila label="Antigüedad" value={d.antiguedad} />
                        </SeccionDetalle>
                        {d.conyuge_nombre && (
                            <SeccionDetalle title="Cónyuge — empleo" color="#0f6e56">
                                <Fila label="Nombre" value={d.conyuge_nombre} />
                                <Fila label="Actividad" value={d.conyuge_tipo_actividad} />
                                <Fila label="Empleador" value={d.conyuge_empleador} />
                                <Fila label="Ingreso neto" value={d.conyuge_ingreso} />
                            </SeccionDetalle>
                        )}
                    </>
                )}

                {isJuridica && (
                    <>
                        <SeccionDetalle title="Empresa">
                            <Fila label="Razón social" value={d.razon_social} />
                            <Fila label="CUIT" value={d.cuit} />
                            <div style={{ gridColumn: '1/-1' }}><Fila label="Domicilio" value={d.domicilio} /></div>
                            <div style={{ gridColumn: '1/-1' }}><Fila label="Apoderado" value={d.apoderado} /></div>
                        </SeccionDetalle>
                        <SeccionDetalle title="Apoderado" color="#1a4d88">
                            <Fila label="Apellido y nombre" value={`${d.apod_apellido || ''} ${d.apod_nombre || ''}`} />
                            <Fila label="Documento" value={`${d.apod_tipo_doc || ''} ${d.apod_nro_doc || ''}`} />
                            <Fila label="Teléfono" value={d.apod_tel} />
                            <Fila label="Email" value={d.apod_email} />
                            <Fila label="Estado civil" value={d.apod_estado_civil} />
                        </SeccionDetalle>
                    </>
                )}

                {f.adjuntos_urls?.length > 0 && (
                    <div style={{ borderTop: '1px solid #e2e6ec', paddingTop: '10px', marginTop: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#8896a7', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: '700', marginBottom: '8px' }}>Archivos adjuntos</div>
                        {f.adjuntos_urls.map((url, i) => {
                            const name = url.split('/').pop().split('?')[0]
                            return (
                                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 9px', background: '#f8f9fb', borderRadius: '6px', border: '0.5px solid #e2e6ec', textDecoration: 'none', marginBottom: '5px' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003366" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    <span style={{ fontSize: '12px', color: '#003366', fontWeight: '500', flex: 1 }}>{name}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8896a7" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                </a>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

function AdminFormModal({ cotizaciones, onClose, onSave, profile }) {
    const [tipo, setTipo] = useState('hoja_datos')
    const [cotizacionId, setCotizacionId] = useState('')
    const [adjuntos, setAdjuntos] = useState([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [fields, setFields] = useState({})

    function set(k, v) { setFields(p => ({ ...p, [k]: v })) }

    async function handleSubmit(estado) {
        const nombre = fields.apellido_nombre
            || (fields.apellido && fields.nombre ? `${fields.apellido}, ${fields.nombre}` : '')
            || fields.razon_social || ''
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

                    <div className="form-group">
                        <label className="form-label">Tipo de formulario *</label>
                        <select className="form-select" value={tipo} onChange={e => { setTipo(e.target.value); setFields({}) }}>
                            {TIPOS_FORMULARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>

                    <div style={{ background: '#f0f4fa', border: '1px solid #d0daea', borderRadius: '8px', padding: '10px 14px' }}>
                        <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Cotización vinculada (opcional)</label>
                        <select className="form-select" value={cotizacionId} onChange={e => setCotizacionId(e.target.value)}>
                            <option value="">Seleccionar cotización...</option>
                            {cotizaciones.map(c => (
                                <option key={c.id} value={c.id}>{numStr(c.numero)} — {c.cliente_nombre} — {c.vehiculo_descripcion} — ${fmt(c.saldo_efectivo)}</option>
                            ))}
                        </select>
                        {cotizacionElegida && (
                            <div style={{ marginTop: '7px', fontSize: '12px', color: '#003366', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span style={{ background: '#003366', color: 'white', borderRadius: '4px', padding: '1px 7px', fontFamily: 'monospace', fontWeight: '800', fontSize: '11px' }}>{numStr(cotizacionElegida.numero)}</span>
                                {cotizacionElegida.cliente_nombre} · {cotizacionElegida.vehiculo_descripcion}
                            </div>
                        )}
                    </div>

                    {tipo === 'hoja_datos' && (
                        <>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#003366" title="Datos personales" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Apellido y nombre completo" required span><input className="form-input" value={fields.apellido_nombre || ''} onChange={e => set('apellido_nombre', e.target.value)} /></Campo>
                                    <Campo label="Tipo y N° documento" required>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select className="form-select" style={{ width: '80px', flexShrink: 0 }} value={fields.tipo_doc || 'DNI'} onChange={e => set('tipo_doc', e.target.value)}>{TIPOS_DOC.map(d => <option key={d}>{d}</option>)}</select>
                                            <input className="form-input" value={fields.nro_doc || ''} onChange={e => set('nro_doc', e.target.value)} />
                                        </div>
                                    </Campo>
                                    <Campo label="Fecha de nacimiento"><input className="form-input" value={fields.fecha_nacimiento || ''} onChange={e => set('fecha_nacimiento', e.target.value)} /></Campo>
                                    <Campo label="Domicilio real" required span><input className="form-input" value={fields.domicilio || ''} onChange={e => set('domicilio', e.target.value)} /></Campo>
                                    <Campo label="Profesión u oficio" required><input className="form-input" value={fields.profesion || ''} onChange={e => set('profesion', e.target.value)} /></Campo>
                                    <Campo label="Lugar de trabajo"><input className="form-input" value={fields.lugar_trabajo || ''} onChange={e => set('lugar_trabajo', e.target.value)} /></Campo>
                                    <Campo label="Teléfono fijo"><input className="form-input" value={fields.tel_fijo || ''} onChange={e => set('tel_fijo', e.target.value)} /></Campo>
                                    <Campo label="Celular" required><input className="form-input" value={fields.celular || ''} onChange={e => set('celular', e.target.value)} /></Campo>
                                    <Campo label="Correo electrónico" required span><input className="form-input" type="email" value={fields.email || ''} onChange={e => set('email', e.target.value)} /></Campo>
                                    <Campo label="Estado civil" required span><RadioGroup options={ESTADOS_CIVILES_FISICA} value={fields.estado_civil} onChange={v => set('estado_civil', v)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#1a4d88" title="Datos del cónyuge" note="Solo si casado / concubino" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Apellido y nombre" span><input className="form-input" value={fields.conyuge_nombre || ''} onChange={e => set('conyuge_nombre', e.target.value)} /></Campo>
                                    <Campo label="Tipo y N° documento">
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select className="form-select" style={{ width: '80px', flexShrink: 0 }} value={fields.conyuge_tipo_doc || 'DNI'} onChange={e => set('conyuge_tipo_doc', e.target.value)}>{TIPOS_DOC.map(d => <option key={d}>{d}</option>)}</select>
                                            <input className="form-input" value={fields.conyuge_nro_doc || ''} onChange={e => set('conyuge_nro_doc', e.target.value)} />
                                        </div>
                                    </Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#444444" title="OnStar — personas de referencia" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Dato 1 — apellido y nombre"><input className="form-input" value={fields.onstar1_nombre || ''} onChange={e => set('onstar1_nombre', e.target.value)} /></Campo>
                                    <Campo label="Teléfono"><input className="form-input" value={fields.onstar1_tel || ''} onChange={e => set('onstar1_tel', e.target.value)} /></Campo>
                                    <Campo label="Dato 2 — apellido y nombre"><input className="form-input" value={fields.onstar2_nombre || ''} onChange={e => set('onstar2_nombre', e.target.value)} /></Campo>
                                    <Campo label="Teléfono"><input className="form-input" value={fields.onstar2_tel || ''} onChange={e => set('onstar2_tel', e.target.value)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#444444" title="Solicitud de cédula azul" />
                                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[{ key: 'cedula_sin_cargo', label: 'Sin cargo' }, { key: 'cedula_con_cargo_1', label: 'Con cargo' }, { key: 'cedula_con_cargo_2', label: 'Con cargo' }].map(({ key, label }) => (
                                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: '8px', alignItems: 'end' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#8896a7', paddingBottom: '8px' }}>{label}</div>
                                            <Campo label="Apellido y nombre"><input className="form-input" value={fields[`${key}_nombre`] || ''} onChange={e => set(`${key}_nombre`, e.target.value)} /></Campo>
                                            <Campo label="DNI"><input className="form-input" value={fields[`${key}_dni`] || ''} onChange={e => set(`${key}_dni`, e.target.value)} /></Campo>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {tipo === 'gpat' && (
                        <>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#003366" title="Datos del solicitante" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Apellido" required><input className="form-input" value={fields.apellido || ''} onChange={e => set('apellido', e.target.value)} /></Campo>
                                    <Campo label="Nombre" required><input className="form-input" value={fields.nombre || ''} onChange={e => set('nombre', e.target.value)} /></Campo>
                                    <Campo label="Tipo doc."><select className="form-select" value={fields.tipo_doc || 'DNI'} onChange={e => set('tipo_doc', e.target.value)}>{TIPOS_DOC.map(d => <option key={d}>{d}</option>)}</select></Campo>
                                    <Campo label="N° documento" required><input className="form-input" value={fields.nro_doc || ''} onChange={e => set('nro_doc', e.target.value)} /></Campo>
                                    <Campo label="Fecha de nacimiento"><input className="form-input" value={fields.fecha_nacimiento || ''} onChange={e => set('fecha_nacimiento', e.target.value)} /></Campo>
                                    <Campo label="CUIL/CUIT"><input className="form-input" value={fields.cuil || ''} onChange={e => set('cuil', e.target.value)} /></Campo>
                                    <Campo label="Condición IVA" required span><RadioGroup options={CONDICIONES_IVA} value={fields.condicion_iva} onChange={v => set('condicion_iva', v)} /></Campo>
                                    <Campo label="Estado civil" required span><RadioGroup options={ESTADOS_CIVILES_GPAT} value={fields.estado_civil} onChange={v => set('estado_civil', v)} /></Campo>
                                    <Campo label="Hijos (cantidad)"><input className="form-input" value={fields.hijos || ''} onChange={e => set('hijos', e.target.value)} /></Campo>
                                    <Campo label="Profesión u ocupación" required><input className="form-input" value={fields.profesion || ''} onChange={e => set('profesion', e.target.value)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#1a4d88" title="Domicilio" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 80px 60px 60px', gap: '10px' }}>
                                    <Campo label="Calle" required><input className="form-input" value={fields.calle || ''} onChange={e => set('calle', e.target.value)} /></Campo>
                                    <Campo label="Número" required><input className="form-input" value={fields.numero_dom || ''} onChange={e => set('numero_dom', e.target.value)} /></Campo>
                                    <Campo label="Piso"><input className="form-input" value={fields.piso || ''} onChange={e => set('piso', e.target.value)} /></Campo>
                                    <Campo label="Depto"><input className="form-input" value={fields.depto || ''} onChange={e => set('depto', e.target.value)} /></Campo>
                                    <Campo label="Localidad" required><input className="form-input" value={fields.localidad || ''} onChange={e => set('localidad', e.target.value)} /></Campo>
                                    <Campo label="Provincia"><input className="form-input" value={fields.provincia || ''} onChange={e => set('provincia', e.target.value)} /></Campo>
                                    <Campo label="Cód. postal"><input className="form-input" value={fields.cp || ''} onChange={e => set('cp', e.target.value)} /></Campo>
                                    <Campo label="Tel. fijo"><input className="form-input" value={fields.tel_fijo || ''} onChange={e => set('tel_fijo', e.target.value)} /></Campo>
                                    <Campo label="Celular" required><input className="form-input" value={fields.celular || ''} onChange={e => set('celular', e.target.value)} /></Campo>
                                    <Campo label="Email" required span><input className="form-input" type="email" value={fields.email || ''} onChange={e => set('email', e.target.value)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#0f6e56" title="Ingresos y actividad — solicitante" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Tipo de actividad" required span><RadioGroup options={TIPOS_ACTIVIDAD} value={fields.tipo_actividad} onChange={v => set('tipo_actividad', v)} /></Campo>
                                    <Campo label="Nombre o razón social del empleador" required span><input className="form-input" value={fields.empleador || ''} onChange={e => set('empleador', e.target.value)} /></Campo>
                                    <Campo label="Teléfono laboral"><input className="form-input" value={fields.tel_laboral || ''} onChange={e => set('tel_laboral', e.target.value)} /></Campo>
                                    <Campo label="Ingreso mensual neto" required><input className="form-input" value={fields.ingreso_neto || ''} onChange={e => set('ingreso_neto', e.target.value)} /></Campo>
                                    <Campo label="Fecha de ingreso" required><input className="form-input" value={fields.fecha_ingreso || ''} onChange={e => set('fecha_ingreso', e.target.value)} /></Campo>
                                    <Campo label="Antigüedad"><input className="form-input" value={fields.antiguedad || ''} onChange={e => set('antiguedad', e.target.value)} /></Campo>
                                    <Campo label="Otra actividad" span><input className="form-input" value={fields.otra_actividad || ''} onChange={e => set('otra_actividad', e.target.value)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#0f6e56" title="Datos del cónyuge — empleo" note="Solo si casado" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Apellido y nombre" span><input className="form-input" value={fields.conyuge_nombre || ''} onChange={e => set('conyuge_nombre', e.target.value)} /></Campo>
                                    <Campo label="Tipo y N° documento">
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select className="form-select" style={{ width: '80px', flexShrink: 0 }} value={fields.conyuge_tipo_doc || 'DNI'} onChange={e => set('conyuge_tipo_doc', e.target.value)}>{TIPOS_DOC.map(d => <option key={d}>{d}</option>)}</select>
                                            <input className="form-input" value={fields.conyuge_nro_doc || ''} onChange={e => set('conyuge_nro_doc', e.target.value)} />
                                        </div>
                                    </Campo>
                                    <Campo label="CUIL/CUIT"><input className="form-input" value={fields.conyuge_cuil || ''} onChange={e => set('conyuge_cuil', e.target.value)} /></Campo>
                                    <Campo label="Tipo de actividad" required span><RadioGroup options={TIPOS_ACTIVIDAD} value={fields.conyuge_tipo_actividad} onChange={v => set('conyuge_tipo_actividad', v)} /></Campo>
                                    <Campo label="Nombre o razón social" required span><input className="form-input" value={fields.conyuge_empleador || ''} onChange={e => set('conyuge_empleador', e.target.value)} /></Campo>
                                    <Campo label="Teléfono"><input className="form-input" value={fields.conyuge_tel || ''} onChange={e => set('conyuge_tel', e.target.value)} /></Campo>
                                    <Campo label="Ingreso mensual neto" required><input className="form-input" value={fields.conyuge_ingreso || ''} onChange={e => set('conyuge_ingreso', e.target.value)} /></Campo>
                                    <Campo label="Fecha de ingreso" required><input className="form-input" value={fields.conyuge_fecha_ingreso || ''} onChange={e => set('conyuge_fecha_ingreso', e.target.value)} /></Campo>
                                    <Campo label="Antigüedad"><input className="form-input" value={fields.conyuge_antiguedad || ''} onChange={e => set('conyuge_antiguedad', e.target.value)} /></Campo>
                                    <Campo label="Otra actividad"><input className="form-input" value={fields.conyuge_otra_actividad || ''} onChange={e => set('conyuge_otra_actividad', e.target.value)} /></Campo>
                                </div>
                            </div>
                        </>
                    )}

                    {tipo === 'persona_juridica' && (
                        <>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#003366" title="Datos de la empresa" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Razón social" required span><input className="form-input" value={fields.razon_social || ''} onChange={e => set('razon_social', e.target.value)} /></Campo>
                                    <Campo label="CUIT" required span><input className="form-input" value={fields.cuit || ''} onChange={e => set('cuit', e.target.value)} /></Campo>
                                    <Campo label="Domicilio" required span><input className="form-input" value={fields.domicilio || ''} onChange={e => set('domicilio', e.target.value)} /></Campo>
                                    <Campo label="Apoderado" required span><input className="form-input" value={fields.apoderado || ''} onChange={e => set('apoderado', e.target.value)} /></Campo>
                                </div>
                            </div>
                            <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                                <ShHead color="#1a4d88" title="Datos del apoderado" />
                                <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Campo label="Apellido" required><input className="form-input" value={fields.apod_apellido || ''} onChange={e => set('apod_apellido', e.target.value)} /></Campo>
                                    <Campo label="Nombre" required><input className="form-input" value={fields.apod_nombre || ''} onChange={e => set('apod_nombre', e.target.value)} /></Campo>
                                    <Campo label="N° documento" required>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select className="form-select" style={{ width: '80px', flexShrink: 0 }} value={fields.apod_tipo_doc || 'DNI'} onChange={e => set('apod_tipo_doc', e.target.value)}>{TIPOS_DOC.map(d => <option key={d}>{d}</option>)}</select>
                                            <input className="form-input" value={fields.apod_nro_doc || ''} onChange={e => set('apod_nro_doc', e.target.value)} />
                                        </div>
                                    </Campo>
                                    <Campo label="Fecha de nacimiento"><input className="form-input" value={fields.apod_fecha_nac || ''} onChange={e => set('apod_fecha_nac', e.target.value)} /></Campo>
                                    <Campo label="Teléfono" required><input className="form-input" value={fields.apod_tel || ''} onChange={e => set('apod_tel', e.target.value)} /></Campo>
                                    <Campo label="Email" required><input className="form-input" type="email" value={fields.apod_email || ''} onChange={e => set('apod_email', e.target.value)} /></Campo>
                                    <Campo label="Código postal"><input className="form-input" value={fields.apod_cp || ''} onChange={e => set('apod_cp', e.target.value)} /></Campo>
                                    <Campo label="CUIL/CUIT"><input className="form-input" value={fields.apod_cuil || ''} onChange={e => set('apod_cuil', e.target.value)} /></Campo>
                                    <Campo label="Estado civil" required span><RadioGroup options={ESTADOS_CIVILES_GPAT} value={fields.apod_estado_civil} onChange={v => set('apod_estado_civil', v)} /></Campo>
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{ background: 'white', border: '0.5px solid #e2e6ec', borderRadius: '10px', overflow: 'hidden' }}>
                        <ShHead color="#444444" title="Archivos adjuntos (opcional)" />
                        <div style={{ padding: '12px 14px' }}>
                            {adjuntos.map((file, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 9px', background: '#f8f9fb', borderRadius: '6px', border: '0.5px solid #e2e6ec', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '12px', flex: 1 }}>{file.name}</span>
                                    <span style={{ fontSize: '11px', color: '#8896a7' }}>{(file.size / 1024).toFixed(0)} KB</span>
                                    <button type="button" onClick={() => setAdjuntos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '16px' }}>×</button>
                                </div>
                            ))}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', background: '#f8f9fb', border: '1.5px dashed #c0c8d0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#8896a7' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Subir archivo(s)
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={e => setAdjuntos(prev => [...prev, ...Array.from(e.target.files)])} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {error && <div style={{ padding: '10px 14px', background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.2)', borderRadius: '6px', color: '#c0392b', fontSize: '13px' }}>{error}</div>}
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

export default function AdminFormularios() {
    const { profile } = useAuth()
    const [formularios, setFormularios] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filtroVendedor, setFiltroVendedor] = useState('')
    const [filtroLocalidad, setFiltroLocalidad] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
    const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
    const [vendedores, setVendedores] = useState([])
    const [selected, setSelected] = useState(null)
    const [toast, setToast] = useState(null)
    const [downloadingId, setDownloadingId] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [cotizaciones, setCotizaciones] = useState([])

    async function load() {
        const [{ data: f }, { data: v }, { data: c }] = await Promise.all([
            supabase.from('formularios').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, nombre, localidad').order('nombre'),
            supabase.from('cotizaciones').select('*').order('created_at', { ascending: false }),
        ])
        setFormularios(f || [])
        setVendedores(v || [])
        setCotizaciones(c || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function handleDelete(f) {
        if (!confirm(`¿Eliminar el formulario ${numStr(f.numero)} de ${f.apellido_nombre || '—'}?`)) return
        await supabase.from('formularios').delete().eq('id', f.id)
        setFormularios(prev => prev.filter(x => x.id !== f.id))
        if (selected?.id === f.id) setSelected(null)
        showToast('Formulario eliminado')
    }

    async function handleDownloadPDF(f) {
        setDownloadingId(f.id)
        try {
            const container = document.createElement('div')
            container.style.cssText = 'position:fixed;left:0;top:0;width:950px;z-index:-9999;opacity:0;pointer-events:none;background:white;'
            document.body.appendChild(container)
            container.innerHTML = buildPDFHTML(f)
            await new Promise(r => setTimeout(r, 500))
            await generatePDFFromElement(
                container.firstChild,
                `formulario_${String(f.numero || '').padStart(3, '0')}_${(f.apellido_nombre || 'sin_nombre').replace(/[\s,]+/g, '_')}`
            )
            document.body.removeChild(container)
            showToast(`PDF ${numStr(f.numero)} descargado`)
        } catch (err) {
            console.error(err)
            showToast('Error al generar PDF', 'error')
        }
        setDownloadingId(null)
    }

    function handleSaved() {
        setShowModal(false)
        showToast('Formulario guardado correctamente')
        load()
    }

    const vendedoresFiltrados = filtroLocalidad
        ? vendedores.filter(v => v.localidad === filtroLocalidad)
        : vendedores

    const filtered = formularios.filter(f => {
        const txt = `${f.apellido_nombre || ''} ${f.vendedor_nombre || ''} ${f.numero || ''} ${f.cotizacion_numero || ''}`.toLowerCase()
        if (search && !txt.includes(search.toLowerCase())) return false
        if (filtroVendedor && f.vendedor_id !== filtroVendedor) return false
        if (filtroLocalidad) {
            const ids = vendedores.filter(v => v.localidad === filtroLocalidad).map(v => v.id)
            if (!ids.includes(f.vendedor_id)) return false
        }
        if (filtroEstado && f.estado !== filtroEstado) return false
        if (filtroTipo && f.tipo_formulario !== filtroTipo) return false
        if (filtroFechaDesde && f.created_at < filtroFechaDesde) return false
        if (filtroFechaHasta && f.created_at > filtroFechaHasta + 'T23:59:59') return false
        return true
    })

    if (loading) return <div className="loading-center"><div className="spinner" /></div>

    return (
        <div style={{ padding: '32px' }}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '28px', fontWeight: '700', color: '#003366', marginBottom: '4px' }}>Formularios recibidos</h1>
                    <p style={{ color: '#8896a7', fontSize: '14px' }}>{filtered.length} formularios · {formularios.filter(f => f.estado === 'enviado').length} enviados</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo formulario
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ minWidth: '180px', flex: 1 }}>
                    <label className="form-label">Buscar</label>
                    <input className="form-input" placeholder="Cliente, N° form, N° cot..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="form-group" style={{ minWidth: '130px' }}>
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                        <option value="">Todos</option>
                        {TIPOS_FORMULARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: '140px' }}>
                    <label className="form-label">Localidad</label>
                    <select className="form-select" value={filtroLocalidad} onChange={e => { setFiltroLocalidad(e.target.value); setFiltroVendedor('') }}>
                        <option value="">Todas</option>
                        {LOCALIDADES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: '160px' }}>
                    <label className="form-label">Vendedor</label>
                    <select className="form-select" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}>
                        <option value="">Todos</option>
                        {vendedoresFiltrados.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: '120px' }}>
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                        <option value="">Todos</option>
                        {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: '130px' }}>
                    <label className="form-label">Desde</label>
                    <input type="date" className="form-input" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} />
                </div>
                <div className="form-group" style={{ minWidth: '130px' }}>
                    <label className="form-label">Hasta</label>
                    <input type="date" className="form-input" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} />
                </div>
                {(search || filtroVendedor || filtroLocalidad || filtroEstado || filtroTipo || filtroFechaDesde || filtroFechaHasta) && (
                    <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}
                        onClick={() => { setSearch(''); setFiltroVendedor(''); setFiltroLocalidad(''); setFiltroEstado(''); setFiltroTipo(''); setFiltroFechaDesde(''); setFiltroFechaHasta('') }}>
                        Limpiar
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: '18px', alignItems: 'start' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e6ec', boxShadow: '0 2px 8px rgba(0,51,102,.06)' }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <p>No hay formularios</p>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>N°</th>
                                        <th>Tipo</th>
                                        <th>Cliente / Razón social</th>
                                        <th>Cot.</th>
                                        <th>Vendedor</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                        <th style={{ textAlign: 'center' }}>Acc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(f => (
                                        <tr key={f.id} onClick={() => setSelected(f)} style={{ cursor: 'pointer', background: selected?.id === f.id ? 'rgba(0,51,102,.04)' : undefined }}>
                                            <td><span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '11px', background: '#003366', color: 'white', borderRadius: '4px', padding: '2px 6px' }}>{numStr(f.numero)}</span></td>
                                            <td><span style={{ background: '#f0f2f5', color: '#4a5568', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: '600' }}>{TIPO_LABEL[f.tipo_formulario] || f.tipo_formulario}</span></td>
                                            <td style={{ fontWeight: '500', fontSize: '13px' }}>{f.apellido_nombre || <span style={{ color: '#8896a7' }}>—</span>}</td>
                                            <td>{f.cotizacion_numero ? <span style={{ background: '#e6edf5', color: '#003366', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}>{numStr(f.cotizacion_numero)}</span> : <span style={{ color: '#c0c8d0', fontSize: '11px' }}>—</span>}</td>
                                            <td style={{ fontSize: '12px' }}>{f.vendedor_nombre}</td>
                                            <td><span className={`badge ${BADGE[f.estado] || 'badge-navy'}`}>{ESTADOS[f.estado] || f.estado}</span></td>
                                            <td style={{ fontSize: '11px', color: '#8896a7', whiteSpace: 'nowrap' }}>{new Date(f.created_at).toLocaleDateString('es-AR')}</td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                                    <button onClick={() => setSelected(f)} className="btn btn-ghost btn-sm btn-icon" title="Ver">
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDownloadPDF(f)} className="btn btn-ghost btn-sm btn-icon" disabled={downloadingId === f.id} title="PDF">
                                                        {downloadingId === f.id
                                                            ? <div className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} />
                                                            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                        }
                                                    </button>
                                                    <button onClick={() => handleDelete(f)} className="btn btn-danger btn-sm btn-icon" title="Eliminar">
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
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

                {selected && (
                    <PanelDetalle
                        f={selected}
                        onClose={() => setSelected(null)}
                        onDownload={handleDownloadPDF}
                        downloadingId={downloadingId}
                    />
                )}
            </div>

            {showModal && (
                <AdminFormModal
                    cotizaciones={cotizaciones}
                    onClose={() => setShowModal(false)}
                    onSave={handleSaved}
                    profile={profile}
                />
            )}
        </div>
    )
}