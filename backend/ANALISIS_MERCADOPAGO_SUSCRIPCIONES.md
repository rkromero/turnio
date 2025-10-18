# Análisis de Configuración de MercadoPago para Suscripciones Recurrentes

## 📊 Estado Actual

### Sistema Implementado

Actualmente tienes **DOS métodos diferentes** para cobrar suscripciones:

1. **Suscripciones Automáticas de MercadoPago** (`subscriptionAutoController.js`)
   - Usa API de `Subscription` (PreApproval) de MercadoPago
   - Webhook: `/api/mercadopago/subscription-webhook`
   - **Problema**: Requiere permisos especiales y verificación de cuenta

2. **Pagos Únicos Manuales** (`mercadoPagoController.js`)
   - Usa API de `Preference` (Checkout Pro)
   - Webhook: `/api/mercadopago/webhook`
   - **Problema**: NO es automático - requiere que el usuario pague cada mes

### Variables de Entorno Necesarias

```env
# Token principal de MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXX (sandbox) o APP-XXXX (producción)
MERCADOPAGO_PUBLIC_KEY=TEST-XXXX o APP-XXXX

# URLs de la aplicación
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app

# OAuth (para cobros por cuenta de clientes)
MP_CLIENT_ID=6037903379451498
MP_CLIENT_SECRET=[secreto]
MP_REDIRECT_URI=https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback
MP_WEBHOOK_SECRET=[opcional para seguridad]
```

---

## 🚨 Problemas Identificados

### 1. Suscripciones Automáticas NO Funcionan Correctamente

**Síntomas:**
- Las suscripciones se crean pero no cobran automáticamente cada mes
- El scheduler intenta renovar pero depende de consultas manuales
- No hay cobro automático real de MercadoPago

**Causa Raíz:**
Las **Suscripciones Automáticas** de MercadoPago (API PreApproval) tienen limitaciones:

- ❌ Requieren validación especial de la cuenta en MP
- ❌ No están disponibles en cuentas de prueba
- ❌ Solo funcionan con cuentas verificadas y con permisos específicos
- ❌ El usuario debe autorizar débito automático desde su cuenta

### 2. Falta de Variables de Entorno

**No están configuradas en Railway:**
```env
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_PUBLIC_KEY
```

**Evidencia:**
```javascript
console.log('Access Token MercadoPago:', process.env.MERCADOPAGO_ACCESS_TOKEN);
// Probablemente muestra: undefined
```

### 3. Scheduler No Cobra Automáticamente

El `schedulerService.js` ejecuta validaciones pero **NO cobra automáticamente**:
- Solo verifica suscripciones vencidas
- Cambia status a SUSPENDED
- **NO inicia un nuevo cobro automático**

### 4. Confusión de Métodos

Hay **2 endpoints** para crear pagos:
```javascript
POST /api/mercadopago/create-payment           // Pago único (Preference)
POST /api/subscriptions-auto/create-automatic  // Suscripción recurrente (PreApproval)
```

No está claro cuál se usa actualmente.

---

## ✅ Soluciones Recomendadas

### Opción 1: **Suscripciones Manuales con Recordatorios** (Más Simple y Confiable)

**Cómo funciona:**
1. El usuario paga **una sola vez** por mes usando Checkout Pro (Preference)
2. Antes de vencer (7, 3, 1 día antes), envías **email/notificación** recordando el pago
3. Si no paga, la suscripción se suspende automáticamente
4. El usuario puede volver a pagar cuando quiera

**Ventajas:**
✅ No requiere permisos especiales de MP  
✅ Funciona en sandbox y producción  
✅ Simple de implementar y mantener  
✅ Control total sobre el flujo  
✅ Menos problemas de soporte (el usuario sabe que debe pagar)

**Desventajas:**
❌ No es completamente automático  
❌ Puede haber más cancelaciones por olvido

**Implementación:**
- Ya tienes el código base: `createSubscriptionPayment()` en `mercadoPagoController.js`
- Solo necesitas mejorar el sistema de recordatorios
- Agregar botón "Renovar Suscripción" en el frontend cuando esté próximo a vencer

---

### Opción 2: **Suscripciones Automáticas de MercadoPago** (Más Complejo)

**Cómo funciona:**
1. El usuario **autoriza débito automático** una vez
2. MercadoPago cobra automáticamente cada mes
3. Recibes webhook cuando hay un nuevo cobro

**Ventajas:**
✅ Totalmente automático  
✅ Mejor experiencia para el usuario (no tiene que recordar pagar)  
✅ Menos cancelaciones  

**Desventajas:**
❌ Requiere cuenta de MP verificada con permisos especiales  
❌ NO funciona con tokens de prueba  
❌ Más complejo de implementar y depurar  
❌ El usuario debe autorizar débito automático (algunos no quieren)  
❌ Mayor soporte (problemas con tarjetas vencidas, fondos insuficientes, etc.)

**Requerimientos:**
1. Cuenta de MercadoPago **verificada** (no sandbox)
2. Solicitar habilitación de **Suscripciones** en tu cuenta
3. Configurar webhook específico para suscripciones
4. Implementar manejo robusto de fallos de pago

---

### Opción 3: **Híbrido: Link de Pago Recurrente** (Recomendado)

