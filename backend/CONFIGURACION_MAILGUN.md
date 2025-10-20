# 📧 Configuración de Mailgun para Notificaciones por Email

## 🚀 Guía Rápida de Configuración

### Paso 1: Crear Cuenta en Mailgun

1. Ve a [https://www.mailgun.com](https://www.mailgun.com)
2. Crea una cuenta gratuita (incluye 5,000 emails/mes por 3 meses)
3. Verifica tu email

### Paso 2: Obtener Credenciales SMTP

#### Opción A: Usar Dominio de Sandbox (Para Testing)

1. En el dashboard de Mailgun, ve a **Sending** → **Domains**
2. Verás un dominio sandbox (ej: `sandbox123abc.mailgun.org`)
3. Haz clic en el dominio sandbox
4. Ve a la sección **SMTP Credentials**
5. Copia las credenciales:
   - **SMTP hostname**: `smtp.mailgun.org` (US) o `smtp.eu.mailgun.org` (EU)
   - **Port**: `587` (TLS) o `465` (SSL)
   - **Username**: `postmaster@sandbox123abc.mailgun.org`
   - **Password**: Haz clic en **Reset Password** para obtener una

⚠️ **Limitación**: El dominio sandbox solo puede enviar a emails autorizados.

#### Para autorizar emails en sandbox:
1. Ve a **Sending** → **Domains** → Tu sandbox
2. En **Authorized Recipients**, agrega los emails de prueba
3. Confirma el email que recibirán

#### Opción B: Usar Tu Propio Dominio (Para Producción)

1. En Mailgun, ve a **Sending** → **Domains** → **Add New Domain**
2. Ingresa tu dominio (ej: `mail.tunegocio.com`)
3. Sigue las instrucciones para configurar los registros DNS:
   - TXT record para SPF
   - TXT record para DKIM
   - CNAME record para tracking (opcional)
   - MX records

4. Espera a que se verifique (puede tomar hasta 48 horas)
5. Una vez verificado, obtén las credenciales SMTP de la misma forma

### Paso 3: Configurar Variables de Entorno en Railway

#### En Railway Dashboard:

1. Ve a tu proyecto de backend en Railway
2. Haz clic en la pestaña **Variables**
3. Agrega las siguientes variables:

```bash
# Configuración SMTP de Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandbox123abc.mailgun.org
SMTP_PASS=tu-password-de-mailgun

# Configuración de Email
EMAIL_FROM_NAME=TurnIO - Tu Negocio
EMAIL_REPLY_TO=tu-email@negocio.com

# Frontend URL (ya debería estar configurada)
FRONTEND_URL=https://turnio-frontend-production.up.railway.app

# Habilitar servicios de notificaciones
ENABLE_APPOINTMENT_REMINDERS=true
ENABLE_REVIEW_NOTIFICATIONS=true
```

4. Guarda los cambios
5. Railway redesplegará automáticamente tu aplicación

### Paso 4: Verificar Configuración

#### Método 1: Desde los logs de Railway

```bash
railway logs --filter "EmailService"
```

Deberías ver:
```
✅ EmailService configurado correctamente con Mailgun
✅ Conexión SMTP verificada correctamente
```

#### Método 2: Enviar email de prueba desde el dashboard

1. Inicia sesión en tu dashboard de TurnIO
2. Ve a **Configuración** → **Notificaciones**
3. Haz clic en "Enviar Email de Prueba"
4. Ingresa tu email
5. Verifica que llegue el email

---

## 🔧 Configuraciones Avanzadas

### Usar Región EU de Mailgun

Si tu cuenta está en la región EU:

```bash
SMTP_HOST=smtp.eu.mailgun.org
```

### Usar Puerto SSL (465)

```bash
SMTP_PORT=465
SMTP_SECURE=true
```

### Personalizar nombre del remitente por negocio

Desde el dashboard de cada negocio:
1. Ve a **Configuración** → **Notificaciones**
2. Configura el "Nombre del Remitente"
3. Guarda cambios

---

## 📊 Límites de Mailgun

### Plan Gratuito (Trial)
- **5,000 emails/mes** por 3 meses
- Solo dominio sandbox
- Debe autorizar destinatarios

### Plan Foundation ($35/mes)
- **50,000 emails/mes**
- Dominios personalizados ilimitados
- Validación de emails
- Logs por 3 días

### Plan Growth ($80/mes)
- **100,000 emails/mes**
- Todo lo de Foundation
- Logs por 7 días
- Webhooks avanzados

### Plan Scale (desde $90/mes)
- **100,000+ emails/mes**
- Logs por 30 días
- IP dedicada
- Soporte prioritario

---

## 🔍 Troubleshooting

### Error: "Authentication failed"

**Causa**: Credenciales incorrectas

**Solución**:
1. Verifica que `SMTP_USER` y `SMTP_PASS` sean correctos
2. Regenera la contraseña SMTP en Mailgun
3. Asegúrate de NO usar la API Key (debe ser password SMTP)

### Error: "Connection timeout"

**Causa**: Puerto bloqueado o host incorrecto

**Solución**:
1. Verifica que `SMTP_HOST` sea correcto (`smtp.mailgun.org` o `smtp.eu.mailgun.org`)
2. Prueba cambiar `SMTP_PORT` a `2525` (puerto alternativo de Mailgun)
3. Verifica que Railway no esté bloqueando puertos SMTP

### Emails no llegan (dominio sandbox)

**Causa**: Destinatario no autorizado

**Solución**:
1. Ve a Mailgun → Domains → Tu sandbox
2. En **Authorized Recipients**, agrega el email destino
3. El destinatario debe confirmar el email de autorización

### Emails van a spam

**Causa**: Falta configuración SPF/DKIM

**Solución**:
1. Usa tu propio dominio verificado (no sandbox)
2. Configura correctamente los registros DNS (SPF, DKIM, DMARC)
3. Espera 24-48 horas para propagación DNS
4. Pide a los usuarios que marquen tus emails como "No spam"

### Error: "Domain not found"

**Causa**: Dominio no verificado en Mailgun

**Solución**:
1. Verifica que el dominio en `SMTP_USER` existe en tu cuenta de Mailgun
2. Asegúrate que esté verificado (checkmark verde)
3. Si es nuevo, espera a que se verifique (hasta 48 horas)

---

## 📧 Ejemplos de Configuración

### Desarrollo Local

Archivo `.env`:
```bash
# Mailgun Sandbox para desarrollo
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@sandbox123abc.mailgun.org
SMTP_PASS=abc123password
EMAIL_FROM_NAME=TurnIO Dev
FRONTEND_URL=http://localhost:5173

# Habilitar en desarrollo (opcional)
ENABLE_APPOINTMENT_REMINDERS=false
ENABLE_REVIEW_NOTIFICATIONS=false
```

### Producción (Railway)

Variables en Railway:
```bash
# Mailgun con dominio propio
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mail.tunegocio.com
SMTP_PASS=produccion-password-seguro
EMAIL_FROM_NAME=TurnIO
EMAIL_REPLY_TO=contacto@tunegocio.com
FRONTEND_URL=https://turnio-frontend-production.up.railway.app

# Servicios habilitados
ENABLE_APPOINTMENT_REMINDERS=true
ENABLE_REVIEW_NOTIFICATIONS=true
NODE_ENV=production
```

---

## 🧪 Testing

### Test 1: Verificar Conexión SMTP

Desde los logs de Railway, busca al iniciar:
```
✅ EmailService configurado correctamente con Mailgun
✅ Conexión SMTP verificada correctamente
```

### Test 2: Crear una Cita

1. Crea una cita de prueba desde el dashboard
2. Verifica en los logs:
```
📧 Enviando email a cliente@example.com - Asunto: ✅ Cita confirmada...
✅ Email enviado exitosamente - MessageID: xxx
```
3. Revisa el inbox del cliente

### Test 3: Enviar Recordatorio Manual

```bash
# Desde Railway shell
curl -X POST https://tu-api.railway.app/api/notifications/send-reminder/APPOINTMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Test 4: Ver Logs en Mailgun

1. Ve a Mailgun Dashboard → **Sending** → **Logs**
2. Verifica que aparezcan los emails enviados
3. Revisa el status (delivered, opened, clicked, bounced, etc.)

---

## 📈 Monitoreo

### Webhooks de Mailgun (Opcional)

Para recibir notificaciones de eventos (entrega, apertura, rebote):

1. En Mailgun, ve a **Sending** → **Webhooks**
2. Agrega webhook URL: `https://tu-api.railway.app/api/webhooks/mailgun`
3. Selecciona eventos: `delivered`, `opened`, `failed`, `complained`
4. Implementa el endpoint en tu backend (futuro)

### Métricas en Dashboard

Una vez implementado, ve a **Dashboard** → **Notificaciones** para ver:
- Total de emails enviados
- Tasa de entrega
- Emails fallidos
- Estadísticas por tipo de notificación

---

## 🔐 Seguridad

### Mejores Prácticas

1. **Nunca** comitees credenciales al repositorio
2. Usa variables de entorno en Railway
3. Regenera passwords SMTP periódicamente
4. Habilita autenticación de dos factores en Mailgun
5. Usa IP whitelisting si es posible
6. Monitorea logs de Mailgun regularmente

### Rotación de Credenciales

Si tus credenciales se comprometen:

1. En Mailgun, ve a **Sending** → **Domain Settings** → **SMTP Credentials**
2. Haz clic en **Reset Password**
3. Copia la nueva contraseña
4. Actualiza `SMTP_PASS` en Railway
5. Railway redesplegará automáticamente

---

## 📚 Recursos Adicionales

- [Mailgun Documentation](https://documentation.mailgun.com/)
- [Mailgun SMTP Guide](https://documentation.mailgun.com/en/latest/user_manual.html#sending-via-smtp)
- [SPF/DKIM Setup](https://documentation.mailgun.com/en/latest/user_manual.html#verifying-your-domain)
- [Mailgun API Reference](https://documentation.mailgun.com/en/latest/api_reference.html)

---

## ❓ Soporte

¿Problemas con la configuración?

1. Revisa los logs de Railway: `railway logs --filter "email"`
2. Verifica los logs de Mailgun en su dashboard
3. Consulta esta documentación
4. Contacta al equipo de desarrollo

---

**Última actualización**: 20 de octubre 2025

