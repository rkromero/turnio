# 📋 TODO - Sistema TurnIO

## 🔴 **CRÍTICO - Resolver Inmediatamente**

### 1. ❌ **Credenciales de Prueba MercadoPago**
**Problema:** Las credenciales TEST no aparecen en MercadoPago Argentina, impide probar suscripciones.

**Solución:**
- [ ] Crear usuarios de prueba (Vendedor y Comprador) en MercadoPago
- [ ] Obtener credenciales TEST del usuario vendedor
- [ ] Actualizar variables en Railway
- [ ] Probar flujo completo de suscripción con tarjetas de prueba

**Impacto:** 🔥 **ALTO** - Sin esto no se puede probar ni cobrar suscripciones

---

## 🟠 **IMPORTANTE - Permisos y Seguridad**

### 2. 🔒 **Permisos de EMPLOYEE en Clientes**
**Estado:** ❌ Sin implementar

**Problema:** Los empleados pueden ver TODOS los clientes del negocio.

**Soluciones posibles:**
- **Opción A:** Empleados solo ven clientes de sus propios turnos (más restrictivo)
- **Opción B:** Empleados ven todos los clientes pero no pueden editarlos/eliminarlos
- **Opción C:** Empleados pueden ver/crear clientes libremente (actual, puede ser lo correcto)

**Archivos a modificar:**
- [ ] `backend/src/controllers/clientController.js` - Filtrar `getClients()`
- [ ] `backend/src/controllers/clientController.js` - Restringir `updateClient()` y `deleteClient()`

**Decisión necesaria:** ¿Qué modelo de permisos prefieres?

---

### 3. 🔒 **Permisos de EMPLOYEE en Servicios**
**Estado:** ❌ Sin implementar

**Problema:** Los empleados pueden crear/editar/eliminar servicios.

**Solución:**
- [ ] Solo ADMIN puede crear/editar/eliminar servicios
- [ ] EMPLOYEE solo puede ver servicios (lectura)

**Archivos a modificar:**
- [ ] `backend/src/controllers/serviceController.js` - Agregar `requireAdmin` middleware
- [ ] `backend/src/routes/services.js` - Proteger rutas POST/PUT/DELETE

---

### 4. 🔒 **Permisos de EMPLOYEE en Usuarios**
**Estado:** ❌ Sin implementar

**Problema:** Los empleados pueden ver/gestionar otros empleados.

**Solución:**
- [ ] Solo ADMIN puede crear/editar/eliminar usuarios
- [ ] EMPLOYEE solo puede ver su propio perfil y editar su información básica

**Archivos a modificar:**
- [ ] `backend/src/controllers/userController.js` - Filtrar `getUsers()` para empleados
- [ ] `backend/src/routes/userRoutes.js` - Proteger rutas con `requireAdmin`

---

### 5. 🔒 **Permisos de EMPLOYEE en Configuración**
**Estado:** ❌ Sin implementar

**Problema:** Los empleados pueden cambiar configuración del negocio.

**Solución:**
- [ ] Solo ADMIN puede editar configuración del negocio
- [ ] Solo ADMIN puede cambiar horarios de trabajo de otros
- [ ] EMPLOYEE puede editar sus propios horarios de trabajo

**Archivos a modificar:**
- [ ] `backend/src/controllers/configController.js`
- [ ] `backend/src/routes/configRoutes.js`

---

## 🟡 **MEDIO - Frontend y UX**

### 6. 🎨 **Frontend: Ocultar opciones según rol**
**Estado:** ⚠️ Desconocido (no revisado)

**Problema:** El frontend probablemente muestra todas las opciones a todos los usuarios.

**Solución:**
- [ ] Revisar `frontend/src/pages/` y componentes
- [ ] Ocultar menús de gestión para EMPLOYEE
- [ ] Ocultar opciones de crear/editar servicios para EMPLOYEE
- [ ] Ocultar opciones de gestión de usuarios para EMPLOYEE
- [ ] Mostrar vista simplificada del dashboard para EMPLOYEE

**Archivos a revisar:**
- [ ] `frontend/src/App.tsx` - Rutas protegidas por rol
- [ ] `frontend/src/components/Sidebar.tsx` o similar - Menú según rol
- [ ] `frontend/src/pages/Dashboard.tsx` - Vista según rol
- [ ] `frontend/src/pages/Appointments.tsx` - Filtros según rol
- [ ] `frontend/src/pages/Clients.tsx` - Acciones según rol
- [ ] `frontend/src/pages/Services.tsx` - Acciones según rol
- [ ] `frontend/src/pages/Users.tsx` - Solo visible para ADMIN

---

### 7. 📱 **Sistema de Notificaciones Push en Frontend**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Notificaciones de nuevos turnos
- [ ] Notificaciones de cambios en turnos
- [ ] Notificaciones de recordatorios próximos
- [ ] Badge/contador de notificaciones no leídas
- [ ] Centro de notificaciones

