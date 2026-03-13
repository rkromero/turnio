// Configuración de rendimiento para Turnio
// Optimizaciones para Core Web Vitals y SEO

// Preload critical resources
const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  document.head.appendChild(fontLink);
};

// Optimize images with lazy loading
const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    // Add lazy loading
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    
    // Add proper alt text if missing
    if (!img.hasAttribute('alt')) {
      img.setAttribute('alt', 'Turnio - Software de gestión de turnos para negocios argentinos');
    }
    
    // Add decoding async for better performance
    img.setAttribute('decoding', 'async');
  });
};

// Optimize external scripts
const optimizeExternalScripts = () => {
  // Add rel="noopener" to external links
  const externalLinks = document.querySelectorAll('a[href^="http"]');
  externalLinks.forEach(link => {
    if (!link.hasAttribute('rel')) {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
};

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', () => {
  preloadCriticalResources();
  optimizeImages();
  optimizeExternalScripts();
});

// Performance monitoring
const monitorPerformance = () => {
  // Monitor Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Monitor Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver(() => {});
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver(() => {});
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
};

// Initialize performance monitoring
monitorPerformance();
