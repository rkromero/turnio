# 📚 Sistema de Suscripciones y Pagos con MercadoPago - Documentación Completa

## 🎯 Inicio Rápido (30 minutos)

Si quieres implementar rápidamente sin leer toda la documentación:

1. **Lee**: `RESUMEN_SUSCRIPCIONES_MERCADOPAGO.md` (5 min)
2. **Configura**: Variables de entorno en Railway (10 min)
3. **Verifica**: Ejecuta script de verificación (5 min)
4. **Prueba**: Endpoints de testing (10 min)

---

## 📖 Guía de Documentación

### Para Implementar (EMPIEZA AQUÍ)

1. **`RESUMEN_SUSCRIPCIONES_MERCADOPAGO.md`** ⭐ **COMIENZA AQUÍ**
   - Diagnóstico del sistema actual
   - Solución recomendada
   - Acciones inmediatas (30 min)
   - Resultado final esperado

2. **`GUIA_IMPLEMENTACION_RAILWAY.md`** 📋 **PASO A PASO**
   - Configuración de variables de entorno
   - Configuración de webhooks
   - Testing completo
   - Troubleshooting
   - Checklist de implementación

3. **`COMANDOS_RAILWAY.md`** 🛠️ **REFERENCIA RÁPIDA**
   - Scripts de verificación
   - Endpoints de API
   - Comandos de base de datos
   - Simulación de escenarios
   - Queries útiles

### Para Entender el Sistema

4. **`ANALISIS_MERCADOPAGO_SUSCRIPCIONES.md`** 🔍 **ANÁLISIS TÉCNICO**
   - Estado actual del sistema
   - Problemas identificados
   - Soluciones recomendadas (3 opciones)
   - Plan de acción detallado
   - Comparativa de métodos

5. **`MERCADOPAGO_FLOW.md`** 📊 **FLUJOS EXISTENTES**
   - Flujo de upgrade de plan
   - Flujo de webhook
   - URLs importantes
   - Problemas conocidos

6. **`SUBSCRIPTION_SYSTEM.md`** 📝 **DOCUMENTACIÓN ORIGINAL**
   - Estados de suscripción
   - Flujos de cambio de plan
   - Modelo de Payment
   - Validaciones críticas

---

## 🗂️ Archivos del Sistema

### Servicios
- `src/services/renewalReminderService.js` - **NUEVO** - Sistema de recordatorios
- `src/services/mercadoPagoService.js` - Servicio de MercadoPago (OAuth)
- `src/services/subscriptionValidationService.js` - Validaciones de suscripción
- `src/services/planChangeService.js` - Cambios de plan

### Controladores
- `src/controllers/mercadoPagoController.js` - Webhooks y pagos
- `src/controllers/subscriptionController.js` - Gestión de suscripciones
- `src/controllers/subscriptionAutoController.js` - Suscripciones automáticas

### Rutas
- `src/routes/mercadoPagoRoutes.js` - Endpoints de MercadoPago
- `src/routes/subscriptionRoutes.js` - Endpoints de suscripciones
- `src/routes/debugRoutes.js` - **MODIFICADO** - Endpoints de testing

### Scheduler
- `schedulerService.js` - **MODIFICADO** - Schedulers de validación y renovación

### Scripts
- `scripts/verify-mercadopago-config.js` - **NUEVO** - Verificación de configuración

---

## 🚀 Flujo de Implementación

```
1. Leer RESUMEN (5 min)
   ↓
2. Configurar Variables en Railway (10 min)
   ↓
3. Ejecutar Script de Verificación (5 min)
   ↓
4. Configurar Webhooks en MP (10 min)
   ↓
5. Probar con Endpoints de Testing (10 min)
   ↓
6. Crear Suscripción de Prueba (15 min)
   ↓
7. Probar Flujo Completo (20 min)
   ↓
8. Monitorear Logs (Continuo)
   ↓
9. Implementar Emails (Opcional - 2 horas)
   ↓
10. Migrar a Producción (Cuando esté listo)
```

**Tiempo total estimado:** 1-2 horas para tener todo funcionando

---

## ✅ Checklist de Implementación

### Configuración Básica
- [ ] Leí `RESUMEN_SUSCRIPCIONES_MERCADOPAGO.md`
- [ ] Configuré `MERCADOPAGO_ACCESS_TOKEN` en Railway
- [ ] Configuré `MERCADOPAGO_PUBLIC_KEY` en Railway
- [ ] Configuré `ENABLE_SUBSCRIPTION_SCHEDULER=true`
- [ ] Ejecuté `node scripts/verify-mercadopago-config.js`
- [ ] Todos los checks pasaron ✅

