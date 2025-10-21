# 🔧 Migración de Timezone de Turnos

## 📋 Problema
Los turnos fueron guardados CON un ajuste de +3 horas (incorrecto). Por ejemplo:
- Un turno creado para las **9:00 AM**
- Se guardaba como **12:00 PM** (se le sumaban 3 horas incorrectamente)
- **Diferencia:** 3 horas de más

Esto causaba que los turnos aparecieran 3 horas más tarde de lo esperado.

---

## 🔧 Solución
Script que ajusta todos los turnos existentes **restando 3 horas** a `startTime` y `endTime`.

---

## ⚠️ IMPORTANTE
**Este script debe ejecutarse UNA SOLA VEZ DESPUÉS de hacer deploy del fix de timezone.**

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
2. **Resta 3 horas** a `startTime` y `endTime` de cada turno (corrige el offset aplicado incorrectamente)
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
# El script hace lo opuesto: sumar 3 horas
# Cambia en línea 47 y 48: 
# - 3 * 60 * 60 * 1000  →  + 3 * 60 * 60 * 1000
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
📝 Todos los turnos ahora tienen la hora correcta (se corrigieron las 3h de más)

✅ Script finalizado
```

