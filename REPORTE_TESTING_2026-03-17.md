# Reporte de Testing — Turnio (www.turnio.com.ar)
**Fecha:** 17 de marzo de 2026
**Scope:** Testing en vivo + revisión de código + análisis de seguridad

---

## Resumen Ejecutivo

Se identificaron **3 bugs críticos**, **6 de alta severidad**, **7 de severidad media** y **5 menores**. El bug más urgente es que los planes de suscripción estaban cobrando **$100/$101/$102 ARS en lugar de $18.900/$24.900/$90.900 ARS** (ya corregido). Se encontró además un bug crítico de seguridad que expone el token de MercadoPago en los logs, y la funcionalidad de auto-renovación de suscripciones está **no implementada** en producción.

---

## 🔍 Análisis del Sistema de Suscripciones

### ¿Se cobran correctamente las suscripciones?
**Sí, después de la corrección BUG-01.** El flujo de pago es: usuario selecciona plan → `subscriptionController.changeSubscriptionPlan()` crea una suscripción con el precio del plan → `mercadoPagoController.createSubscriptionPayment()` genera una preferencia de pago en MercadoPago → usuario paga en MercadoPago → webhook `POST /api/mercadopago/webhook` recibe la notificación → si APPROVED: activa la suscripción y establece `nextBillingDate = ahora + 1 mes/año`.

### ¿Se vuelven a cobrar solas al vencer?
**No. El sistema NO tiene auto-renovación real.** El flujo al vencer es:
1. El scheduler (`schedulerService.js`) corre cada 6 horas y ejecuta `SubscriptionValidationService.runAllValidations()`
2. `validateExpiredSubscriptions()` busca suscripciones con `nextBillingDate < ahora`
3. Si existe un pago APPROVED reciente (posterior al `nextBillingDate`) → extiende la fecha
4. Si NO hay pago reciente → establece `status = 'SUSPENDED'`
5. El negocio debe **manualmente volver al dashboard y pagar nuevamente**

Existe código para suscripciones automáticas (`subscriptionAutoController.js` con MP Subscriptions API), pero `checkExpiredSubscriptions()` nunca es llamado por el scheduler principal. Es código muerto. Ver BUG-20.

### ¿Se habilita/deshabilita el acceso según el estado?
**Sí, funciona correctamente.** El middleware `authenticateToken` en `auth.js` verifica el estado de la suscripción en cada request. Si está SUSPENDED/EXPIRED/PAYMENT_FAILED: bloquea el acceso con HTTP 403, excepto para los endpoints de pago/suscripción/auth necesarios para renovar. El plan FREE siempre tiene acceso sin restricciones.

---

---

## 🔴 CRÍTICO — Requieren atención inmediata

### BUG-01: Precios de suscripción incorrectos en producción ✅ CORREGIDO

**Archivos afectados:**
- `backend/src/controllers/planController.js` (líneas 27, 45, 64)
- `backend/src/controllers/subscriptionController.js` (líneas 27, 45, 64)
- `backend/src/services/planChangeService.js` (líneas 10-15)

**Descripción:**
Existen **3 definiciones separadas e inconsistentes** de `AVAILABLE_PLANS`/`PLAN_PRICES` en el codebase:

| Archivo | BASIC | PREMIUM | ENTERPRISE |
|---|---|---|---|
| `planController.js` | **$100** | **$101** | **$102** |
| `subscriptionController.js` | **$100** | **$101** | **$102** |
| `planChangeService.js` | $18.900 | $24.900 | $90.900 |

El endpoint `/api/subscriptions/plans` (usado por la landing y el dashboard) devuelve los precios de `subscriptionController.js` ($100/$101/$102). Cuando el usuario hace click en "Seleccionar Plan" → se crea la suscripción con `priceAmount = 100` → MercadoPago cobra **$100 ARS**.

Existe incluso un endpoint `/api/subscriptions/test-plans` (sin auth) que muestra los precios correctos ($18.900 etc.), lo que confirma que los valores $100/$101/$102 son precios de **prueba nunca actualizados a producción**.

**Impacto:** Pérdida de ingresos total en cobros de suscripciones.

**Fix:** Unificar en un único archivo de constantes (ej. `config/plans.js`) con los precios reales: BASIC=$18.900, PREMIUM=$24.900, ENTERPRISE=$90.900. Usar ese archivo en los 3 controllers/services.

---

### BUG-02: Webhook de MercadoPago sin verificación de firma

**Archivo:** `backend/src/routes/mercadoPagoRoutes.js` (línea 27)
**Archivo:** `backend/src/controllers/mercadoPagoController.js` (función `handleWebhook`)

**Descripción:**
El endpoint `POST /api/mercadopago/webhook` acepta cualquier request sin validar la firma `x-signature` que MercadoPago incluye en cada notificación. El código solo logea la firma (`console.log`) pero nunca la verifica con HMAC.

