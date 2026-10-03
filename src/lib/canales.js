// Cada canal de venta usa las mismas pantallas (listado, cotizador y ABM de
// vehículos) pero con sus propias tablas, rutas y color.
export const CANALES = {
  convencional: {
    id: 'convencional',
    titulo: 'Cotizá tu 0km',
    nombreAdmin: 'Vehículos',
    tablaVehiculos: 'vehiculos',
    tablaPlanes: 'planes_financiacion',
    basePath: '',
    adminPath: '/admin/vehiculos',
    temaClass: '',
    prefijoPlan: '',
  },
  corporativo: {
    id: 'corporativo',
    titulo: 'Ventas corporativas',
    nombreAdmin: 'Ventas corporativas',
    tablaVehiculos: 'corp_vehiculos',
    tablaPlanes: 'corp_planes_financiacion',
    basePath: '/corporativo',
    adminPath: '/admin/corporativo',
    temaClass: 'tema-corporativo',
    prefijoPlan: 'Ventas corporativas',
  },
}
