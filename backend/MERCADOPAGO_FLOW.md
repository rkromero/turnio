# Flujo de MercadoPago - TurnIO

## 🔗 Integración Actual

### Configuración
- SDK: `mercadopago` v2.7.0
- Token: `TEST-5449663282882649-061911...` (sandbox)
- Cliente: `MercadoPagoConfig` + `Payment`, `Preference`, `PreApproval`

### Endpoints Webhook
1. `/api/mercadopago/webhook` - Pagos únicos
2. `/api/subscriptions-auto/webhook` - Suscripciones automáticas

---

## 📋 Flujo de Upgrade de Plan

### Paso 1: Usuario solicita upgrade
```
Frontend → POST /api/subscriptions/change-plan
{
  subscriptionId: "...",
  newPlanType: "BASIC"
}
```

### Paso 2: Backend crea Payment PENDING
```javascript
Payment.create({
  subscriptionId,
  amount: 18900,
  status: 'PENDING',
  paymentMethod: "plan_upgrade_FREE_to_BASIC"
})

Subscription.update({
  metadata: {
    pendingUpgrade: {
      paymentId,
      fromPlan: "FREE",
      toPlan: "BASIC",
      amount: 18900
    }
  }
})
```

### Paso 3: Frontend crea checkout
```
Frontend → POST /api/subscriptions/create-payment
{
  subscriptionId: "..."
}

Response: {
  initPoint: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}

Frontend → window.location.href = initPoint
```

### Paso 4: Usuario paga en MercadoPago
- Usuario completa pago
- MP redirige a success/failure/pending URL
- MP envía webhook a nuestro backend

### Paso 5: Webhook procesa pago
```
MercadoPago → POST /api/mercadopago/webhook
{
  type: "payment",
  data: { id: "mp_payment_id" }
}
```

**⚠️ PROBLEMA ACTUAL**: El webhook solo actualiza Payment.status y Subscription.status, pero **NO** procesa upgrades pendientes.

```javascript
// Código actual en handleWebhook (líneas 436-445)
if (newStatus === 'APPROVED') {
  await prisma.subscription.update({
    where: { id: payment.subscription.id },
    data: { status: 'ACTIVE' }
  });
  await prisma.business.update({
    where: { id: payment.subscription.businessId },
    data: { planType: payment.subscription.planType } // ❌ INCORRECTO
  });
}
```

**Problema**: Actualiza `Business.planType` con el plan ACTUAL de Subscription, no con el nuevo plan del upgrade pendiente.

---

## ✅ Flujo Correcto de Upgrade

### Webhook mejorado debe:

1. **Detectar upgrade pendiente**
```javascript
const pendingUpgrade = payment.subscription.metadata?.pendingUpgrade;
if (pendingUpgrade && newStatus === 'APPROVED') {
  // Procesar upgrade
}
```

2. **Llamar a processUpgradePayment()**
```javascript
await PlanChangeService.processUpgradePayment(payment.id);
```

3. **processUpgradePayment() hace:**
```javascript
// Actualizar Subscription
await prisma.subscription.update({
  data: {
    planType: pendingUpgrade.toPlan,  // ✅ Nuevo plan
    status: 'ACTIVE',
    nextBillingDate: new Date() + 1 mes,
    metadata: {
      ...sin pendingUpgrade  // Limpiar
    }
  }
});

// Actualizar Business
await prisma.business.update({
  data: {
    planType: pendingUpgrade.toPlan,  // ✅ Nuevo plan
    maxAppointments: getPlanLimits(pendingUpgrade.toPlan).appointments
  }
});
```

---

## 🔧 Fix Requerido

### Archivo: `backend/src/controllers/mercadoPagoController.js`

**Línea 436-445** (handleWebhook):