**Impacto:** Un atacante puede enviar una notificación falsa de pago aprobado y activar una suscripción sin pagar. MercadoPago provee documentación oficial sobre cómo verificar estas firmas.

**Fix:**
```javascript
const crypto = require('crypto');
const secret = process.env.MP_WEBHOOK_SECRET;
const xSignature = req.headers['x-signature'];
const xRequestId = req.headers['x-request-id'];
const dataId = req.query['data.id'];
const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
if (hash !== signatureParts.v1) { return res.status(401).send(); }
```

---

### BUG-16 (NUEVO): Token de MercadoPago expuesto en logs de producción 🔴 CRÍTICO

**Archivo:** `backend/src/controllers/subscriptionAutoController.js` (líneas 8 y 20)

**Descripción:**
El módulo tiene dos `console.log` a nivel de módulo (fuera de funciones) que se ejecutan cada vez que el servidor arranca, exponiendo el token completo de MercadoPago en los logs de Railway:

```javascript
console.log('Access Token MercadoPago:', process.env.MERCADOPAGO_ACCESS_TOKEN); // línea 8
console.log('🔑 Inicializando MercadoPago con token:', process.env.MERCADOPAGO_ACCESS_TOKEN); // línea 20
```

**Impacto:** Cualquier persona con acceso a los logs de Railway (o un leak de logs) puede obtener el token de MercadoPago y realizar cobros en nombre de Turnio o acceder a datos de pagos.

**Fix:** Eliminar estas líneas inmediatamente. Si se necesita confirmar que el token está configurado, solo loguear `!!process.env.MERCADOPAGO_ACCESS_TOKEN` (true/false).

---

## 🟠 ALTO — Corregir antes del siguiente deploy

### BUG-03: Endpoints de administración sin control de roles

**Archivo:** `backend/src/routes/subscriptionRoutes.js`

**Descripción:**
Los siguientes endpoints usan `authenticateToken` (verifica que el usuario esté logueado) pero **no verifican que sea admin**. Cualquier usuario con cuenta puede ejecutarlos:

- `POST /api/subscriptions/validate` — ejecuta validaciones sobre **todas** las suscripciones de la plataforma (puede suspender suscripciones masivamente)
- `POST /api/subscriptions/process-pending-downgrades` — procesa downgrades de **todos** los negocios

**Fix:** Agregar `requireAdmin` middleware en estas rutas.

---

### BUG-04: Endpoints de debug expuestos sin autenticación

**Archivo:** `backend/src/routes/subscriptionRoutes.js` (líneas 19-93)

**Descripción:**
Los siguientes endpoints son accesibles sin ninguna autenticación:

- `GET /api/subscriptions/test` — endpoint de prueba activo en producción
- `GET /api/subscriptions/test-plans` — expone la estructura de planes
- `GET /api/subscriptions/test-db` — **PELIGROSO**: expone el conteo de negocios y suscripciones, y crea una **nueva instancia de PrismaClient** por cada request (riesgo de connection pool exhaustion)

**Fix:** Eliminar o proteger con autenticación + admin estos endpoints.

---

### BUG-05: Límites de plan FREE no se aplican — usuarios excedidos

**Evidencia en producción:** La cuenta BarberSHOP tiene **3 usuarios activos con un límite de 1** (300% del límite). El dashboard lo muestra en rojo pero el sistema no lo bloquea.

**Archivos afectados:** `backend/src/controllers/userController.js` (falta validación de límite al crear usuario)

**Descripción:** Al crear un nuevo usuario/empleado, no se verifica si el negocio ha alcanzado el límite de usuarios de su plan. Solo `planController.js` (endpoint `/api/plans/change`) valida los límites al cambiar de plan, pero no al crear usuarios.

**Fix:** Agregar en `userController.js` (endpoint de creación de usuario) una verificación del límite del plan antes de crear el usuario.

---

### BUG-06: Pago obligatorio activado sin MercadoPago conectado

**Evidencia en producción:** En la cuenta BarberSHOP, el toggle "Requerir pago obligatorio" está **activado** pero MercadoPago **no está conectado**.

**Impacto:** Cuando un cliente intenta reservar un turno en `turnio.com.ar/book/barbershop`, el sistema intentará crear una preferencia de pago en MP pero fallará porque no hay credenciales configuradas, potencialmente bloqueando todas las reservas.

**Fix:** Agregar validación en la UI: si "Requerir pago obligatorio" está activado y MP no está conectado, mostrar advertencia y deshabilitar el toggle (o guiar al usuario a conectar MP primero).

---

## 🟡 MEDIO — Deuda técnica importante

### BUG-07: Duplicación de AVAILABLE_PLANS en 3 archivos ✅ CORREGIDO (como parte de BUG-01)

