# ⚡ Configuración Rápida de Sandbox

## 🎯 Resumen

Para probar ambos sistemas de pago en sandbox, necesitas configurar estas variables en Railway:

## 📝 Variables Requeridas

### Sistema de Suscripciones (Pago a la Plataforma)
```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

### Sistema de Pagos por Turnos (OAuth - Pago a Negocios)
```env
MP_CLIENT_ID=6037903379451498
MP_CLIENT_SECRET=xxxxx-xxxxx-xxxxx
MP_REDIRECT_URI=https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback
```

### URLs (si no las tienes)
```env
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

## 🚀 Pasos Rápidos

1. **Obtener credenciales:**
   - Ve a: https://www.mercadopago.com.ar/developers/panel/app
   - Credenciales de prueba → `TEST-` tokens
   - Credenciales de producción → `MP_CLIENT_ID` y `MP_CLIENT_SECRET`

2. **Configurar en Railway:**
   - Railway → tu proyecto → backend → Variables
   - Agrega todas las variables de arriba
   - Deploy

3. **Verificar:**
   ```bash
   node scripts/test-sandbox-payments.js
   ```

4. **Configurar webhooks:**
   - Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
   - Agrega:
     - `https://turnio-backend-production.up.railway.app/api/mercadopago/webhook`
     - `https://turnio-backend-production.up.railway.app/api/payments/webhook`

## ✅ Verificación

Ejecuta el script de prueba:
```bash
node scripts/test-sandbox-payments.js
```

Deberías ver:
```
✅ Sistema de Suscripciones: FUNCIONAL
✅ Sistema de Pagos por Turnos: FUNCIONAL
✅ Base de Datos: CONECTADA
```

## 📚 Documentación Completa

Para más detalles, ver: `GUIA_CONFIGURACION_SANDBOX.md`

