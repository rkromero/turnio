# Sistema de Suscripciones - TurnIO

## 📊 Estados de Suscripción

### Enum: `SubscriptionStatus`

| Estado | Descripción | Cuándo se usa |
|--------|-------------|---------------|
| `ACTIVE` | Suscripción activa y funcional | Plan pagado y vigente, o plan gratuito |
| `CANCELLED` | Usuario canceló la suscripción | Mantiene acceso hasta fin del período pagado |
| `SUSPENDED` | Suspendida por falta de pago | No hay pago después de vencimiento |
| `EXPIRED` | Período de suscripción terminó | Después de fecha de vencimiento sin renovación |
| `PAYMENT_FAILED` | Fallo en el pago | Intento de pago rechazado por MP |

## 🔄 Flujos de Cambio de Plan

### 1. Upgrade (FREE → BASIC/PREMIUM/ENTERPRISE)

```
1. Usuario solicita upgrade
   ↓
2. Se crea Payment con status PENDING
   - amount: precio del nuevo plan
   - paymentMethod: "plan_upgrade_FREE_to_BASIC"
   ↓
3. Se actualiza Subscription.metadata
   - pendingUpgrade: { paymentId, fromPlan, toPlan, amount, requestedAt }
   - Status permanece ACTIVE (usuario mantiene acceso actual)
   ↓
4. Se retorna requiresPayment=true + paymentId
   ↓
5. Frontend crea checkout de MercadoPago
   ↓
6. Usuario paga → Webhook recibe notificación
   ↓
7. processUpgradePayment() ejecuta:
   - Payment.status → APPROVED
   - Subscription.planType → nuevo plan
   - Subscription.nextBillingDate → +1 mes desde hoy
   - Business.planType → nuevo plan
   - Business.maxAppointments → según nuevo plan
   - Limpia metadata.pendingUpgrade
```

### 2. Downgrade (PREMIUM → BASIC o BASIC → FREE)

```
1. Usuario solicita downgrade
   ↓
2. Se actualiza Subscription.metadata
   - pendingDowngrade: { 
       fromPlan, toPlan, 
       effectiveDate: nextBillingDate,
       requestedAt, newPlanPrice 
     }
   - Status permanece ACTIVE (usuario mantiene acceso hasta vencimiento)
   ↓
3. Se retorna requiresPayment=false + effectiveDate
   ↓
4. Usuario mantiene plan actual hasta nextBillingDate
   ↓
5. Scheduler ejecuta processPendingDowngrades() diariamente
   ↓
6. En nextBillingDate:
   - Subscription.planType → nuevo plan
   - Business.planType → nuevo plan
   - Se crea Payment PENDING por nuevo plan
   - Limpia metadata.pendingDowngrade
```

### 3. Mismo nivel de plan

```
Si currentPlan === newPlan:
- Retorna success=true, requiresPayment=false
- No se hace ningún cambio
```

## 💳 Modelo de Payment

### Campos principales:

```prisma
model Payment {
  id                    String        @id @default(cuid())
  subscriptionId        String
  amount                Float
  currency              String        @default("ARS")
  status                PaymentStatus @default(PENDING)
  billingCycle          BillingCycle
  
  // MercadoPago
  mercadoPagoPaymentId  String?       @unique
  mercadoPagoOrderId    String?
  preferenceId          String?       @unique
  
  // Fechas
  paidAt                DateTime?
  dueDate               DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  
  // Metadatos del pago
  paymentMethod         String?       // Ejemplos:
                                     // - "credit_card"
                                     // - "plan_upgrade_FREE_to_BASIC"
                                     // - "monthly_renewal"
  installments          Int?
  failureReason         String?
  
  subscription          Subscription  @relation(...)
}
```

### PaymentStatus enum:

- `PENDING`: Esperando pago
- `APPROVED`: Pagado y aprobado
- `REJECTED`: Rechazado por MP
- `CANCELLED`: Cancelado por usuario
- `REFUNDED`: Reembolsado

## 🔐 Validaciones Críticas

### Antes de cambiar plan:

1. ✅ Usuario autenticado y con businessId
2. ✅ newPlanType existe en AVAILABLE_PLANS
3. ✅ Si tiene suscripción, usar subscriptionId correcto
4. ✅ Verificar límites del nuevo plan vs uso actual

### Antes de crear Payment:

1. ✅ subscriptionId válido
2. ✅ amount > 0 para planes pagados
3. ✅ billingCycle válido (MONTHLY/YEARLY)
4. ✅ NO usar campos que no existen (como metadata en Payment)

### Antes de procesar pago:

1. ✅ Payment existe y status es APPROVED
2. ✅ Subscription.metadata.pendingUpgrade existe
3. ✅ Business existe

## 🚨 Errores Comunes y Soluciones

### Error: "Unknown argument `metadata`" en Payment
**Causa**: Payment NO tiene campo metadata (solo Subscription lo tiene)
**Solución**: Usar paymentMethod para info del tipo de pago

### Error: "Invalid value for argument `status`. Expected SubscriptionStatus"
**Causa**: Intentar usar status que no existe en el enum
**Solución**: Solo usar: ACTIVE, CANCELLED, SUSPENDED, EXPIRED, PAYMENT_FAILED

### Error: "Ya tienes una suscripción activa"
**Causa**: Frontend envía subscriptionId=null cuando SÍ existe suscripción
**Solución**: Obtener suscripción actual con getCurrentSubscription() primero

### Error: Campo faltante en modelo
**Causa**: Código usa campo que no está en schema.prisma
**Solución**: Verificar schema antes de crear/actualizar registros

## 📝 Checklist de Desarrollo

Antes de modificar sistema de suscripciones:

- [ ] Verificar schema.prisma para campos y enums válidos
- [ ] Revisar este documento para flujos correctos
- [ ] Probar con plan FREE primero
- [ ] Validar que metadata solo se usa en Subscription
- [ ] Usar solo status válidos del enum
- [ ] Agregar logs detallados para debugging
- [ ] Probar en Railway (no local)

## 🔗 Endpoints Relacionados

- `POST /api/subscriptions/change-plan` - Cambiar plan
- `GET /api/subscriptions/current` - Obtener suscripción actual
- `POST /api/subscriptions/create` - Crear suscripción nueva
- `POST /api/subscriptions/cancel` - Cancelar suscripción
- `GET /api/subscriptions/payment-history` - Historial de pagos
- `POST /api/subscriptions/process-upgrade-payment` - Procesar pago de upgrade
- `POST /api/mercadopago/webhook` - Webhook de MercadoPago

## 🧪 Testing

Para probar cambios de plan:

1. Crear negocio con plan FREE
2. Intentar upgrade a BASIC
3. Verificar que se crea Payment PENDING
4. Verificar metadata.pendingUpgrade en Subscription
5. Simular pago aprobado
6. Verificar que plan cambia correctamente
7. Verificar que Business.planType se actualiza
8. Verificar logs en Railway

## 📞 Soporte

Si encuentras errores:
1. Revisar logs de Railway
2. Buscar error en este documento
3. Verificar schema.prisma
4. Revisar código con logs detallados

