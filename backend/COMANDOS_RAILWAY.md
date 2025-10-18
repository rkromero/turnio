# 🛠️ Comandos Útiles para Railway

## 📋 Scripts de Verificación y Testing

### 1. Verificar Configuración de MercadoPago

```bash
node scripts/verify-mercadopago-config.js
```

**Qué hace:**
- Verifica que las variables de entorno estén configuradas
- Prueba la conexión con la API de MercadoPago
- Crea una preferencia de prueba
- Verifica conexión con la base de datos
- Muestra estadísticas de suscripciones

**Output esperado:**
```
🔍 === VERIFICACIÓN DE CONFIGURACIÓN DE MERCADOPAGO ===

✅ MERCADOPAGO_ACCESS_TOKEN: Configurado
✅ MERCADOPAGO_PUBLIC_KEY: Configurado
✅ BACKEND_URL: https://turnio-backend-production.up.railway.app
✅ FRONTEND_URL: https://turnio-frontend-production.up.railway.app

🔌 Probando conexión con API de MercadoPago...
✅ Conexión exitosa con MercadoPago API
✅ Preference ID creado: 12345-xxxx-xxxx

💾 Verificando conexión con base de datos...
✅ Base de datos conectada
   Suscripciones: 5
   Pagos: 12
   Suscripciones por vencer (próximos 7 días): 2

✅ === VERIFICACIÓN COMPLETADA ===
```

---

## 🔗 Endpoints de API para Testing

### 1. Probar Recordatorios de Renovación

```bash
# Con curl:
curl -X POST https://turnio-backend-production.up.railway.app/api/debug/test-renewal-reminders

# Con wget:
wget --post-data="" https://turnio-backend-production.up.railway.app/api/debug/test-renewal-reminders
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Tareas de renovación ejecutadas",
  "data": {
    "upcomingExpirations": {
      "total": 2,
      "processed": 1
    },
    "suspensions": {
      "total": 1,
      "suspended": 1
    }
  }
}
```

### 2. Probar Validaciones de Suscripción

```bash
curl -X POST https://turnio-backend-production.up.railway.app/api/debug/test-subscription-validations
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Validaciones ejecutadas",
  "data": {
    "expiredCount": 1,
    "upcomingCount": 2,
    "failedCount": 0,
    "downgradeCount": 0
  }
}
```

### 3. Ver Estado del Scheduler

```bash
curl https://turnio-backend-production.up.railway.app/api/debug/scheduler-status
```

**Respuesta esperada:**
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

---

## 🗄️ Comandos de Base de Datos

### 1. Abrir Prisma Studio

```bash
npx prisma studio
```

Abre interfaz web en: `http://localhost:5555`

### 2. Ver Suscripciones Próximas a Vencer

```sql
-- Conectarse a la BD y ejecutar:
SELECT 
  s.id,
  b.name as business_name,
  s.planType,
  s.nextBillingDate,
  s.status,
  DATEDIFF(s.nextBillingDate, NOW()) as days_until_expiration
FROM subscriptions s
JOIN businesses b ON s.businessId = b.id
WHERE s.planType != 'FREE'
  AND s.status = 'ACTIVE'
  AND s.nextBillingDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
ORDER BY s.nextBillingDate ASC;
```

### 3. Ver Últimos Pagos

```sql
SELECT 
  p.id,
  p.amount,
  p.status,
  p.createdAt,
  p.paidAt,
  s.planType,
  b.name as business_name
FROM payments p
JOIN subscriptions s ON p.subscriptionId = s.id
JOIN businesses b ON s.businessId = b.id
ORDER BY p.createdAt DESC
LIMIT 10;
```

### 4. Ver Suscripciones Suspendidas

```sql
SELECT 
  s.id,
  b.name as business_name,
  s.planType,
  s.status,
  s.nextBillingDate,
  DATEDIFF(NOW(), s.nextBillingDate) as days_overdue
FROM subscriptions s
JOIN businesses b ON s.businessId = b.id
WHERE s.status = 'SUSPENDED'
ORDER BY s.nextBillingDate DESC;
```

---

## 🧪 Simular Escenarios de Testing

### 1. Simular Suscripción Próxima a Vencer

```javascript
// En Railway, ejecuta esto en la consola de Node o crea un script:
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateExpiringSoon() {
  // Buscar una suscripción activa
  const subscription = await prisma.subscription.findFirst({
    where: { 
      status: 'ACTIVE',
      planType: { not: 'FREE' }
    }
  });

  if (!subscription) {
    console.log('No hay suscripciones activas para modificar');
    return;
  }

  // Configurar que venza en 3 días
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { nextBillingDate: threeDaysFromNow }
  });

  console.log(`✅ Suscripción ${subscription.id} configurada para vencer en 3 días`);
}

simulateExpiringSoon();
```

### 2. Simular Suscripción Vencida

```javascript
async function simulateExpired() {
  const subscription = await prisma.subscription.findFirst({
    where: { 
      status: 'ACTIVE',
      planType: { not: 'FREE' }
    }
  });

  if (!subscription) {
    console.log('No hay suscripciones activas para modificar');
    return;
  }

  // Configurar que venció hace 2 días
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { nextBillingDate: twoDaysAgo }
  });

  console.log(`✅ Suscripción ${subscription.id} configurada como vencida hace 2 días`);
}

simulateExpired();
```

---

## 🔍 Monitorear Logs en Railway

### 1. Ver Logs en Tiempo Real

1. Ve a Railway
2. Selecciona tu proyecto
3. Click en **turnio-backend-production**
4. Click en **"View Logs"**

### 2. Buscar en Logs

