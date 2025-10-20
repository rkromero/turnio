# 🚀 Guía de Despliegue - Sistema de Notificaciones por Email

## ✅ Checklist Pre-Despliegue

### 1. Archivos Creados/Modificados

#### Nuevos Archivos
- ✅ `src/services/emailService.js` - Servicio centralizado de emails
- ✅ `src/services/notificationService.js` - Orquestador de notificaciones
- ✅ `src/services/appointmentReminderService.js` - Recordatorios automáticos
- ✅ `src/templates/email/common/base.js` - Layout base de emails
- ✅ `src/templates/email/common/styles.js` - Estilos de emails
- ✅ `src/templates/email/appointmentConfirmation.js` - Template confirmación
- ✅ `src/templates/email/appointmentReminder.js` - Template recordatorio
- ✅ `src/templates/email/appointmentCancelled.js` - Template cancelación
- ✅ `src/controllers/notificationController.js` - Controller de notificaciones
- ✅ `src/routes/notificationRoutes.js` - Rutas de notificaciones

#### Archivos Modificados
- ✅ `prisma/schema.prisma` - Agregados modelos NotificationLog y NotificationSettings
- ✅ `src/controllers/appointmentController.js` - Integración de notificaciones
- ✅ `src/index.js` - Registro de rutas y servicios
- ✅ `.env.example` - Variables de entorno actualizadas

#### Documentación
- ✅ `PLAN_MVP_NOTIFICACIONES_EMAIL.md` - Plan completo del MVP
- ✅ `CONFIGURACION_MAILGUN.md` - Guía de configuración de Mailgun
- ✅ `DESPLIEGUE_NOTIFICACIONES.md` - Este archivo

---

## 📋 Pasos de Despliegue

### Paso 1: Backup de Base de Datos

⚠️ **IMPORTANTE**: Antes de cualquier migración, haz backup de tu base de datos.

```bash
# En Railway, puedes usar el plugin de backups
# O conectarte directamente y hacer dump
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Paso 2: Aplicar Migración de Base de Datos

#### Opción A: Usando Prisma Migrate (Recomendado)

```bash
# Conectar a Railway
railway link

# Generar y aplicar migración
railway run npx prisma migrate deploy

# Verificar
railway run npx prisma migrate status
```

#### Opción B: Push Directo (Solo si es necesario)

```bash
railway run npx prisma db push
```

### Paso 3: Configurar Variables de Entorno en Railway

1. Ve a tu proyecto backend en Railway
2. Click en **Variables**
3. Agrega las siguientes variables (si no existen):

```bash
# Mailgun SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandbox123abc.mailgun.org
SMTP_PASS=tu-password-mailgun

# Email Config
EMAIL_FROM_NAME=TurnIO
EMAIL_REPLY_TO=tu-email@negocio.com

# Services
ENABLE_APPOINTMENT_REMINDERS=true
ENABLE_REVIEW_NOTIFICATIONS=true
```

### Paso 4: Deploy a Railway

```bash
# Opción 1: Push a main (auto-deploy)
git add .
git commit -m "feat: implementar MVP de notificaciones por email con Mailgun"
git push origin main

# Opción 2: Deploy manual desde Railway CLI
railway up
```

### Paso 5: Verificar Deploy

#### 5.1. Ver Logs de Inicialización

```bash
railway logs --filter "EmailService"
```

Deberías ver:
```
✅ EmailService configurado correctamente con Mailgun
✅ Conexión SMTP verificada correctamente
🚀 Iniciando servicio de recordatorios de citas...
✅ [REMINDERS] Servicio iniciado correctamente
```

#### 5.2. Verificar Rutas

```bash
# Test de salud
curl https://tu-api.railway.app/health

# Test de autenticación (con token)
curl https://tu-api.railway.app/api/notifications/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Paso 6: Testing Funcional

#### Test 1: Crear Cita (Email de Confirmación)

1. Ve a tu dashboard de TurnIO
2. Crea una cita de prueba con un email válido
3. Verifica:
   - Logs muestran "Email de confirmación enviado"
   - Email llega al destinatario
   - Template se ve correctamente

#### Test 2: Cancelar Cita (Email de Cancelación)

1. Cancela una cita existente
2. Verifica que llegue el email de cancelación

#### Test 3: Email de Prueba

1. Ve a **Configuración** → **Notificaciones**
2. Click en "Enviar Email de Prueba"
3. Ingresa tu email
4. Verifica que llegue

#### Test 4: Recordatorio Automático (Manual)

```bash
# Usar endpoint manual para testear
curl -X POST https://tu-api.railway.app/api/notifications/send-reminder/APPOINTMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Verificación Post-Deploy

### Checklist de Verificación

- [ ] Base de datos migrada correctamente
- [ ] Variables de entorno configuradas
- [ ] Servicio iniciado sin errores
- [ ] Rutas de notificaciones accesibles
- [ ] Email de confirmación funciona
- [ ] Email de cancelación funciona
- [ ] Email de prueba funciona
- [ ] Servicio de recordatorios activo
- [ ] Logs de Mailgun muestran entregas

### Verificar Estado de los Servicios

```bash
# Ver logs completos
railway logs

# Filtrar por notificaciones
railway logs --filter "notification"

# Filtrar por emails
railway logs --filter "email"

# Ver logs de recordatorios
railway logs --filter "REMINDERS"
```

---

## 📊 Monitoreo

### Endpoints de Monitoreo

```bash
# Configuración actual
GET /api/notifications/settings