### Webhooks
- [ ] Configuré webhook en panel de MercadoPago
- [ ] URL: `https://turnio-backend-production.up.railway.app/api/mercadopago/webhook`
- [ ] Eventos: Payments (approved, rejected, cancelled)
- [ ] Probé con simulación de MP

### Testing
- [ ] Probé endpoint `/api/debug/scheduler-status`
- [ ] Probé endpoint `/api/debug/test-renewal-reminders`
- [ ] Schedulers están corriendo (validationScheduler: true, renewalScheduler: true)
- [ ] Creé suscripción de prueba
- [ ] Procesé pago de prueba con tarjeta de sandbox
- [ ] Webhook recibió notificación
- [ ] Payment se actualizó a APPROVED
- [ ] Suscripción se activó

### Monitoreo
- [ ] Veo logs en Railway correctamente
- [ ] Schedulers se ejecutan cada 6/12 horas
- [ ] Recordatorios se registran en logs
- [ ] No hay errores críticos

### Opcional (Recomendado)
- [ ] Implementé envío de emails
- [ ] Configuré servicio de email (SendGrid/SES/Mailgun)
- [ ] Probé envío de email real
- [ ] Agregué dashboard de métricas
- [ ] Configuré alertas en Railway

### Producción (Cuando esté listo)
- [ ] Cambié a credenciales de producción de MP
- [ ] Actualicé webhooks a modo producción
- [ ] Probé con pago real (monto pequeño)
- [ ] Monitoreo activo de primeras renovaciones
- [ ] Plan de respaldo en caso de problemas

---

## 🎯 Lo que FUNCIONA después de implementar

✅ **Detección Automática**
- Sistema detecta suscripciones próximas a vencer
- Ejecuta cada 12 horas automáticamente

✅ **Recordatorios Automáticos**
- 7 días antes del vencimiento
- 3 días antes del vencimiento
- 1 día antes del vencimiento

✅ **Links de Pago Fáciles**
- Se crea link de pago reutilizable
- Usuario paga con un clic
- No necesita registrarse de nuevo

✅ **Suspensión Automática**
- Suscripciones sin pago se suspenden
- Plan cambia automáticamente a FREE
- Usuario puede reactivar cuando quiera

✅ **Monitoreo y Logs**
- Logs detallados de todas las operaciones
- Endpoints de testing para verificar
- Dashboard de estado del scheduler

---

## 📊 Arquitectura del Sistema

```
┌─────────────────┐
│    Frontend     │
│  (Usuario paga) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  MercadoPago    │
│   Checkout      │
└────────┬────────┘
         │
         ↓ Webhook
┌─────────────────────────────────────────┐
│           Backend (Railway)              │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  mercadoPagoController.js       │   │
│  │  - Recibe webhook               │   │
│  │  - Actualiza Payment            │   │
│  │  - Activa Suscripción           │   │
│  └────────────┬────────────────────┘   │
│               │                         │
│  ┌────────────▼────────────────────┐   │
│  │  Scheduler Service              │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │ Validation (cada 6h)    │   │   │
│  │  │ - Suspende vencidas     │   │   │
│  │  └─────────────────────────┘   │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │ Renewal (cada 12h)      │   │   │
│  │  │ - Detecta próximas      │   │   │
│  │  │ - Crea links de pago    │   │   │
│  │  │ - Envía recordatorios   │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │  PostgreSQL (Railway)           │   │
│  │  - Subscriptions                │   │
│  │  - Payments                     │   │
│  │  - Business                     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🔄 Flujo de Renovación Detallado

```
┌──────────────────────────────────────────────────────┐
│ DÍA 0: Usuario paga primera vez                     │
├──────────────────────────────────────────────────────┤
│ • Suscripción status: ACTIVE                         │
│ • nextBillingDate: +30 días                          │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│ DÍA 23: 7 días antes de vencer                       │
├──────────────────────────────────────────────────────┤
│ • Scheduler detecta suscripción                      │
│ • Crea link de pago si no existe                     │
│ • Envía primer recordatorio (log/email)             │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│ DÍA 27: 3 días antes de vencer                       │
├──────────────────────────────────────────────────────┤
│ • Scheduler detecta de nuevo                         │
│ • Reutiliza link de pago existente                   │
│ • Envía segundo recordatorio (más urgente)           │
└──────────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────┐
│ DÍA 29: 1 día antes de vencer                        │
├──────────────────────────────────────────────────────┤
│ • Scheduler detecta de nuevo                         │
│ • Envía último recordatorio (urgente)                │
└──────────────────────────────────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │ Usuario paga?            │
        └─────────┬────────┬───────┘
                  │        │
           SÍ ◄───┘        └───► NO
           │                      │
           ↓                      ↓
