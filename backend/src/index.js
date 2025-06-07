require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Debug: Log de variables de entorno importantes
console.log('🔧 Variables de entorno:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('- PORT:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para Railway/producción
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware de seguridad
app.use(helmet());

// Rate limiting (configurado para proxies)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana por IP
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
console.log('🌐 CORS configurado para:', corsOptions.origin);

app.use(cors(corsOptions));

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

// Función para ejecutar migraciones
async function runMigrations() {
  try {
    console.log('🔄 Sincronizando schema de base de datos...');
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    
    if (stdout) {
      console.log('✅ Schema sincronizado exitosamente:');
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('warn')) {
      console.warn('⚠️ Advertencias:', stderr);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando schema:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
    
    // Intentar con migrate deploy como fallback
    console.log('🔄 Intentando con migrate deploy...');
    try {
      const { stdout: stdout2, stderr: stderr2 } = await execAsync('npx prisma migrate deploy');
      if (stdout2) {
        console.log('✅ Migrate deploy exitoso:');
        console.log(stdout2);
      }
      return true;
    } catch (error2) {
      console.error('❌ También falló migrate deploy:', error2.message);
      return false;
    }
  }
}

// Función de inicio del servidor
async function startServer() {
  try {
    // 1. Ejecutar migraciones
    const migrationsSuccess = await runMigrations();
    if (!migrationsSuccess) {
      console.error('❌ Fallo al sincronizar schema. Continuando de todas formas...');
    }
    
    // 2. Conectar a la base de datos
    await connectDatabase();
    
    // 3. Configurar rutas
    const authRoutes = require('./routes/auth');
    const appointmentRoutes = require('./routes/appointments');
    const serviceRoutes = require('./routes/services');
    const dashboardRoutes = require('./routes/dashboard');
    const clientRoutes = require('./routes/clientRoutes');
    const reportRoutes = require('./routes/reportRoutes');
    const configRoutes = require('./routes/configRoutes');
    const userRoutes = require('./routes/userRoutes');

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
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/clients', clientRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/users', userRoutes);

    // Ruta para reservas públicas (sin autenticación)
    app.post('/api/public/:businessSlug/book', async (req, res) => {
      try {
        const { businessSlug } = req.params;
        const { clientName, clientEmail, clientPhone, serviceId, startTime, notes, professionalId } = req.body;

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

        // Determinar el profesional a asignar
        let assignedProfessional = null;
        
        if (professionalId) {
          // Verificar que el profesional especificado existe y está activo
          assignedProfessional = await prisma.user.findFirst({
            where: {
              id: professionalId,
              businessId: business.id,
              isActive: true
            }
          });

          if (!assignedProfessional) {
            return res.status(400).json({
              success: false,
              message: 'Profesional no disponible'
            });
          }
        } else {
          // Asignación automática: buscar profesional disponible
          const startDateTime = new Date(startTime);
          const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);
          const dayOfWeek = startDateTime.getDay();

          // Buscar profesionales que trabajen este día y estén disponibles
          const availableProfessionals = await prisma.user.findMany({
            where: {
              businessId: business.id,
              isActive: true,
              workingHours: {
                some: {
                  dayOfWeek: dayOfWeek,
                  isActive: true
                }
              }
            },
            include: {
              workingHours: {
                where: {
                  dayOfWeek: dayOfWeek,
                  isActive: true
                }
              },
              appointments: {
                where: {
                  startTime: {
                    gte: new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000),
                    lte: new Date(startDateTime.getTime() + 24 * 60 * 60 * 1000)
                  },
                  status: {
                    in: ['CONFIRMED', 'COMPLETED']
                  }
                }
              }
            }
          });

          // Filtrar profesionales que realmente estén disponibles en el horario solicitado
          for (const professional of availableProfessionals) {
            const workingHour = professional.workingHours[0];
            if (!workingHour) continue;

            // Verificar que el horario está dentro del horario laboral
            const [startHour, startMin] = workingHour.startTime.split(':').map(Number);
            const [endHour, endMin] = workingHour.endTime.split(':').map(Number);
            
            const workStart = new Date(startDateTime);
            workStart.setHours(startHour, startMin, 0, 0);
            
            const workEnd = new Date(startDateTime);
            workEnd.setHours(endHour, endMin, 0, 0);

            if (startDateTime >= workStart && endDateTime <= workEnd) {
              // Verificar que no tenga conflictos con otras citas
              const hasConflict = professional.appointments.some(appointment => {
                const appointmentStart = new Date(appointment.startTime);
                const appointmentEnd = new Date(appointment.endTime);
                
                return (
                  (startDateTime >= appointmentStart && startDateTime < appointmentEnd) ||
                  (endDateTime > appointmentStart && endDateTime <= appointmentEnd) ||
                  (startDateTime <= appointmentStart && endDateTime >= appointmentEnd)
                );
              });

              if (!hasConflict) {
                assignedProfessional = professional;
                break; // Tomar el primer profesional disponible
              }
            }
          }

          if (!assignedProfessional) {
            return res.status(400).json({
              success: false,
              message: 'No hay profesionales disponibles en el horario solicitado'
            });
          }
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
            userId: assignedProfessional.id,
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
            },
            user: {
              select: {
                name: true,
                avatar: true
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
            professionalName: appointment.user.name,
            professionalAvatar: appointment.user.avatar,
            startTime: appointment.startTime,
            duration: appointment.service.duration,
            businessName: business.name,
            wasAutoAssigned: !professionalId
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

    // 4. Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 Servidor TurnIO ejecutándose en puerto', PORT);
      console.log('📊 Ambiente:', process.env.NODE_ENV);
      console.log('🔗 Health check: http://localhost:' + PORT + '/health');
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

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