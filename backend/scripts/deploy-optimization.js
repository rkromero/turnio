#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

// Script de optimización para deployment en Railway
async function deployOptimization() {
  console.log('🚀 Iniciando optimización de deployment...');
  
  try {
    // 1. Verificar conexión a la base de datos
    console.log('📡 Verificando conexión a la base de datos...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a la base de datos establecida');
    
    // 2. Verificar índices existentes
    console.log('🔍 Verificando índices existentes...');
    const existingIndexes = await prisma.$queryRaw`
      SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE 'idx_%'
    `;
    
    console.log(`📋 Encontrados ${existingIndexes.length} índices de performance`);
    
    // 3. Aplicar índices críticos si no existen
    if (existingIndexes.length < 5) {
      console.log('⚡ Aplicando índices críticos de performance...');
      
      const criticalIndexes = [
        {
          name: 'idx_appointments_business_branch_user_time',
          sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_branch_user_time 
                ON appointments("businessId", "branchId", "userId", "startTime", status)`,
          description: 'Optimiza consultas de disponibilidad de turnos'
        },
        {
          name: 'idx_appointments_business_date',
          sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_business_date 
                ON appointments("businessId", "startTime")`,
          description: 'Optimiza reportes y dashboard por fecha'
        },
        {
          name: 'idx_clients_business_email',
          sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_email 
                ON clients("businessId", email) WHERE email IS NOT NULL`,
          description: 'Optimiza búsquedas de clientes por email'
        },
        {
          name: 'idx_clients_business_phone',
          sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_business_phone 
                ON clients("businessId", phone) WHERE phone IS NOT NULL`,
          description: 'Optimiza búsquedas de clientes por teléfono'
        },
        {
          name: 'idx_reviews_business_approved',
          sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_business_approved 
                ON reviews("businessId", "isApproved", "createdAt" DESC) WHERE "isPublic" = true`,
          description: 'Optimiza consultas de reseñas públicas'
        }
      ];
      
      let appliedCount = 0;
      for (const index of criticalIndexes) {
        try {
          await prisma.$executeRawUnsafe(index.sql);
          appliedCount++;
          console.log(`✅ Índice aplicado: ${index.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️ Índice ya existe: ${index.name}`);
            appliedCount++;
          } else {
            console.log(`❌ Error aplicando ${index.name}: ${error.message}`);
          }
        }
        
        // Pausa pequeña entre índices
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`📊 Índices aplicados: ${appliedCount}/${criticalIndexes.length}`);
    } else {
      console.log('✅ Índices de performance ya están aplicados');
    }
    
    // 4. Verificar estadísticas de la base de datos
    console.log('📊 Verificando estadísticas de la base de datos...');
    const stats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM businesses) as businesses,
        (SELECT COUNT(*) FROM appointments) as appointments,
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM reviews) as reviews
    `;
    
    console.log('📈 Estadísticas de la base de datos:');
    console.log(`   🏢 Negocios: ${stats[0].businesses}`);
    console.log(`   📅 Citas: ${stats[0].appointments}`);
    console.log(`   👥 Clientes: ${stats[0].clients}`);
    console.log(`   ⭐ Reseñas: ${stats[0].reviews}`);
    
    // 5. Test de performance básico
    console.log('🧪 Ejecutando test de performance básico...');
    const testStart = Date.now();
    
    await Promise.all([
      prisma.appointment.findMany({
        where: { startTime: { gte: new Date() } },
        select: { id: true },
        take: 10
      }),
      prisma.client.findMany({
        where: { email: { not: null } },
        select: { id: true },
        take: 10
      }),
      prisma.review.findMany({
        where: { isPublic: true },
        select: { id: true },
        take: 5
      })
    ]);
    
    const testEnd = Date.now();
    const testTime = testEnd - testStart;
    
    console.log(`✅ Test de performance completado en ${testTime}ms`);
    
    // 6. Resumen final
    console.log('\n🎉 Optimización de deployment completada exitosamente!');
    console.log('📊 Resumen:');
    console.log(`   🔍 Índices verificados: ${existingIndexes.length}`);
    console.log(`   🚀 Test de performance: ${testTime}ms`);
    console.log(`   📈 Estado: ${testTime <= 100 ? 'OPTIMIZADO' : testTime <= 200 ? 'BUENO' : 'NECESITA ATENCIÓN'}`);
    
    return {
      success: true,
      indexes: existingIndexes.length,
      testTime: testTime,
      status: testTime <= 100 ? 'optimized' : testTime <= 200 ? 'good' : 'needs_attention'
    };
    
  } catch (error) {
    console.error('❌ Error en optimización de deployment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  deployOptimization()
    .then((result) => {
      console.log('\n✅ Script de deployment completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en script de deployment:', error);
      process.exit(1);
    });
}

module.exports = { deployOptimization };
