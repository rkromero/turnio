# AUDITORÍA TURNIO — 2026-03-12

> Auditoría de solo lectura. Sin modificaciones al código.
> Pilares evaluados: Seguridad · Funcionalidad · UX/UI

---

## RESUMEN EJECUTIVO

| Pilar | 🔴 Crítico | 🟠 Alto | 🟡 Medio |
|---|---|---|---|
| Seguridad | 12 | 5 | 5 |
| Funcionalidad | 5 | 5 | 4 |
| UX/UI | 5 | 6 | 5 |
| **Total** | **22** | **16** | **14** |

---

## PRIORIDADES INMEDIATAS

1. Verificar firma del webhook de MercadoPago — bloquea fraude de suscripciones gratuitas
2. Envolver check de conflicto + creación de turno en transacción — previene doble booking
3. Corregir CORS — cambiar `callback(null, true)` en el else a `callback(new Error(...))`
4. Deshabilitar o proteger debug/testing routes en producción — superficie de ataque innecesaria
5. Rotar el JWT_SECRET por uno generado con `crypto.randomBytes(64).toString('hex')`
6. Agregar `disabled={submitting}` en botón de BookingPage — evita turnos duplicados

---

## PILAR 1: SEGURIDAD

### 🔴 CRÍTICO

**1. JWT_SECRET débil y predecible**
- `backend/.env` línea 5: `JWT_SECRET="mi_jwt_secret_super_seguro_123456789"` — string predecible. Cualquiera que lo conozca puede forjar tokens de cualquier usuario.

**2. Webhook de MercadoPago sin verificación de firma**
- `backend/src/controllers/mercadoPagoController.js` líneas 426-440: el header `x-signature` se loguea pero **nunca se valida**. Un atacante puede enviar un webhook falso con `status: 'approved'` y activar suscripciones sin pagar.

**3. Race condition en creación de turnos (doble booking posible)**
- `backend/src/controllers/appointmentController.js` líneas 275-380: el chequeo de conflicto y la creación del turno son dos queries separadas. Si dos usuarios reservan el mismo slot en paralelo, ambos ven "disponible" antes de que el otro escriba. No hay transacción ni lock.

**4. CORS configurado para aceptar cualquier origen**
- `backend/src/index.js` línea ~86: la rama `else` del CORS hace `callback(null, true)` en vez de `callback(new Error(...))`. Resultado: cualquier dominio puede hacer requests autenticados a la API.

**5. Rutas de debug sin autenticación expuestas en producción**
- `backend/src/routes/debugRoutes.js` líneas 14-128: endpoints como `POST /api/debug/apply-performance-indexes` y `POST /api/debug/test-subscription-validations` no tienen middleware de auth. Cualquiera puede llamarlos.

**6. Rutas de testing permiten modificar fechas de suscripción**
- `backend/src/routes/testingRoutes.js`: permite cambiar la fecha de vencimiento de una suscripción vía API. Si `NODE_ENV` no está seteado en producción, esto funciona en producción.

**7. State parameter de OAuth sin firma HMAC**
- `backend/src/controllers/paymentController.js` líneas 58-65: el `state` del OAuth de MercadoPago se parsea con `.split('_')[1]` sin validar firma. Un atacante puede interceptar el callback y conectar el MP de otro negocio.

**8. Tokens de MercadoPago guardados en texto plano en la DB**
- `backend/prisma/schema.prisma` líneas 31-36: `mp_access_token` y `mp_refresh_token` en columnas sin cifrar. Si la DB se compromete, el atacante tiene acceso a las cuentas MP de todos los negocios.

**9. Frontend hardcodea URL de producción**
- `frontend/src/pages/Appointments.tsx` línea 81: URL `https://turnio-backend-production.up.railway.app/api/...` hardcodeada. Rompe cualquier entorno que no sea producción y expone la URL interna del backend.

**10. Logs en middleware exponen datos sensibles**
- `backend/src/middleware/auth.js` líneas 26-66: 17 `console.log` que incluyen IDs de usuario, businessId, nombre y email. En producción estos logs van a Railway y quedan expuestos.

**11. Sin rate limiting específico en `/api/auth/login`**
- El limiter global es de 1000 req/15 min por IP. Eso son 1000 intentos de fuerza bruta por IP sin bloqueo. No hay lockout por cuenta.

