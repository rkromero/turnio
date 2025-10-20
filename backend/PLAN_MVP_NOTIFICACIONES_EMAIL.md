# 📧 Plan MVP - Sistema de Notificaciones por Email

## 🎯 Objetivo
Implementar un sistema robusto de notificaciones por email para mejorar la comunicación con clientes y la gestión de turnos.

---

## 📊 Estado Actual

### ✅ Ya Implementado
- ✅ Configuración de nodemailer con SMTP
- ✅ Servicio de notificaciones de reseñas (`reviewNotificationService.js`)
- ✅ Templates HTML básicos para emails
- ✅ Campo `reviewRequestSent` en modelo Appointment

### ❌ Faltante
- ❌ Notificaciones de confirmación de citas
- ❌ Notificaciones de recordatorio de citas (24h antes)
- ❌ Notificaciones de cancelación de citas
- ❌ Notificaciones de modificación de citas
- ❌ Campo `reminderSent` funcional en Appointment
- ❌ Sistema centralizado de templates de email
- ❌ Cola de emails para manejo de errores
- ❌ Panel de configuración de notificaciones
- ❌ Historial de notificaciones enviadas

---

## 🏗️ Arquitectura Propuesta

```
backend/
├── src/
│   ├── services/
│   │   ├── emailService.js              ← NUEVO: Servicio centralizado de emails
│   │   ├── notificationService.js       ← NUEVO: Orquestador de notificaciones
│   │   ├── emailQueue.js                ← NUEVO: Cola de emails con reintentos
│   │   └── reviewNotificationService.js ← EXISTENTE (refactorizar)
│   ├── templates/
│   │   └── email/                       ← NUEVO: Templates de email
│   │       ├── appointmentConfirmation.js
│   │       ├── appointmentReminder.js
│   │       ├── appointmentCancelled.js
│   │       ├── appointmentModified.js
│   │       ├── reviewRequest.js
│   │       └── common/
│   │           ├── header.js
│   │           ├── footer.js
│   │           └── styles.js
│   ├── controllers/
│   │   └── notificationController.js    ← NUEVO: Gestión de notificaciones
│   └── routes/
│       └── notificationRoutes.js        ← NUEVO: Endpoints de notificaciones
└── prisma/
    └── schema.prisma                    ← MODIFICAR: Agregar modelo NotificationLog
```

---

## 📋 Fases de Implementación

### **FASE 1: Infraestructura Base** ⏱️ 2-3 horas
**Prioridad: CRÍTICA**

#### 1.1. Actualizar Schema de Base de Datos
```prisma
// Agregar a schema.prisma

model NotificationLog {
  id            String   @id @default(cuid())
  businessId    String
  appointmentId String?
  clientId      String?
  type          NotificationType
  channel       NotificationChannel @default(EMAIL)
  status        NotificationStatus  @default(PENDING)
  recipient     String              // Email o teléfono
  subject       String?
  content       String?             // Template usado
  sentAt        DateTime?
  failureReason String?
  retryCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  business      Business     @relation(fields: [businessId], references: [id], onDelete: Cascade)
  appointment   Appointment? @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  client        Client?      @relation(fields: [clientId], references: [id], onDelete: SetNull)

  @@map("notification_logs")
}

model NotificationSettings {
  id                        String   @id @default(cuid())
  businessId                String   @unique
  
  // Configuración de emails
  sendConfirmationEmail     Boolean  @default(true)
  sendReminderEmail         Boolean  @default(true)
  reminderHoursBefore       Int      @default(24)
  sendCancellationEmail     Boolean  @default(true)
  sendModificationEmail     Boolean  @default(true)
  sendReviewRequestEmail    Boolean  @default(true)
  
  // Configuración personalizada
  fromName                  String?  // "Mi Negocio"
  replyToEmail              String?  // email@negocio.com
  
  // Metadata
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  business                  Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  
  @@map("notification_settings")
}

enum NotificationType {
  APPOINTMENT_CONFIRMATION
  APPOINTMENT_REMINDER
  APPOINTMENT_CANCELLED
  APPOINTMENT_MODIFIED
  REVIEW_REQUEST
  PAYMENT_RECEIVED
  PAYMENT_FAILED
  SUBSCRIPTION_RENEWED
  SUBSCRIPTION_EXPIRED
}

enum NotificationChannel {
  EMAIL
  SMS
  WHATSAPP
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  RETRY
}
```

