import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para archivos estáticos con tipos MIME correctos
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    // Service Worker
    if (filePath.endsWith('/sw.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Manifest
    else if (filePath.endsWith('/manifest.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    // JavaScript files
    else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // CSS files
    else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    // JSON files
    else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));

// API proxy (si es necesario)
app.use('/api', (req, res) => {
  // Redirigir requests de API al backend
  const backendUrl = process.env.VITE_API_URL || 'https://turnio-backend-production.up.railway.app';
  const targetUrl = `${backendUrl}${req.originalUrl}`;
  
  res.redirect(302, targetUrl);
});

// SPA fallback - todas las rutas de la app van a index.html
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Verificar si el archivo existe
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down server...');
  process.exit(0);
}); 