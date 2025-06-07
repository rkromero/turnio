#!/bin/bash

echo "🚀 Iniciando deployment con corrección para Railway..."

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "🔧 Fix: Arregla error 404 en /services/public/cdfa

- Agrega script railway-fix.js para diagnosticar y corregir problemas
- Mejora logging en getPublicServices
- Configura auto-ejecución del fix en Railway deployment
- Asegura que el negocio 'cdfa' exista con servicios activos"

# Push a la rama principal
git push origin main

echo "✅ Deployment completado. Railway comenzará el redeploy automáticamente."
echo "🔗 Monitorea el progreso en: https://railway.app"
echo "📝 Logs disponibles en Railway Dashboard" 