---

### 8. 🎯 **Onboarding para nuevos negocios**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Tour guiado al primer login
- [ ] Wizard de configuración inicial
- [ ] Tips contextuales
- [ ] Checklist de configuración

---

## 🟢 **BAJA - Mejoras y Features**

### 9. 📧 **Sistema de Notificaciones por Email**
**Estado:** ⚠️ Parcial (depende de implementación)

**Funcionalidades faltantes:**
- [ ] Confirmación de turno por email
- [ ] Recordatorio 24h antes del turno
- [ ] Recordatorio 2h antes del turno
- [ ] Email de cancelación
- [ ] Email de bienvenida a nuevos clientes
- [ ] Configurar plantillas de email personalizadas

**Implementación:**
- [ ] Integrar servicio de email (SendGrid, AWS SES, Resend)
- [ ] Crear plantillas HTML
- [ ] Queue de emails para envío asíncrono

---

### 10. 💬 **Sistema de Notificaciones por SMS/WhatsApp**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Confirmación de turno por SMS
- [ ] Recordatorio 24h antes
- [ ] Recordatorio 2h antes
- [ ] Link para cancelar/reagendar por WhatsApp
- [ ] Integración con WhatsApp Business API

**Servicios posibles:**
- Twilio
- WhatsApp Business API
- MessageBird

---

### 11. 🚫 **Políticas de Cancelación**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Configurar tiempo mínimo para cancelar (ej: 24h antes)
- [ ] Penalizaciones por cancelaciones tardías
- [ ] Límite de cancelaciones por cliente
- [ ] Bloqueo temporal de clientes con muchas cancelaciones
- [ ] Email/SMS automático al cancelar

---

### 12. 🔄 **Reagendamiento de Turnos**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Cliente puede reagendar desde email/SMS
- [ ] Cliente puede reagendar desde página pública
- [ ] Límite de reagendamientos permitidos
- [ ] Notificación al profesional de cambios

---

### 13. 🏖️ **Sistema de Ausencias/Vacaciones**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Empleados pueden marcar días/períodos de ausencia
- [ ] Bloqueo automático de horarios durante ausencias
- [ ] Notificación a admin de solicitudes de vacaciones
- [ ] Calendario de ausencias del equipo

---

### 14. 💰 **Pagos por Turno Individual (MercadoPago)**
**Estado:** ⚠️ Implementación existente pero sin probar completamente

**Verificar:**
- [ ] Flujo de pago al agendar turno
- [ ] Webhook de confirmación de pago
- [ ] Cancelación con reembolso
- [ ] Reporte de pagos individuales

---

### 15. 📊 **Reportes Avanzados**
**Estado:** ⚠️ Básico implementado

**Mejoras:**
- [ ] Exportar reportes a PDF
- [ ] Exportar reportes a Excel/CSV
- [ ] Reportes de ingresos por servicio
- [ ] Reportes de performance por empleado
- [ ] Reportes de tasa de cancelación
- [ ] Reportes de clientes recurrentes vs nuevos
- [ ] Gráficos interactivos (Chart.js o similar)

---

### 16. 🔔 **Recordatorios Automáticos**
**Estado:** ⚠️ Campo existe pero no hay automatización

**Funcionalidades:**
- [ ] Scheduler que revisa turnos próximos
- [ ] Envío automático de recordatorios 24h antes
- [ ] Envío automático de recordatorios 2h antes
- [ ] Marcar recordatorios como enviados
- [ ] Configurar horarios de envío

**Implementación:**
- [ ] Usar schedulerService existente
- [ ] Crear `reminderService.js`
- [ ] Integrar con sistema de emails/SMS

---

### 17. 📱 **App Móvil o PWA**
**Estado:** ❌ Sin implementar

**Opciones:**
- [ ] Convertir frontend a PWA (Progressive Web App)
- [ ] Desarrollar app nativa (React Native)
- [ ] Permitir instalación en móvil
- [ ] Notificaciones push móviles

---

### 18. 🔐 **Seguridad y Logs**
**Estado:** ⚠️ Básico implementado

**Mejoras:**
- [ ] Rate limiting en endpoints críticos
- [ ] Logs de auditoría (quién hizo qué y cuándo)
- [ ] Detección de intentos de acceso no autorizados
- [ ] 2FA (autenticación de dos factores)
- [ ] Encriptación de datos sensibles

---

### 19. 💾 **Backup y Recuperación**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Backup automático diario de base de datos
- [ ] Exportación de datos del negocio
- [ ] Importación de datos desde backup
- [ ] Almacenamiento en S3 o similar

---

### 20. 🌍 **Internacionalización (i18n)**
**Estado:** ❌ Sin implementar (todo en español)

**Funcionalidades:**
- [ ] Soporte multi-idioma (inglés, portugués)
- [ ] Detección automática de idioma
- [ ] Selector de idioma en UI
- [ ] Traducción de emails/SMS

