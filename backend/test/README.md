# 🧪 Tests del Sistema de Validación de Pagos

Este directorio contiene los tests integrales para el sistema de validación de pagos basado en scoring de clientes implementado en TurnIO.

## 🎯 Qué se está probando

### 📊 **PaymentValidationService** 
- ✅ Cliente sin historial → ambas opciones disponibles
- ⭐ Cliente confiable (>3.5★) → ambas opciones disponibles  
- ❌ Cliente riesgoso (≤3.5★) → solo pago adelantado obligatorio
- 🔍 Búsqueda por email/teléfono por separado
- 🚨 Manejo graceful de errores
- 🔄 Casos edge (scoring exacto en límite 3.5)
- 💬 Formato correcto de mensajes personalizados

### 🌐 **API Endpoints**
- `/api/payments/payment-options` → respuesta correcta
- Validación de parámetros requeridos
- Estructura de respuesta JSON

### 📝 **Flujo de Reservas**
- ✅ Reserva sin pago (cliente confiable + paymentMethod='local')
- 🚫 Reserva rechazada (cliente riesgoso + paymentMethod='local') 
- 💳 Reserva con pago online (cliente riesgoso + paymentMethod='online')
- 🔄 Validación completa del flujo end-to-end

### 📈 **Casos Especiales**
- Distribución correcta de scoring (1★-5★)
- Clasificación automática de clientes confiables vs riesgosos
- Manejo de datos inválidos (email/teléfono vacío)

---

## 🚀 Cómo ejecutar los tests

### **Prerrequisitos:**
```bash
# 1. Instalar dependencias (desde backend/)
npm install

# 2. Configurar base de datos de test (opcional)
# Crear .env.test con DATABASE_URL diferente si quieres usar DB separada
```

### **Ejecutar tests:**

```bash
# Todos los tests con detalles
npm test

# Solo tests de pagos
npm run test:payment

# Tests en modo watch (desarrollo)
npm run test:watch

# Tests específicos con pattern
npx jest payment --verbose

# Tests con cobertura
npx jest --coverage
```

---

## 📋 Estructura de los Tests

```
📊 Sistema de Validación de Pagos basado en Scoring
├── 📊 PaymentValidationService - Lógica de Scoring
│   ├── ✅ Cliente sin historial - ambas opciones disponibles
│   ├── ⭐ Cliente confiable (>3.5★) - ambas opciones disponibles
│   ├── ❌ Cliente riesgoso (≤3.5★) - solo pago adelantado
│   ├── 🔍 Búsqueda por email solamente
│   ├── 📱 Búsqueda por teléfono solamente
│   └── 🚨 Error en evaluación - opción por defecto
├── 🌐 API Endpoint - /api/payments/payment-options
│   ├── ✅ GET con email válido
│   └── ❌ GET sin email ni teléfono
├── 📝 Reservas Públicas - Validación de Pago
│   ├── ✅ Reserva sin pago (cliente confiable)
│   ├── 🚫 Reserva rechazada (cliente riesgoso sin pago)
│   └── 💳 Reserva con pago online (cliente riesgoso)
├── 🔄 Casos Edge y Manejo de Errores
│   ├── 📧 Email inválido - manejo graceful
│   ├── 📞 Teléfono inválido - manejo graceful
│   ├── 🔄 Scoring exacto en el límite (3.5)
│   └── 💬 Formato de mensajes personalizados
└── 📈 Estadísticas y Métricas del Sistema
    └── 📊 Distribución de scoring de clientes
```

---

## 🎯 Casos de Test Específicos

### **Scoring de Clientes:**
| Estrellas | Clasificación | ¿Requiere Pago? | ¿Puede pagar local? |
|-----------|---------------|------------------|---------------------|
| 5★        | Confiable     | ❌ No            | ✅ Sí               |
| 4★        | Confiable     | ❌ No            | ✅ Sí               |
| 3.5★      | **Riesgoso**  | ✅ **Sí**        | ❌ **No**           |
| 3★        | Riesgoso      | ✅ Sí            | ❌ No              |
| 2★        | Riesgoso      | ✅ Sí            | ❌ No              |
| 1★        | Riesgoso      | ✅ Sí            | ❌ No              |
| `null`    | Sin historial | ❌ No            | ✅ Sí               |

### **Flujos de Reserva:**
```
Cliente Confiable + paymentMethod='local' → ✅ CONFIRMED
Cliente Confiable + paymentMethod='online' → ✅ PENDING_PAYMENT → MercadoPago
Cliente Riesgoso + paymentMethod='local' → ❌ ERROR 400 (rejected)
Cliente Riesgoso + paymentMethod='online' → ✅ PENDING_PAYMENT → MercadoPago
Cliente Nuevo + paymentMethod='local' → ✅ CONFIRMED  
Cliente Nuevo + paymentMethod='online' → ✅ PENDING_PAYMENT → MercadoPago
```

---

## 🛠️ Setup de Datos de Prueba

Los tests automáticamente:
- ✅ Crean un negocio, sucursal, usuario y servicio de prueba
- ✅ Limpian datos entre tests
- ✅ Crean/eliminan clientes con diferentes scores
- ✅ Manejan conexión y desconexión de Prisma
- ✅ Mockean logs para tests silenciosos

---

## 📊 Métricas Esperadas

Si todos los tests pasan:
- ✅ **15+ test cases** cubriendo todos los escenarios
- ✅ **100% lógica de negocio** validada
- ✅ **API endpoints** funcionando correctamente  
- ✅ **Flujo end-to-end** completo probado
- ✅ **Manejo de errores** robusto verificado

---

## 🚨 Troubleshooting

### **Error: Database connection**
```bash
# Verificar que la base de datos esté corriendo
npm run db:push

# O configurar DB de test separada en .env.test
DATABASE_URL="postgresql://..."
```

### **Error: Jest timeout**
```bash
# Los tests usan 30s timeout por defecto
# Si siguen fallando, aumentar en setup.js:
jest.setTimeout(60000);
```

### **Error: Table does not exist**
```bash
# Aplicar migraciones a la DB de test
npm run db:setup
```

---

## 🎉 Tests Exitosos

Cuando todos los tests pasen, verás:
```
🧪 Sistema de Validación de Pagos basado en Scoring
  📊 PaymentValidationService - Lógica de Scoring
    ✅ Cliente sin historial - ambas opciones disponibles
    ⭐ Cliente confiable (>3.5★) - ambas opciones disponibles
    ❌ Cliente riesgoso (≤3.5★) - solo pago adelantado
    ...
  🌐 API Endpoint - /api/payments/payment-options  
    ✅ GET /api/payments/payment-options con email válido
    ...
  📝 Reservas Públicas - Validación de Pago
    ✅ Reserva sin pago (cliente confiable)
    🚫 Reserva rechazada (cliente riesgoso sin pago)  
    💳 Reserva con pago online (cliente riesgoso)
    ...

Test Suites: 1 passed, 1 total
Tests: 15 passed, 15 total
```

¡**Sistema completamente validado y listo para producción!** 🚀 