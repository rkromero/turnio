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
const { startReviewNotificationService } = require('./services/reviewNotificationService');

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
    console.log('✅ Conectado a la base de datos');
    
    // Inicializar servicio de notificaciones de reseñas
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_REVIEW_NOTIFICATIONS === 'true') {
      startReviewNotificationService();
    }
    
    // 3. Configurar rutas
    const authRoutes = require('./routes/auth');
    const appointmentRoutes = require('./routes/appointments');
    const serviceRoutes = require('./routes/services');
    const dashboardRoutes = require('./routes/dashboard');
    const clientRoutes = require('./routes/clientRoutes');
    const reportRoutes = require('./routes/reportRoutes');
    const configRoutes = require('./routes/configRoutes');
    const userRoutes = require('./routes/userRoutes');
    const planRoutes = require('./routes/planRoutes');
    const reviewRoutes = require('./routes/reviewRoutes');
    const clientScoringRoutes = require('./routes/clientScoring');
    const branchRoutes = require('./routes/branchRoutes');
    const migrationRoutes = require('./routes/migrationRoutes');
    const breakTimeRoutes = require('./routes/breakTimeRoutes');

    // Rutas de salud
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'TurnIO API funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Ruta de debug para verificar el negocio CDFA
    app.get('/debug/cdfa', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        const business = await prisma.business.findUnique({
          where: { slug: 'cdfa' },
          include: {
            services: {
              where: { isActive: true }
            },
            _count: {
              select: {
                services: true,
                clients: true,
                appointments: true
              }
            }
          }
        });

        res.json({
          success: true,
          debug: {
            businessFound: !!business,
            business: business ? {
              id: business.id,
              name: business.name,
              slug: business.slug,
              activeServices: business._count.services,
              totalClients: business._count.clients,
              totalAppointments: business._count.appointments,
              services: business.services.map(s => ({
                id: s.id,
                name: s.name,
                duration: s.duration,
                price: s.price
              }))
            } : null,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint de debug para profesionales y horarios
    app.get('/debug/professionals', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        const business = await prisma.business.findUnique({
          where: { slug: 'cdfa' }
        });

        if (!business) {
          return res.json({
            success: false,
            error: 'Negocio CDFA no encontrado'
          });
        }

        const professionals = await prisma.user.findMany({
          where: {
            businessId: business.id
          },
          include: {
            workingHours: true,
            _count: {
              select: {
                appointments: true
              }
            }
          }
        });

        const result = {
          success: true,
          debug: {
            businessId: business.id,
            businessName: business.name,
            totalProfessionals: professionals.length,
            professionals: professionals.map(prof => ({
              id: prof.id,
              name: prof.name,
              email: prof.email,
              isActive: prof.isActive,
              totalAppointments: prof._count.appointments,
              workingHours: prof.workingHours.map(wh => ({
                dayOfWeek: wh.dayOfWeek,
                dayName: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][wh.dayOfWeek],
                startTime: wh.startTime,
                endTime: wh.endTime,
                isActive: wh.isActive
              }))
            })),
            summary: {
              total: professionals.length,
              active: professionals.filter(p => p.isActive).length,
              withSchedules: professionals.filter(p => p.workingHours.length > 0).length,
              fullyConfigured: professionals.filter(p => 
                p.isActive && p.workingHours.some(wh => wh.isActive)
              ).length
            },
            timestamp: new Date().toISOString()
          }
        };

        res.json(result);

      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para migrar tipos de negocio
    app.post('/debug/migrate-business-types', async (req, res) => {
      try {
        const migrateDatabaseSchema = require('../add-business-type-migration');
        const result = await migrateDatabaseSchema();
        
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error ejecutando migración de tipos de negocio:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al ejecutar la migración de tipos de negocio',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para migrar horarios de descanso
    app.post('/debug/migrate-break-times', async (req, res) => {
      try {
        const { migrateBreakTimes } = require('../add-break-times-migration');
        await migrateBreakTimes();
        
        res.json({
          success: true,
          message: 'Migración de horarios de descanso completada',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error ejecutando migración de horarios de descanso:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al ejecutar la migración de horarios de descanso',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint temporal para aplicar migraciones de scoring
    app.post('/debug/apply-scoring-migrations', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        console.log('🔄 Aplicando migraciones del sistema de scoring...');
        
        // SQL commands para crear las tablas
        const commands = [
          `CREATE TYPE "ClientEventType" AS ENUM ('ATTENDED', 'NO_SHOW', 'CANCELLED_LATE', 'CANCELLED_GOOD')`,
          `CREATE TABLE "client_scores" (
            "id" TEXT NOT NULL,
            "email" TEXT,
            "phone" TEXT,
            "name" TEXT NOT NULL,
            "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "starRating" INTEGER,
            "totalBookings" INTEGER NOT NULL DEFAULT 0,
            "attendedCount" INTEGER NOT NULL DEFAULT 0,
            "noShowCount" INTEGER NOT NULL DEFAULT 0,
            "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "client_scores_pkey" PRIMARY KEY ("id")
          )`,
          `CREATE TABLE "client_history" (
            "id" TEXT NOT NULL,
            "clientScoreId" TEXT NOT NULL,
            "businessId" TEXT NOT NULL,
            "appointmentId" TEXT NOT NULL,
            "eventType" "ClientEventType" NOT NULL,
            "points" DOUBLE PRECISION NOT NULL,
            "weight" DOUBLE PRECISION NOT NULL,
            "notes" TEXT,
            "eventDate" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "client_history_pkey" PRIMARY KEY ("id")
          )`,
          `CREATE UNIQUE INDEX "client_scores_email_key" ON "client_scores"("email")`,
          `CREATE UNIQUE INDEX "client_scores_phone_key" ON "client_scores"("phone")`,
          `ALTER TABLE "client_history" ADD CONSTRAINT "client_history_clientScoreId_fkey" FOREIGN KEY ("clientScoreId") REFERENCES "client_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        ];
        
        const results = [];
        
        for (let i = 0; i < commands.length; i++) {
          try {
            await prisma.$executeRawUnsafe(commands[i]);
            results.push(`✅ Comando ${i + 1}: Ejecutado exitosamente`);
            console.log(`✅ Comando ${i + 1}: Ejecutado exitosamente`);
          } catch (error) {
            if (error.message.includes('already exists')) {
              results.push(`⚠️ Comando ${i + 1}: Ya existe (omitido)`);
              console.log(`⚠️ Comando ${i + 1}: Ya existe (omitido)`);
            } else {
              results.push(`❌ Comando ${i + 1}: Error - ${error.message}`);
              console.error(`❌ Comando ${i + 1}: Error -`, error.message);
            }
          }
        }
        
        // Verificar tablas creadas
        let verification = {};
        try {
          const clientScoresCount = await prisma.clientScore.count();
          const clientHistoryCount = await prisma.clientHistory.count();
          verification = {
            clientScoresTable: `${clientScoresCount} registros`,
            clientHistoryTable: `${clientHistoryCount} registros`,
            status: 'Tablas verificadas exitosamente'
          };
        } catch (error) {
          verification = {
            status: 'Error verificando tablas: ' + error.message
          };
        }
        
        res.json({
          success: true,
          message: 'Migraciones aplicadas',
          results,
          verification,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Error aplicando migraciones:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint temporal para reset completo de base de datos
    app.post('/debug/reset-complete-database', async (req, res) => {
      try {
        const { resetCompleteDatabase } = require('../reset-database');
        
        console.log('🗑️ Endpoint de reset completo invocado');
        
        // Ejecutar el reset
        await resetCompleteDatabase();
        
        res.json({
          success: true,
          message: 'Reset completo de base de datos ejecutado exitosamente',
          timestamp: new Date().toISOString(),
          warning: 'TODOS los datos han sido eliminados permanentemente'
        });
        
      } catch (error) {
        console.error('❌ Error en reset completo:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para aplicar migraciones del sistema multi-sucursal
    app.post('/debug/apply-branch-migrations', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        console.log('🔄 Aplicando migraciones del sistema multi-sucursal...');
        
        // SQL commands para crear las tablas del sistema multi-sucursal
        const commands = [
          // Crear tabla branches
          `CREATE TABLE IF NOT EXISTS "branches" (
            "id" TEXT NOT NULL,
            "businessId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "address" TEXT,
            "phone" TEXT,
            "description" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "isMain" BOOLEAN NOT NULL DEFAULT false,
            "latitude" DOUBLE PRECISION,
            "longitude" DOUBLE PRECISION,
            "timezone" TEXT DEFAULT 'America/Argentina/Buenos_Aires',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
          )`,
          
          // Crear tabla branch_services
          `CREATE TABLE IF NOT EXISTS "branch_services" (
            "id" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "serviceId" TEXT NOT NULL,
            "price" DOUBLE PRECISION,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "branch_services_pkey" PRIMARY KEY ("id")
          )`,
          
          // Crear tabla branch_holidays
          `CREATE TABLE IF NOT EXISTS "branch_holidays" (
            "id" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "date" TIMESTAMP(3) NOT NULL,
            "isRecurring" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "branch_holidays_pkey" PRIMARY KEY ("id")
          )`,
          
          // Agregar columnas a tablas existentes
          `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branchId" TEXT`,
          `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN DEFAULT true`,
          `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "branchId" TEXT`,
          `ALTER TABLE "holidays" ADD COLUMN IF NOT EXISTS "branchId" TEXT`,
          
          // Crear índices únicos
          `CREATE UNIQUE INDEX IF NOT EXISTS "branches_businessId_slug_key" ON "branches"("businessId", "slug")`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "branch_services_branchId_serviceId_key" ON "branch_services"("branchId", "serviceId")`,
          
          // Crear foreign keys
          `ALTER TABLE "branches" ADD CONSTRAINT IF NOT EXISTS "branches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
          `ALTER TABLE "branch_services" ADD CONSTRAINT IF NOT EXISTS "branch_services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
          `ALTER TABLE "branch_services" ADD CONSTRAINT IF NOT EXISTS "branch_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
          `ALTER TABLE "branch_holidays" ADD CONSTRAINT IF NOT EXISTS "branch_holidays_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
          `ALTER TABLE "users" ADD CONSTRAINT IF NOT EXISTS "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
          `ALTER TABLE "appointments" ADD CONSTRAINT IF NOT EXISTS "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE`
        ];
        
        const results = [];
        
        for (let i = 0; i < commands.length; i++) {
          try {
            await prisma.$executeRawUnsafe(commands[i]);
            results.push(`✅ Comando ${i + 1}: Ejecutado exitosamente`);
            console.log(`✅ Comando ${i + 1}: Ejecutado exitosamente`);
          } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
              results.push(`⚠️ Comando ${i + 1}: Ya existe (omitido)`);
              console.log(`⚠️ Comando ${i + 1}: Ya existe (omitido)`);
            } else {
              results.push(`❌ Comando ${i + 1}: Error - ${error.message}`);
              console.error(`❌ Comando ${i + 1}: Error -`, error.message);
            }
          }
        }
        
        // Crear sucursal principal para negocios existentes
        console.log('🔄 Creando sucursales principales para negocios existentes...');
        
        const businesses = await prisma.business.findMany({
          where: {
            branches: {
              none: {}
            }
          }
        });
        
        const branchCreationResults = [];
        
        for (const business of businesses) {
          try {
            await prisma.branch.create({
              data: {
                businessId: business.id,
                name: business.name + ' - Principal',
                slug: 'principal',
                address: business.address,
                phone: business.phone,
                description: 'Sucursal principal',
                isMain: true,
                isActive: true
              }
            });
            branchCreationResults.push(`✅ Sucursal principal creada para: ${business.name}`);
            console.log(`✅ Sucursal principal creada para: ${business.name}`);
          } catch (error) {
            branchCreationResults.push(`❌ Error creando sucursal para ${business.name}: ${error.message}`);
            console.error(`❌ Error creando sucursal para ${business.name}:`, error.message);
          }
        }
        
        // Asignar branchId a citas existentes que no lo tengan
        console.log('🔄 Asignando sucursales a citas existentes...');
        
        const appointmentUpdateResults = [];
        
        try {
          const appointmentsWithoutBranch = await prisma.appointment.findMany({
            where: {
              branchId: null
            },
            include: {
              business: {
                include: {
                  branches: {
                    where: { isMain: true }
                  }
                }
              }
            }
          });
          
          for (const appointment of appointmentsWithoutBranch) {
            const mainBranch = appointment.business.branches[0];
            if (mainBranch) {
              await prisma.appointment.update({
                where: { id: appointment.id },
                data: { branchId: mainBranch.id }
              });
            }
          }
          
          appointmentUpdateResults.push(`✅ ${appointmentsWithoutBranch.length} citas actualizadas`);
          console.log(`✅ ${appointmentsWithoutBranch.length} citas actualizadas`);
        } catch (error) {
          appointmentUpdateResults.push(`❌ Error actualizando citas: ${error.message}`);
          console.error('❌ Error actualizando citas:', error.message);
        }
        
        // Verificar tablas creadas
        let verification = {};
        try {
          const branchesCount = await prisma.branch.count();
          const branchServicesCount = await prisma.branchService.count();
          const branchHolidaysCount = await prisma.branchHoliday.count();
          
          verification = {
            branchesTable: `${branchesCount} registros`,
            branchServicesTable: `${branchServicesCount} registros`,
            branchHolidaysTable: `${branchHolidaysCount} registros`,
            status: 'Tablas multi-sucursal verificadas exitosamente'
          };
        } catch (error) {
          verification = {
            status: 'Error verificando tablas: ' + error.message
          };
        }
        
        res.json({
          success: true,
          message: 'Migraciones del sistema multi-sucursal aplicadas',
          results,
          branchCreationResults,
          appointmentUpdateResults,
          verification,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Error aplicando migraciones multi-sucursal:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
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
    app.use('/api/plans', planRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/branches', branchRoutes);
    app.use('/api/migration', migrationRoutes);
    app.use('/api/break-times', breakTimeRoutes);
    
    // Rutas de client scoring (protegidas)
    app.use('/api/client-scoring', clientScoringRoutes);

    // Debug endpoint para diagnosticar problemas de booking
    app.post('/api/debug/book-test', async (req, res) => {
      try {
        console.log('🔧 DEBUG - Test endpoint called');
        console.log('Body:', req.body);
        
        const { prisma } = require('./config/database');
        
        // Test básico de conexión a DB
        const businessCount = await prisma.business.count();
        console.log('🔧 DEBUG - Business count:', businessCount);
        
        res.json({
          success: true,
          message: 'Debug endpoint working',
          data: {
            businessCount,
            body: req.body
          }
        });
      } catch (error) {
        console.error('🔧 DEBUG - Error in test endpoint:', error);
        res.status(500).json({
          success: false,
          message: 'Debug endpoint failed',
          error: error.message
        });
      }
    });

    // Debug endpoint para obtener datos del negocio
    app.get('/api/debug/business-data/:slug', async (req, res) => {
      try {
        const { slug } = req.params;
        const { prisma } = require('./config/database');
        
        const business = await prisma.business.findUnique({
          where: { slug },
          include: {
            services: {
              select: {
                id: true,
                name: true,
                price: true,
                duration: true,
                isActive: true
              }
            },
            users: {
              select: {
                id: true,
                name: true,
                role: true,
                isActive: true,
                branchId: true
              }
            }
          }
        });
        
        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Business not found'
          });
        }
        
        res.json({
          success: true,
          data: {
            business: {
              id: business.id,
              name: business.name,
              slug: business.slug
            },
            services: business.services,
            users: business.users
          }
        });
      } catch (error) {
        console.error('🔧 DEBUG - Error getting business data:', error);
        res.status(500).json({
          success: false,
          message: 'Debug endpoint failed',
          error: error.message
        });
      }
    });

    // Debug endpoint paso a paso para booking
    app.post('/api/debug/booking-step-by-step', async (req, res) => {
      try {
        console.log('🔧 STEP-BY-STEP DEBUG - Starting...');
        const { businessSlug, clientName, clientEmail, clientPhone, serviceId, startTime, notes, professionalId } = req.body;
        
        const results = [];
        const { prisma } = require('./config/database');
        
        // PASO 1: Buscar negocio
        console.log('🔧 STEP 1 - Looking for business:', businessSlug);
        results.push('STEP 1: Looking for business');
        
        const business = await prisma.business.findUnique({
          where: { slug: businessSlug }
        });
        
        if (!business) {
          results.push('STEP 1: FAILED - Business not found');
          return res.json({ success: false, steps: results, error: 'Business not found' });
        }
        
        results.push(`STEP 1: SUCCESS - Found business: ${business.name}`);
        
        // PASO 2: Buscar servicio
        console.log('🔧 STEP 2 - Looking for service:', serviceId);
        results.push('STEP 2: Looking for service');
        
        const service = await prisma.service.findFirst({
          where: {
            id: serviceId,
            businessId: business.id,
            isActive: true
          }
        });
        
        if (!service) {
          results.push('STEP 2: FAILED - Service not found');
          return res.json({ success: false, steps: results, error: 'Service not found' });
        }
        
        results.push(`STEP 2: SUCCESS - Found service: ${service.name}`);
        
        // PASO 3: Buscar profesional
        console.log('🔧 STEP 3 - Looking for professional:', professionalId);
        results.push('STEP 3: Looking for professional');
        
        const professional = await prisma.user.findFirst({
          where: {
            id: professionalId,
            businessId: business.id,
            isActive: true
          }
        });
        
        if (!professional) {
          results.push('STEP 3: FAILED - Professional not found');
          return res.json({ success: false, steps: results, error: 'Professional not found' });
        }
        
        results.push(`STEP 3: SUCCESS - Found professional: ${professional.name}`);
        
        // PASO 3b: Determinar branchId
        console.log('🔧 STEP 3b - Determining branchId');
        results.push('STEP 3b: Determining branchId');
        
        let branchId = professional.branchId;
        if (!branchId) {
          // Si el profesional no tiene sucursal específica, usar la principal
          const mainBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isMain: true }
          });
          branchId = mainBranch?.id;
        }
        
        if (!branchId) {
          // Si no hay sucursal principal, usar cualquier sucursal activa
          const anyBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isActive: true }
          });
          branchId = anyBranch?.id;
        }
        
        if (!branchId) {
          results.push('STEP 3b: FAILED - No branch found');
          return res.json({ success: false, steps: results, error: 'No branch found' });
        }
        
        results.push(`STEP 3b: SUCCESS - Using branchId: ${branchId}`);
        
        // PASO 4: Crear o encontrar cliente
        console.log('🔧 STEP 4 - Looking for/creating client');
        results.push('STEP 4: Looking for/creating client');
        
        let client = await prisma.client.findFirst({
          where: {
            businessId: business.id,
            OR: [
              ...(clientEmail ? [{ email: clientEmail }] : []),
              ...(clientPhone ? [{ phone: clientPhone }] : [])
            ].filter(condition => Object.keys(condition).length > 0)
          }
        });
        
        if (!client) {
          console.log('🔧 STEP 4a - Creating new client');
          results.push('STEP 4a: Creating new client');
          
          client = await prisma.client.create({
            data: {
              businessId: business.id,
              name: clientName,
              email: clientEmail,
              phone: clientPhone
            }
          });
          
          results.push(`STEP 4a: SUCCESS - Created client: ${client.name}`);
        } else {
          results.push(`STEP 4: SUCCESS - Found existing client: ${client.name}`);
        }
        
        // PASO 5: Crear el turno
        console.log('🔧 STEP 5 - Creating appointment');
        results.push('STEP 5: Creating appointment');
        
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);
        
        results.push(`STEP 5a: Start time: ${startDateTime.toISOString()}`);
        results.push(`STEP 5b: End time: ${endDateTime.toISOString()}`);
        
        const appointment = await prisma.appointment.create({
          data: {
            businessId: business.id,
            branchId: branchId, // ← AGREGAR EL BRANCH ID FALTANTE
            clientId: client.id,
            serviceId,
            userId: professional.id,
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
        
        results.push(`STEP 5: SUCCESS - Created appointment ID: ${appointment.id}`);
        
        res.json({
          success: true,
          steps: results,
          appointment: {
            id: appointment.id,
            clientName: client.name,
            serviceName: appointment.service.name,
            professionalName: appointment.user.name,
            startTime: appointment.startTime,
            businessName: business.name
          }
        });
        
      } catch (error) {
        console.error('🔧 STEP-BY-STEP DEBUG - Error:', error);
        console.error('🔧 STEP-BY-STEP DEBUG - Stack:', error.stack);
        
        res.json({
          success: false,
          error: error.message,
          stack: error.stack,
          steps: results || []
        });
      }
    });

    // Endpoint simplificado de booking para evitar problemas
    app.post('/api/debug/simple-booking', async (req, res) => {
      try {
        console.log('🔧 SIMPLE BOOKING - Starting...');
        const { businessSlug, clientName, clientEmail, clientPhone, serviceId, startTime, notes, professionalId } = req.body;
        
        const { prisma } = require('./config/database');
        
        // 1. Buscar negocio
        const business = await prisma.business.findUnique({
          where: { slug: businessSlug }
        });
        
        if (!business) {
          return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }
        
        // 2. Buscar servicio
        const service = await prisma.service.findFirst({
          where: { id: serviceId, businessId: business.id, isActive: true }
        });
        
        if (!service) {
          return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }
        
        // 3. Buscar profesional
        const professional = await prisma.user.findFirst({
          where: { id: professionalId, businessId: business.id, isActive: true }
        });
        
        if (!professional) {
          return res.status(400).json({ success: false, message: 'Profesional no disponible' });
        }
        
        // 3b. Determinar branchId - usar el del profesional o la sucursal principal
        let branchId = professional.branchId;
        if (!branchId) {
          // Si el profesional no tiene sucursal específica, usar la principal
          const mainBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isMain: true }
          });
          branchId = mainBranch?.id;
        }
        
        if (!branchId) {
          // Si no hay sucursal principal, usar cualquier sucursal activa
          const anyBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isActive: true }
          });
          branchId = anyBranch?.id;
        }
        
        if (!branchId) {
          return res.status(500).json({ success: false, message: 'No se encontró sucursal disponible' });
        }
        
        // 4. Crear cliente (siempre nuevo para evitar problemas)
        const client = await prisma.client.create({
          data: {
            businessId: business.id,
            name: clientName,
            email: clientEmail,
            phone: clientPhone
          }
        });
        
        // 5. Crear turno
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);
        
        const appointment = await prisma.appointment.create({
          data: {
            businessId: business.id,
            branchId: branchId, // ← ESTE ERA EL CAMPO FALTANTE
            clientId: client.id,
            serviceId,
            userId: professional.id,
            startTime: startDateTime,
            endTime: endDateTime,
            notes,
            status: 'CONFIRMED'
          },
          include: {
            service: { select: { name: true, duration: true, price: true } },
            user: { select: { name: true, avatar: true } }
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
            startTime: appointment.startTime,
            businessName: business.name
          }
        });
        
      } catch (error) {
        console.error('🔧 SIMPLE BOOKING - Error:', error);
        console.error('🔧 SIMPLE BOOKING - Stack:', error.stack);
        
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
          error: error.message
        });
      }
    });

    // Ruta para reservas públicas (sin autenticación)
    app.post('/api/public/:businessSlug/book', async (req, res) => {
      try {
        console.log('🔧 BOOKING DEBUG - Starting booking process');
        const { businessSlug } = req.params;
        const { clientName, clientEmail, clientPhone, serviceId, startTime, notes, professionalId } = req.body;
        console.log('🔧 BOOKING DEBUG - Request data:', { businessSlug, clientName, serviceId, startTime, professionalId });

        // Buscar el negocio
        const { prisma } = require('./config/database');
        console.log('🔧 BOOKING DEBUG - Looking for business:', businessSlug);
        const business = await prisma.business.findUnique({
          where: { slug: businessSlug }
        });
        console.log('🔧 BOOKING DEBUG - Business found:', business ? business.name : 'NOT FOUND');

        if (!business) {
          return res.status(404).json({
            success: false,
            message: 'Negocio no encontrado'
          });
        }

        // Verificar el servicio
        console.log('🔧 BOOKING DEBUG - Looking for service:', serviceId);
        const service = await prisma.service.findFirst({
          where: {
            id: serviceId,
            businessId: business.id,
            isActive: true
          }
        });
        console.log('🔧 BOOKING DEBUG - Service found:', service ? service.name : 'NOT FOUND');

        if (!service) {
          console.log('🔧 BOOKING DEBUG - Service not found, returning 404');
          return res.status(404).json({
            success: false,
            message: 'Servicio no encontrado'
          });
        }

        // Determinar el profesional a asignar
        console.log('🔧 BOOKING DEBUG - Looking for professional:', professionalId);
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
          console.log('🔧 BOOKING DEBUG - Professional found:', assignedProfessional ? assignedProfessional.name : 'NOT FOUND');

          if (!assignedProfessional) {
            console.log('🔧 BOOKING DEBUG - Professional not found, returning 400');
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
              ...(clientEmail ? [{ email: clientEmail }] : []),
              ...(clientPhone ? [{ phone: clientPhone }] : [])
            ].filter(condition => Object.keys(condition).length > 0)
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
        } else {
          // ✅ ACTUALIZAR NOMBRE SI SE PROPORCIONA UNO NUEVO
          if (clientName && clientName.trim() !== client.name) {
            client = await prisma.client.update({
              where: { id: client.id },
              data: { 
                name: clientName,
                // Actualizar email y teléfono si se proporcionan y no existen
                email: clientEmail || client.email,
                phone: clientPhone || client.phone
              }
            });
          }
        }

        // Determinar branchId - usar el del profesional o la sucursal principal
        let branchId = assignedProfessional.branchId;
        if (!branchId) {
          // Si el profesional no tiene sucursal específica, usar la principal
          const mainBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isMain: true }
          });
          branchId = mainBranch?.id;
        }
        
        if (!branchId) {
          // Si no hay sucursal principal, usar cualquier sucursal activa
          const anyBranch = await prisma.branch.findFirst({
            where: { businessId: business.id, isActive: true }
          });
          branchId = anyBranch?.id;
        }
        
        if (!branchId) {
          return res.status(500).json({
            success: false,
            message: 'No se encontró sucursal disponible'
          });
        }

        // Crear el turno
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000);

        const appointment = await prisma.appointment.create({
          data: {
            businessId: business.id,
            branchId: branchId, // ← AGREGAR EL BRANCH ID FALTANTE
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
        console.error('🔧 BOOKING DEBUG - Error en reserva pública:', error);
        console.error('🔧 BOOKING DEBUG - Error stack:', error.stack);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    });

    // Debug endpoints para diagnóstico de scoring
    app.get('/debug/check-scoring-tables', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        // Verificar si las tablas existen
        const clientScoresCount = await prisma.clientScore.count();
        const clientHistoryCount = await prisma.clientHistory.count();
        const clientsCount = await prisma.client.count();
        const appointmentsCount = await prisma.appointment.count();
        
        // Obtener algunos registros de ejemplo
        const sampleScores = await prisma.clientScore.findMany({
          take: 5,
          include: {
            history: {
              take: 3,
              orderBy: { createdAt: 'desc' }
            }
          }
        });
        
        const sampleHistory = await prisma.clientHistory.findMany({
          take: 5,
          include: {
            clientScore: {
              select: { name: true, email: true, starRating: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        res.json({
          success: true,
          data: {
            tables: {
              clientScores: clientScoresCount,
              clientHistory: clientHistoryCount,
              clients: clientsCount,
              appointments: appointmentsCount
            },
            samples: {
              scores: sampleScores,
              history: sampleHistory
            }
          }
        });
      } catch (error) {
        console.error('Error checking scoring tables:', error);
        res.status(500).json({
          success: false,
          message: error.message,
          details: error.stack
        });
      }
    });

    app.get('/debug/list-clients', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        const clients = await prisma.client.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            businessId: true
          }
        });
        
        res.json({
          success: true,
          data: clients
        });
      } catch (error) {
        console.error('Error listing clients:', error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    });

    app.get('/debug/list-appointments', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        
        const appointments = await prisma.appointment.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            startTime: true,
            createdAt: true,
            client: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });
        
        res.json({
          success: true,
          data: appointments
        });
      } catch (error) {
        console.error('Error listing appointments:', error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    });

    app.post('/debug/create-test-scoring', async (req, res) => {
      try {
        const { prisma } = require('./config/database');
        const { email, name } = req.body;
        
        // Obtener un businessId válido de la base de datos
        const business = await prisma.business.findFirst();
        if (!business) {
          return res.status(500).json({
            success: false,
            message: 'No hay negocios en la base de datos'
          });
        }
        
        // Crear scoring directamente (el sistema de scoring es independiente)
        const clientScore = await prisma.clientScore.create({
          data: {
            email,
            name,
            totalPoints: 9, // 3 eventos positivos * 3 puntos
            totalWeight: 3, // 3 eventos
            starRating: 5,
            totalBookings: 3,
            attendedCount: 3,
            noShowCount: 0
          }
        });
        
        // Crear algunos eventos de historial
        const events = [
          { eventType: 'ATTENDED', points: 1, weight: 1, notes: 'Primera cita - puntual' },
          { eventType: 'ATTENDED', points: 1, weight: 1, notes: 'Segunda cita - excelente' },
          { eventType: 'ATTENDED', points: 1, weight: 1, notes: 'Tercera cita - muy satisfecho' }
        ];
        
        for (const event of events) {
          await prisma.clientHistory.create({
            data: {
              clientScoreId: clientScore.id,
              businessId: business.id,
              appointmentId: `test-apt-${Date.now()}-${Math.random()}`,
              eventType: event.eventType,
              points: event.points,
              weight: event.weight,
              notes: event.notes,
              eventDate: new Date()
            }
          });
        }
        
        res.json({
          success: true,
          data: {
            clientScore,
            message: 'Scoring de prueba creado exitosamente'
          }
        });
      } catch (error) {
        console.error('Error creating test scoring:', error);
        res.status(500).json({
          success: false,
          message: error.message
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