Write-Host "🚀 Deploying Railway fix v2..." -ForegroundColor Cyan

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "Fix v2: Robusto script de inicio y debug para Railway"

# Push a la rama principal
git push origin main

Write-Host "✅ Deployment v2 completado!" -ForegroundColor Green
Write-Host "🔗 Monitorea en: https://railway.app" -ForegroundColor Yellow
Write-Host "🐛 Debug URL disponible en Railway" -ForegroundColor Magenta 