La definición de planes está copiada en `planController.js`, `subscriptionController.js` y `planChangeService.js`. Esta es la causa raíz del BUG-01. Cualquier cambio de precio, límite o feature requiere actualizarlo en 3 lugares, generando inconsistencias.

**Fix:** Crear `backend/src/config/plans.js` con la definición canónica e importar desde allí.

---

### BUG-08: Logs de debug excesivos en producción ✅ CORREGIDO

El middleware `auth.js` tiene +15 `console.log` detallados para el endpoint `/api/auth/profile`, incluyendo tokens, IDs de usuario y datos sensibles. Esto:
- Degrada el rendimiento (log por cada request autenticado que pasa por profile)
- Expone datos sensibles en los logs de Railway

**Fix:** Eliminar o convertir a `logger.debug()` (que solo se activa con `NODE_ENV=development`).

---

### BUG-09: Tests de Jest no ejecutables en CI/CD actual ✅ CORREGIDO

Los tests en `backend/test/payment-validation.test.js` fallaron con el error:
```
@prisma/client did not initialize yet. Please run "prisma generate"
```
El repositorio no incluye el cliente Prisma generado, y el entorno de Railway no puede ejecutar `prisma generate` en el sandbox de tests.

**Fix:** Agregar `npm run db:generate && npm test` en el pipeline, o mockear el cliente Prisma en los tests.

---

### BUG-10: `test-db` crea nueva instancia de PrismaClient

**Archivo:** `backend/src/routes/subscriptionRoutes.js` línea 56

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // ❌ Nueva instancia por request
```

Debe usar el singleton de `config/database.js`.

---

### BUG-11: Inconsistencia en el flujo de upgrade/downgrade ✅ CORREGIDO (como parte de BUG-01)

Al hacer un **upgrade** a través del modal "Cambiar Plan" en el dashboard:
1. Se llama a `subscriptionController.changeSubscriptionPlan()` → crea suscripción con `priceAmount = 100`
2. Luego se llama a `mercadoPagoController.createSubscriptionPayment()` → cobra `subscription.priceAmount = 100`

Pero si se va por `planChangeService.processUpgrade()` (el servicio correcto):
→ Cobra `PLAN_PRICES[newPlanType] = 18.900`

Los dos flujos cobran montos distintos para el mismo plan. El flujo activo desde el frontend cobra $100.

---

## 🟡 MEDIO — Nuevos bugs encontrados en análisis de suscripciones

### BUG-17: `subscriptionAutoController.js` crea nueva instancia de PrismaClient

**Archivo:** `backend/src/controllers/subscriptionAutoController.js` (línea 5)

```javascript
const prismaClient = new PrismaClient(); // ❌ Instancia nueva cada vez que el módulo se carga
```

El módulo crea su propia instancia de `PrismaClient` además de importar la singleton desde `config/database.js`. Esto genera conexiones extras al pool de PostgreSQL y puede causar `connection limit exceeded` bajo carga. Este patrón ya fue identificado en BUG-10 para `subscriptionRoutes.js`.

**Fix:** Reemplazar con `const { prisma } = require('../config/database')` y eliminar la línea 2 (`const { PrismaClient } = require('@prisma/client')`).

---

### BUG-18: Múltiples console.log a nivel de módulo en rutas de MercadoPago

**Archivo:** `backend/src/routes/mercadoPagoRoutes.js` (líneas 3, 15, 18, 32, 37, 40, 44)

El archivo tiene 7 `console.log` fuera de handlers de ruta, incluyendo `const DEBUG_DEPLOY = true` hardcodeado. Estos se ejecutan en cada restart del servidor y contaminan los logs de Railway.

**Fix:** Eliminar todos los logs de módulo y la variable `DEBUG_DEPLOY`.

---

### BUG-19: `auth.js` (routes) tiene debug middleware con console.log activos

**Archivo:** `backend/src/routes/auth.js` (líneas 14-59)

Existe un `simpleAuthMiddleware` con múltiples `console.log` detallados (token presente, token decodificado, usuario encontrado, etc.). Este middleware se ejecuta en cada request de autenticación si está en uso.

**Fix:** Revisar si `simpleAuthMiddleware` está siendo usado en alguna ruta. Si no, eliminarlo. Si sí, reemplazar `console.log` por `logger.debug()`.

---

### BUG-20: Sistema de auto-renovación de suscripciones NO está conectado al scheduler

**Archivo:** `backend/src/controllers/subscriptionAutoController.js` (función `checkExpiredSubscriptions`)
**Archivo:** `backend/src/services/schedulerService.js`

La función `checkExpiredSubscriptions()` de `subscriptionAutoController.js` implementa la lógica para:
1. Buscar suscripciones vencidas con `mercadoPagoSubscriptionId` configurado
2. Consultar el estado en MP
3. Si está autorizado: crear registro de pago y extender la fecha

Sin embargo, **esta función nunca es llamada por el scheduler**. El scheduler principal solo llama a `SubscriptionValidationService.runAllValidations()`, que no hace cobros automáticos — solo suspende.

**Consecuencia:** Los negocios deben renovar manualmente cada mes. No hay cobro automático real.

**Fix:** Decidir si se quiere habilitar el cobro automático. Si sí: integrar `checkExpiredSubscriptions()` en `schedulerService.js` como paso adicional en la validación. Si no: documentar que el modelo es "manual renewal" y comunicarlo a los usuarios.

---

### BUG-21: Condición de renovación puede fallar en edge case

**Archivo:** `backend/src/services/subscriptionValidationService.js` (línea 39-41)

```javascript
const hasRecentPayment = subscription.payments.length > 0 &&
                        subscription.payments[0].status === 'APPROVED' &&
                        subscription.payments[0].createdAt > subscription.nextBillingDate; // ⚠️
