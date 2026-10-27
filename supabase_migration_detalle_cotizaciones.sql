-- ============================================================
-- COTIZADOR AKAR - Detalle completo de cotizaciones
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- Agrega la columna donde se guardan todos los campos de cada
-- cotización (banco, tasa, tramos, promociones, observaciones, etc.)
-- para el resumen del panel y el ticket descargable.
-- No modifica ni borra datos existentes.
-- ============================================================

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS detalle JSONB;
