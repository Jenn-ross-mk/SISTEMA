import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ClienteLayout from './pages/cliente/ClienteLayout'
import VehiculosIndex from './pages/cliente/VehiculosIndex'
import CotizadorVehiculo from './pages/cliente/CotizadorVehiculo'
import FormulariosPage from './pages/cliente/FormulariosPage.jsx'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminVehiculos from './pages/admin/AdminVehiculos'
import AdminVehiculoForm from './pages/admin/AdminVehiculoForm'
import AdminVendedores from './pages/admin/AdminVendedores'
import AdminCotizaciones from './pages/admin/AdminCotizaciones'
import AdminFormularios from './pages/admin/AdminFormularios'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="loading-center" style={{ height: '100vh' }}>
      <div className="spinner" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={<PrivateRoute><ClienteLayout /></PrivateRoute>}>
        <Route index element={<VehiculosIndex />} />
        <Route path="vehiculo/:id" element={<CotizadorVehiculo />} />
        <Route path="formularios" element={<FormulariosPage />} />
      </Route>

      <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="vehiculos" element={<AdminVehiculos />} />
        <Route path="vehiculos/nuevo" element={<AdminVehiculoForm />} />
        <Route path="vehiculos/editar/:id" element={<AdminVehiculoForm />} />
        <Route path="vendedores" element={<AdminVendedores />} />
        <Route path="cotizaciones" element={<AdminCotizaciones />} />
        <Route path="formularios" element={<AdminFormularios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}