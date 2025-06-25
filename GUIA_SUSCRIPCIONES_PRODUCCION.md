# 🚀 Guía Completa: Sistema de Suscripciones Automáticas

## 📋 Resumen del Sistema

Tu sistema TurnIO ya tiene implementado un **sistema completo de suscripciones automáticas** que permite:

✅ **Cobro automático mensual/anual**  
✅ **Renovación automática de suscripciones**  
✅ **Manejo de pagos fallidos**  
✅ **Webhooks de MercadoPago configurados**  
✅ **Proceso de verificación de vencimientos**  

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Asegúrate de tener estas variables configuradas en Railway:

```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...

# URLs del sistema
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app

# Base de datos (Railway la configura automáticamente)
DATABASE_URL=postgresql://...
```

### 2. Configuración de MercadoPago

#### A. Crear Aplicación en MercadoPago

1. Ve a [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
2. Crea una nueva aplicación tipo "Web"
3. Copia el `Access Token` y `Public Key`

#### B. Configurar Webhooks

En tu aplicación de MercadoPago, configura estos webhooks:

**Webhook para pagos únicos:**
```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/webhook
Eventos: payment
```

**Webhook para suscripciones automáticas:**
```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/subscription-webhook
Eventos: subscription_authorized_payment
```

---

## 🧪 Pruebas del Sistema

### Opción 1: Pruebas Rápidas (Recomendado)

Ejecuta el script de pruebas completo:

```bash
# Flujo completo automatizado (2 minutos)
node test-auto-subscription-complete.js full

# O paso a paso:
node test-auto-subscription-complete.js setup    # Verificar configuración
node test-auto-subscription-complete.js create   # Crear suscripción de prueba
node test-auto-subscription-complete.js check    # Verificar vencimientos
node test-auto-subscription-complete.js webhook  # Simular cobro automático
node test-auto-subscription-complete.js cleanup  # Limpiar datos
```

### Opción 2: Pruebas Manuales

```bash
# 1. Verificar configuración
node test-mercadopago-config.js

# 2. Probar creación de suscripción
node test-subscription-flow.js

# 3. Verificar proceso de renovación
node test-recurring-payment.js
```

---

## 🔄 Cómo Funciona el Cobro Automático

### Flujo Normal
```
1. Usuario selecciona plan pago
2. Sistema crea suscripción con MercadoPago
3. Usuario paga la primera vez
4. MercadoPago cobra automáticamente cada 30 días
5. Sistema recibe webhook y actualiza suscripción
```

### Proceso de Verificación Automática

El sistema verifica suscripciones vencidas **cada 6 horas**:

```javascript
// Configurado en backend/schedulerService.js
setInterval(() => {
  checkExpiredSubscriptions(); // Cada 6 horas
}, 6 * 60 * 60 * 1000);
```

---

## 🎯 Configuración de Precios

Los precios están definidos en el frontend:

```typescript
// frontend/src/types/plans.ts
export const PLAN_PRICES = {
  BASIC: {
    monthly: 4900,  // $49 ARS
    yearly: 49000   // $490 ARS (10% descuento)
  },
  PREMIUM: {
    monthly: 9900,  // $99 ARS
    yearly: 99000   // $990 ARS
  },
  ENTERPRISE: {
    monthly: 19900, // $199 ARS
    yearly: 199000  // $1990 ARS
  }
};
```

---

## 📊 Monitoreo y Logs

### Logs Importantes a Buscar

```bash
# En Railway, busca estos logs:
💳 Creando suscripción automática de MercadoPago
✅ Suscripción automática creada exitosamente
🔔 Webhook de suscripción automática recibido
💳 Pago automático recibido
✅ Pago automático procesado
```

### Verificar Estado de Suscripciones

```bash
# Verificar suscripciones en la BD
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.subscription.findMany({
  include: { business: true, payments: true }
}).then(console.log);
"
```

---

## 🚨 Manejo de Errores

### Pago Fallido
- MercadoPago intenta cobrar
- Si falla, envía webhook con status `rejected`
- Sistema marca suscripción como `PAYMENT_FAILED`
- Usuario recibe notificación (implementar)
- Sistema permite reintentar

### Webhook No Recibido
- Sistema verifica vencimientos cada 6 horas
- Si suscripción vencida, intenta procesar automáticamente
- Si tiene `mercadoPagoSubscriptionId`, consulta estado en MercadoPago

---

## ⚡ Activación del Sistema

### Para Ambiente de Desarrollo
```bash
# Iniciar backend con scheduler
cd backend
npm start

# El scheduler se inicia automáticamente
```

### Para Producción en Railway
El sistema ya está configurado para iniciar automáticamente cuando se despliega.

---

## 🔧 Endpoints Principales

### Frontend → Backend

```javascript
// Crear suscripción automática
POST /api/mercadopago/create-automatic-subscription
Body: { subscriptionId: "sub_123" }

// Crear pago único (fallback)
POST /api/mercadopago/create-payment
Body: { subscriptionId: "sub_123" }
```

### MercadoPago → Backend (Webhooks)

```javascript
// Webhook para pagos únicos
POST /api/mercadopago/webhook

// Webhook para suscripciones automáticas
POST /api/mercadopago/subscription-webhook
```

---

## 🎉 Resultado Final

Después de la configuración, tu sistema:

✅ **Cobra automáticamente cada 30 días**  
✅ **Renueva suscripciones automáticamente**  
✅ **Maneja pagos fallidos**  
✅ **Actualiza planes de negocios**  
✅ **Envía notificaciones via webhook**  
✅ **Verifica vencimientos periódicamente**  

---

## 📞 Solución de Problemas

### Problema: Webhook no llega
```bash
# Verificar URL del webhook
echo $BACKEND_URL/api/mercadopago/subscription-webhook

# Probar manualmente
curl -X POST $BACKEND_URL/api/mercadopago/subscription-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"subscription_authorized_payment","data":{"id":"test"}}'
```

### Problema: Suscripción no se renueva
```bash
# Ejecutar verificación manual
node -e "
const { checkExpiredSubscriptions } = require('./backend/src/controllers/subscriptionAutoController');
checkExpiredSubscriptions();
"
```

### Problema: Variables de entorno faltantes
```bash
# Verificar en Railway
node test-auto-subscription-complete.js setup
```

---

## 🎯 Próximos Pasos

1. **Configurar MercadoPago** según la sección anterior
2. **Ejecutar pruebas** con el script de pruebas
3. **Verificar webhooks** en el panel de MercadoPago
4. **Monitorear logs** en Railway
5. **Probar con usuarios reales** (usar modo sandbox primero)

¡Tu sistema de suscripciones automáticas está listo! 🚀 