Busca estos patrones para verificar funcionamiento:

**Schedulers iniciados:**
```
✅ Scheduler de validaciones iniciado
✅ Scheduler de recordatorios de renovación iniciado
```

**Tareas ejecutándose:**
```
⏰ Ejecutando tareas de renovación programadas...
🔍 === PROCESANDO SUSCRIPCIONES PRÓXIMAS A VENCER ===
```

**Recordatorios enviados:**
```
📧 Enviando recordatorio de renovación:
   Negocio: [nombre]
   Días hasta vencer: 3
```

**Suscripciones suspendidas:**
```
🔍 === SUSPENDIENDO SUSCRIPCIONES VENCIDAS ===
⚠️ [nombre negocio]
   Venció hace: 2 días
   Acción: Suspendiendo suscripción...
```

---

## 🎯 Testing End-to-End Completo

### Paso 1: Crear Suscripción de Prueba

```bash
# Desde el frontend, registra un nuevo negocio
# O usa este curl:

curl -X POST https://turnio-backend-production.up.railway.app/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -d '{
    "businessId": "tu-business-id",
    "planType": "BASIC",
    "billingCycle": "MONTHLY"
  }'
```

### Paso 2: Crear Pago

```bash
curl -X POST https://turnio-backend-production.up.railway.app/api/mercadopago/create-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -d '{
    "subscriptionId": "subscription-id"
  }'
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=xxx",
    "paymentId": "payment-id"
  }
}
```

### Paso 3: Simular Pago (Sandbox)

1. Abre el `initPoint` en navegador
2. Usa tarjeta de prueba:
   ```
   Número: 5031 7557 3453 0604
   CVV: 123
   Vencimiento: 11/25
   Nombre: APRO
   ```

### Paso 4: Verificar Webhook

```bash
# Ver logs de Railway
# Busca:
🔔 Webhook de MercadoPago recibido:
💳 Información del pago recibida:
✅ Pago procesado exitosamente
```

### Paso 5: Verificar Estado

```bash
curl https://turnio-backend-production.up.railway.app/api/subscriptions/current \
  -H "Cookie: token=YOUR_AUTH_TOKEN"
```

---

## 🛠️ Comandos de Mantenimiento

### 1. Reiniciar Schedulers

```bash
# En Railway, en la terminal del servicio:
pkill -f node  # Mata proceso
# Railway automáticamente reiniciará el servicio
```

### 2. Limpiar Pagos Pendientes Antiguos

```sql
DELETE FROM payments 
WHERE status = 'PENDING' 
  AND createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

### 3. Resetear Metadata de Suscripción

```sql
UPDATE subscriptions 
SET metadata = JSON_OBJECT()
WHERE id = 'subscription-id';
```

---

## 📊 Queries Útiles para Analytics

### 1. Tasa de Renovación

```sql
SELECT 
  COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
  COUNT(*) as total,
  ROUND(COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) / COUNT(*) * 100, 2) as approval_rate
FROM payments
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### 2. Ingresos Mensuales

```sql
SELECT 
  DATE_FORMAT(paidAt, '%Y-%m') as month,
  SUM(amount) as total_revenue,
  COUNT(*) as payment_count,
  AVG(amount) as avg_payment
FROM payments
WHERE status = 'APPROVED'
GROUP BY DATE_FORMAT(paidAt, '%Y-%m')
ORDER BY month DESC;
```

### 3. Distribución de Planes

```sql
SELECT 
  planType,
  COUNT(*) as count,
  ROUND(COUNT(*) / (SELECT COUNT(*) FROM subscriptions) * 100, 2) as percentage
FROM subscriptions
WHERE status = 'ACTIVE'
GROUP BY planType
ORDER BY count DESC;
```

---

## 🚨 Solución de Problemas Comunes

### Error: "Cannot read property 'MERCADOPAGO_ACCESS_TOKEN' of undefined"

```bash
# Verifica que las variables estén configuradas:
echo $MERCADOPAGO_ACCESS_TOKEN

# Si está vacío, configúralo en Railway:
# Variables → Add Variable → MERCADOPAGO_ACCESS_TOKEN=TEST-xxx
```

### Error: "Scheduler no se ejecuta"

```bash
# Verifica el estado:
curl https://turnio-backend-production.up.railway.app/api/debug/scheduler-status

# Si muestra false, verifica variables:
echo $ENABLE_SUBSCRIPTION_SCHEDULER

# Debería ser: true
```

### Error: "Webhook no recibe notificaciones"

```bash
# 1. Verifica que la URL sea accesible:
curl https://turnio-backend-production.up.railway.app/api/mercadopago/webhook

# 2. Verifica configuración en MP:
# https://www.mercadopago.com.ar/developers/panel/webhooks

# 3. Prueba con webhook.site:
# Configura https://webhook.site/xxx en MP temporalmente
```

---

## 💡 Tips y Mejores Prácticas

### 1. Siempre probar en Railway primero
```bash
# Nunca pruebes en local, siempre en Railway
curl https://turnio-backend-production.up.railway.app/api/debug/test-renewal-reminders
```

### 2. Monitorear logs regularmente
```bash
# Configura alertas en Railway para errores críticos
# Ve a Settings → Notifications
```

### 3. Backup de datos antes de cambios
```bash
# Exporta datos importantes:
npx prisma db pull
npx prisma db seed  # Si tienes seed
```

### 4. Versionado de cambios
```bash
git tag -a v1.0-suscripciones -m "Sistema de suscripciones implementado"
git push origin v1.0-suscripciones
```

---

¡Listo! Con estos comandos puedes gestionar y monitorear todo el sistema de suscripciones. 🚀

