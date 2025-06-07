Write-Host "🚀 Iniciando deployment con corrección para Railway..." -ForegroundColor Cyan

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "Fix: Arregla error 404 en /services/public/cdfa - Agrega script railway-fix.js para diagnosticar y corregir problemas"

# Push a la rama principal
git push origin main

Write-Host "✅ Deployment completado. Railway comenzará el redeploy automáticamente." -ForegroundColor Green
Write-Host "🔗 Monitorea el progreso en: https://railway.app" -ForegroundColor Yellow
Write-Host "📝 Logs disponibles en Railway Dashboard" -ForegroundColor Yellow 