┌──────────────────────┐  ┌──────────────────────┐
│ Webhook confirma     │  │ DÍA 30+: Vencida     │
│ • Payment: APPROVED  │  │ • Status: SUSPENDED  │
│ • Suscripción: ACTIVE│  │ • Plan: FREE         │
│ • nextBilling: +30d  │  │ • Puede reactivar    │
└──────────────────────┘  └──────────────────────┘
```

---

## 💡 Preguntas Frecuentes

### ¿Es seguro este sistema?
✅ Sí. Los pagos se procesan directamente en MercadoPago, no almacenamos datos de tarjetas.

### ¿Qué pasa si un webhook falla?
El sistema maneja reintentos. Si falla definitivamente, el scheduler detectará y suspenderá la suscripción.

### ¿Cómo sé si está funcionando?
Usa: `curl https://tu-backend.up.railway.app/api/debug/scheduler-status`

### ¿Puedo cambiar los días de recordatorio?
Sí. Edita `renewalReminderService.js` línea con: `[7, 3, 1].includes(daysUntilExpiration)`

### ¿Puedo probar sin afectar datos reales?
Sí. Usa las credenciales de sandbox (TEST-) y crea negocios de prueba.

### ¿Cómo migro a producción?
Cambia las credenciales de TEST- a APP- en Railway y actualiza webhooks en MP.

---

## 🆘 Soporte y Troubleshooting

Si tienes problemas, sigue este orden:

1. **Lee**: `GUIA_IMPLEMENTACION_RAILWAY.md` → Sección Troubleshooting
2. **Ejecuta**: `node scripts/verify-mercadopago-config.js`
3. **Revisa**: Logs de Railway → View Logs
4. **Verifica**: `/api/debug/scheduler-status`
5. **Consulta**: `COMANDOS_RAILWAY.md` → Solución de Problemas

---

## 📈 Métricas para Monitorear

### Corto Plazo (Primera semana)
- [ ] Webhooks recibidos correctamente: 100%
- [ ] Pagos procesados sin errores: >95%
- [ ] Suscripciones activadas correctamente: 100%
- [ ] Scheduler ejecutándose sin fallos

### Mediano Plazo (Primer mes)
- [ ] Tasa de renovación: >70%
- [ ] Emails/recordatorios enviados: 100%
- [ ] Tasa de conversión de recordatorios: >50%
- [ ] Churn rate (cancelaciones): <20%

### Largo Plazo (3 meses)
- [ ] Ingresos mensuales recurrentes (MRR) creciendo
- [ ] Lifetime Value (LTV) por cliente
- [ ] Cost of Acquisition (CAC)
- [ ] Ratio LTV:CAC >3:1

---

## 🎓 Recursos Adicionales

### Documentación de MercadoPago
- [Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

### Herramientas Útiles
- [Webhook.site](https://webhook.site) - Testing de webhooks
- [Prisma Studio](https://www.prisma.io/studio) - Visualización de BD
- [Thunder Client](https://www.thunderclient.com) - Testing de API

---

## 🚀 Próximas Mejoras Sugeridas

### Funcionalidad
- [ ] Envío de emails con SendGrid/SES
- [ ] Notificaciones por WhatsApp
- [ ] Dashboard de métricas en frontend
- [ ] Sistema de cupones de descuento
- [ ] Prueba gratuita de 14 días
- [ ] Facturación automática
- [ ] Multi-moneda (USD, EUR)

### Técnico
- [ ] Validación de firma de webhooks (seguridad)
- [ ] Retry logic para webhooks fallidos
- [ ] Idempotencia en endpoints
- [ ] Tests unitarios
- [ ] Tests de integración E2E
- [ ] Monitoreo con Sentry
- [ ] Alertas automáticas de errores

---

## 📝 Changelog

### v1.0 - 2025-01-XX
- ✅ Sistema de recordatorios de renovación
- ✅ Scheduler automático de renovaciones
- ✅ Script de verificación de configuración
- ✅ Endpoints de testing
- ✅ Documentación completa
- ✅ Suspensión automática de vencidas
- ✅ Links de pago reutilizables

---

## 📞 Contacto

Para reportar problemas o sugerencias:
- Revisa primero la documentación
- Busca en logs de Railway
- Ejecuta scripts de verificación

---

¡Todo listo para implementar! 🎉

**Empieza por: `RESUMEN_SUSCRIPCIONES_MERCADOPAGO.md`**

