# 📋 Resumen de Pendientes - TurnIO

## 🔥 **LO MÁS URGENTE (Top 5)**

### 1. ❌ **Credenciales TEST de MercadoPago**
**¿Por qué?** Sin esto no puedes probar ni cobrar suscripciones.
**Esfuerzo:** 1-2 horas
**Estado:** Bloqueado por proceso de MercadoPago

---

### 2. 🔒 **Permisos de EMPLOYEE (Backend)**
**¿Qué falta?** Los empleados actualmente pueden:
- ✅ Ver todos los turnos ← **YA CORREGIDO**
- ❌ Ver/editar/eliminar TODOS los clientes
- ❌ Crear/editar/eliminar servicios
- ❌ Ver/gestionar otros empleados
- ❌ Cambiar configuración del negocio

**¿Por qué?** Seguridad y privacidad de datos.
**Esfuerzo:** 3-4 horas

---

### 3. 🎨 **Permisos de EMPLOYEE (Frontend)**
**¿Qué falta?** El frontend probablemente muestra todas las opciones a todos los usuarios.

**Necesitas:**
- Ocultar menús de gestión para empleados
- Ocultar botones de crear/editar servicios
- Ocultar sección de usuarios
- Vista simplificada del dashboard

**¿Por qué?** UX - Los empleados no deberían ver opciones que no pueden usar.
**Esfuerzo:** 2-3 horas

---

### 4. 📧 **Recordatorios Automáticos**
**¿Qué falta?** Los turnos no envían recordatorios automáticos.

**Necesitas:**
- Email 24h antes del turno
- Email 2h antes del turno
- Marcar como enviado

**¿Por qué?** Reduce no-shows y mejora experiencia del cliente.
**Esfuerzo:** 4-6 horas (con email service)

---

### 5. 🚫 **Políticas de Cancelación**
**¿Qué falta?** Clientes pueden cancelar sin restricciones.

**Necesitas:**
- Tiempo mínimo para cancelar (ej: 4h antes)
- Bloquear cancelaciones muy cercanas
- Notificación al profesional

**¿Por qué?** Protege tu negocio de cancelaciones de último momento.
**Esfuerzo:** 2-3 horas

---

## 💡 **RECOMENDACIONES INMEDIATAS**

### 🎯 **SI TIENES 1 DÍA:**
Implementa **Permisos de EMPLOYEE** (Backend + Frontend)
→ Tu sistema estará seguro y bien estructurado

### 🎯 **SI TIENES 1 SEMANA:**
1. Permisos de EMPLOYEE (1 día)
2. Credenciales TEST + Pruebas MercadoPago (1-2 días)
3. Recordatorios Automáticos (1-2 días)
4. Políticas de Cancelación (medio día)

### 🎯 **SI TIENES 1 MES:**
Implementa **Fases 1-3** del plan completo:
- Seguridad y Permisos
- MercadoPago funcionando 100%
- Sistema de notificaciones completo

---

## ❓ **DECISIONES QUE NECESITO DE TI**

### 1️⃣ **Permisos de Clientes para EMPLOYEE:**
¿Qué prefieres?

**A) RESTRICTIVO** (Recomendado para privacidad)
- Empleados solo ven clientes de sus propios turnos
- No pueden crear/editar clientes

**B) MODERADO** (Balance)
- Empleados ven todos los clientes (lectura)
- Solo pueden editar clientes de sus turnos
- No pueden eliminar clientes

**C) PERMISIVO** (Actual)
- Empleados tienen acceso completo a clientes
- Pueden crear/editar/eliminar cualquier cliente

**¿Tu elección?** _______

---

### 2️⃣ **Servicio de Email:**
Para recordatorios y notificaciones, ¿qué prefieres?

**A) SendGrid** (Recomendado)
- Fácil de usar
- 100 emails/día gratis
- Buena reputación

**B) Resend** (Nuevo, moderno)
- 100 emails/día gratis
- UI moderna
- Fácil integración

**C) AWS SES** (Enterprise)
- Muy barato ($0.10 por 1000 emails)
- Más complejo de configurar
- Muy escalable

**¿Tu elección?** _______

---

### 3️⃣ **¿Necesitas SMS/WhatsApp?**
Para recordatorios más directos:

- **SÍ** → Twilio cuesta ~$0.04 por SMS
- **NO** → Solo emails (gratis con SendGrid/Resend)

**¿Tu elección?** _______

---

### 4️⃣ **Prioridad de Features:**
¿Qué te importa más?

1. ⭐ **Seguridad** (Permisos correctos)
2. ⭐ **Cobros** (MercadoPago funcionando)
3. ⭐ **Notificaciones** (Recordatorios automáticos)
4. ⭐ **Cancelaciones** (Políticas y restricciones)
5. ⭐ **Reportes** (Exportar PDF/Excel)
6. ⭐ **Integraciones** (Google Calendar, etc.)

**Ordena del 1-6 según tu prioridad:** _______

---

## 🚀 **¿QUÉ IMPLEMENTAMOS AHORA?**

Dime:
1. ¿Qué decisiones tomaste arriba? (A/B/C para cada una)
2. ¿Cuánto tiempo tienes disponible? (1 día, 1 semana, 1 mes)
3. ¿Hay algo urgente que no está en esta lista?

Y empezamos a implementar en ese orden. 💪

