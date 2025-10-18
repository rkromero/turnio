# Sistema de Permisos por Rol

## 📋 Resumen

Se implementó un sistema de filtrado automático de turnos basado en el rol del usuario autenticado.

## 🔒 Roles del Sistema

### 1. **ADMIN** (Administrador/Dueño)
- **Permisos completos** sobre el negocio
- **Ve todos los turnos** de todos los profesionales
- **Ve todas las estadísticas** del negocio
- **Gestiona empleados**, servicios, sucursales, etc.

### 2. **EMPLOYEE** (Empleado/Profesional)
- **Permisos limitados** a su propia información
- **Solo ve sus propios turnos** (donde él es el profesional asignado)
- **Ve estadísticas limitadas** (solo de sus propios turnos)
- **No ve** turnos de otros profesionales
- **No ve** totales de clientes del negocio (por privacidad)

---

## 🎯 Endpoints Modificados

### 1. **GET /api/appointments** - Lista de Turnos
**Antes:**
- Todos los usuarios veían todos los turnos del negocio

**Ahora:**
- **ADMIN**: Ve todos los turnos del negocio
- **EMPLOYEE**: Solo ve turnos donde `userId = currentUser.id`

```javascript
// Filtro automático aplicado
if (currentUser.role === 'EMPLOYEE') {
  where.userId = currentUser.id;
}
```

---

### 2. **GET /api/dashboard/stats** - Estadísticas del Dashboard
**Antes:**
- Todos los usuarios veían las mismas estadísticas

**Ahora:**
- **ADMIN**: Ve todas las estadísticas del negocio
- **EMPLOYEE**: Ve solo estadísticas de sus propios turnos
  - Turnos de hoy: solo los suyos
  - Ingresos del mes: solo de sus turnos completados
  - Próximos turnos: solo los suyos
  - Total de clientes: 0 (no tiene acceso a esta información)

```javascript
const baseFilter = { 
  businessId,
  branchId: { in: branchIds }
};

if (currentUser.role === 'EMPLOYEE') {
  baseFilter.userId = currentUser.id;
}
```

---

### 3. **GET /api/reports/metrics** - Reportes
**Antes:**
- Todos los usuarios veían los mismos reportes

**Ahora:**
- **ADMIN**: Ve reportes completos del negocio
- **EMPLOYEE**: Ve reportes solo de sus propios turnos
  - Total de citas: solo las suyas
  - Citas por estado: solo las suyas
  - Ingresos: solo de sus turnos
  - Clientes únicos: solo los que atendió

```javascript
const baseFilter = {
  businessId: businessId,
  startTime: { gte: startDate, lte: endDate }
};

if (currentUser.role === 'EMPLOYEE') {
  baseFilter.userId = currentUser.id;
}
```

---

## 🔑 Implementación Técnica

### Middleware de Autenticación
```javascript
// backend/src/middleware/auth.js
const authenticateToken = async (req, res, next) => {
  // ... verificación de token ...
  req.user = user;  // Usuario completo con rol
  req.businessId = user.businessId;
  next();
};
```

### Acceso al Usuario Actual
En todos los controladores tenemos acceso a:
- `req.user` - Usuario autenticado completo
- `req.user.role` - Rol del usuario (`ADMIN` o `EMPLOYEE`)
- `req.user.id` - ID del usuario

### Filtrado Automático
El filtrado se aplica automáticamente en el backend, no requiere cambios en el frontend.

---

## 🧪 Casos de Prueba

### Caso 1: ADMIN consulta turnos
```
GET /api/appointments
Headers: Authorization: Bearer <admin_token>

Resultado: Devuelve todos los turnos del negocio
```

### Caso 2: EMPLOYEE consulta turnos
```
GET /api/appointments
Headers: Authorization: Bearer <employee_token>

Resultado: Devuelve solo los turnos donde userId = employee.id
```

### Caso 3: EMPLOYEE intenta ver turno de otro profesional
```
GET /api/appointments?userId=otro_profesional_id
Headers: Authorization: Bearer <employee_token>

Resultado: El filtro ignora el query param, devuelve solo sus propios turnos
```

---

## 📊 Base de Datos

### Modelo Appointment
```prisma
model Appointment {
  id           String   @id @default(cuid())
  businessId   String
  userId       String?  // 👈 Profesional asignado
  // ... otros campos ...
}
```

El campo `userId` en `Appointment` indica qué profesional está asignado a ese turno.

---

## ✅ Beneficios

1. **Privacidad**: Los empleados no ven información de otros profesionales
2. **Seguridad**: El filtrado se aplica en el backend, no se puede omitir desde el frontend
3. **Simplicidad**: No requiere cambios en el frontend, funciona automáticamente
4. **Escalabilidad**: Fácil de extender con más roles en el futuro

---

## 🚀 Despliegue

Los cambios se aplicaron en:
- `backend/src/controllers/appointmentController.js`
- `backend/src/controllers/dashboardController.js`
- `backend/src/controllers/reportController.js`

**Commit:** `feat: filtrar turnos por rol - empleados solo ven sus propios turnos`

**Estado:** ✅ Deployado en Railway

---

## 📝 Notas Adicionales

- Los empleados **SÍ pueden** ver la información completa de los clientes que ellos atienden
- Los empleados **NO pueden** ver estadísticas globales del negocio
- Los empleados **NO pueden** crear, editar o eliminar otros usuarios
- Los administradores mantienen permisos completos sobre todo el sistema

---

## 🔮 Futuras Mejoras

1. **Rol MANAGER**: Permisos intermedios entre ADMIN y EMPLOYEE
2. **Permisos granulares**: Sistema de permisos más detallado por funcionalidad
3. **Auditoría**: Log de accesos y modificaciones por usuario
4. **Multi-negocio**: Soporte para usuarios que trabajan en múltiples negocios