**⚠️ ALERTA DE MIGRACIÓN**: Esta migración agrega nuevas tablas pero NO modifica datos existentes.

#### 1.2. Crear Servicio Centralizado de Emails
**Archivo**: `backend/src/services/emailService.js`

**Funcionalidades**:
- ✅ Configuración de transporter con variables de entorno
- ✅ Método genérico `sendEmail()`
- ✅ Manejo de errores robusto
- ✅ Validación de configuración SMTP
- ✅ Logging detallado

#### 1.3. Sistema de Templates Reutilizables
**Archivos**:
- `backend/src/templates/email/common/base.js` (Layout base)
- `backend/src/templates/email/common/styles.js` (Estilos CSS inline)

---

### **FASE 2: Notificaciones Esenciales** ⏱️ 3-4 horas
**Prioridad: ALTA**

#### 2.1. Confirmación de Cita
**Trigger**: Inmediatamente después de crear una cita
**Template**: `appointmentConfirmation.js`

**Información incluida**:
- ✅ Nombre del cliente
- ✅ Detalles del servicio
- ✅ Fecha y hora
- ✅ Profesional asignado
- ✅ Sucursal (dirección)
- ✅ Mapa de ubicación (si hay coordenadas)
- ✅ Botón "Agregar al Calendario" (.ics)
- ✅ Instrucciones de cancelación

**Modificación necesaria**: `appointmentController.js` → `createAppointment()`

#### 2.2. Recordatorio de Cita
**Trigger**: 24 horas antes de la cita (configurable)
**Template**: `appointmentReminder.js`

**Información incluida**:
- ✅ Recordatorio amigable
- ✅ Detalles de la cita
- ✅ Botón "Confirmar Asistencia"
- ✅ Opción de reprogramar
- ✅ Política de cancelación

**Servicio**: Crear `appointmentReminderService.js` con scheduler cada 1 hora

#### 2.3. Cancelación de Cita
**Trigger**: Cuando se cancela una cita
**Template**: `appointmentCancelled.js`

**Información incluida**:
- ✅ Confirmación de cancelación
- ✅ Detalles de la cita cancelada
- ✅ Invitación a reagendar
- ✅ Link directo a página de reservas

**Modificación necesaria**: `appointmentController.js` → `cancelAppointment()`

---

### **FASE 3: Notificaciones Avanzadas** ⏱️ 2-3 horas
**Prioridad: MEDIA**

#### 3.1. Modificación de Cita
**Trigger**: Cuando se modifica fecha/hora de una cita
**Template**: `appointmentModified.js`

**Información incluida**:
- ✅ Notificación de cambio
- ✅ Datos anteriores vs nuevos
- ✅ Nueva fecha y hora
- ✅ Botón "Ver Cambios"

**Modificación necesaria**: `appointmentController.js` → `updateAppointment()`

#### 3.2. Mejorar Sistema de Reseñas
**Refactorizar**: `reviewNotificationService.js`
- Integrar con `emailService.js`
- Usar nuevo sistema de templates
- Registrar en `NotificationLog`

---

### **FASE 4: Panel de Control** ⏱️ 3-4 horas
**Prioridad: MEDIA-BAJA**

#### 4.1. Backend: API de Configuración
**Endpoints**:
```javascript
GET    /api/notifications/settings
PUT    /api/notifications/settings
GET    /api/notifications/history
GET    /api/notifications/stats
POST   /api/notifications/test-email
```

#### 4.2. Frontend: Página de Configuración
**Ubicación**: `frontend/src/pages/NotificationSettings.tsx`

**Características**:
- ✅ Toggle para activar/desactivar cada tipo de notificación
- ✅ Configurar horas de recordatorio (12h, 24h, 48h)
- ✅ Personalizar nombre del remitente
- ✅ Email de respuesta (reply-to)
- ✅ Previsualización de templates
- ✅ Enviar email de prueba
- ✅ Ver historial de notificaciones enviadas

---

### **FASE 5: Confiabilidad y Monitoreo** ⏱️ 2-3 horas
**Prioridad: MEDIA**

#### 5.1. Cola de Emails con Reintentos
**Archivo**: `backend/src/services/emailQueue.js`

**Funcionalidades**:
- ✅ Cola en memoria (para MVP)
- ✅ Reintentos automáticos (3 intentos)
- ✅ Backoff exponencial
- ✅ Logging de fallos

**Futuro**: Migrar a Redis o Bull Queue

