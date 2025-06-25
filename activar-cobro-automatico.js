require('dotenv').config();

console.log('🚀 === ACTIVADOR DE COBRO AUTOMÁTICO - TurnIO ===\n');

async function main() {
  const args = process.argv.slice(2);
  const comando = args[0];

  switch (comando) {
    case 'produccion':
      await activarProduccion();
      break;
    case 'pruebas':
      await ejecutarPruebas();
      break;
    case 'verificar':
      await verificarConfiguracion();
      break;
    case 'scheduler':
      await probarScheduler();
      break;
    default:
      mostrarAyuda();
  }
}

function mostrarAyuda() {
  console.log('📋 ACTIVADOR DE COBRO AUTOMÁTICO');
  console.log('');
  console.log('USO: node activar-cobro-automatico.js [comando]');
  console.log('');
  console.log('COMANDOS:');
  console.log('  produccion  - Configurar para producción (Railway)');
  console.log('  pruebas     - Ejecutar pruebas completas del sistema');
  console.log('  verificar   - Verificar configuración actual');
  console.log('  scheduler   - Probar el scheduler manualmente');
  console.log('');
  console.log('EJEMPLOS:');
  console.log('  node activar-cobro-automatico.js verificar');
  console.log('  node activar-cobro-automatico.js pruebas');
  console.log('  node activar-cobro-automatico.js produccion');
}

async function verificarConfiguracion() {
  console.log('🔍 VERIFICANDO CONFIGURACIÓN...\n');

  // Variables de entorno requeridas
  const variablesRequeridas = [
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY', 
    'BACKEND_URL',
    'FRONTEND_URL',
    'DATABASE_URL'
  ];

  console.log('1️⃣ Variables de entorno:');
  let todasConfiguradas = true;
  
  for (const variable of variablesRequeridas) {
    if (process.env[variable]) {
      const valor = process.env[variable];
      const valorMostrar = valor.length > 30 ? valor.substring(0, 30) + '...' : valor;
      console.log(`✅ ${variable}: ${valorMostrar}`);
    } else {
      console.log(`❌ ${variable}: NO CONFIGURADA`);
      todasConfiguradas = false;
    }
  }

  console.log('\n2️⃣ URLs del sistema:');
  console.log(`📤 Backend:  ${process.env.BACKEND_URL || 'NO CONFIGURADA'}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'NO CONFIGURADA'}`);

  console.log('\n3️⃣ Webhooks de MercadoPago que debes configurar:');
  console.log(`🔗 Pago único:     ${process.env.BACKEND_URL}/api/mercadopago/webhook`);
  console.log(`🔗 Suscripciones:  ${process.env.BACKEND_URL}/api/mercadopago/subscription-webhook`);

  console.log('\n4️⃣ Estado del sistema:');
  if (todasConfiguradas) {
    console.log('✅ Configuración COMPLETA - Sistema listo para cobrar automáticamente');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. node activar-cobro-automatico.js pruebas');
    console.log('   2. Configurar webhooks en MercadoPago');
    console.log('   3. node activar-cobro-automatico.js produccion');
  } else {
    console.log('❌ Configuración INCOMPLETA - Configura las variables faltantes');
  }
}

async function ejecutarPruebas() {
  console.log('🧪 EJECUTANDO PRUEBAS DEL SISTEMA...\n');

  try {
    console.log('Ejecutando pruebas completas...');
    const { spawn } = require('child_process');
    
    const proceso = spawn('node', ['test-auto-subscription-complete.js', 'full'], {
      stdio: 'inherit'
    });

    proceso.on('close', (codigo) => {
      if (codigo === 0) {
        console.log('\n🎉 PRUEBAS COMPLETADAS EXITOSAMENTE');
      } else {
        console.log('\n❌ PRUEBAS FALLARON');
      }
    });

  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error.message);
  }
}

async function probarScheduler() {
  console.log('⏰ PROBANDO SCHEDULER MANUALMENTE...\n');

  try {
    // Probar importación del scheduler
    console.log('1️⃣ Importando scheduler...');
    const schedulerService = require('./backend/schedulerService');
    console.log('✅ Scheduler importado correctamente');

    // Probar función de verificación
    console.log('\n2️⃣ Ejecutando verificación manual...');
    const resultado = await schedulerService.runValidationsOnce();
    console.log('✅ Verificación ejecutada:', resultado);

    // Mostrar estado del scheduler
    console.log('\n3️⃣ Estado del scheduler:');
    const estado = schedulerService.getSchedulerStatus();
    console.log(estado);

    console.log('\n🎉 SCHEDULER FUNCIONANDO CORRECTAMENTE');

  } catch (error) {
    console.error('❌ Error probando scheduler:', error.message);
  }
}

async function activarProduccion() {
  console.log('🚀 CONFIGURANDO PARA PRODUCCIÓN...\n');

  console.log('📋 LISTA DE VERIFICACIÓN PARA PRODUCCIÓN:');
  console.log('');
  
  console.log('✅ 1. VARIABLES DE ENTORNO EN RAILWAY:');
  console.log('   - MERCADOPAGO_ACCESS_TOKEN (token de producción)');
  console.log('   - MERCADOPAGO_PUBLIC_KEY (key de producción)');
  console.log('   - ENABLE_SUBSCRIPTION_SCHEDULER=true');
  console.log('');

  console.log('✅ 2. WEBHOOKS EN MERCADOPAGO:');
  console.log(`   - Pagos: ${process.env.BACKEND_URL}/api/mercadopago/webhook`);
  console.log(`   - Suscripciones: ${process.env.BACKEND_URL}/api/mercadopago/subscription-webhook`);
  console.log('');

  console.log('✅ 3. VERIFICAR DEPLOYMENT:');
  console.log('   - El scheduler se iniciará automáticamente en Railway');
  console.log('   - Verificar logs: "✅ Scheduler de suscripciones automáticas iniciado"');
  console.log('');

  console.log('✅ 4. MONITOREO:');
  console.log('   - Logs de cobros: "💳 Procesando pago automático"');  
  console.log('   - Logs de webhooks: "🔔 Webhook de suscripción automática recibido"');
  console.log('');

  console.log('🎯 COMANDOS PARA DEPLOYMENT:');
  console.log('');
  console.log('# Hacer commit de los cambios');
  console.log('git add .');
  console.log('git commit -m "feat: activar sistema de cobro automático"');
  console.log('git push origin main');
  console.log('');
  console.log('# Railway hará deploy automáticamente');
  console.log('# Verificar en Railway logs que aparezca:');
  console.log('# "✅ Scheduler de suscripciones automáticas iniciado"');
  console.log('');

  console.log('🚨 IMPORTANTE:');
  console.log('- Usar tokens de PRODUCCIÓN de MercadoPago');
  console.log('- Configurar webhooks con URLs de PRODUCCIÓN');
  console.log('- Probar con un usuario real antes de lanzar');
}

// Ejecutar script
main().catch(console.error); 