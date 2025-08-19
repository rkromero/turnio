-- =====================================================
-- MIGRACIÓN: ÍNDICES CRÍTICOS PARA PERFORMANCE
-- =====================================================
-- 
-- Esta migración agrega índices esenciales para optimizar
-- la performance cuando la aplicación tenga muchos registros.
-- 
-- ⚠️ IMPORTANTE: Ejecutar en horario de bajo tráfico
-- ⚠️ IMPORTANTE: Los índices grandes pueden tomar varios minutos
-- =====================================================

-- =====================================================
-- 1. ÍNDICES CRÍTICOS PARA TABLA APPOINTMENTS
-- =====================================================

-- Índice compuesto para consultas de disponibilidad (MÁS IMPORTANTE)
-- Optimiza: getAvailableSlots, conflictos de horarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
ON appointments(businessId, branchId, userId, startTime, status);

-- Índice para consultas por fecha y negocio
-- Optimiza: reportes, dashboard, citas del día
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
ON appointments(businessId, startTime);

-- Índice para reportes y analytics
-- Optimiza: métricas por estado, estadísticas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_status_created 
ON appointments(businessId, status, createdAt);

-- Índice para búsquedas por cliente
-- Optimiza: historial de citas por cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client 
ON appointments(clientId, startTime);

-- Índice para citas por profesional
-- Optimiza: agenda personal, citas asignadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user 
ON appointments(userId, startTime) WHERE userId IS NOT NULL;

-- Índice para citas por servicio
-- Optimiza: reportes por servicio, analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_service 
ON appointments(serviceId, startTime);

-- =====================================================
-- 2. ÍNDICES PARA TABLA CLIENTS
-- =====================================================

-- Índice para búsquedas por email
-- Optimiza: búsqueda de clientes por email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
ON clients(businessId, email) WHERE email IS NOT NULL;

-- Índice para búsquedas por teléfono
-- Optimiza: búsqueda de clientes por teléfono
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
ON clients(businessId, phone) WHERE phone IS NOT NULL;

-- Índice para búsquedas por nombre
-- Optimiza: búsqueda de clientes por nombre
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_name 
ON clients(businessId, name);

-- Índice para clientes recientes
-- Optimiza: listado de clientes por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_created 
ON clients(businessId, createdAt DESC);

-- =====================================================
-- 3. ÍNDICES PARA TABLA REVIEWS
-- =====================================================

-- Índice para consultas de reseñas públicas
-- Optimiza: widget de reseñas, reseñas aprobadas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_approved 
ON reviews(businessId, isApproved, createdAt DESC) WHERE isPublic = true;

-- Índice para reseñas por cliente
-- Optimiza: historial de reseñas por cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_client 
ON reviews(clientId, createdAt DESC);

-- Índice para reseñas por cita
-- Optimiza: verificación de reseñas existentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_appointment 
ON reviews(appointmentId);

-- =====================================================
-- 4. ÍNDICES PARA TABLA CLIENT_SCORES
-- =====================================================

-- Índice para búsquedas por email
-- Optimiza: scoring por email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_email 
ON client_scores(email) WHERE email IS NOT NULL;

-- Índice para búsquedas por teléfono
-- Optimiza: scoring por teléfono
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_phone 
ON client_scores(phone) WHERE phone IS NOT NULL;

-- Índice para scoring por actividad
-- Optimiza: clientes más activos, detección de churn
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_activity 
ON client_scores(lastActivity DESC, starRating DESC);

-- Índice para scoring por puntos
-- Optimiza: clientes con mejor scoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_points 
ON client_scores(totalPoints DESC, starRating DESC);

-- =====================================================
-- 5. ÍNDICES PARA TABLA SERVICES
-- =====================================================

-- Índice para servicios activos por negocio
-- Optimiza: listado de servicios disponibles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_business_active 
ON services(businessId, isActive) WHERE isActive = true;

-- Índice para servicios por nombre
-- Optimiza: búsqueda de servicios
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_business_name 
ON services(businessId, name);

-- =====================================================
-- 6. ÍNDICES PARA TABLA USERS
-- =====================================================

-- Índice para usuarios activos por negocio
-- Optimiza: listado de profesionales activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_business_active 
ON users(businessId, isActive, role) WHERE isActive = true;

-- Índice para usuarios por sucursal
-- Optimiza: profesionales por sucursal
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_branch 
ON users(branchId, isActive) WHERE branchId IS NOT NULL AND isActive = true;

-- =====================================================
-- 7. ÍNDICES PARA TABLA BRANCHES
-- =====================================================

-- Índice para sucursales activas por negocio
-- Optimiza: listado de sucursales disponibles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branches_business_active 
ON branches(businessId, isActive) WHERE isActive = true;

-- Índice para sucursal principal
-- Optimiza: búsqueda de sucursal principal
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branches_main 
ON branches(businessId, isMain) WHERE isMain = true;

-- =====================================================
-- 8. ÍNDICES PARA TABLA WORKING_HOURS
-- =====================================================

-- Índice para horarios activos por usuario
-- Optimiza: consulta de horarios de trabajo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_working_hours_user_active 
ON working_hours(userId, dayOfWeek, isActive) WHERE isActive = true;

-- =====================================================
-- 9. ÍNDICES PARA TABLA HOLIDAYS
-- =====================================================

-- Índice para feriados por negocio y fecha
-- Optimiza: verificación de feriados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_holidays_business_date 
ON holidays(businessId, date);

-- =====================================================
-- 10. ÍNDICES PARA TABLA BRANCH_BREAK_TIMES
-- =====================================================

-- Índice para horarios de descanso por sucursal
-- Optimiza: consulta de descansos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_branch_break_times_branch 
ON branch_break_times(branchId, dayOfWeek, isActive) WHERE isActive = true;

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

-- Consulta para verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- ESTADÍSTICAS DE USO DE ÍNDICES (ejecutar después de uso)
-- =====================================================

-- Consulta para monitorear el uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. Los índices CONCURRENTLY no bloquean la tabla durante la creación
-- 2. La creación puede tomar varios minutos en tablas grandes
-- 3. Monitorear el uso de índices después de la implementación
-- 4. Considerar eliminar índices no utilizados para optimizar escrituras
-- 5. Revisar el plan de ejecución de queries críticas después de crear índices
--
-- =====================================================
