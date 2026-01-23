# ⚡ Configuración Rápida - Sistema de Suscripciones

## 🎯 Resumen

Para probar el sistema de suscripciones en sandbox, necesitas configurar estas variables en Railway:

## 📝 Variables Requeridas

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

**También necesitas (probablemente ya las tienes):**
```env
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

## 🚀 Pasos Rápidos

### 1. Obtener Credenciales
- Ve a: https://www.mercadopago.com.ar/developers/panel/app
- Credenciales → **Credenciales de prueba**
- Copia `Access Token` (debe empezar con `TEST-`)
- Copia `Public Key` (debe empezar con `TEST-`)

### 2. Configurar en Railway
- Railway → tu proyecto → backend → Variables
- Agrega `MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx`
- Agrega `MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx`
- **Deploy**

### 3. Verificar
```bash
node scripts/test-suscripciones-sandbox.js
```

### 4. Configurar Webhook
- Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
- Agrega: `https://turnio-backend-production.up.railway.app/api/mercadopago/webhook`
- Evento: `payment`

## ✅ Verificación

Ejecuta el script:
```bash
node scripts/test-suscripciones-sandbox.js
```

Deberías ver:
```
✅ Variables de entorno: CONFIGURADAS
✅ Conexión con MercadoPago: FUNCIONAL
✅ Base de datos: CONECTADA
🎉 ¡EL SISTEMA DE SUSCRIPCIONES ESTÁ LISTO PARA PROBAR!
```

## 🧪 Probar

1. Ve al frontend y crea una suscripción
2. Usa tarjeta de prueba: `5031 7557 3453 0604` (CVV: 123)
3. Verifica que el pago se procese correctamente

## 📚 Documentación Completa

Para más detalles, ver: `GUIA_SUSCRIPCIONES_SANDBOX.md`

