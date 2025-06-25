-- Script para actualizar el esquema de suscripciones
-- Ejecutar en la base de datos de Railway

-- Agregar nuevas columnas para manejo de fallos de pago
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS retryCount INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lastRetryDate TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS nextRetryDate TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS gracePeriodEnd TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS suspendedAt TIMESTAMP;

-- Actualizar los valores enum para el status
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'GRACE_PERIOD';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- Crear índices para optimizar las consultas
CREATE INDEX IF NOT EXISTS idx_subscriptions_retry ON subscriptions(status, nextRetryDate) WHERE status = 'PAYMENT_FAILED';
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace ON subscriptions(status, gracePeriodEnd) WHERE status = 'GRACE_PERIOD';
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing ON subscriptions(status, nextBillingDate) WHERE status = 'ACTIVE';

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position; 