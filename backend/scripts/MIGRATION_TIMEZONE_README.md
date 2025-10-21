# 🔧 Migración de Timezone de Turnos

## 📋 Problema
Los turnos fueron guardados sin ajuste de timezone Argentina (UTC-3). Por ejemplo:
- Un turno creado para las **11:00 AM Argentina**
- Se guardaba como **11:00 UTC** (debería ser 14:00 UTC)
- **Diferencia:** 3 horas adelantado

Esto causaba que los turnos aparecieran como "pendientes de evaluar" antes de tiempo.

---

## 🔧 Solución
Script que ajusta todos los turnos existentes sumando 3 horas a `startTime` y `endTime`.

---

## ⚠️ IMPORTANTE
**Este script debe ejecutarse UNA SOLA VEZ antes de hacer deploy del fix de timezone.**

---

## 🚀 Cómo Ejecutar

### Opción 1: En Railway (Producción)

1. Ve a Railway → Backend Service → Deploy Logs
2. Abre la terminal integrada
3. Ejecuta:
```bash
node scripts/fix-timezone-appointments.js
```

### Opción 2: Localmente contra Railway DB

1. Asegúrate de tener el `DATABASE_URL` de Railway en tu `.env`
2. Ejecuta:
```bash
cd backend
node scripts/fix-timezone-appointments.js
```

---

## 📊 Qué Hace el Script

1. **Lee todos los turnos** de la base de datos
2. **Suma 3 horas** a `startTime` y `endTime` de cada turno
3. **Actualiza** la base de datos
4. **Muestra un resumen** de turnos actualizados

---

## ✅ Después de Ejecutar

Una vez completada la migración:
1. Verifica que el script terminó sin errores
2. Prueba crear un turno nuevo y verifica que se guarde correctamente
3. Haz push del fix de timezone:
```bash
git push origin main
```

---

## 🔄 Reversión (Si algo sale mal)

Si necesitas revertir los cambios:
```bash
# El script hace lo opuesto: restar 3 horas
# (Crear un script inverso si es necesario)
```

---

## 📝 Ejemplo de Output

```
🔧 Iniciando migración de timezone para turnos...

📊 Total de turnos encontrados: 23

   ✅ 10/23 turnos actualizados...
   ✅ 20/23 turnos actualizados...

============================================================
📊 RESUMEN DE MIGRACIÓN:
============================================================
✅ Turnos actualizados exitosamente: 23
❌ Errores: 0
📋 Total procesados: 23
============================================================

🎉 ¡Migración completada exitosamente!
📝 Todos los turnos ahora tienen el timezone correcto (UTC +3h)

✅ Script finalizado
```