```javascript
// ❌ ANTES (incorrecto)
if (newStatus === 'APPROVED') {
  await prisma.subscription.update({
    where: { id: payment.subscription.id },
    data: { status: 'ACTIVE' }
  });
  await prisma.business.update({
    where: { id: payment.subscription.businessId },
    data: { planType: payment.subscription.planType }
  });
}

// ✅ DESPUÉS (correcto)
if (newStatus === 'APPROVED') {
  // Verificar si hay upgrade pendiente
  const pendingUpgrade = payment.subscription.metadata?.pendingUpgrade;
  
  if (pendingUpgrade && pendingUpgrade.paymentId === payment.id) {
    // Es un pago de upgrade, procesarlo con el servicio
    console.log('🔄 Procesando upgrade pendiente...');
    const PlanChangeService = require('../services/planChangeService');
    await PlanChangeService.processUpgradePayment(payment.id);
  } else {
    // Pago regular (nueva suscripción o renovación)
    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: 'ACTIVE' }
    });
    await prisma.business.update({
      where: { id: payment.subscription.businessId },
      data: { planType: payment.subscription.planType }
    });
  }
}
```

---

## 🧪 Testing en Railway

### 1. Crear negocio con plan FREE

### 2. Solicitar upgrade a BASIC
```bash
curl -X POST https://turnio-backend-production.up.railway.app/api/subscriptions/change-plan \
  -H "Cookie: token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "...",
    "newPlanType": "BASIC"
  }'
```

### 3. Obtener payment ID de la respuesta

### 4. Crear checkout y pagar en sandbox de MP

### 5. Verificar logs del webhook

### 6. Verificar que:
- Payment.status = APPROVED
- Subscription.planType = BASIC
- Subscription.metadata.pendingUpgrade = null
- Business.planType = BASIC

---

## 📌 URLs Importantes

### Sandbox MercadoPago
- Checkout: https://www.mercadopago.com.ar/checkout/v1/redirect
- Dashboard: https://www.mercadopago.com.ar/developers/panel
- Webhooks: https://www.mercadopago.com.ar/developers/panel/webhooks

### URLs de Railway (producción)
- Backend: https://turnio-backend-production.up.railway.app
- Frontend: https://turnio-frontend-production.up.railway.app
- Webhook: https://turnio-backend-production.up.railway.app/api/mercadopago/webhook

### URLs de callback
```javascript
success_url: "https://turnio-frontend-production.up.railway.app/payment/success"
failure_url: "https://turnio-frontend-production.up.railway.app/payment/failure"
pending_url: "https://turnio-frontend-production.up.railway.app/payment/pending"
```

---

## 🔐 Seguridad

### Validar webhook de MercadoPago
```javascript
// TODO: Implementar validación de firma
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#editor_3
```

### Variables de entorno requeridas
```
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_PUBLIC_KEY=TEST-...
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

---

## 📊 Estados de Pago

### Estados MP → Nuestros estados
| MercadoPago | TurnIO | Acción |
|-------------|--------|--------|
| `approved` | `APPROVED` | Activar plan |
| `rejected` | `REJECTED` | Mantener plan actual |
| `cancelled` | `REJECTED` | Mantener plan actual |
| `pending` | `PENDING` | Esperar |
| `in_process` | `PENDING` | Esperar |
| `authorized` | `PENDING` | Esperar capture |

---

## ⚠️ Problemas Conocidos

1. **Upgrade no se procesa**: Webhook no llama a `processUpgradePayment()`
2. **No hay validación de firma**: Webhooks pueden ser falsos
3. **No hay retry**: Si webhook falla, pago queda pendiente
4. **No hay timeout**: Pagos pendientes indefinidamente

---

## 🚀 Próximos pasos

- [ ] Fix webhook para procesar upgrades
- [ ] Implementar validación de firma MP
- [ ] Agregar retry logic para webhooks
- [ ] Agregar timeout para pagos pendientes
- [ ] Tests E2E del flujo completo
- [ ] Monitoreo de webhooks fallidos

