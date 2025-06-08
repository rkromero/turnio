# Despliegue en Railway - TurnIO

## 📋 Prerrequisitos

1. Cuenta en [Railway](https://railway.app)
2. Cuenta en GitHub (para conectar el repositorio)
3. Base de datos PostgreSQL (Railway la puede proveer)

## 🚀 Pasos de Despliegue

### 1. Preparar el Repositorio

Asegúrate de que todos los archivos estén committeados:

```bash
git add .
git commit -m "feat: sistema de reseñas completo listo para Railway"
git push origin main
```

### 2. Crear Proyecto en Railway

1. Ve a [railway.app](https://railway.app)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Conecta tu repositorio de TurnIO

### 3. Configurar Base de Datos

1. En tu proyecto de Railway, haz clic en "Add Service"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente la base de datos
4. Copia la URL de conexión (DATABASE_URL)

### 4. Configurar Variables de Entorno

En la pestaña "Variables" de tu servicio, agrega:

```env
# Base de datos (se auto-genera)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro_aqui

# Email para notificaciones de reseñas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password-de-gmail

# URLs
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production

# Activar notificaciones automáticas
ENABLE_REVIEW_NOTIFICATIONS=true

# Puerto (Railway lo configura automáticamente)
PORT=${{ PORT }}
```

### 5. Configurar Dominio Personalizado (Opcional)

1. En Railway, ve a la pestaña "Settings" de tu servicio
2. En "Domains", haz clic en "Generate Domain"
3. O agrega tu dominio personalizado

### 6. Verificar Despliegue

1. Railway ejecutará automáticamente el build y deployment
2. Verifica en los logs que todo esté funcionando
3. Prueba el endpoint de health: `https://tu-app.railway.app/health`

## 🔧 Configuración del Proyecto

### Archivos de Configuración Incluidos

- **`railway.json`** - Configuración específica de Railway
- **`Procfile`** - Comando de inicio para el servicio
- **`nixpacks.toml`** - Configuración de build con Nixpacks
- **`.railwayignore`** - Archivos a excluir del deployment

### Scripts NPM Configurados

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  }
}
```

## 📧 Configuración de Email (Gmail)

Para que funcionen las notificaciones de reseñas:

1. Ve a tu cuenta de Gmail
2. Activa la autenticación de 2 factores
3. Genera una "Contraseña de aplicación":
   - Ve a Cuenta de Google → Seguridad
   - Autenticación en dos pasos → Contraseñas de aplicaciones
   - Genera una nueva contraseña
4. Usa esta contraseña en `SMTP_PASS`

## 🗄️ Migración de Base de Datos

Railway ejecutará automáticamente:
```bash
npx prisma generate
npx prisma db push
```

Si necesitas ejecutar migraciones manualmente:
1. Ve a la consola de Railway
2. Ejecuta: `npx prisma migrate deploy`

## 📊 Monitoreo

### Health Check
- URL: `https://tu-app.railway.app/health`
- Respuesta esperada: `{"success": true, "message": "TurnIO API funcionando correctamente"}`

### Logs
- Ve a la pestaña "Logs" en Railway para monitorear la aplicación
- Busca errores de conexión a base de datos o email

### Métricas
- Railway provee métricas básicas de CPU, memoria y red
- El servicio de reseñas se ejecuta cada 30 minutos automáticamente

## 🔒 Seguridad

### Variables Sensibles
- Nunca commitees archivos `.env` con datos reales
- Usa variables de entorno de Railway para datos sensibles
- Rota regularmente el JWT_SECRET

### CORS
El backend está configurado para aceptar conexiones desde:
- Variable `FRONTEND_URL`
- Localhost (solo en desarrollo)

## 🐛 Troubleshooting

### Error de Base de Datos
```bash
# En Railway Console
npx prisma db push --accept-data-loss
npx prisma generate
```

### Error de Email
- Verifica que `SMTP_USER` y `SMTP_PASS` estén correctos
- Confirma que Gmail tenga habilitada la autenticación de 2 factores
- Prueba la conexión SMTP manualmente

### Error de Build
- Revisa los logs de build en Railway
- Verifica que todas las dependencias estén en `package.json`
- Confirma que la versión de Node.js sea compatible (18.x)

## 🎯 URLs Importantes Post-Despliegue

Una vez desplegado, tendrás:

- **API Base**: `https://tu-app.railway.app/api`
- **Health Check**: `https://tu-app.railway.app/health`
- **Reseñas Públicas**: `https://tu-app.railway.app/api/reviews/public/{slug}`
- **Dashboard**: Configura tu frontend para apuntar a la nueva URL

## 📝 Notas Adicionales

1. **Escalabilidad**: Railway escala automáticamente según el tráfico
2. **Backup**: Considera configurar backups automáticos de la base de datos
3. **Monitoring**: Integra servicios como Sentry para monitoreo de errores
4. **Performance**: Railway incluye CDN automático para assets estáticos

¡Tu sistema de reseñas TurnIO está listo para producción! 🚀 