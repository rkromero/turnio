-- MIGRACIÓN: Sistema de Pagos con Mercado Pago
-- Fecha: 2024-12-25
-- Descripción: Agregar soporte para pagos individuales por negocio

-- 1. Agregar campos de Mercado Pago a la tabla businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_access_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_user_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_public_key TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS mp_connected_at TIMESTAMP;

-- 2. Crear tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Datos de Mercado Pago
    mp_payment_id TEXT UNIQUE, -- ID del pago en MP
    mp_preference_id TEXT, -- ID de la preferencia
    mp_collection_id TEXT, -- ID de la colección
    
    -- Datos del pago
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',
    description TEXT,
    
    -- Estados
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled, refunded
    payment_method VARCHAR(100), -- credit_card, debit_card, cash, etc
    payment_type VARCHAR(50), -- account_money, credit_card, etc
    
    -- Metadatos
    external_reference TEXT, -- Referencia externa (appointment_id)
    payer_email TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    
    -- Datos adicionales de MP
    mp_data JSONB -- Para guardar toda la respuesta de MP
);

-- 3. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 4. Agregar campo de estado de pago a appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- 5. Crear tabla de configuración de pagos por negocio
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Configuraciones
    require_payment BOOLEAN DEFAULT FALSE, -- Si requiere pago obligatorio
    payment_deadline_hours INTEGER DEFAULT 24, -- Horas para pagar antes de la cita
    auto_cancel_unpaid BOOLEAN DEFAULT FALSE, -- Cancelar automáticamente si no paga
    
    -- Configuración de MP
    mp_webhook_url TEXT,
    mp_success_url TEXT,
    mp_failure_url TEXT,
    mp_pending_url TEXT,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(business_id)
);

-- 6. Insertar configuración por defecto para negocios existentes
INSERT INTO payment_settings (business_id, require_payment, payment_deadline_hours)
SELECT id, FALSE, 24 
FROM businesses 
ON CONFLICT (business_id) DO NOTHING;

-- 7. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER update_payment_settings_updated_at 
    BEFORE UPDATE ON payment_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Agregar comentarios para documentación
COMMENT ON TABLE payments IS 'Tabla de pagos procesados a través de Mercado Pago';
COMMENT ON TABLE payment_settings IS 'Configuración de pagos por negocio';
COMMENT ON COLUMN businesses.mp_access_token IS 'Token de acceso de Mercado Pago del negocio';
COMMENT ON COLUMN businesses.mp_connected IS 'Indica si el negocio tiene Mercado Pago conectado';
COMMENT ON COLUMN appointments.payment_status IS 'Estado del pago: pending, paid, failed, refunded';

-- 10. Verificar la migración
SELECT 
    'payments' as table_name, 
    COUNT(*) as record_count 
FROM payments
UNION ALL
SELECT 
    'payment_settings' as table_name, 
    COUNT(*) as record_count 
FROM payment_settings
UNION ALL
SELECT 
    'businesses_with_mp' as table_name, 
    COUNT(*) as record_count 
FROM businesses 
WHERE mp_connected = TRUE; 