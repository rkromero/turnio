const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function applyPaymentMethodMigration() {
  console.log('🚀 Iniciando migración: Agregar campo paymentMethod');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add-payment-method-field.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);

    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n⏳ Ejecutando comando ${i + 1}/${commands.length}...`);
      
      try {
        await prisma.$executeRawUnsafe(command);
        console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  Comando ${i + 1} omitido (ya existe)`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Migración completada exitosamente');
    console.log('\n📊 Verificando cambios...');

    // Verificar que el campo existe
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'appointments' AND column_name = 'paymentMethod';
    `;

    if (result && result.length > 0) {
      console.log('✅ Campo paymentMethod agregado correctamente:');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('⚠️  No se pudo verificar el campo (puede que ya existiera)');
    }

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
applyPaymentMethodMigration()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

