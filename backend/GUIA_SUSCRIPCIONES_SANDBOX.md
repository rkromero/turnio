# 💳 Guía de Configuración de Suscripciones en Sandbox

Esta guía te ayudará a configurar y probar el **sistema de suscripciones** (pago a la plataforma) en modo sandbox.

---

## 🎯 ¿Qué es el Sistema de Suscripciones?

Este sistema permite que los **negocios paguen a la plataforma** por usar la herramienta. Los negocios pueden elegir entre diferentes planes (FREE, BASIC, PREMIUM, ENTERPRISE) y pagar mensual o anualmente.

---

## 📋 Paso 1: Obtener Credenciales de Sandbox

### 1.1 Acceder al Panel de MercadoPago

1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Inicia sesión con tu cuenta de MercadoPago
3. Selecciona tu aplicación (o crea una nueva si no tienes)

### 1.2 Obtener Credenciales de Prueba

1. En el panel, ve a **"Credenciales"**
2. Busca la sección **"Credenciales de prueba"** (Sandbox)
3. Necesitas dos valores:

**Access Token:**
- Debe empezar con `TEST-`
- Ejemplo: `TEST-5449663282882649-061911-xxxxx`

**Public Key:**
- Debe empezar con `TEST-`
- Ejemplo: `TEST-xxxxx-xxxxx-xxxxx`

⚠️ **IMPORTANTE:** Asegúrate de copiar los valores completos sin espacios al inicio o final.

---

## 🔧 Paso 2: Configurar en Railway

### 2.1 Acceder a Railway

1. Ve a: https://railway.app
2. Inicia sesión
3. Selecciona tu proyecto **TurnIO**
4. Selecciona el servicio **turnio-backend-production**

### 2.2 Agregar Variables de Entorno

1. Haz clic en la pestaña **"Variables"**
2. Haz clic en **"New Variable"**
3. Agrega estas variables:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

**También verifica que tengas estas URLs configuradas:**
```env
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

4. Haz clic en **"Deploy"** para aplicar los cambios

⚠️ **IMPORTANTE:** 
- Reemplaza `TEST-xxxxx` con tus credenciales reales
- No agregues comillas alrededor de los valores
- No dejes espacios al inicio o final

---

## ✅ Paso 3: Verificar Configuración

### 3.1 Ejecutar Script de Verificación

Una vez que Railway haya desplegado los cambios, ejecuta el script de verificación:

**Opción 1: Desde Railway CLI**
```bash
railway run node scripts/test-suscripciones-sandbox.js
```

**Opción 2: Desde el contenedor de Railway**
1. Ve a Railway → tu servicio backend
2. Haz clic en "View Logs"
3. Abre una terminal (si está disponible)
4. Ejecuta:
```bash
node scripts/test-suscripciones-sandbox.js
```

**Opción 3: Desde tu máquina local (si tienes acceso a la BD)**
```bash
cd backend
node scripts/test-suscripciones-sandbox.js
```

### 3.2 Resultado Esperado

El script debería mostrar:

```
✅ Variables de entorno: CONFIGURADAS
✅ Conexión con MercadoPago: FUNCIONAL
✅ Configuración de Webhook: VERIFICADA
✅ Base de datos: CONECTADA

🎉 ¡EL SISTEMA DE SUSCRIPCIONES ESTÁ LISTO PARA PROBAR!
```

Si hay errores, el script te indicará qué falta configurar.

---

## 🔗 Paso 4: Configurar Webhook en MercadoPago

### 4.1 Acceder al Panel de Webhooks

1. Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
2. Inicia sesión
3. Selecciona tu aplicación

### 4.2 Configurar URL de Webhook

Agrega esta URL:

```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/webhook
Eventos: payment
```

**También puedes agregar (opcional):**
```
URL: https://turnio-backend-production.up.railway.app/api/mercadopago/subscription-webhook
Eventos: subscription_authorized_payment
```

### 4.3 Verificar Webhook

MercadoPago enviará una notificación de prueba. Verifica en los logs de Railway que se recibió correctamente.

---

## 🧪 Paso 5: Probar el Sistema

### 5.1 Crear una Suscripción de Prueba

1. **Ve al frontend:**
   - URL: `https://turnio-frontend-production.up.railway.app`
   - Inicia sesión o regístrate

2. **Selecciona un plan:**
   - Ve a la sección de suscripciones
   - Selecciona un plan (ej: BASIC)
   - Elige ciclo de facturación (Mensual o Anual)

3. **Haz clic en "Pagar" o "Contratar"**
   - Deberías ser redirigido a MercadoPago

### 5.2 Pagar con Tarjeta de Prueba

**Tarjeta APROBADA (recomendada para pruebas):**
- **Número:** `5031 7557 3453 0604`
- **CVV:** `123`
- **Vencimiento:** Cualquier fecha futura (ej: 12/25)
- **Nombre:** `APRO`

**Otras tarjetas de prueba:**
- **Rechazada:** `5031 4332 1540 6351` (Nombre: OTHE)
- **Pendiente:** `5031 7557 3453 0604` (Nombre: CONT)

📚 **Más tarjetas:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

### 5.3 Verificar Resultado

1. **Después del pago:**
   - Deberías ser redirigido a `/subscription/success`
   - Verifica que veas un mensaje de éxito

2. **Verificar en la base de datos:**
   - `Payment.status` debe ser `APPROVED`
   - `Subscription.status` debe ser `ACTIVE`
   - `Business.planType` debe ser el plan seleccionado

3. **Verificar logs de Railway:**
   - Deberías ver logs del webhook recibido
   - Deberías ver que el pago se procesó correctamente

---

## 🐛 Solución de Problemas

### Error: "MERCADOPAGO_ACCESS_TOKEN no definido"

**Solución:**
1. Verifica que agregaste la variable en Railway
2. Verifica que hiciste "Deploy" después de agregarla
3. Verifica que no hay espacios al inicio o final del token
4. Verifica que el token empiece con `TEST-` (para sandbox)

### Error: "Invalid access token"

**Solución:**
1. Verifica que el token sea correcto
2. Verifica que no haya expirado (regenera si es necesario)
3. Verifica que sea el token de "prueba" (no de producción)
4. Regenera el token en el panel de MercadoPago

### Error: "Webhook no se recibe"

**Solución:**
1. Verifica que la URL del webhook sea accesible públicamente
2. Verifica que esté configurada en el panel de MercadoPago
3. Verifica los logs de Railway para ver si hay errores
4. Verifica que Railway esté desplegado y funcionando

### Error: "Payment not found" en webhook

**Solución:**
1. Verifica que el `external_reference` coincida con el `Payment.id`
2. Verifica que el pago se creó correctamente antes del webhook
3. Revisa los logs para ver qué `external_reference` recibió el webhook

### El pago se aprueba pero no se actualiza la suscripción

**Solución:**
1. Verifica que el webhook se recibió correctamente
2. Verifica los logs del webhook para ver si hay errores
3. Verifica que el código del webhook esté procesando correctamente
4. Revisa `backend/src/controllers/mercadoPagoController.js` línea 418-512

---

## 📊 Flujo Completo del Sistema

```
1. Usuario selecciona plan en frontend
   ↓
2. Frontend llama: POST /api/subscriptions/create
   ↓
3. Backend crea Subscription y Payment (PENDING)
   ↓
4. Frontend llama: POST /api/mercadopago/create-payment
   ↓
5. Backend crea Preference en MercadoPago
   ↓
6. Frontend redirige a init_point de MercadoPago
   ↓
7. Usuario completa pago en MercadoPago
   ↓
8. MercadoPago envía webhook: POST /api/mercadopago/webhook
   ↓
9. Backend actualiza Payment (APPROVED) y Subscription (ACTIVE)
   ↓
10. MercadoPago redirige a frontend (success/failure)
```

---

## 📋 Checklist de Verificación

### Configuración
- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado (empieza con `TEST-`)
- [ ] `MERCADOPAGO_PUBLIC_KEY` configurado (empieza con `TEST-`)
- [ ] `BACKEND_URL` configurado
- [ ] `FRONTEND_URL` configurado
- [ ] Variables desplegadas en Railway

### Verificación
- [ ] Script `test-suscripciones-sandbox.js` ejecuta sin errores
- [ ] Conexión con MercadoPago: ✅ FUNCIONAL
- [ ] Base de datos: ✅ CONECTADA

### Webhook
- [ ] Webhook configurado en panel de MercadoPago
- [ ] Webhook recibiendo notificaciones (verificar logs)

### Pruebas
- [ ] Crear suscripción funciona
- [ ] Pagar suscripción funciona
- [ ] Webhook procesa pago correctamente
- [ ] Suscripción se activa después del pago

---

## 🎯 Próximos Pasos

Una vez que el sistema funcione en sandbox:

1. **Probar todos los planes** (FREE, BASIC, PREMIUM, ENTERPRISE)
2. **Probar ambos ciclos** (Mensual y Anual)
3. **Probar upgrades** de plan
4. **Verificar webhooks** en diferentes escenarios
5. **Revisar logs** para asegurar que no hay errores
6. **Cuando estés listo para producción:**
   - Cambia `TEST-` por `APP-` en los tokens
   - Actualiza las URLs si es necesario
   - Prueba nuevamente en producción

---

## 📞 Recursos Útiles

- **Panel de MercadoPago:** https://www.mercadopago.com.ar/developers/panel
- **Documentación de Checkout Pro:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro
- **Tarjetas de Prueba:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards
- **Webhooks:** https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

---

**Última actualización:** 2024-12-19