```

El scheduler solo considera el pago como "reciente" si `createdAt > nextBillingDate`. Pero si un usuario paga **unos minutos ANTES** de que llegue la fecha límite (el pago es creado a las 23:55 y el scheduler corre a las 00:05 del día siguiente), el pago existente no será reconocido y la suscripción podría suspenderse incorrectamente.

**Fix:** Ampliar la ventana: comparar contra `nextBillingDate - 24 horas` para dar margen.

---

## 🟢 BAJO — Mejoras menores

### BUG-12: Footer con año desactualizado
Footer muestra "© 2024 Turnio" — debería ser dinámico o actualizarse a 2026.

### BUG-13: Imagen banner de sucursal no profesional
La sucursal "BarberSHOP - Principal" usa una captura de pantalla de código como imagen banner (datos de prueba que llegaron a producción).

### BUG-14: Nombre de sucursal con typo
"Barbersho 2" en lugar de "Barbershop 2".

### BUG-15: console.log de deploy hardcodeados en producción
`mercadoPagoRoutes.js` tiene logs de deploy activos:
```javascript
console.log('🚀 DEPLOY TEST: MercadoPago routes loaded - v2.0');
```
Estos degradan la legibilidad de los logs en Railway.

---

## ✅ Lo que funciona correctamente

- **Landing page**: carga rápida, responsive, secciones correctas
- **Login/Registro**: flujo funciona correctamente
- **Dashboard**: métricas (turnos hoy, cancelaciones, ingresos, no-show) se calculan correctamente
- **Gestión de servicios**: CRUD completo funcional
- **Flujo de reserva pública** (`/book/:slug`): 4 pasos completos funcionando (sucursal → servicio → fecha → profesional/horario)
- **Calendario de turnos**: vista diaria con citas correctamente renderizadas
- **Autenticación JWT**: correctamente implementada con verificación en BD
- **Verificación de suscripción en middleware**: bloqueo correcto cuando el plan está expirado/suspendido
- **Idempotencia en webhooks**: el `processPaymentWebhook` verifica el payment ID antes de procesar
- **Configuración de pagos**: UI de Pagos y MercadoPago OAuth bien estructurada

---

## Estado de correcciones realizadas

| Bug | Estado |
|---|---|
| BUG-01: Precios incorrectos ($100 → $18.900 reales) | ✅ Corregido |
| BUG-07: Duplicación de AVAILABLE_PLANS | ✅ Corregido (parte de BUG-01) |
| BUG-08: Logs debug en auth.js | ✅ Corregido |
| BUG-09: Tests de Jest sin prisma generate | ✅ Corregido |
| BUG-11: Inconsistencia en precio de upgrade | ✅ Corregido (parte de BUG-01) |

## Prioridad de fixes pendientes

| Prioridad | Bug | Tiempo estimado |
|---|---|---|
| 1 | BUG-16: Token MP en logs (CRÍTICO) | 5 min — eliminar 2 líneas |
| 2 | BUG-02: Webhook sin verificación de firma | 1 hora |
| 3 | BUG-20: Auto-renovación no conectada | 2 horas |
| 4 | BUG-03: Admin sin control de roles | 15 min |
| 5 | BUG-04: Endpoints debug expuestos | 15 min |
| 6 | BUG-05: Límites de usuarios no aplicados | 45 min |
| 7 | BUG-06: Pago obligatorio sin MP conectado | 30 min |
| 8 | BUG-17: PrismaClient sin singleton | 10 min |
| 9 | BUG-10: PrismaClient en test-db | 10 min |
| 10 | BUG-21: Edge case en validación de pagos | 15 min |
| 11 | BUG-18/19: console.log de módulo | 30 min |

---

*Reporte generado el 17/03/2026. Actualizado con análisis de sistema de suscripciones. Testing realizado sobre www.turnio.com.ar (producción) + revisión estática de código.*
