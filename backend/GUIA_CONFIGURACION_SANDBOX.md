# 🧪 Guía de Configuración de Sandbox - Sistemas de Pago

Esta guía te ayudará a configurar ambos sistemas de pago en modo **sandbox (pruebas)** para asegurar que todo funciona correctamente antes de pasar a producción.

---

## 📋 Resumen de Sistemas

### 1️⃣ Sistema de Suscripciones (Pago a la Plataforma)
- **Propósito:** Los negocios pagan por usar la herramienta
- **Token:** `MERCADOPAGO_ACCESS_TOKEN` (tu cuenta de MercadoPago)
- **Archivos:** `mercadoPagoController.js`

### 2️⃣ Sistema de Pagos por Turnos (Pago a Negocios)
- **Propósito:** Los clientes pagan a cada negocio por sus citas
- **Método:** OAuth (cada negocio conecta su propio MercadoPago)
- **Archivos:** `paymentController.js`, `mercadoPagoService.js`

---

## 🚀 Paso 1: Obtener Credenciales de Sandbox

### 1.1 Credenciales para Sistema de Suscripciones

1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Inicia sesión con tu cuenta de MercadoPago
3. Selecciona tu aplicación (o crea una nueva)
4. Ve a **"Credenciales"**
5. Busca la sección **"Credenciales de prueba"** (Sandbox)

**Necesitas:**
- `Access Token` (debe empezar con `TEST-`)
- `Public Key` (debe empezar con `TEST-`)

**Ejemplo:**
```
MERCADOPAGO_ACCESS_TOKEN=TEST-5449663282882649-061911-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

### 1.2 Credenciales para Sistema de Pagos por Turnos (OAuth)

1. En el mismo panel de MercadoPago, ve a **"Credenciales de producción"**
   - ⚠️ **Nota:** Aunque dice "producción", estas credenciales funcionan también en sandbox para OAuth

2. Busca:
   - `Client ID` (número largo)
   - `Client Secret` (string largo)

**Ejemplo:**
```
MP_CLIENT_ID=6037903379451498
MP_CLIENT_SECRET=xxxxx-xxxxx-xxxxx
```

3. Configura la URL de redirección:
   - Ve a **"URLs de redirección"** en el panel
   - Agrega: `https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback`
   - O tu URL de frontend + `/dashboard/settings/payments/callback`

---

## 🔧 Paso 2: Configurar Variables en Railway

### 2.1 Acceder a Railway

1. Ve a: https://railway.app
2. Inicia sesión
3. Selecciona tu proyecto **TurnIO**
4. Selecciona el servicio **turnio-backend-production**

### 2.2 Agregar Variables de Entorno

1. Haz clic en la pestaña **"Variables"**
2. Haz clic en **"New Variable"**
3. Agrega cada una de estas variables:

#### Variables para Sistema de Suscripciones:
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

#### Variables para Sistema de Pagos por Turnos:
```env
MP_CLIENT_ID=6037903379451498
MP_CLIENT_SECRET=xxxxx-xxxxx-xxxxx
MP_REDIRECT_URI=https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback
```

#### Variables de URLs (si no las tienes):
```env
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

4. Haz clic en **"Deploy"** para aplicar los cambios

---

## ✅ Paso 3: Verificar Configuración

### 3.1 Ejecutar Script de Verificación

Una vez que Railway haya desplegado los cambios, ejecuta el script de verificación:

**Opción 1: Desde Railway CLI**
```bash
railway run node scripts/test-sandbox-payments.js
```

**Opción 2: Desde el contenedor de Railway**
1. Ve a Railway → tu servicio backend
2. Haz clic en "View Logs"
3. Abre una terminal (si está disponible)
4. Ejecuta:
```bash
node scripts/test-sandbox-payments.js
```

**Opción 3: Desde tu máquina local (si tienes acceso a la BD)**
```bash
cd backend
node scripts/test-sandbox-payments.js
```

### 3.2 Resultado Esperado

El script debería mostrar:

```
✅ Sistema de Suscripciones: FUNCIONAL
✅ Sistema de Pagos por Turnos: FUNCIONAL
✅ Base de Datos: CONECTADA

🎉 ¡TODOS LOS SISTEMAS ESTÁN FUNCIONANDO CORRECTAMENTE!
```

Si hay errores, el script te indicará qué falta configurar.

---

## 🔗 Paso 4: Configurar Webhooks en MercadoPago

### 4.1 Acceder al Panel de Webhooks

1. Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
2. Inicia sesión
3. Selecciona tu aplicación

### 4.2 Configurar URLs de Webhook

Agrega estas URLs:

**Para Sistema de Suscripciones:**
```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/webhook
Eventos: payment
```

**Para Sistema de Suscripciones Automáticas (opcional):**
```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/subscription-webhook
Eventos: subscription_authorized_payment
```

**Para Sistema de Pagos por Turnos:**
```
URL: https://turnio-backend-production.up.railway.app/api/payments/webhook
Eventos: payment
```

### 4.3 Verificar Webhooks

MercadoPago enviará una notificación de prueba. Verifica en los logs de Railway que se recibió correctamente.

---

## 🧪 Paso 5: Probar Ambos Sistemas

### 5.1 Probar Sistema de Suscripciones

