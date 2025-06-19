# Sistema de Suscripciones Automáticas - TurnIO

## 🎯 **Resumen**

El sistema ahora incluye **cobro automático recurrente** cada 30 días (o 12 meses para planes anuales) usando MercadoPago Subscriptions.

## 🔄 **Cómo Funciona**

### **1. Flujo de Suscripción Automática**

```
Usuario se registra → Selecciona plan pago → Crea suscripción automática → MercadoPago cobra cada 30 días
```

### **2. Proceso Detallado**

1. **Registro inicial**: Usuario se registra con plan FREE
2. **Selección de plan**: Usuario elige plan pago (BASIC, PREMIUM, ENTERPRISE)
3. **Creación de suscripción**: Sistema crea suscripción con status `PAYMENT_FAILED`
4. **Configuración automática**: Usuario configura pago automático con MercadoPago
5. **Primer cobro**: MercadoPago procesa el primer pago
6. **Cobros recurrentes**: MercadoPago cobra automáticamente cada 30 días

## 💳 **Configuración de MercadoPago**

### **Variables de Entorno Requeridas**

```env
MERCADOPAGO_ACCESS_TOKEN=your_access_token
MERCADOPAGO_PUBLIC_KEY=your_public_key
FRONTEND_URL=https://your-frontend-url.com
BACKEND_URL=https://your-backend-url.com
```

### **Webhooks Configurados**

- **Pago único**: `/api/mercadopago/webhook`
- **Suscripción automática**: `/api/mercadopago/subscription-webhook`

## 📊 **Estructura de Datos**

### **Tabla Subscription**

```sql
- id: Identificador único
- businessId: ID del negocio
- planType: FREE, BASIC, PREMIUM, ENTERPRISE
- status: ACTIVE, CANCELLED, SUSPENDED, EXPIRED, PAYMENT_FAILED
- billingCycle: MONTHLY, YEARLY
- priceAmount: Precio del plan
- startDate: Fecha de inicio
- nextBillingDate: Próxima fecha de cobro
- mercadoPagoSubscriptionId: ID de suscripción en MercadoPago
```

### **Tabla Payment**

```sql
- id: Identificador único
- subscriptionId: ID de la suscripción
- amount: Monto del pago
- status: PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED
- billingCycle: MONTHLY, YEARLY
- mercadoPagoPaymentId: ID del pago en MercadoPago
- paidAt: Fecha de pago
- dueDate: Fecha de vencimiento
```

## 🔧 **Endpoints Implementados**

### **Crear Suscripción Automática**
```
POST /api/mercadopago/create-automatic-subscription
```

**Body:**
```json
{
  "subscriptionId": "subscription_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "mp_subscription_id",
    "publicKey": "mp_public_key",
    "initPoint": "payment_url",
    "subscription": {
      "id": "subscription_id",
      "planType": "BASIC",
      "billingCycle": "MONTHLY",
      "amount": 4900,
      "status": "ACTIVE"
    }
  }
}
```

### **Webhook de Suscripción Automática**
```
POST /api/mercadopago/subscription-webhook
```

## ⏰ **Ciclos de Cobro**

### **Planes Mensuales**
- **Frecuencia**: Cada 30 días
- **Configuración**: `frequency: 1, frequency_type: "months"`

### **Planes Anuales**
- **Frecuencia**: Cada 12 meses
- **Configuración**: `frequency: 12, frequency_type: "months"`
- **Descuento**: 10% sobre el precio mensual

## 🚨 **Manejo de Errores**

### **Pago Fallido**
1. MercadoPago intenta el cobro
2. Si falla, envía webhook con status `rejected`
3. Sistema actualiza suscripción a `PAYMENT_FAILED`
4. Usuario recibe notificación
5. Sistema permite reintentar el pago

### **Suscripción Cancelada**
1. Usuario cancela desde el dashboard
2. Sistema actualiza status a `CANCELLED`
3. MercadoPago detiene los cobros automáticos
4. Usuario vuelve al plan FREE

## 🔍 **Monitoreo y Logs**

### **Logs Importantes**
- `💳 Creando suscripción automática de MercadoPago`
- `✅ Suscripción automática creada exitosamente`
- `🔔 Webhook de suscripción automática recibido`
- `💳 Pago automático recibido`
- `✅ Pago automático procesado`

### **Verificación de Estado**
```javascript
// Verificar suscripciones vencidas
const checkExpiredSubscriptions = async () => {
  // Busca suscripciones que deben renovarse
  // Procesa pagos automáticos
  // Actualiza estados
};
```

## 🧪 **Pruebas**

### **Script de Prueba Completa**
```bash
node test-automatic-subscription.js
```

### **Verificar Funcionamiento**
1. Crear negocio de prueba
2. Crear suscripción BASIC
3. Configurar suscripción automática
4. Verificar webhooks
5. Simular pagos automáticos

## 📈 **Métricas y Reportes**

### **Datos Disponibles**
- Total de suscripciones activas
- Ingresos recurrentes mensuales
- Tasa de éxito de pagos automáticos
- Suscripciones canceladas
- Pagos fallidos

### **Dashboard de Suscripciones**
- Estado de todas las suscripciones
- Próximas fechas de cobro
- Historial de pagos
- Alertas de pagos fallidos

## 🔐 **Seguridad**

### **Autenticación**
- Todos los endpoints protegidos con JWT
- Webhooks verificados por MercadoPago
- Validación de permisos por negocio

### **Validaciones**
- Verificación de datos de entrada
- Validación de estados de suscripción
- Control de acceso por businessId

## 🚀 **Próximos Pasos**

### **Mejoras Planificadas**
1. **Notificaciones por email** para pagos fallidos
2. **Dashboard de analytics** de suscripciones
3. **Sistema de reintentos** automáticos
4. **Facturación automática** con PDF
5. **Integración con contabilidad**

### **Optimizaciones**
1. **Cache de datos** de suscripciones
2. **Procesamiento en lotes** de pagos
3. **Monitoreo en tiempo real** de webhooks
4. **Backup automático** de datos críticos

## 📞 **Soporte**

### **Problemas Comunes**
1. **Webhook no recibido**: Verificar URL y configuración
2. **Pago no procesado**: Revisar logs y estado de MercadoPago
3. **Suscripción no activada**: Verificar webhook y base de datos

### **Contacto**
- Revisar logs en Railway
- Verificar configuración de MercadoPago
- Consultar documentación de MercadoPago Subscriptions

---

**¡El sistema está listo para cobros automáticos cada 30 días!** 🎉 