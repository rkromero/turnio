/**
 * Script de Migración: Sistema de Predicción de Riesgo
 * 
 * Aplica todos los cambios necesarios para el sistema de predicción
 * de cancelaciones con IA/ML
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyRiskPredictionMigration() {
  console.log('🔧 Iniciando migración del Sistema de Predicción de Riesgo...\n');

  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add-risk-prediction-system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir en statements individuales
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`📋 Ejecutando ${statements.length} statements SQL...\n`);

    let executed = 0;
    let errors = 0;

    for (const statement of statements) {
      try {
        // Ejecutar statement
        await prisma.$executeRawUnsafe(statement);
        executed++;
        
        if (executed % 5 === 0) {
          console.log(`   ✅ ${executed}/${statements.length} statements ejecutados...`);
        }
      } catch (error) {
        // Ignorar errores de "ya existe" que son esperados
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('IF NOT EXISTS')) {
          executed++;
          continue;
        }
        
        errors++;
        console.error(`   ❌ Error en statement:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Statements ejecutados exitosamente: ${executed}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${statements.length}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      console.log('📝 Sistema de Predicción de Riesgo instalado');
      console.log('\n📊 Nuevas tablas creadas:');
      console.log('   - appointment_risk_predictions');
      console.log('   - time_slot_stats');
      console.log('\n🔧 Tablas actualizadas:');
      console.log('   - appointments (+ 3 campos)');
      console.log('   - services (+ 3 campos)');
      console.log('   - client_scores (+ 4 campos)');
      console.log('\n⚡ Próximo paso: Ejecutar cálculo inicial de estadísticas');
    } else {
      console.log(`\n⚠️ Migración completada con ${errors} errores`);
    }

  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
applyRiskPredictionMigration()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });

