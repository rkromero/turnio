# 🚀 Guía de Implementación en Railway

## Paso 1: Configurar Variables de Entorno (⚡ URGENTE - 10 minutos)

### 1.1 Obtener Credenciales de MercadoPago

1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación (o crea una nueva)
4. Ve a **"Credenciales"**

#### Para PRUEBAS (Sandbox):
```
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxx-xxxx-xxxx-xxxx
```

#### Para PRODUCCIÓN (cuando estés listo):
```
MERCADOPAGO_ACCESS_TOKEN=APP-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_PUBLIC_KEY=APP-xxxx-xxxx-xxxx-xxxx
```

### 1.2 Configurar en Railway

1. Ve a: https://railway.app
2. Abre tu proyecto **TurnIO**
3. Selecciona el servicio **turnio-backend-production**
4. Click en **"Variables"**
5. Agrega las siguientes variables:

```env
# Credenciales de MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx-xxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxx-xxxx-xxxx-xxxx

# URLs (probablemente ya las tienes configuradas)
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app

# Habilitar scheduler de renovaciones
ENABLE_SUBSCRIPTION_SCHEDULER=true
```

6. Click en **"Deploy"** para aplicar cambios

### 1.3 Verificar Configuración

Después del deploy, ejecuta el script de verificación:

```bash
# Conectarte al contenedor de Railway y ejecutar:
node scripts/verify-mercadopago-config.js
```

O desde el navegador, accede a:
```
https://turnio-backend-production.up.railway.app/api/debug/scheduler-status
```

---

## Paso 2: Configurar Webhooks en MercadoPago (15 minutos)

### 2.1 Acceder al Panel de Webhooks

1. Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
2. Click en **"Configurar notificaciones"**
3. Selecciona tu aplicación

### 2.2 Configurar URLs de Webhook

Agrega estas URLs:

```
URL de Pagos:
https://turnio-backend-production.up.railway.app/api/mercadopago/webhook

URL de Suscripciones:
https://turnio-backend-production.up.railway.app/api/mercadopago/subscription-webhook
```

### 2.3 Eventos a Escuchar

Marca estos eventos:
- ✅ **Payments**: approved, rejected, cancelled
- ✅ **Merchant Orders**: created, updated
- ✅ **Subscriptions**: authorized_payment (si usas suscripciones automáticas)

### 2.4 Probar Webhook

1. En el panel de MP, usa la función de "Simular notificación"
2. Revisa los logs de Railway para ver si llegó
3. Endpoint para ver logs:
```
https://turnio-backend-production.up.railway.app/api/debug/scheduler-status
```

---

## Paso 3: Probar el Sistema (30 minutos)

### 3.1 Verificar Conexión con MercadoPago

```bash
# En Railway, ejecuta:
node scripts/verify-mercadopago-config.js
```

Deberías ver:
```
✅ MERCADOPAGO_ACCESS_TOKEN: Configurado
✅ MERCADOPAGO_PUBLIC_KEY: Configurado
✅ Conexión exitosa con MercadoPago API
```

### 3.2 Probar Creación de Suscripción

1. Ve al frontend: `https://turnio-frontend-production.up.railway.app`
2. Regístrate o inicia sesión
3. Ve a **Configuración > Suscripción**
4. Selecciona **Plan BASIC**
5. Click en **"Contratar Plan"**

Deberías ver:
- Se crea una suscripción en la BD con status `PAYMENT_FAILED`
- Se redirige a MercadoPago checkout
- URL de pago válida

### 3.3 Probar Flujo Completo de Pago

1. En el checkout de MP, usa **tarjeta de prueba**:
   ```
   Tarjeta aprobada:
   Número: 5031 7557 3453 0604
   CVV: 123
   Vencimiento: 11/25
   Nombre: APRO
   ```

2. Completa el pago

3. Verifica que:
   - El webhook recibe la notificación
   - El payment se actualiza a status `APPROVED`
   - La suscripción se activa
   - El plan del negocio se actualiza

### 3.4 Probar Sistema de Recordatorios

Para probar sin esperar días, usa el endpoint de testing:

```bash
# Hacer POST request:
curl -X POST https://turnio-backend-production.up.railway.app/api/debug/test-renewal-reminders
```

O desde el navegador con una extensión como **Thunder Client**:
```
POST https://turnio-backend-production.up.railway.app/api/debug/test-renewal-reminders
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Tareas de renovación ejecutadas",
  "data": {
    "upcomingExpirations": {
      "total": X,
      "processed": Y
    },
    "suspensions": {
      "total": A,
      "suspended": B
    }
  }
}
```

---

## Paso 4: Monitorear el Sistema (Continuo)

### 4.1 Ver Logs en Railway

1. Ve a tu proyecto en Railway
2. Selecciona **turnio-backend-production**
3. Click en **"View Logs"**

Busca estos logs:
```
✅ Scheduler de validaciones iniciado
✅ Scheduler de recordatorios de renovación iniciado
🔍 Ejecutando tareas de renovación inicial...
```

### 4.2 Verificar Estado del Scheduler

```bash
GET https://turnio-backend-production.up.railway.app/api/debug/scheduler-status
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "validationScheduler": true,
    "renewalScheduler": true,
    "activeIntervals": ["validation", "renewal"]
  }
}
```

### 4.3 Ver Suscripciones en la Base de Datos

Puedes usar Prisma Studio para ver el estado:
```bash
npx prisma studio
```

O crear un endpoint para ver el dashboard:
```bash
GET https://turnio-backend-production.up.railway.app/api/subscriptions/current
```

---

## Paso 5: Configurar Emails (Opcional pero Recomendado)

El sistema actual **NO envía emails automáticamente**. Solo registra logs.

### 5.1 Opciones de Servicios de Email

**Opción 1: SendGrid** (recomendado para empezar)
- Gratis hasta 100 emails/día
- https://sendgrid.com

**Opción 2: AWS SES**
- Muy barato ($0.10 por 1000 emails)
- https://aws.amazon.com/ses

**Opción 3: Mailgun**
- Gratis hasta 5000 emails/mes
- https://www.mailgun.com

### 5.2 Implementar Envío de Emails

En `backend/src/services/renewalReminderService.js`, busca el comentario:
```javascript
// TODO: Implementar envío de email real
```

Y agrega el código de tu servicio de email elegido.

Ejemplo con SendGrid:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async sendRenewalReminder(subscription, daysUntilExpiration, paymentLink) {
  const msg = {
    to: subscription.business.email,
    from: 'noreply@turnio.app',
    subject: `Tu suscripción vence en ${daysUntilExpiration} días`,
    html: `
      <h2>Hola ${subscription.business.name}!</h2>
      <p>Tu suscripción al plan ${subscription.planType} vence el 
         ${subscription.nextBillingDate.toLocaleDateString()}.</p>
      <p><a href="${paymentLink}">Renovar Suscripción</a></p>
    `
  };
  
  await sgMail.send(msg);
}
```

---

## Paso 6: Migrar a Producción (Cuando estés listo)

### 6.1 Cambiar a Credenciales de Producción

1. Ve a MP: https://www.mercadopago.com.ar/developers/panel/app
2. Cambia a modo **"Producción"**
3. Copia las credenciales de producción
4. Actualiza variables en Railway:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP-xxxx  # Sin TEST-
   MERCADOPAGO_PUBLIC_KEY=APP-xxxx
   ```

### 6.2 Actualizar Webhooks

Las URLs de webhook son las mismas, pero asegúrate de que estén configuradas en **modo producción** en el panel de MP.

### 6.3 Probar con Pago Real

1. Usa tu propia tarjeta
2. Intenta con montos pequeños primero ($100 ARS)
3. Verifica que todo funcione correctamente

---

## 🔧 Troubleshooting

### Error: "MERCADOPAGO_ACCESS_TOKEN no definido"

**Solución:**
1. Ve a Variables en Railway
2. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado
3. Haz deploy de nuevo

### Error: "Invalid credentials"

**Solución:**
1. Verifica que el token no tenga espacios al inicio/final
2. Verifica que sea el token correcto (TEST para sandbox)
3. Regenera el token en el panel de MP

### Webhook no recibe notificaciones

**Solución:**
1. Verifica que la URL del webhook esté configurada en MP
2. Verifica que la URL sea accesible desde internet
3. Usa https://webhook.site para probar
4. Revisa logs de Railway

### Scheduler no se ejecuta

**Solución:**
1. Verifica que `ENABLE_SUBSCRIPTION_SCHEDULER=true` esté configurado
2. Verifica que esté en modo producción o la variable esté activa
3. Revisa logs de Railway para ver errores

### Recordatorios no se envían

**Solución:**
1. El sistema por defecto solo registra logs, no envía emails
2. Implementa el envío de emails (ver Paso 5)
3. Verifica que haya suscripciones próximas a vencer

---

## 📊 Checklist de Implementación

### Configuración Básica
- [ ] Variables de entorno configuradas en Railway
- [ ] MercadoPago conectado exitosamente
- [ ] Webhooks configurados
- [ ] Script de verificación ejecutado exitosamente

### Testing
- [ ] Probado flujo completo de registro
- [ ] Probado flujo completo de pago
- [ ] Webhook recibe notificaciones
- [ ] Payment se actualiza correctamente
- [ ] Suscripción se activa correctamente

### Schedulers
- [ ] Scheduler de validaciones corriendo
- [ ] Scheduler de renovaciones corriendo
- [ ] Endpoint de testing funciona
- [ ] Logs muestran ejecución correcta

### Producción (cuando estés listo)
- [ ] Credenciales de producción configuradas
- [ ] Webhooks actualizados a producción
- [ ] Pago real probado
- [ ] Emails de recordatorio configurados (opcional)

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa los logs de Railway** primero
2. **Ejecuta el script de verificación**: `node scripts/verify-mercadopago-config.js`
3. **Consulta la documentación**: 
   - `ANALISIS_MERCADOPAGO_SUSCRIPCIONES.md`
   - `MERCADOPAGO_FLOW.md`
   - `SUBSCRIPTION_SYSTEM.md`

---

## 🎯 Próximos Pasos Sugeridos

1. **Implementar envío de emails** para recordatorios
2. **Agregar dashboard** para ver estado de suscripciones
3. **Implementar notificaciones** por WhatsApp (opcional)
4. **Agregar sistema de cupones** de descuento
5. **Implementar prueba gratuita** de 14 días

---

## 📈 Métricas para Monitorear

- Tasa de conversión de FREE a BASIC
- Tasa de renovación mensual
- Tasa de cancelación (churn)
- Tiempo promedio de pago después del recordatorio
- Pagos fallidos vs exitosos