---

### 21. 🎨 **Personalización de Marca**
**Estado:** ⚠️ Parcial (logo, colores básicos)

**Mejoras:**
- [ ] Personalización avanzada de colores
- [ ] Subida de múltiples imágenes (banner, fotos del local)
- [ ] Personalización de dominio propio
- [ ] Personalización de plantillas de email
- [ ] Preview en tiempo real de cambios

---

### 22. 🔗 **Integraciones**
**Estado:** ⚠️ Solo MercadoPago

**Posibles integraciones:**
- [ ] Google Calendar - Sincronizar turnos
- [ ] Facebook/Instagram - Reservas desde redes sociales
- [ ] Google My Business - Sincronizar info
- [ ] Zapier - Automatizaciones
- [ ] Stripe - Método de pago alternativo

---

### 23. 📈 **Dashboard Analítico Avanzado**
**Estado:** ⚠️ Dashboard básico existe

**Mejoras:**
- [ ] Gráficos de tendencias temporales
- [ ] Comparación mes a mes / año a año
- [ ] Predicción de ingresos
- [ ] Análisis de horarios más/menos populares
- [ ] Análisis de servicios más/menos solicitados
- [ ] KPIs personalizables

---

### 24. ⭐ **Sistema de Reseñas Mejorado**
**Estado:** ✅ Implementado pero mejorable

**Mejoras:**
- [ ] Respuestas a reseñas por parte del negocio
- [ ] Solicitud automática de reseña después del turno
- [ ] Widget de reseñas para insertar en web externa
- [ ] Sincronización con Google Reviews
- [ ] Moderación de reseñas

---

### 25. 🎁 **Sistema de Fidelización**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Puntos por turno completado
- [ ] Descuentos por puntos acumulados
- [ ] Cupones y promociones
- [ ] Programa de referidos
- [ ] Tarjeta de cliente frecuente

---

### 26. 📋 **Lista de Espera**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Cliente se anota en lista de espera si no hay turnos
- [ ] Notificación automática cuando se libera un turno
- [ ] Prioridad según orden de llegada
- [ ] Expiración de oportunidades no aprovechadas

---

### 27. 🔄 **Turnos Recurrentes**
**Estado:** ❌ Sin implementar

**Funcionalidades:**
- [ ] Cliente puede agendar turnos semanales/mensuales
- [ ] Renovación automática de turnos recurrentes
- [ ] Gestión de serie de turnos
- [ ] Cancelar/modificar toda una serie

---

## 🎯 **RECOMENDACIÓN DE PRIORIZACIÓN**

### 🚀 **FASE 1: Seguridad y Permisos (1-2 semanas)**
1. Permisos de EMPLOYEE en Clientes, Servicios, Usuarios, Configuración
2. Frontend: Ocultar opciones según rol
3. Logs de auditoría básicos

### 🚀 **FASE 2: MercadoPago y Suscripciones (1 semana)**
4. Resolver credenciales TEST de MercadoPago
5. Probar flujo completo de suscripciones
6. Implementar webhooks correctamente
7. Probar renovaciones automáticas

### 🚀 **FASE 3: Notificaciones y Recordatorios (2 semanas)**
8. Sistema de notificaciones por Email
9. Recordatorios automáticos 24h/2h antes
10. Sistema de confirmación de turnos

### 🚀 **FASE 4: Experiencia de Usuario (2 semanas)**
11. Onboarding para nuevos negocios
12. Políticas de cancelación
13. Reagendamiento de turnos
14. Sistema de ausencias/vacaciones

### 🚀 **FASE 5: Features Avanzadas (3-4 semanas)**
15. Reportes avanzados con exportación
16. Sistema de SMS/WhatsApp
17. Integraciones (Google Calendar, etc.)
18. Dashboard analítico avanzado

### 🚀 **FASE 6: Retención y Crecimiento (2-3 semanas)**
19. Sistema de fidelización
20. Lista de espera
21. Turnos recurrentes
22. Sistema de reseñas mejorado

---

## 📝 **DECISIONES PENDIENTES**

Antes de implementar, necesito que decidas:

1. **Permisos de EMPLOYEE con clientes:**
   - ¿Solo ven clientes de sus turnos? 
   - ¿Ven todos pero no pueden editar?
   - ¿Tienen acceso completo? (actual)

2. **Prioridades:**
   - ¿Qué fase quieres que implemente primero?
   - ¿Hay alguna funcionalidad crítica que no está en la lista?

3. **Servicios externos:**
   - ¿Qué servicio de email prefieres? (SendGrid, AWS SES, Resend)
   - ¿Necesitas SMS/WhatsApp? ¿Qué servicio? (Twilio, etc.)

---

**Total de items:** 27 funcionalidades/mejoras identificadas
**Estimación total:** 12-16 semanas de desarrollo