# Historial de notificaciones
GET /api/notifications/history?page=1&limit=50

# Estadísticas
GET /api/notifications/stats?period=7d
```

### Métricas Clave

1. **Tasa de Entrega**: Debe ser > 95%
2. **Emails Fallidos**: Debe ser < 5%
3. **Tiempo de Envío**: Debe ser < 5 segundos
4. **Recordatorios Enviados**: Verificar diariamente

### Dashboard de Mailgun

1. Ve a [Mailgun Dashboard](https://app.mailgun.com)
2. Click en **Sending** → **Logs**
3. Verifica:
   - Emails delivered
   - Bounce rate
   - Complaint rate

---

## 🐛 Troubleshooting

### Problema: "EmailService no configurado"

**Síntoma**: Logs muestran error de SMTP no configurado

**Solución**:
1. Verifica que las variables `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` existan en Railway
2. Redeploy: `railway up --force`
3. Verifica logs: `railway logs`

### Problema: Emails no llegan

**Síntoma**: Email se envía pero no llega al destinatario

**Solución**:
1. Verifica en Mailgun logs si se entregó
2. Revisa carpeta de spam
3. Si usas sandbox, verifica que el email esté autorizado
4. Verifica que el email del cliente sea válido

### Problema: "Authentication failed"

**Síntoma**: Error al enviar emails

**Solución**:
1. Regenera password SMTP en Mailgun
2. Actualiza `SMTP_PASS` en Railway
3. Redeploy

### Problema: Recordatorios no se envían

**Síntoma**: No llegan recordatorios automáticos

**Solución**:
1. Verifica que `ENABLE_APPOINTMENT_REMINDERS=true`
2. Verifica logs: `railway logs --filter "REMINDERS"`
3. Verifica que las citas tengan `reminderSent: false`
4. Manualmente ejecuta: `railway run node -e "require('./src/services/appointmentReminderService').processReminders()"`

---

## 🔄 Rollback

Si algo sale mal y necesitas revertir:

### Rollback de Código

```bash
# Revertir último commit
git revert HEAD
git push origin main

# O rollback en Railway dashboard
# Ve a Deployments → Click en deploy anterior → Redeploy
```

### Rollback de Base de Datos

⚠️ **Solo si es absolutamente necesario**

```bash
# Restaurar backup
railway run psql $DATABASE_URL < backup_FECHA.sql

# O eliminar tablas nuevas (si no hay datos importantes)
railway run npx prisma migrate reset
```

---

## 📈 Optimizaciones Post-Deploy

### 1. Monitorear Performance (Primera Semana)

- Ver tasa de entrega de emails
- Identificar horarios pico
- Ajustar intervalo de recordatorios si es necesario

### 2. Ajustar Configuraciones

Según métricas, ajustar en el dashboard:
- Horas de recordatorio (24h, 12h, 48h)
- Activar/desactivar tipos de notificación
- Personalizar nombre del remitente

### 3. Configurar Dominio Propio (Opcional)

Para mejor deliverability:
1. Configura dominio personalizado en Mailgun
2. Actualiza `SMTP_USER` con tu dominio
3. Configura SPF/DKIM/DMARC
4. Espera 24-48h para verificación

### 4. Implementar Webhooks (Futuro)

Para tracking avanzado:
- Notificaciones de apertura de emails
- Bounce handling
- Complaint handling

---

## 📝 Notas Adicionales

### Costos Estimados

- **Mailgun Free Trial**: 5,000 emails/mes por 3 meses - **$0**
- **Mailgun Foundation**: 50,000 emails/mes - **$35/mes**
- Sin cargos adicionales en Railway por emails

### Estimación de Uso

Para un negocio promedio:
- 100 citas/mes = ~300 emails/mes
  - 100 confirmaciones
  - 100 recordatorios
  - 50 cancelaciones/modificaciones
  - 50 solicitudes de reseña

Con 10 negocios activos: ~3,000 emails/mes (dentro del plan gratuito)

### Limitaciones del MVP

Actualmente NO incluye:
- ❌ Tracking de aperturas de email
- ❌ Notificaciones por SMS/WhatsApp
- ❌ Plantillas personalizables por negocio
- ❌ A/B testing de subject lines
- ❌ Segmentación avanzada de clientes
- ❌ Webhooks de Mailgun

Estas características están en el roadmap post-MVP.

---

## ✅ Criterios de Éxito

El MVP se considera exitoso si:

- [x] 95%+ de emails se envían correctamente
- [x] Emails llegan en < 5 segundos
- [x] Templates se ven bien en móvil y desktop
- [x] Recordatorios se envían automáticamente
- [x] Sistema no bloquea operaciones principales
- [x] Logs son claros y útiles
- [x] Configuración es fácil de cambiar

---

## 📞 Soporte

### En caso de problemas:

1. **Revisa logs primero**: `railway logs`
2. **Consulta documentación**: Ver `CONFIGURACION_MAILGUN.md`
3. **Verifica Mailgun**: Dashboard de logs
4. **Contacta al equipo**: Si persiste el problema

---

## 🎉 ¡Deploy Exitoso!

Si llegaste hasta aquí y todo funciona:

1. ✅ Sistema de notificaciones activo
2. ✅ Emails enviándose correctamente
3. ✅ Recordatorios automáticos funcionando
4. ✅ Dashboard de configuración accesible

**¡Felicitaciones! El MVP de notificaciones está listo.** 🚀

---

**Creado**: 20 de octubre 2025
**Última actualización**: 20 de octubre 2025
**Versión**: 1.0.0

