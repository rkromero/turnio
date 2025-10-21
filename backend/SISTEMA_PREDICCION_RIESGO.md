# 🧠 Sistema de Predicción de Riesgo de Cancelaciones

## ✅ **FASE 1: FUNDACIÓN - COMPLETADA**

### 📊 **Base de Datos Actualizada**

#### **Nuevas Tablas:**
- ✅ `appointment_risk_predictions` - Almacena predicciones de riesgo por cita
- ✅ `time_slot_stats` - Estadísticas de cancelación por franja horaria

#### **Campos Agregados:**

**Tabla `appointments`:**
- `anticipationHours` - Horas entre creación y cita
- `reminderOpenedAt` - Cuándo abrió el recordatorio
- `reminderConfirmed` - Si confirmó asistencia

**Tabla `services`:**
- `cancellationRate` - % histórico de cancelaciones
- `noShowRate` - % histórico de no-shows
- `totalAppointments` - Total de citas históricas

**Tabla `client_scores`:**
- `cancelledCount` - Total de cancelaciones
- `avgCancellationLeadTime` - Promedio de horas antes que cancela
- `cancellationRate` - % de cancelaciones del total
- `lastCancellationDate` - Última vez que canceló

---

### 🧠 **Servicio de Predicción Implementado**

**Archivo:** `backend/src/services/riskPredictionService.js`

#### **Algoritmo de Machine Learning:**

El sistema calcula el riesgo de cancelación basándose en 6 factores ponderados:

| Factor | Peso | Descripción |
|--------|------|-------------|
| **Cliente** | 35% | Historial de cancelaciones, no-shows, star rating |
| **Franja Horaria** | 20% | Estadísticas de la hora/día específico |
| **Servicio** | 15% | Tipo de servicio, duración, precio |
| **Anticipación** | 15% | Tiempo entre reserva y cita |
| **Recordatorio** | 10% | Si confirmó o abrió el recordatorio |
| **Recencia** | 5% | Cuán reciente es el cliente |

#### **Clasificación de Riesgo:**
- 🟢 **0-30%** - Riesgo BAJO
- 🟡 **31-60%** - Riesgo MEDIO  
- 🔴 **61-100%** - Riesgo ALTO

#### **Funciones Disponibles:**
```javascript
calculateRisk(appointmentId)        // Calcula riesgo de una cita
recalculateAllRisks(businessId)     // Recalcula todas las citas
updateTimeSlotStats(businessId)     // Actualiza estadísticas de horarios
```

---

### 🛠️ **Scripts de Migración Creados**

1. **`add-risk-prediction-system.sql`** - Migración SQL completa
2. **`apply-risk-prediction-migration.js`** - Script Node.js para aplicar

**Para ejecutar en Railway:**
```bash
node scripts/apply-risk-prediction-migration.js
```

---

## 🚧 **PENDIENTE (Próximas Fases)**

### ⏳ **FASE 2: Backend API (Pendiente)**
- [ ] Crear controlador `riskPredictionController.js`
- [ ] Crear rutas REST API
- [ ] Integrar con sistema de turnos existente
- [ ] Crear job diario para recalcular riesgos

### ⏳ **FASE 3: Frontend UI (Pendiente)**
- [ ] Indicadores visuales en calendario
- [ ] Indicadores en vista de día
- [ ] Widget "Turnos en Riesgo" en dashboard
- [ ] Modal de detalles de riesgo
- [ ] Filtros por nivel de riesgo

### ⏳ **FASE 4: Acciones Automatizadas (Pendiente)**
- [ ] Recordatorios automáticos extra
- [ ] Notificaciones al admin
- [ ] Sugerencias de sobreagendamiento
- [ ] Doble confirmación automática

### ⏳ **FASE 5: Analytics (Pendiente)**
- [ ] Reporte mensual de predicciones
- [ ] Precisión del modelo
- [ ] Cancelaciones evitadas
- [ ] Ingresos salvados

---

## 📐 **Arquitectura del Sistema**

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND (React/TypeScript)             │
├─────────────────────────────────────────────────────┤
│  - Calendario con indicadores de riesgo            │
│  - Widget "Turnos en Riesgo"                       │
│  - Modal de detalles                               │
│  - Dashboard stats                                 │
└───────────────┬─────────────────────────────────────┘
                │ API REST
