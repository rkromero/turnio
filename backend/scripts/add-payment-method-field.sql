-- Migración: Agregar campo paymentMethod a la tabla appointments
-- Fecha: 2025-01-17
-- Descripción: Agrega el campo paymentMethod para indicar el método de pago (LOCAL o ADELANTADO)

-- Agregar columna paymentMethod con valor por defecto 'LOCAL'
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'LOCAL';

-- Índice para búsquedas por método de pago
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON appointments("paymentMethod");

-- Comentario de la columna
COMMENT ON COLUMN appointments."paymentMethod" IS 'Método de pago: LOCAL (pago en el local) o ADELANTADO (pago anticipado)';


