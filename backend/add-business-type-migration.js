const { PrismaClient } = require('@prisma/client');

const migrateDatabaseSchema = async () => {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Iniciando migración de esquema...');
    
    // Agregar las nuevas columnas al modelo Business
    const migrations = [
      // 1. Agregar enum BusinessType
      `DO $$ BEGIN
        CREATE TYPE "BusinessType" AS ENUM ('GENERAL', 'BARBERSHOP', 'HAIR_SALON', 'BEAUTY_CENTER', 'MEDICAL_CENTER', 'MASSAGE_SPA');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      
      // 2. Agregar columna businessType con valor por defecto
      `ALTER TABLE "businesses" 
       ADD COLUMN IF NOT EXISTS "businessType" "BusinessType" DEFAULT 'GENERAL';`,
      
      // 3. Agregar columna defaultAppointmentDuration con valor por defecto
      `ALTER TABLE "businesses" 
       ADD COLUMN IF NOT EXISTS "defaultAppointmentDuration" INTEGER DEFAULT 60;`,
       
      // 4. Actualizar negocios existentes con valores por defecto más específicos
      `UPDATE "businesses" 
       SET "businessType" = 'GENERAL', "defaultAppointmentDuration" = 60 
       WHERE "businessType" IS NULL OR "defaultAppointmentDuration" IS NULL;`
    ];

    const results = [];
    
    for (let i = 0; i < migrations.length; i++) {
      try {
        console.log(`⏳ Ejecutando migración ${i + 1}/${migrations.length}...`);
        await prisma.$executeRawUnsafe(migrations[i]);
        results.push(`✅ Migración ${i + 1}: Ejecutada exitosamente`);
        console.log(`✅ Migración ${i + 1} completada`);
      } catch (error) {
        const errorMessage = `❌ Migración ${i + 1}: Error - ${error.message}`;
        results.push(errorMessage);
        console.error(`❌ Error en migración ${i + 1}:`, error.message);
        // Continuamos con las siguientes migraciones
      }
    }

    // Verificar el resultado
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        defaultAppointmentDuration: true
      }
    });

    console.log('📊 Verificación de negocios:');
    businesses.forEach(business => {
      console.log(`- ${business.name}: ${business.businessType}, ${business.defaultAppointmentDuration}min`);
    });

    return {
      success: true,
      message: 'Migración de tipos de negocio completada',
      results,
      verification: {
        businessesCount: businesses.length,
        businessesWithNewFields: businesses.filter(b => b.businessType && b.defaultAppointmentDuration).length
      }
    };

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    return {
      success: false,
      error: error.message,
      message: 'Error al ejecutar la migración de tipos de negocio'
    };
  } finally {
    await prisma.$disconnect();
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateDatabaseSchema()
    .then(result => {
      console.log('\n📋 Resultado final:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = migrateDatabaseSchema; 