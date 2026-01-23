# ✅ Checklist de Configuración - Sistema de Suscripciones

## 📋 Verificación de Configuración

### 1. Variables de Entorno en Railway
- [ ] `MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx` configurado
- [ ] `MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx` configurado
- [ ] `BACKEND_URL` configurado
- [ ] `FRONTEND_URL` configurado
- [ ] Variables desplegadas (Deploy realizado)

### 2. Webhook en MercadoPago
- [ ] URL configurada: `https://turnio-backend-production.up.railway.app/api/mercadopago/webhook`
- [ ] Evento "Pagos" marcado ✅
- [ ] Evento "Órdenes comerciales" marcado ✅
- [ ] Configuración guardada
- [ ] Clave secreta generada (opcional, para validación futura)

### 3. Verificación con Script
- [ ] Ejecutar: `node scripts/test-suscripciones-sandbox.js`
- [ ] Todas las verificaciones pasan ✅

### 4. Prueba de Webhook
- [ ] Hacer clic en "Simular notificación" en MercadoPago
- [ ] Verificar logs de Railway que recibió el webhook
- [ ] Verificar que respondió correctamente (200 OK)

### 5. Prueba Completa
- [ ] Crear suscripción desde frontend
- [ ] Completar pago con tarjeta de prueba
- [ ] Verificar que webhook procesa el pago
- [ ] Verificar que suscripción se activa correctamente

---

## 🧪 Tarjetas de Prueba

**Tarjeta APROBADA:**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Vencimiento: Cualquier fecha futura
- Nombre: `APRO`

---

## 📝 Notas

- La clave secreta del webhook se puede usar para validar que los webhooks vengan realmente de MercadoPago (implementación futura)
- Si marcas "Planes y suscripciones", podrás recibir notificaciones de suscripciones automáticas (aunque actualmente usas pagos únicos)