**Cómo funciona:**
1. Creas un **Link de Pago de MercadoPago** con monto fijo
2. Envías ese link por email/whatsapp antes de vencer
3. El usuario paga con un solo clic (sin registrarse de nuevo)
4. Webhook confirma el pago automáticamente

**Ventajas:**
✅ Muy simple para el usuario  
✅ No requiere permisos especiales  
✅ Funciona en sandbox y producción  
✅ Más tasas de conversión que recordatorios simples  
✅ Puedes guardar el link y reutilizarlo

**Implementación:**
```javascript
// Crear link de pago reutilizable
const preference = {
  items: [{
    title: "Suscripción Plan BASIC - Mensual",
    quantity: 1,
    unit_price: 18900,
  }],
  external_reference: subscriptionId,
  notification_url: `${BACKEND_URL}/api/mercadopago/webhook`
};
```

---

## 🔧 Plan de Acción Recomendado

### PASO 1: Configurar Variables de Entorno en Railway ⚡ URGENTE

```env
# Variables que DEBES configurar YA en Railway
MERCADOPAGO_ACCESS_TOKEN=TEST-5449663282882649-061911-XXXXX  # Para pruebas
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx

# Para producción (cuando estés listo):
MERCADOPAGO_ACCESS_TOKEN=APP-xxxxx  # Token de producción
MERCADOPAGO_PUBLIC_KEY=APP-xxxxx
```

**Dónde obtener estos tokens:**
1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Selecciona tu aplicación
3. Ve a "Credenciales"
4. Copia Access Token y Public Key

### PASO 2: Decidir Qué Método Usar

**Mi recomendación: Opción 3 (Híbrido)**

Razones:
- Simple de implementar
- Funciona inmediatamente
- No requiere permisos especiales
- Buena experiencia de usuario
- Fácil de mantener

### PASO 3: Implementar Sistema de Recordatorios

Necesitas agregar:
1. **Servicio de Email/Notificaciones**
2. **Scheduler mejorado** que envíe recordatorios antes de vencer
3. **Crear link de pago** cuando la suscripción está por vencer

### PASO 4: Mejorar Webhook

El webhook actual necesita:
1. ✅ **Validación de firma** de MercadoPago (seguridad)
2. ✅ **Idempotencia** (evitar procesar el mismo webhook 2 veces)
3. ✅ **Retry logic** (reintentar si falla)
4. ✅ **Logs detallados** para debugging

---

## 📝 Checklist de Implementación

### Configuración Básica (1-2 horas)
- [ ] Configurar `MERCADOPAGO_ACCESS_TOKEN` en Railway
- [ ] Configurar `MERCADOPAGO_PUBLIC_KEY` en Railway
- [ ] Probar endpoint `/api/mercadopago/create-payment`
- [ ] Verificar que webhook reciba notificaciones

### Sistema de Renovación (3-4 horas)
- [ ] Crear servicio de notificaciones (email)
- [ ] Implementar scheduler para recordatorios (7, 3, 1 día antes)
- [ ] Crear endpoint para "Renovar Suscripción"
- [ ] Agregar botón en frontend para renovar

### Seguridad y Robustez (2-3 horas)
- [ ] Implementar validación de firma de webhook
- [ ] Agregar idempotencia a webhook
- [ ] Agregar retry logic
- [ ] Implementar logs estructurados

### Testing (2-3 horas)
- [ ] Probar flujo completo en Railway
- [ ] Probar webhook con ngrok o Railway
- [ ] Probar renovación de suscripción
- [ ] Probar suspensión por falta de pago

---

## 🎯 Recomendación Final

**Para arrancar YA:**
1. Configura las variables de entorno (10 minutos)
2. Usa el método de **Pagos Manuales con Link Reutilizable**
3. Implementa recordatorios por email antes de vencer
4. Más adelante, si necesitas, migra a suscripciones automáticas

**Código mínimo para empezar:**
```javascript
// En subscriptionController.js
const createRenewalPaymentLink = async (subscriptionId) => {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { business: true }
  });

  // Crear preferencia de pago
  const preference = new Preference(mpClient);
  const response = await preference.create({
    body: {
      items: [{
        title: `Renovación ${subscription.planType}`,
        quantity: 1,
        unit_price: subscription.priceAmount
      }],
      external_reference: subscriptionId,
      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`
    }
  });

  return response.init_point; // Link de pago
};
```

---

## ❓ Preguntas para Decidir

1. **¿Cuántos clientes activos tienes pagando?**
   - Pocos (< 10): Usa pagos manuales
   - Muchos (> 50): Considera suscripciones automáticas

2. **¿Tu cuenta de MP está verificada?**
   - No: Usa pagos manuales
   - Sí: Puedes probar suscripciones automáticas

3. **¿Necesitas que sea 100% automático?**
   - No: Pagos manuales + recordatorios es suficiente
   - Sí: Implementa suscripciones automáticas (más trabajo)

---

## 📞 Próximos Pasos

1. **URGENTE**: Configurar variables de entorno en Railway
2. Decidir qué método usar (recomiendo Opción 3)
3. Implementar el método elegido
4. Probar en Railway con cuenta de prueba
5. Migrar a producción cuando esté listo

