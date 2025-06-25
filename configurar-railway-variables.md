# Configurar Variables de Entorno en Railway

## Variables que necesitas configurar:

### Backend (turnio-backend-production):
```
MP_CLIENT_ID=6037903379451498
MP_CLIENT_SECRET=[TU_CLIENT_SECRET_AQUI]
MP_REDIRECT_URI=https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback
MP_WEBHOOK_SECRET=35287bd8c96000fb9478666438a255085c8bd0773f7d2bd616482c304ce26857
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

## Pasos para configurar en Railway:

1. Ve a Railway.app
2. Selecciona tu proyecto TurnIO
3. Haz clic en "turnio-backend-production"
4. Ve a la pestaña "Variables"
5. Agrega cada variable una por una
6. Haz clic en "Deploy" para aplicar los cambios

## ¿Cómo obtener CLIENT_SECRET?

1. Ve a "Credenciales de producción" en MercadoPago
2. Copia el CLIENT_SECRET
3. Reemplaza [TU_CLIENT_SECRET_AQUI] con el valor real

## Probar la configuración:

Una vez configurado, ve a:
https://turnio-frontend-production.up.railway.app/dashboard/settings

Y haz clic en el tab "Pagos" - deberías ver el botón "Conectar MercadoPago" 