**12. Suscripciones de testing accesibles sin auth**
- `backend/src/routes/subscriptionRoutes.js` líneas 19-48: `/subscriptions/test-db` instancia un Prisma client nuevo y hace queries a la DB sin autenticación.

---

### 🟠 ALTO

**1. Password mínimo de 6 caracteres**
- `backend/src/routes/userRoutes.js`: regex `.{6,}` — OWASP recomienda mínimo 12. Sin caracteres especiales requeridos, sin lockout por intentos fallidos.

**2. Sin transacción en actualizaciones de pago**
- `mercadoPagoController.js` líneas 506-625: actualizar payment + subscription + business.planType son 3 queries separadas. Si la segunda falla, el estado queda inconsistente.

**3. Sin rate limiting en endpoints públicos de booking**
- `GET /api/appointments/public/:slug/*` sin rate limit. Permite scrapear todos los slots y negocios disponibles.

**4. Autorización inconsistente en endpoints de usuarios**
- `userRoutes.js` líneas 132-138: `PUT /users/:id` solo usa `authenticateTokenOnly` (sin verificar rol), un EMPLOYEE puede modificar el perfil de otro usuario.

**5. Sin log de auditoría para operaciones críticas**
- No hay registro de: intentos de login fallidos, cambios de plan, aprobaciones de pago, conexiones OAuth. Imposible investigar fraude o errores.

---

### 🟡 MEDIO

- CSP deshabilitado en Helmet (`index.js` línea 40)
- Slug generation no maneja caracteres unicode correctamente
- Sin CSRF tokens en operaciones de estado
- Sin versionado de API (`/api/v1/`)
- Errores internos de Prisma se retornan en texto plano en algunos endpoints de test

---

### 🟢 BIEN

- bcryptjs con 12 salt rounds ✅
- HTTPOnly cookies para el token ✅
- express-validator usado en la mayoría de rutas ✅
- Helmet aplicado ✅
- JWT con expiración de 7 días ✅

---

## PILAR 2: FUNCIONALIDAD

### 🔴 CRÍTICO

**1. Doble booking posible (bug de negocio crítico)**
- `appointmentController.js` líneas 275-380: el check de conflicto y la creación del turno no están en una transacción. En alta concurrencia dos clientes pueden reservar el mismo slot simultáneamente.

**2. Webhook no es idempotente**
- MercadoPago reenvía webhooks si no recibe 200. Si el webhook llega dos veces, el estado se procesa dos veces. No hay chequeo de "¿ya procesé este payment_id?".

**3. Suscripción expirada no bloquea acceso a datos**
- `auth.js` líneas 157-221: el chequeo de suscripción expirada solo está en `authenticateToken`, no en `authenticateTokenOnly`. `getAppointments` usa `authenticateTokenOnly` → usuario con suscripción vencida sigue viendo todos sus datos.

**4. Sin validación de ownership en creación de pagos**
- `mercadoPagoController.js` líneas 238-245: se verifica que el usuario esté autenticado pero no que la suscripción pertenezca a su negocio. Un usuario puede crear un pago apuntando a la suscripción de otro.

**5. Sin rollback si MercadoPago falla después de crear suscripción en DB**
- `authController.js`: la creación de negocio+usuario+suscripción está en transacción Prisma, pero si el paso siguiente (llamada a MercadoPago API) falla, la suscripción queda creada en DB sin contrapartida en MP.

---

### 🟠 ALTO

**1. Estados de pago de MercadoPago incompletos**
- Solo maneja `approved`, `rejected`, `cancelled`. Los estados `in_process`, `in_mediation` (chargeback) y `pending` mapean a PENDING genérico. Un chargeback no debería tratarse igual que un pago pendiente.

**2. Cálculo de slots disponibles sin caché**
- `appointmentController.js` líneas 922-1143: `getAvailableSlots` hace queries por cada request. Sin Redis ni caché de ningún tipo. En una página pública con tráfico, esto genera muchas queries por página cargada.

**3. Profesional con múltiples sucursales puede generar overbooking**
- Un profesional con `branchId: null` puede trabajar en cualquier sucursal, pero el conflicto solo se chequea por `userId` + hora. Puede colisionar entre sucursales.

