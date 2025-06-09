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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'express',
    version: '1.0.1'
  });
});

// SPA fallback - SOLO para rutas que no son archivos estáticos
app.get('*', (req, res, next) => {
  // Si es una petición de archivo estático que no existe, dejar que express.static maneje el 404
  if (req.path.includes('.') && !req.path.includes('/api/')) {
    return next();
  }
  
  // Si es una ruta de la SPA, servir index.html
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Verificar que los archivos importantes existen
  const criticalFiles = ['index.html', 'manifest.json', 'sw.js'];
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, 'dist', file);
    const exists = fs.existsSync(filePath);
    console.log(`📄 ${file}: ${exists ? '✅ Found' : '❌ Missing'}`);
  });
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