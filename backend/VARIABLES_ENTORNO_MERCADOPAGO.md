# 🔧 Variables de Entorno - MercadoPago Backend

## 📋 Variables Requeridas para Sistema de Suscripciones

### Variables Principales (OBLIGATORIAS)

```env
# Token de acceso de MercadoPago (tu cuenta)
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx

# Public Key de MercadoPago (tu cuenta)
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
```

**⚠️ IMPORTANTE:**
- Para **sandbox/pruebas**: Deben empezar con `TEST-`
- Para **producción**: Deben empezar con `APP-`
- Sin espacios al inicio o final
- Sin comillas

### URLs de la Aplicación (OBLIGATORIAS)

```env
# URL del backend (Railway)
BACKEND_URL=https://turnio-backend-production.up.railway.app

# URL del frontend (Railway)
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

---

## 📋 Variables para Sistema de Pagos por Turnos (OAuth)

### Variables OAuth (OPCIONALES - Solo si usas pagos por turnos)

```env
# Client ID de MercadoPago (OAuth)
MP_CLIENT_ID=6037903379451498

# Client Secret de MercadoPago (OAuth)
MP_CLIENT_SECRET=xxxxx-xxxxx-xxxxx

# URL de redirección para OAuth
MP_REDIRECT_URI=https://turnio-frontend-production.up.railway.app/dashboard/settings/payments/callback
```

**Nota:** Estas variables son para el sistema de pagos por turnos (cuando los negocios conectan su propio MercadoPago). Si solo usas el sistema de suscripciones, no son necesarias.

---

## 📋 Variables Adicionales (Opcionales)

### Clave Secreta del Webhook (Opcional - para validación futura)

```env
# Clave secreta del webhook (opcional, para validar que los webhooks vengan de MP)
MP_WEBHOOK_SECRET=bf262b17e5b5f61fdb63b7354df3477e2d864c9f3ca79f2792119dd83a645155
```

**Nota:** Esta clave la obtienes del panel de MercadoPago en la configuración de webhooks. Actualmente no se usa para validación, pero es buena práctica tenerla configurada.

---

## 🎯 Resumen Mínimo para Sistema de Suscripciones

**Solo necesitas estas 4 variables:**

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx-xxxxx-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx-xxxxx-xxxxx
BACKEND_URL=https://turnio-backend-production.up.railway.app
FRONTEND_URL=https://turnio-frontend-production.up.railway.app
```

---

## 📍 Dónde Obtener las Credenciales

### MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY

1. Ve a: https://www.mercadopago.com.ar/developers/panel/app
2. Inicia sesión
3. Selecciona tu aplicación
4. Ve a **"Credenciales"**
5. Para sandbox: **"Credenciales de prueba"**
6. Para producción: **"Credenciales de producción"**
7. Copia:
   - **Access Token** → `MERCADOPAGO_ACCESS_TOKEN`
   - **Public Key** → `MERCADOPAGO_PUBLIC_KEY`

### MP_CLIENT_ID y MP_CLIENT_SECRET (si usas OAuth)

1. En el mismo panel de MercadoPago
2. Ve a **"Credenciales de producción"** (aunque uses sandbox)
3. Busca:
   - **Client ID** → `MP_CLIENT_ID`
   - **Client Secret** → `MP_CLIENT_SECRET`

### MP_WEBHOOK_SECRET (opcional)

1. Ve a: https://www.mercadopago.com.ar/developers/panel/webhooks
2. Selecciona tu aplicación
3. En la sección **"Clave secreta"**
4. Copia la clave generada → `MP_WEBHOOK_SECRET`

---

## ✅ Checklist de Configuración

- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado (empieza con `TEST-` o `APP-`)
- [ ] `MERCADOPAGO_PUBLIC_KEY` configurado (empieza con `TEST-` o `APP-`)
- [ ] `BACKEND_URL` configurado (URL de Railway)
- [ ] `FRONTEND_URL` configurado (URL de Railway)
- [ ] Variables desplegadas en Railway (Deploy realizado)
- [ ] Verificado con script: `node scripts/test-suscripciones-sandbox.js`

---

## 🧪 Verificar Configuración

Ejecuta el script de verificación:

```bash
node scripts/test-suscripciones-sandbox.js
```

Debería mostrar:
```
✅ Variables de entorno: CONFIGURADAS
✅ Conexión con MercadoPago: FUNCIONAL
✅ Base de datos: CONECTADA
```

---

## ⚠️ Errores Comunes

### Error: "MERCADOPAGO_ACCESS_TOKEN no definido"
- **Solución:** Verifica que agregaste la variable en Railway
- **Solución:** Verifica que hiciste "Deploy" después de agregarla

### Error: "Invalid access token"
- **Solución:** Verifica que el token sea correcto
- **Solución:** Verifica que no haya espacios al inicio o final
- **Solución:** Regenera el token en el panel de MercadoPago

### Error: "Token debe empezar con TEST-"
- **Solución:** Estás usando token de producción en sandbox
- **Solución:** Usa "Credenciales de prueba" para sandbox

---

**Última actualización:** 2024-12-19

