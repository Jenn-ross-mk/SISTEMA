-- ============================================================
-- VENTAS CORPORATIVAS
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
--
-- Crea tablas propias para los vehículos y planes de ventas corporativas,
-- con la misma estructura que las del cotizador convencional, y copia los
-- vehículos y planes actuales como punto de partida. Después de esto, cada
-- sección se edita por separado: cambiar un precio en una no afecta a la otra.
-- ============================================================

-- 1. Tablas con la misma estructura que las originales
CREATE TABLE corp_vehiculos (LIKE vehiculos INCLUDING ALL);

CREATE TABLE corp_planes_financiacion (LIKE planes_financiacion INCLUDING ALL);
ALTER TABLE corp_planes_financiacion
  ADD CONSTRAINT corp_planes_financiacion_vehiculo_id_fkey
  FOREIGN KEY (vehiculo_id) REFERENCES corp_vehiculos(id) ON DELETE CASCADE;

-- 2. Copia inicial (se mantienen los mismos id para que los planes queden
--    asociados a su vehículo; la foto se comparte, no se duplica)
INSERT INTO corp_vehiculos SELECT * FROM vehiculos;
INSERT INTO corp_planes_financiacion SELECT * FROM planes_financiacion
  WHERE vehiculo_id IN (SELECT id FROM corp_vehiculos);

-- 3. Permisos: todos los usuarios logueados ven; solo admin edita
ALTER TABLE corp_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE corp_planes_financiacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corp_vehiculos_select" ON corp_vehiculos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "corp_vehiculos_admin_write" ON corp_vehiculos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "corp_planes_select" ON corp_planes_financiacion FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "corp_planes_admin_write" ON corp_planes_financiacion FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