**4. Sin confirmación del cliente en el flujo de booking**
- Los turnos se crean directamente en estado `CONFIRMED`. No hay flujo de "pendiente de confirmación" → el profesional no sabe si el cliente realmente va a ir.

**5. Sin cleanup de datos de testing**
- Los endpoints de testing crean entidades pero no las limpian. La base de datos acumula datos de prueba.

---

### 🟡 MEDIO

- Los recordatorios no tienen idempotency check → si el scheduler corre dos veces, puede enviar emails duplicados
- Sin historial de precios: si el precio del servicio cambia, no hay registro del precio al momento del turno
- Sin paginación visible en listado de clientes (potencialmente carga todos)
- No hay estado `TENTATIVO` / pendiente de confirmación del cliente

---

### 🟢 BIEN

- Registro de negocio en una sola transacción Prisma ✅
- Detección de overlap de horarios correctamente implementada (chequea ambos extremos del intervalo) ✅
- Auto-creación de cliente si no existe al reservar ✅
- Soft delete en turnos (CANCELLED en lugar de DELETE) ✅
- Working hours creados automáticamente para nuevos profesionales ✅

---

## PILAR 3: UX/UI

### 🔴 CRÍTICO

**1. BookingPage no muestra errores al usuario cuando la API falla**
- `frontend/src/pages/BookingPage.tsx` líneas 71-162: existe estado `submitting` pero no hay display de errores. Si la API devuelve error 500, el usuario ve nada. No sabe si su turno se creó o no.

**2. Botón de reserva no se deshabilita durante envío**
- Sin `disabled={submitting}` en el botón de submit → el usuario puede hacer doble click y crear turnos duplicados.

**3. Sin diálogo de confirmación para cancelar turno**
- La cancelación parece ser un click directo sin "¿Estás seguro?". Un profesional puede cancelar un turno accidentalmente desde el celular.

**4. Sin empty state en listado de turnos**
- Cuando no hay turnos, probablemente muestra una lista vacía sin mensaje, sin ilustración, sin CTA para crear el primero. Primera experiencia del usuario nuevo es una pantalla en blanco.

**5. Gaps de responsive en mobile**
- Formularios multi-paso en mobile sin overflow handling, botones potencialmente chicos para touch, nombres largos de profesionales sin truncado.

---

### 🟠 ALTO

**1. Sin progress bar en el flujo multi-paso de booking**
- El estado `step` existe (`BookingPage.tsx` línea 75) pero no hay indicador visible de en qué paso está el usuario ni cuántos faltan. Genera confusión y abandono.

**2. Validación en tiempo real ausente en formularios**
- `Register.tsx`: la validación del email solo se dispara al submit, no mientras el usuario tipea.

**3. Sin skeleton screens en cargas de datos**
- `Plans.tsx`: hay estado `loading` pero sin skeleton. La página aparece en blanco hasta que cargan los datos.

**4. Flujo de pago fallido sin opción de reintentar**
- `PaymentFailure.tsx`: página de fallo sin botón de reintento claro ni información de soporte.

**5. Sin máscaras de input para teléfono**
- Campo de teléfono acepta cualquier formato. Para Argentina debería guiar al usuario con formato `+54 9 XXXX XXXXXX`.

**6. Accesibilidad básica ausente**
- Sin `aria-label` en íconos, sin indicadores de estado que no sean solo por color, sin navegación por teclado verificable.

---

### 🟡 MEDIO

- Inconsistencia en notificaciones toast (algunos flujos tienen, otros redirigen silenciosamente)
- Sin warning de "cambios sin guardar" al navegar fuera de un formulario
- Sin búsqueda/filtro en selector de profesionales (si hay muchos)
- Sin navegación rápida a mes específico en el calendario
- Duración del servicio no visible al momento de elegirlo en el booking

---

### 🟢 BIEN

- Dark mode preparado con clases Tailwind ✅
- Lucide-react para íconos (escalables, consistentes) ✅
- MobileNavigation.tsx existe y está referenciado ✅
- Logo centralizado en componente propio ✅
- AuthContext maneja errores con graceful degradation ✅