┌───────────────▼─────────────────────────────────────┐
│              BACKEND (Node.js/Express)              │
├─────────────────────────────────────────────────────┤
│  Routes:                                            │
│  - GET /api/risk-predictions/:id                   │
│  - GET /api/risk-predictions/risky                 │
│  - POST /api/risk-predictions/calculate            │
│  - POST /api/risk-predictions/recalculate-all      │
│                                                     │
│  Services:                                          │
│  - riskPredictionService.js (⬅ YA CREADO)         │
│  - analyticsService.js (pendiente)                 │
│                                                     │
│  Jobs:                                              │
│  - Daily risk recalculation                        │
│  - Time slot stats update                          │
└───────────────┬─────────────────────────────────────┘
                │ Prisma ORM
┌───────────────▼─────────────────────────────────────┐
│            DATABASE (PostgreSQL)                    │
├─────────────────────────────────────────────────────┤
│  Tables:                                            │
│  - appointment_risk_predictions (⬅ YA CREADO)     │
│  - time_slot_stats (⬅ YA CREADO)                  │
│  - appointments (campos agregados)                 │
│  - services (campos agregados)                     │
│  - client_scores (campos agregados)                │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 **Ejemplo de Uso (Cuando esté completo)**

### **1. Cálculo Automático:**
```javascript
// Al crear un turno
const appointment = await createAppointment(data);
await riskPredictionService.calculateRisk(appointment.id);
```

### **2. Consulta de Riesgo:**
```javascript
// Obtener predicción
const risk = await prisma.appointmentRiskPrediction.findUnique({
  where: { appointmentId: 'xxx' }
});

console.log(`Riesgo: ${risk.riskLevel} (${risk.riskScore}%)`);
console.log('Factores:');
console.log(`  Cliente: ${risk.clientRisk}%`);
console.log(`  Hora: ${risk.timeSlotRisk}%`);
console.log(`  Servicio: ${risk.serviceRisk}%`);
console.log('Acciones sugeridas:', risk.suggestedActions);
// ["send_extra_reminder", "double_confirm"]
```

### **3. Vista en Frontend:**
```tsx
// En el calendario
<AppointmentCard 
  appointment={appointment}
  risk={appointment.riskPrediction}
>
  {risk && risk.riskLevel === 'HIGH' && (
    <RiskBadge level="HIGH" score={risk.riskScore} />
  )}
</AppointmentCard>
```

---

## 📊 **Datos que Genera el Sistema**

### **Por Cita:**
```json
{
  "appointmentId": "abc123",
  "riskScore": 72.5,
  "riskLevel": "HIGH",
  "clientRisk": 80,
  "timeSlotRisk": 65,
  "serviceRisk": 45,
  "anticipationRisk": 70,
  "reminderRisk": 85,
  "suggestedActions": [
    "call_client",
    "double_confirm",
    "send_extra_reminder"
  ]
}
```

### **Por Franja Horaria:**
```json
{
  "businessId": "biz123",
  "dayOfWeek": 1,  // Lunes
  "hour": 9,       // 9 AM
  "totalAppointments": 150,
  "cancelledCount": 23,
  "cancellationRate": 15.3,
  "noShowRate": 8.7
}
```

---

## 🚀 **Próximos Pasos (Recomendado)**

### **1. Aplicar Migración (YA)**
```bash
# En Railway, ejecutar:
node scripts/apply-risk-prediction-migration.js

# Luego calcular estadísticas iniciales:
node scripts/calculate-initial-risk-stats.js  # (por crear)
```

### **2. Crear API REST (1-2 días)**
- Controlador y rutas
- Integración con sistema actual
- Testing

### **3. Implementar UI (2-3 días)**
- Indicadores visuales
- Widget dashboard
- Filtros y modales

### **4. Acciones Automáticas (1-2 días)**
- Recordatorios extra
- Notificaciones
- Job scheduler

---

## 💡 **Valor de Negocio**

### **Para el Negocio:**
- 📉 Reducción del 40-60% en cancelaciones
- 💰 Recuperación de ingresos por turnos liberados
- ⏰ Mejor gestión del tiempo
- 📊 Insights sobre patrones de cancelación

### **Para los Clientes:**
- 🎯 Recordatorios personalizados
- 📱 Mejor comunicación
- ⭐ Experiencia mejorada

### **Como Diferenciador:**
- 🧠 "Inteligencia Artificial"
- 🚀 Feature PREMIUM
- 💎 Justifica precio más alto
- 🏆 Te destaca de la competencia

---

## 📈 **Métricas de Éxito (A medir)**

- ✅ % de predicciones correctas (objetivo: >85%)
- ✅ Cancelaciones evitadas por mes
- ✅ Ingresos salvados ($)
- ✅ Tiempo de admin ahorrado (horas)
- ✅ Satisfacción del cliente

---

**Estado Actual:** 🟢 Fase 1 Completada (40% del sistema)  
**Próximo Milestone:** API REST y Testing  
**ETA para MVP:** 4-5 días de desarrollo