#### 5.2. Monitoreo y Alertas
- ✅ Logging de todos los emails enviados
- ✅ Dashboard de estadísticas
- ✅ Alertas si falla > 50% de emails en 1 hora

---

## 🔧 Variables de Entorno Requeridas

```env
# SMTP Configuration (Gmail, SendGrid, Mailgun, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app

# Email Settings
EMAIL_FROM_NAME=TurnIO Notificaciones
EMAIL_REPLY_TO=soporte@turnio.com

# Frontend URL (para links en emails)
FRONTEND_URL=https://tu-app.railway.app
```

---

## 📧 Ejemplos de Templates

### Confirmación de Cita
```
Asunto: ✅ Cita confirmada en [Nombre Negocio] - [Fecha]

Hola [Nombre Cliente],

Tu cita ha sido confirmada exitosamente.

📅 Fecha: Lunes, 20 de octubre 2025
⏰ Hora: 15:00
💈 Servicio: Corte de cabello
👤 Profesional: Juan Pérez
📍 Sucursal: Av. Corrientes 1234, CABA

[Botón: Agregar al Calendario]
[Botón: Ver Detalles]

¿Necesitas cancelar o reprogramar?
[Link de cancelación]

---
Equipo de [Nombre Negocio]
```

### Recordatorio de Cita
```
Asunto: ⏰ Recordatorio: Tu cita es mañana - [Nombre Negocio]

Hola [Nombre Cliente],

Te recordamos que tu cita está programada para mañana.

📅 Mañana, 21 de octubre 2025
⏰ 15:00
💈 Corte de cabello con Juan Pérez
📍 Av. Corrientes 1234, CABA

[Botón: Confirmar Asistencia]
[Botón: Reprogramar]

Si no puedes asistir, por favor cancela con anticipación.

---
Equipo de [Nombre Negocio]
```

---

## ⚡ Orden de Implementación Recomendado

### Sprint 1 (MVP Mínimo) - **6-8 horas**
1. ✅ Actualizar schema.prisma (30 min)
2. ✅ Correr migración (10 min)
3. ✅ Crear `emailService.js` (1 hora)
4. ✅ Crear templates base (1 hora)
5. ✅ Implementar confirmación de cita (1.5 horas)
6. ✅ Implementar cancelación de cita (1 hora)
7. ✅ Implementar recordatorio de cita (2 horas)
8. ✅ Testing básico (1 hora)

### Sprint 2 (Mejoras) - **4-5 horas**
9. ✅ Implementar modificación de cita (1 hora)
10. ✅ Refactorizar servicio de reseñas (1 hora)
11. ✅ Crear sistema de cola de emails (1.5 horas)
12. ✅ Panel de configuración básico (1.5 horas)

### Sprint 3 (Pulido) - **3-4 horas**
13. ✅ Dashboard de notificaciones (2 horas)
14. ✅ Testing completo (1 hora)
15. ✅ Documentación (1 hora)

---

## 🎨 Mejores Prácticas de Diseño de Emails

### Principios
1. **Mobile-first**: 60% de emails se leen en móvil
2. **Estilos inline**: Muchos clientes de email no soportan CSS externo
3. **Texto alternativo**: Siempre incluir versión texto plano
4. **Call-to-action claro**: Un botón principal por email
5. **Unsubscribe**: Opcional para transaccionales pero recomendado

### Dimensiones
- **Ancho máximo**: 600px
- **Botones**: Min 44x44px para táctil
- **Fuentes**: Arial, Helvetica, system fonts
- **Contraste**: WCAG AA mínimo

---

## 🧪 Plan de Testing

### Testing Manual
- [ ] Enviar email de confirmación en Railway
- [ ] Enviar email de recordatorio
- [ ] Enviar email de cancelación
- [ ] Verificar links funcionan correctamente
- [ ] Probar en Gmail, Outlook, Apple Mail

### Testing Automatizado (Opcional Fase 3)
- [ ] Tests unitarios para templates
- [ ] Tests de integración para envío de emails
- [ ] Mock de nodemailer para CI/CD

---

## 📈 Métricas de Éxito

### KPIs del MVP
- ✅ **Tasa de envío**: > 95% de emails enviados exitosamente
- ✅ **Tasa de apertura**: > 40% (benchmark: emails transaccionales)
- ✅ **Tasa de clics**: > 10% en CTAs principales
- ✅ **Reducción de no-shows**: Objetivo -20% con recordatorios

