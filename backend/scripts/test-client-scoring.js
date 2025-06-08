const clientScoringService = require('../src/services/clientScoringService');

async function testClientScoring() {
  console.log('🧪 Probando sistema de scoring de clientes...\n');
  
  try {
    // 1. Crear cliente de prueba con eventos
    console.log('1️⃣ Creando cliente de prueba...');
    
    const testEmail = 'cliente.prueba@test.com';
    const testPhone = '+5491123456789';
    const testName = 'Cliente de Prueba';
    const businessId = 'test-business-id';
    
    // Simular varios eventos
    const events = [
      { appointmentId: 'apt-1', eventType: 'ATTENDED', notes: 'Llegó puntual' },
      { appointmentId: 'apt-2', eventType: 'ATTENDED', notes: 'Muy amable' },
      { appointmentId: 'apt-3', eventType: 'NO_SHOW', notes: 'No se presentó' },
      { appointmentId: 'apt-4', eventType: 'ATTENDED', notes: 'Llegó 5 min tarde' },
      { appointmentId: 'apt-5', eventType: 'CANCELLED_GOOD', notes: 'Canceló con 2 días de anticipación' },
      { appointmentId: 'apt-6', eventType: 'ATTENDED', notes: 'Excelente cliente' }
    ];
    
    console.log('📝 Registrando eventos...');
    for (const event of events) {
      const result = await clientScoringService.recordClientEvent(
        testEmail,
        testPhone,
        testName,
        businessId,
        event.appointmentId,
        event.eventType,
        event.notes
      );
      
      console.log(`   ✅ ${event.eventType}: ${result.starRating} estrellas`);
    }
    
    // 2. Obtener scoring del cliente
    console.log('\n2️⃣ Obteniendo scoring del cliente...');
    const clientScore = await clientScoringService.getClientScore(testEmail, testPhone);
    
    if (clientScore) {
      console.log('📊 Resultado del scoring:');
      console.log(`   ⭐ Estrellas: ${clientScore.starRating}/5`);
      console.log(`   📈 Total reservas: ${clientScore.totalBookings}`);
      console.log(`   ✅ Asistencias: ${clientScore.attendedCount}`);
      console.log(`   ❌ No-shows: ${clientScore.noShowCount}`);
      console.log(`   📅 Última actividad: ${clientScore.lastActivity}`);
      
      console.log('\n📋 Historial reciente:');
      clientScore.history.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.eventType} - ${event.points} puntos (${event.eventDate.toLocaleDateString()})`);
      });
    }
    
    // 3. Probar búsqueda por teléfono
    console.log('\n3️⃣ Probando búsqueda por teléfono...');
    const clientByPhone = await clientScoringService.getClientScore(null, testPhone);
    console.log(`   📱 Cliente encontrado por teléfono: ${clientByPhone ? 'SÍ' : 'NO'}`);
    
    // 4. Obtener estadísticas generales
    console.log('\n4️⃣ Estadísticas generales del sistema...');
    const stats = await clientScoringService.getClientScoringStats();
    console.log('📈 Estadísticas:');
    console.log(`   👥 Total clientes: ${stats.totalClients}`);
    console.log(`   ⭐ Rating promedio: ${stats.averageRating?.toFixed(2) || 'N/A'}`);
    console.log('   📊 Distribución:');
    Object.entries(stats.distribution).forEach(([rating, count]) => {
      const stars = rating === 'null' ? 'Sin rating' : `${rating} estrellas`;
      console.log(`      ${stars}: ${count} clientes`);
    });
    
    console.log('\n✅ ¡Prueba del sistema de scoring completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testClientScoring()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testClientScoring }; 