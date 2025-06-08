const { PrismaClient } = require('@prisma/client');

async function applyMigrations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Aplicando migraciones del sistema de scoring...');
    
    // Crear tablas de scoring
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ClientScore" (
        "id" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "starRating" INTEGER,
        "totalBookings" INTEGER NOT NULL DEFAULT 0,
        "attendedCount" INTEGER NOT NULL DEFAULT 0,
        "noShowCount" INTEGER NOT NULL DEFAULT 0,
        "cancelledLateCount" INTEGER NOT NULL DEFAULT 0,
        "cancelledGoodCount" INTEGER NOT NULL DEFAULT 0,
        "lastActivity" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "ClientScore_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ClientHistory" (
        "id" TEXT NOT NULL,
        "clientEmail" TEXT,
        "clientPhone" TEXT,
        "clientName" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "eventDate" TIMESTAMP(3) NOT NULL,
        "appointmentId" TEXT,
        "notes" TEXT,
        "score" DOUBLE PRECISION NOT NULL,
        "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "ClientHistory_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Crear índices
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClientScore_email_idx" ON "ClientScore"("email");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClientScore_phone_idx" ON "ClientScore"("phone");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClientHistory_email_idx" ON "ClientHistory"("clientEmail");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ClientHistory_phone_idx" ON "ClientHistory"("clientPhone");
    `;
    
    console.log('✅ Migraciones aplicadas exitosamente!');
    
    // Verificar que las tablas se crearon
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename='ClientScore' OR tablename='ClientHistory');
    `;
    
    console.log('📋 Tablas creadas:', tables);
    
  } catch (error) {
    console.error('❌ Error aplicando migraciones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations(); 