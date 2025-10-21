-- =====================================================
-- MIGRACIÓN: SISTEMA DE PREDICCIÓN DE RIESGO
-- =====================================================
-- Fecha: 2025-10-21
-- Descripción: Agrega campos y tablas para predicción
--              de cancelaciones usando IA/ML

-- =====================================================
-- 1. ACTUALIZAR TABLA APPOINTMENTS
-- =====================================================

-- Agregar campos de predicción de riesgo
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "anticipationHours" INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "reminderOpenedAt" TIMESTAMP(3);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "reminderConfirmed" BOOLEAN DEFAULT false;

COMMENT ON COLUMN appointments."anticipationHours" IS 'Horas entre creación y cita';
COMMENT ON COLUMN appointments."reminderOpenedAt" IS 'Cuándo abrió el recordatorio';
COMMENT ON COLUMN appointments."reminderConfirmed" IS 'Si confirmó asistencia';

-- =====================================================
-- 2. ACTUALIZAR TABLA SERVICES
-- =====================================================

-- Agregar estadísticas de riesgo
ALTER TABLE services ADD COLUMN IF NOT EXISTS "cancellationRate" DOUBLE PRECISION;
ALTER TABLE services ADD COLUMN IF NOT EXISTS "noShowRate" DOUBLE PRECISION;
ALTER TABLE services ADD COLUMN IF NOT EXISTS "totalAppointments" INTEGER DEFAULT 0;

COMMENT ON COLUMN services."cancellationRate" IS '% histórico de cancelaciones';
COMMENT ON COLUMN services."noShowRate" IS '% histórico de no-shows';
COMMENT ON COLUMN services."totalAppointments" IS 'Total de citas históricas';

-- =====================================================
-- 3. ACTUALIZAR TABLA CLIENT_SCORES
-- =====================================================

-- Agregar campos de cancelación
ALTER TABLE client_scores ADD COLUMN IF NOT EXISTS "cancelledCount" INTEGER DEFAULT 0;
ALTER TABLE client_scores ADD COLUMN IF NOT EXISTS "avgCancellationLeadTime" INTEGER;
ALTER TABLE client_scores ADD COLUMN IF NOT EXISTS "cancellationRate" DOUBLE PRECISION;
ALTER TABLE client_scores ADD COLUMN IF NOT EXISTS "lastCancellationDate" TIMESTAMP(3);

COMMENT ON COLUMN client_scores."cancelledCount" IS 'Total de cancelaciones';
COMMENT ON COLUMN client_scores."avgCancellationLeadTime" IS 'Promedio de horas antes que cancela';
COMMENT ON COLUMN client_scores."cancellationRate" IS '% de cancelaciones del total';
COMMENT ON COLUMN client_scores."lastCancellationDate" IS 'Última vez que canceló';

-- =====================================================
-- 4. CREAR TABLA APPOINTMENT_RISK_PREDICTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS "appointment_risk_predictions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL UNIQUE,
    
    -- Scores de riesgo (0-100)
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    
    -- Factores individuales
    "clientRisk" DOUBLE PRECISION NOT NULL,
    "timeSlotRisk" DOUBLE PRECISION NOT NULL,
    "serviceRisk" DOUBLE PRECISION NOT NULL,
    "anticipationRisk" DOUBLE PRECISION NOT NULL,
    "reminderRisk" DOUBLE PRECISION NOT NULL,
    
    -- Recomendaciones
    "suggestedActions" JSONB,
    
    -- Timestamps
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    -- Foreign Keys
    CONSTRAINT "appointment_risk_predictions_appointmentId_fkey" 
        FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS "appointment_risk_predictions_riskLevel_idx" 
    ON "appointment_risk_predictions"("riskLevel");
CREATE INDEX IF NOT EXISTS "appointment_risk_predictions_riskScore_idx" 
    ON "appointment_risk_predictions"("riskScore");

-- =====================================================
-- 5. CREAR TABLA TIME_SLOT_STATS
-- =====================================================

CREATE TABLE IF NOT EXISTS "time_slot_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    
    -- Estadísticas
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    
    -- Tasas calculadas
    "cancellationRate" DOUBLE PRECISION,
    "noShowRate" DOUBLE PRECISION,
    "completionRate" DOUBLE PRECISION,
    
    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT "time_slot_stats_businessId_branchId_dayOfWeek_hour_key" 
        UNIQUE ("businessId", "branchId", "dayOfWeek", "hour")
);

-- Índices
CREATE INDEX IF NOT EXISTS "time_slot_stats_businessId_dayOfWeek_hour_idx" 
    ON "time_slot_stats"("businessId", "dayOfWeek", "hour");

-- =====================================================
-- 6. ACTUALIZAR DATOS EXISTENTES
-- =====================================================

-- Calcular anticipationHours para turnos existentes
UPDATE appointments 
SET "anticipationHours" = EXTRACT(EPOCH FROM ("startTime" - "createdAt")) / 3600
WHERE "anticipationHours" IS NULL;

-- Inicializar reminderConfirmed en false para turnos existentes
UPDATE appointments 
SET "reminderConfirmed" = false
WHERE "reminderConfirmed" IS NULL;

-- =====================================================
-- 7. MENSAJES DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Predicción de Riesgo instalado correctamente';
    RAISE NOTICE '📊 Tablas creadas: appointment_risk_predictions, time_slot_stats';
    RAISE NOTICE '🔧 Campos agregados a: appointments, services, client_scores';
    RAISE NOTICE '⚡ Próximo paso: Ejecutar cálculo inicial de estadísticas';
END $$;

