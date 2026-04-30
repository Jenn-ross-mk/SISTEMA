# Cotizador AKAR — Guía de Instalación Completa

## Arquitectura

- **Frontend:** React + Vite
- **Base de datos + Auth:** Supabase (gratuito)
- **Hosting:** Netlify / Vercel / cualquier hosting estático

---

## PASO 1 — Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratuita
2. Creá un nuevo proyecto (guardá la contraseña de la DB)
3. Esperá que termine de provisionar (~2 minutos)
4. Andá a **SQL Editor** (menú izquierdo)
5. Pegá TODO el contenido del archivo `supabase_schema.sql` y ejecutalo con el botón "Run"
6. Andá a **Settings → API**:
   - Copiá **Project URL** (ej: `https://xxxx.supabase.co`)
   - Copiá **anon public key**

---

## PASO 2 — Configuración local

1. Copiá `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Editá `.env` con tus datos de Supabase:
   ```
   VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

---

## PASO 3 — Crear el primer administrador

1. Andá a Supabase → **Authentication → Users → Add User**
2. Completá email y contraseña
3. Guardalo
4. Andá a **SQL Editor** y ejecutá:
   ```sql
   UPDATE profiles SET rol = 'admin' WHERE id = 'ID_DEL_USUARIO_QUE_CREASTE';
   ```
   (El ID lo encontrás en Authentication → Users)

---

## PASO 4 — Instalación y desarrollo local

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo
npm run dev

# Abrir en el navegador: http://localhost:5173
```

---

## PASO 5 — Deploy a Netlify (recomendado, gratis)

1. Creá cuenta en [netlify.com](https://netlify.com)
2. Conectá tu repositorio de GitHub (subí el proyecto primero con `git init && git add . && git commit -m "init" && git remote add origin TU_REPO && git push`)
3. En Netlify → **Site Settings → Environment Variables**, agregá:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. En Build Settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Hacé click en Deploy

Para que funcione el routing de React, creá el archivo `public/_redirects`:
```
/*    /index.html   200
```

---

## Uso del sistema

### Como Administrador
- Ingresá con tu email/contraseña
- Accedé al **Panel Admin** desde el header o desde `/admin`
- Podés:
  - Crear/editar/eliminar vehículos con sus planes de financiación
  - Gestionar vendedores (crear cuentas, cambiar roles, activar/desactivar)
  - Ver todas las cotizaciones con filtros por vendedor, fecha, provincia

### Como Vendedor
- Ingresás con tu email/contraseña
- Tu nombre aparece automáticamente en el cotizador
- Podés:
  - Ver todos los vehículos disponibles
  - Hacer cotizaciones y guardarlas
  - Ver tu historial de cotizaciones propias en `/admin/cotizaciones`

---

## Estructura del proyecto

```
src/
  context/
    AuthContext.jsx     — manejo de sesión
  lib/
    supabase.js         — cliente de Supabase
  pages/
    LoginPage.jsx       — pantalla de login
    cliente/
      ClienteLayout.jsx   — header + layout cotizador
      VehiculosIndex.jsx  — listado de vehículos
      CotizadorVehiculo.jsx — pantalla de cotización
    admin/
      AdminLayout.jsx     — sidebar + layout admin
      AdminDashboard.jsx  — estadísticas
      AdminVehiculos.jsx  — listado de vehículos
      AdminVehiculoForm.jsx — crear/editar vehículo + planes
      AdminVendedores.jsx — gestión de usuarios
      AdminCotizaciones.jsx — historial de cotizaciones
  index.css             — estilos globales
  App.jsx               — router principal
  main.jsx              — punto de entrada
```

---

## Notas importantes

- **Imágenes:** Se suben al storage de Supabase (bucket `vehiculos`). El plan gratuito incluye 1GB.
- **Usuarios:** Al crear un vendedor desde el panel, recibirá un email de confirmación de Supabase. Debe confirmar antes de poder ingresar.
- **RLS (Row Level Security):** Configurado para que cada vendedor solo vea sus propias cotizaciones. Los admins ven todo.
- **Precio base:** Se muestra automáticamente al seleccionar la provincia (Chubut o Santa Cruz).
