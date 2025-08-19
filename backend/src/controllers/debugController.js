const { prisma } = require('../config/database');

// Aplicar índices de performance
const applyPerformanceIndexes = async (req, res) => {
  try {
    console.log('🚀 Aplicando índices de performance...');
    
    const indexes = [
      // Índices críticos para appointments
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
       ON appointments(businessId, branchId, userId, startTime, status)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
       ON appointments(businessId, startTime)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_status_created 
       ON appointments(businessId, status, createdAt)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_client 
       ON appointments(clientId, startTime)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_user 
       ON appointments(userId, startTime) WHERE userId IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_service 
       ON appointments(serviceId, startTime)`,
      
      // Índices para clients
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
       ON clients(businessId, email) WHERE email IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
       ON clients(businessId, phone) WHERE phone IS NOT NULL`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_name 
       ON clients(businessId, name)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_created 
       ON clients(businessId, createdAt DESC)`,
      
      // Índices para reviews
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_approved 
       ON reviews(businessId, isApproved, createdAt DESC) WHERE isPublic = true`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_client 
       ON reviews(clientId, createdAt DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_appointment 
       ON reviews(appointmentId)`
    ];
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i];
      try {
        console.log(`⏳ Aplicando índice ${i + 1}/${indexes.length}...`);
        await prisma.$executeRawUnsafe(index);
        successCount++;
        results.push({ index: i + 1, status: 'success' });
        console.log(`✅ Índice ${i + 1} aplicado exitosamente`);
      } catch (error) {
        errorCount++;
        results.push({ index: i + 1, status: 'error', message: error.message });
        console.log(`❌ Error en índice ${i + 1}: ${error.message}`);
      }
      
      // Pequeña pausa entre índices
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores`);
    
    res.json({
      success: true,
      message: 'Proceso de índices completado',
      summary: {
        total: indexes.length,
        success: successCount,
        errors: errorCount
      },
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error aplicando índices:', error);
    res.status(500).json({
      success: false,
      message: 'Error aplicando índices',
      error: error.message
    });
  }
};

// Verificar índices existentes
const checkIndexes = async (req, res) => {
  try {
    console.log('🔍 Verificando índices existentes...');
    
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;
    
    res.json({
      success: true,
      data: result,
      count: result.length
    });
    
  } catch (error) {
    console.error('❌ Error verificando índices:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando índices',
      error: error.message
    });
  }
};

// Monitorear uso de índices
const monitorIndexUsage = async (req, res) => {
  try {
    console.log('📊 Monitoreando uso de índices...');
    
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE indexname LIKE 'idx_%'
      ORDER BY idx_scan DESC
    `;
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error monitoreando índices:', error);
    res.status(500).json({
      success: false,
      message: 'Error monitoreando índices',
      error: error.message
    });
  }
};

module.exports = {
  applyPerformanceIndexes,
  checkIndexes,
  monitorIndexUsage
};
