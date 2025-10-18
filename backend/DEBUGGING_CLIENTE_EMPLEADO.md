# 🐛 Debug: Error al crear cliente como EMPLOYEE

## ❌ Error reportado:
```
Failed to load resource: the server responded with a status of 400 ()
URL: turnio-backend-production.up.railway.app/api/clients
```

## 🔍 Análisis:

### 1. **Validaciones actuales:**
```javascript
body('name').trim().notEmpty().isLength({ min: 2, max: 100 })
body('email').optional().isEmail()
body('phone').optional().custom((value) => {
  if (!value || value.trim() === '') return true;
  if (!/^[\d\s\-\+\(\)]+$/.test(value.trim())) {
    throw new Error('Formato de teléfono inválido');
  }
  return true;
})
body('notes').optional().isLength({ max: 500 })
```

### 2. **Permisos actuales:**
- ✅ Ruta usa `authenticateTokenOnly` (no requiere rol ADMIN)
- ✅ EMPLOYEE **SÍ puede** crear clientes

### 3. **Posibles causas del error 400:**

#### A) **Falta el campo `name`**
- El nombre es requerido
- Debe tener entre 2 y 100 caracteres

#### B) **Email inválido**
- Si se envía email, debe tener formato válido

#### C) **Teléfono con caracteres inválidos**
- Solo se permiten: números, espacios, guiones, paréntesis, +
- **NO se permiten**: letras, símbolos especiales

#### D) **Notas muy largas**
- Máximo 500 caracteres

## 🔧 Soluciones:

### Opción 1: Ver logs en Railway
```bash
# En Railway dashboard:
1. Ir al servicio backend
2. Click en "Deployments"
3. Click en el deployment activo
4. Ver "Logs" en tiempo real
5. Buscar: "[CLIENT DEBUG]" o "Errores de validación"
```

### Opción 2: Revisar payload enviado
El frontend debe enviar:
```json
{
  "name": "Nombre Cliente",      // REQUERIDO (2-100 chars)
  "email": "email@example.com",  // OPCIONAL (formato email válido)
  "phone": "+54 11 1234-5678",   // OPCIONAL (solo números/espacios/guiones/+/paréntesis)
  "notes": "Notas opcionales"    // OPCIONAL (max 500 chars)
}
```

### Opción 3: Probar con curl/Postman
```bash
curl -X POST https://turnio-backend-production.up.railway.app/api/clients \
  -H "Authorization: Bearer <token_empleado>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Prueba",
    "email": "test@test.com",
    "phone": "1234567890"
  }'
```

## 🚨 Error Común: Teléfono con letras

Si el teléfono tiene letras o símbolos raros, va a fallar:
```javascript
❌ "+54-11-abcd-1234"  // Tiene letras
❌ "11#1234-5678"      // Tiene #
✅ "+54 11 1234-5678"  // OK
✅ "1234567890"        // OK
✅ "+54-11-1234-5678"  // OK
```

## 📝 Checklist de Debugging:

1. [ ] Revisar que el campo `name` no esté vacío
2. [ ] Verificar que el `email` tenga formato válido
3. [ ] Revisar que el `phone` solo tenga números/espacios/guiones/+/paréntesis
4. [ ] Verificar que las `notes` no excedan 500 caracteres
5. [ ] Ver logs en Railway con keyword "[CLIENT DEBUG]"
6. [ ] Verificar que el token del empleado sea válido
7. [ ] Probar con Postman/curl para aislar si es problema del frontend

## 🔄 Próximos pasos:

**Por favor, proporciona:**
1. Los datos exactos que intentas enviar (nombre, email, teléfono)
2. O captura de pantalla del error en Network tab (con el payload)
3. O logs de Railway con el error exacto

