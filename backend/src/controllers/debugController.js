const { prisma } = require('../config/database');
const { Pool } = require('pg');

// Crear pool de conexión directa a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Verificar estructura de tablas
const checkTableStructure = async (req, res) => {
  try {
    console.log('🔍 Verificando estructura de tablas...');
    
    const client = await pool.connect();
    try {
      const tables = ['appointments', 'clients', 'reviews', 'client_scores', 'client_history'];
      const results = {};
      
      for (const table of tables) {
        const query = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = $1
          ORDER BY ordinal_position;
        `;
        
        const result = await client.query(query, [table]);
        results[table] = result.rows;
      }
      
      res.json({
        success: true,
        data: results
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Aplicar índices de performance usando conexión directa
const applyPerformanceIndexes = async (req, res) => {
  try {
    console.log('🚀 Aplicando índices de performance...');
    
    // Índices corregidos con nombres de columnas exactos
    const indexes = [
      // Índices críticos para appointments
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
       ON appointments("businessId", "branchId", "userId", "startTime", status)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
       ON appointments("businessId", "startTime")`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_status_created 
       ON appointments("businessId", status, "createdAt")`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client 
       ON appointments("clientId", "startTime")`,
      
      // Índices para clients
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
       ON clients("businessId", email)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
       ON clients("businessId", phone)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_name 
       ON clients("businessId", name)`,
      
      // Índices para reviews
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_rating 
       ON reviews("businessId", rating)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_created 
       ON reviews("businessId", "createdAt")`,
      
      // Índices para client_scores (solo si la tabla existe)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_email 
       ON client_scores(email)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_phone 
       ON client_scores(phone)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_scores_rating 
       ON client_scores("starRating")`,
      
      // Índices para client_history (solo si la tabla existe)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_history_client_event 
       ON client_history("clientScoreId", "eventType")`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_history_business_date 
       ON client_history("businessId", "eventDate")`
    ];
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < indexes.length; i++) {
      try {
        console.log(`⏳ Aplicando índice ${i + 1}/${indexes.length}...`);
        
        // Usar conexión directa a PostgreSQL
        const client = await pool.connect();
        try {
          await client.query(indexes[i]);
          results.push({
            index: i + 1,
            status: 'success',
            message: `Índice ${i + 1} creado exitosamente`
          });
          successCount++;
          console.log(`✅ Índice ${i + 1} creado exitosamente`);
        } finally {
          client.release();
        }
      } catch (error) {
        results.push({
          index: i + 1,
          status: 'error',
          message: error.message
        });
        errorCount++;
        console.error(`❌ Error en índice ${i + 1}:`, error.message);
      }
      
      // Pausa entre comandos para no sobrecargar la DB
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    res.json({
      success: true,
      message: 'Proceso de índices completado',
      summary: {
        total: indexes.length,
        success: successCount,
        errors: errorCount
      },
      results
    });
    
  } catch (error) {
    console.error('❌ Error aplicando índices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Verificar índices existentes
const checkIndexes = async (req, res) => {
  try {
    console.log('🔍 Verificando índices existentes...');
    
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename IN ('appointments', 'clients', 'reviews', 'client_scores', 'client_history')
        ORDER BY tablename, indexname;
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error verificando índices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Monitorear uso de índices
const monitorIndexUsage = async (req, res) => {
  try {
    console.log('📊 Monitoreando uso de índices...');
    
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
          AND relname IN ('appointments', 'clients', 'reviews', 'client_scores', 'client_history')
        ORDER BY idx_scan DESC;
      `;
      
      const result = await client.query(query);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error monitoreando índices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Cambiar plan de un usuario (para pruebas)
const changePlanForUser = async (req, res) => {
  try {
    const { email, planType } = req.body;
    
    if (!email || !planType) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere email y planType'
      });
    }

    const validPlans = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: `Plan inválido. Debe ser uno de: ${validPlans.join(', ')}`
      });
    }

    console.log(`🔄 Cambiando plan de ${email} a ${planType}...`);

    // 1. Buscar el usuario y su negocio
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            planType: true,
            maxAppointments: true
          }
        }
      }
    });

    if (!user || !user.business) {
      return res.status(404).json({
        success: false,
        message: `Usuario con email ${email} no encontrado o sin negocio asociado`
      });
    }

    const oldPlan = user.business.planType;

    // 2. Determinar los límites del nuevo plan
    const planLimits = {
      FREE: 30,
      BASIC: 100,
      PREMIUM: 500,
      ENTERPRISE: 999999
    };

    // 3. Actualizar el negocio
    const updatedBusiness = await prisma.business.update({
      where: { id: user.business.id },
      data: {
        planType: planType,
        maxAppointments: planLimits[planType]
      }
    });

    console.log(`✅ Plan actualizado: ${oldPlan} → ${planType} para ${user.business.name}`);

    res.json({
      success: true,
      message: `Plan cambiado exitosamente de ${oldPlan} a ${planType}`,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.name,
          oldPlan: oldPlan,
          newPlan: updatedBusiness.planType,
          maxAppointments: updatedBusiness.maxAppointments
        }
      }
    });

  } catch (error) {
    console.error('❌ Error cambiando plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  applyPerformanceIndexes,
  checkIndexes,
  monitorIndexUsage,
  checkTableStructure,
  changePlanForUser
};
