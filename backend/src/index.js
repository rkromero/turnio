require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { connectDatabase, disconnectDatabase } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const serviceRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rutas de salud
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TurnIO API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);

// Ruta para reservas públicas (sin autenticación)
app.post('/api/public/:businessSlug/book', async (req, res) => {
  try {
    const { businessSlug } = req.params;
    const { clientName, clientEmail, clientPhone, serviceId, startTime, notes } = req.body;

    // Buscar el negocio
    const { prisma } = require('./config/database');
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    // Verificar el servicio
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        businessId: business.id,
        isActive: true
      }
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Crear o encontrar cliente
    let client = await prisma.client.findFirst({
      where: {
        businessId: business.id,
        OR: [
          { email: clientEmail },
          { phone: clientPhone }
        ]
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          businessId: business.id,
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        }
      });
    }

    // Crear el turno
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        serviceId,
        startTime: startDateTime,
        endTime: endDateTime,
        notes,
        status: 'CONFIRMED'
      },
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Turno reservado exitosamente',
      data: {
        appointmentId: appointment.id,
        clientName: client.name,
        serviceName: appointment.service.name,
        startTime: appointment.startTime,
        duration: appointment.service.duration,
        businessName: business.name
      }
    });

  } catch (error) {
    console.error('Error en reserva pública:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    
    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor TurnIO ejecutándose en puerto ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('🔄 Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

// Iniciar el servidor
startServer(); 