### Métricas a Monitorear
- Total de emails enviados por día
- Emails fallidos y razones
- Tiempo promedio de envío
- Tipos de notificación más comunes

---

## ⚠️ Consideraciones Importantes

### Límites de Proveedores SMTP
- **Gmail**: 500 emails/día (cuenta gratuita)
- **SendGrid**: 100 emails/día (plan gratuito)
- **Mailgun**: 1,000 emails/mes (plan gratuito)
- **Recomendación**: SendGrid o Mailgun para producción

### Privacidad y GDPR
- ✅ Solo enviar emails a clientes que dieron su email voluntariamente
- ✅ Incluir opción de "Gestionar preferencias" (futuro)
- ✅ No compartir emails con terceros
- ✅ Encriptar logs de notificaciones

### Failover
- ✅ Si falla SMTP, registrar en BD para reintento
- ✅ No bloquear creación de citas si falla email
- ✅ Alertar a admin si > 10 fallos consecutivos

---

## 🚀 Siguiente Nivel (Post-MVP)

### Futuras Mejoras
1. **SMS/WhatsApp**: Integrar Twilio o WhatsApp Business API
2. **Push Notifications**: Para app móvil
3. **Plantillas personalizables**: Editor visual
4. **A/B Testing**: Optimizar subject lines
5. **Segmentación**: Emails específicos por tipo de cliente
6. **Webhooks**: Notificar eventos a sistemas externos
7. **Analytics**: Tracking de aperturas y clics (SendGrid, Mailgun)

---

## 📝 Checklist de Implementación

### Pre-requisitos
- [ ] Verificar que nodemailer está instalado
- [ ] Configurar variables de entorno SMTP
- [ ] Confirmar acceso a Railway para probar en producción

### Desarrollo
- [ ] Crear rama `feature/email-notifications`
- [ ] Actualizar schema.prisma
- [ ] Correr migración en Railway (previa backup)
- [ ] Implementar servicios según fases
- [ ] Testing exhaustivo en Railway
- [ ] Code review

### Deploy
- [ ] Merge a `main` con aprobación
- [ ] Deploy automático en Railway
- [ ] Verificar variables de entorno en Railway
- [ ] Smoke test en producción
- [ ] Monitorear logs por 24 horas

---

## 💡 Tips de Implementación

### Para Desarrollo
```bash
# Variables de entorno para desarrollo local
cp .env.example .env

# Testing de emails en desarrollo (usar MailHog o Mailtrap)
# MailHog: https://github.com/mailhog/MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Usar SMTP_HOST=localhost y SMTP_PORT=1025 para testing
```

### Para Testing en Railway
```bash
# Ver logs de emails en Railway
railway logs --filter "email"

# Probar email de confirmación manualmente
curl -X POST https://tu-api.railway.app/api/notifications/test-email \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"appointment_confirmation","appointmentId":"cuid"}'
```

---

## 📞 Soporte y Recursos

### Documentación Útil
- [Nodemailer Docs](https://nodemailer.com/about/)
- [Email Design Best Practices](https://www.campaignmonitor.com/best-practices/)
- [Gmail SMTP Setup](https://support.google.com/mail/answer/7126229)
- [SendGrid API Docs](https://docs.sendgrid.com/)

### Herramientas Recomendadas
- **MailHog**: Testing local de emails
- **Mailtrap**: Sandbox para emails de desarrollo
- **Litmus**: Testing multi-cliente de email
- **Can I Email**: Compatibilidad CSS en emails

---

## ✅ Criterios de Aceptación del MVP

### Funcionalidad Mínima
- [x] Cliente recibe email al crear cita
- [x] Cliente recibe recordatorio 24h antes
- [x] Cliente recibe email si se cancela cita
- [x] Todos los emails tienen diseño profesional
- [x] Links en emails funcionan correctamente
- [x] Sistema registra logs de notificaciones
- [x] Errores de email no bloquean operaciones

### Calidad
- [x] Emails se ven bien en móvil y desktop
- [x] Tiempo de envío < 5 segundos
- [x] Tasa de éxito de envío > 95%
- [x] No hay información hardcodeada en templates

---

**Tiempo Total Estimado**: 12-16 horas de desarrollo
**Complejidad**: Media
**Impacto en usuarios**: Alto ⭐⭐⭐⭐⭐
**Prioridad**: Alta 🔥

---

*Documento creado: 20 de octubre 2025*
*Última actualización: 20 de octubre 2025*

