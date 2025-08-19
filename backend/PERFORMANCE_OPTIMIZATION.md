# 🚀 Optimización de Performance - TurnIO

## 📋 Resumen

Este documento describe las optimizaciones de base de datos implementadas para garantizar que TurnIO funcione eficientemente con miles de registros.

## ⚠️ Estado Actual

**IMPORTANTE**: Los índices de performance **NO están aplicados** en la base de datos actual. Es **CRÍTICO** aplicarlos antes de que la aplicación tenga muchos usuarios.

## 🎯 Índices Críticos Implementados

### **1. Tabla `appointments` (MÁS IMPORTANTE)**

Estos índices optimizan las consultas más frecuentes:

- **`idx_appointments_business_branch_user_time`**: Consultas de disponibilidad de horarios
- **`idx_appointments_business_date`**: Reportes y dashboard por fecha
- **`idx_appointments_business_status_created`**: Analytics y estadísticas
- **`idx_appointments_client`**: Historial de citas por cliente
- **`idx_appointments_user`**: Agenda personal de profesionales
- **`idx_appointments_service`**: Reportes por servicio

### **2. Tabla `clients`**

Optimizan búsquedas de clientes:

- **`idx_clients_business_email`**: Búsqueda por email
- **`idx_clients_business_phone`**: Búsqueda por teléfono
- **`idx_clients_business_name`**: Búsqueda por nombre
- **`idx_clients_business_created`**: Clientes recientes

### **3. Tabla `reviews`**

Optimizan sistema de reseñas:

- **`idx_reviews_business_approved`**: Reseñas públicas aprobadas
- **`idx_reviews_client`**: Historial de reseñas por cliente
- **`idx_reviews_appointment`**: Verificación de reseñas existentes

### **4. Tabla `client_scores`**

Optimizan sistema de scoring:

- **`idx_client_scores_email`**: Scoring por email
- **`idx_client_scores_phone`**: Scoring por teléfono
- **`idx_client_scores_activity`**: Clientes más activos
- **`idx_client_scores_points`**: Mejor scoring

## 🛠️ Cómo Aplicar las Optimizaciones

### **Opción 1: Script Automático (Recomendado)**

```bash
# Navegar al directorio backend
cd backend

# Verificar índices actuales
node scripts/apply-performance-indexes.js check

# Aplicar todos los índices
node scripts/apply-performance-indexes.js apply

# Monitorear uso después de aplicación
node scripts/apply-performance-indexes.js monitor
```

### **Opción 2: SQL Manual**

```bash
# Ejecutar el archivo SQL directamente
psql $DATABASE_URL -f add-performance-indexes.sql
```

### **Opción 3: Railway SQL Editor**

1. Ir a Railway Dashboard
2. Seleccionar la base de datos PostgreSQL
3. Abrir SQL Editor
4. Copiar y pegar el contenido de `add-performance-indexes.sql`
5. Ejecutar

## 📊 Monitoreo de Performance

### **Verificar Índices Creados**

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### **Monitorear Uso de Índices**

```sql
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
```

### **Analizar Queries Lentas**

```sql
-- Habilitar extensión (ejecutar una vez)
CREATE EXTENSION pg_stat_statements;

-- Ver queries más lentas
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements 
WHERE query LIKE '%appointments%' OR query LIKE '%clients%'
ORDER BY mean_time DESC 
LIMIT 10;
```

## ⏱️ Tiempo Estimado de Aplicación

- **Tabla appointments**: 5-10 minutos (más crítica)
- **Tabla clients**: 2-5 minutos
- **Otras tablas**: 1-3 minutos cada una
- **Total estimado**: 15-30 minutos

## 🔍 Verificación Post-Aplicación

### **1. Verificar Índices Creados**

```bash
node scripts/apply-performance-indexes.js check
```

### **2. Probar Consultas Críticas**

```javascript
// Consulta de disponibilidad (debe ser rápida)
const startTime = Date.now();
const availableSlots = await getAvailableSlots(businessId, date);
const endTime = Date.now();
console.log(`Tiempo: ${endTime - startTime}ms`); // Debe ser < 100ms
```

### **3. Monitorear Performance**

```bash
# Después de usar la aplicación por unos días
node scripts/apply-performance-indexes.js monitor
```

## 🚨 Consideraciones Importantes

### **Cuándo Aplicar**

- ✅ **Horario de bajo tráfico** (noche o fin de semana)
- ✅ **Backup reciente** de la base de datos
- ✅ **Monitoreo activo** durante la aplicación

### **Qué Evitar**

- ❌ **No aplicar durante horario pico**
- ❌ **No aplicar sin backup**
- ❌ **No aplicar sin monitoreo**

### **Signos de Problemas**

- ⚠️ **Queries que toman > 100ms**
- ⚠️ **Table scans en lugar de index scans**
- ⚠️ **Alto uso de CPU en la base de datos**
- ⚠️ **Timeouts en consultas de disponibilidad**

## 📈 Beneficios Esperados

### **Antes de los Índices**
- Consultas de disponibilidad: 500-2000ms
- Reportes de analytics: 2000-5000ms
- Búsquedas de clientes: 100-500ms

### **Después de los Índices**
- Consultas de disponibilidad: 10-50ms
- Reportes de analytics: 100-300ms
- Búsquedas de clientes: 5-20ms

## 🔧 Mantenimiento

### **Revisión Mensual**

```bash
# Verificar uso de índices
node scripts/apply-performance-indexes.js monitor

# Analizar queries lentas
node scripts/apply-performance-indexes.js analyze
```

### **Limpieza de Índices No Utilizados**

```sql
-- Identificar índices no utilizados
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

## 📞 Soporte

Si encuentras problemas durante la aplicación:

1. **Verificar logs** del script
2. **Revisar errores** específicos
3. **Consultar documentación** de PostgreSQL
4. **Contactar soporte** con detalles del error

---

**⚠️ RECORDATORIO**: Estos índices son **CRÍTICOS** para la escalabilidad de TurnIO. Aplícalos antes de que la aplicación tenga muchos usuarios.
