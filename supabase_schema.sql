-- ============================================================
-- COTIZADOR AKAR - SUPABASE SCHEMA
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehiculos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  version TEXT NOT NULL,
  imagen_url TEXT,
  precio_chubut NUMERIC(14,2) NOT NULL DEFAULT 0,
  precio_santacruz NUMERIC(14,2) NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planes_financiacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE,
  nombre_plan TEXT NOT NULL,
  cuotas INTEGER NOT NULL,
  tna NUMERIC(6,2) NOT NULL DEFAULT 0,
  valor_cuota_por_millon NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_maximo NUMERIC(14,2),
  quebranto_pct NUMERIC(5,4) DEFAULT 0.11,
  tiene_quebranto BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cotizaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID REFERENCES profiles(id),
  vendedor_nombre TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  vehiculo_id UUID REFERENCES vehiculos(id),
  vehiculo_descripcion TEXT NOT NULL,
  provincia TEXT NOT NULL,
  precio_base NUMERIC(14,2) NOT NULL,
  entrega_usado NUMERIC(14,2) DEFAULT 0,
  descuento NUMERIC(14,2) DEFAULT 0,
  plan_nombre TEXT,
  monto_financiado NUMERIC(14,2) DEFAULT 0,
  cuotas INTEGER DEFAULT 0,
  valor_cuota NUMERIC(14,2) DEFAULT 0,
  quebranto NUMERIC(14,2) DEFAULT 0,
  sellado NUMERIC(14,2) DEFAULT 0,
  saldo_efectivo NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_financiacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "vehiculos_select" ON vehiculos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "vehiculos_admin_write" ON vehiculos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "planes_select" ON planes_financiacion FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "planes_admin_write" ON planes_financiacion FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "cotizaciones_select" ON cotizaciones FOR SELECT USING (vendedor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
CREATE POLICY "cotizaciones_insert" ON cotizaciones FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cotizaciones_admin_delete" ON cotizaciones FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, rol) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO storage.buckets (id, name, public) VALUES ('vehiculos', 'vehiculos', true);
CREATE POLICY "vehiculos_images_public" ON storage.objects FOR SELECT USING (bucket_id = 'vehiculos');
CREATE POLICY "vehiculos_images_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehiculos' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));