1. **Crear una suscripción de prueba:**
   - Ve al frontend: `/dashboard/subscription`
   - Selecciona un plan (ej: BASIC)
   - Haz clic en "Pagar"
   - Deberías ser redirigido a MercadoPago

2. **Pagar con tarjeta de prueba:**
   - Usa una tarjeta de prueba de MercadoPago
   - **Tarjeta aprobada:** `5031 7557 3453 0604`
   - **CVV:** 123
   - **Vencimiento:** Cualquier fecha futura
   - **Nombre:** APRO

3. **Verificar resultado:**
   - Deberías ser redirigido a `/subscription/success`
   - Verifica en la base de datos que el `Payment.status` sea `APPROVED`
   - Verifica que `Subscription.status` sea `ACTIVE`

### 5.2 Probar Sistema de Pagos por Turnos

1. **Conectar un negocio a MercadoPago:**
   - Ve al frontend: `/dashboard/settings/payments`
   - Haz clic en "Conectar MercadoPago"
   - Serás redirigido a MercadoPago para autorizar
   - Después de autorizar, serás redirigido de vuelta
   - Verifica que el negocio tenga `mp_connected = true` en la BD

2. **Crear una cita con pago:**
   - Crea una cita desde el frontend
   - Selecciona un servicio con precio
   - Haz clic en "Pagar ahora" o similar
   - Deberías ser redirigido a MercadoPago

3. **Pagar con tarjeta de prueba:**
   - Usa la misma tarjeta de prueba
   - Completa el pago

4. **Verificar resultado:**
   - Deberías ser redirigido a `/booking/payment/success`
   - Verifica en la BD que `AppointmentPayment.status` sea `approved`
   - Verifica que `Appointment.payment_status` sea `paid`

---

## 🐛 Solución de Problemas

### Error: "MERCADOPAGO_ACCESS_TOKEN no definido"

**Solución:**
1. Verifica que agregaste la variable en Railway
2. Verifica que hiciste "Deploy" después de agregarla
3. Verifica que no hay espacios al inicio o final del token
4. Verifica que el token empiece con `TEST-` (para sandbox)

### Error: "MP_CLIENT_ID no definido"

**Solución:**
1. Verifica que agregaste `MP_CLIENT_ID` en Railway
2. Verifica que agregaste `MP_CLIENT_SECRET` también
3. Verifica que hiciste "Deploy"

### Error: "Invalid redirect_uri"

**Solución:**
1. Verifica que `MP_REDIRECT_URI` esté configurado correctamente
2. Verifica que la misma URL esté agregada en el panel de MercadoPago
3. Verifica que no haya espacios o caracteres especiales

### Error: "OAuth error: invalid_client"

**Solución:**
1. Verifica que `MP_CLIENT_ID` y `MP_CLIENT_SECRET` sean correctos
2. Verifica que sean las credenciales de "producción" (aunque uses sandbox)
3. Regenera las credenciales en el panel de MercadoPago si es necesario

### Webhook no se recibe

**Solución:**
1. Verifica que la URL del webhook sea accesible públicamente
2. Verifica que esté configurada en el panel de MercadoPago
3. Verifica los logs de Railway para ver si hay errores
4. Usa ngrok o similar para probar localmente

---

## 📊 Checklist de Verificación

### Configuración Básica
- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado (empieza con `TEST-`)
- [ ] `MERCADOPAGO_PUBLIC_KEY` configurado (empieza con `TEST-`)
- [ ] `MP_CLIENT_ID` configurado
- [ ] `MP_CLIENT_SECRET` configurado
- [ ] `MP_REDIRECT_URI` configurado
- [ ] `BACKEND_URL` configurado
- [ ] `FRONTEND_URL` configurado

### Verificación
- [ ] Script `test-sandbox-payments.js` ejecuta sin errores
- [ ] Sistema de Suscripciones: ✅ FUNCIONAL
- [ ] Sistema de Pagos por Turnos: ✅ FUNCIONAL

### Webhooks
- [ ] Webhook de suscripciones configurado en MercadoPago
- [ ] Webhook de pagos por turnos configurado en MercadoPago
- [ ] Webhooks recibiendo notificaciones (verificar logs)

### Pruebas
- [ ] Crear suscripción funciona
- [ ] Pagar suscripción funciona
- [ ] Conectar negocio a MP funciona
- [ ] Crear pago por turno funciona
- [ ] Pagar turno funciona

---

## 🎯 Próximos Pasos

Una vez que ambos sistemas funcionen en sandbox:

1. **Probar flujos completos** varias veces
2. **Verificar que los webhooks procesen correctamente**
3. **Revisar logs** para asegurar que no hay errores
4. **Documentar cualquier problema encontrado**
5. **Cuando estés listo para producción:**
   - Cambia `TEST-` por `APP-` en los tokens
   - Actualiza las URLs si es necesario
   - Prueba nuevamente en producción

---

## 📞 Recursos Útiles

- **Panel de MercadoPago:** https://www.mercadopago.com.ar/developers/panel
- **Documentación de MercadoPago:** https://www.mercadopago.com.ar/developers/es/docs
- **Tarjetas de Prueba:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards
- **Webhooks:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

---

**Última actualización:** 2024-12-19

