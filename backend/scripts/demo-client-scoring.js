// Demostración del Sistema de Scoring de Clientes
console.log('🌟 DEMOSTRACIÓN DEL SISTEMA DE SCORING DE CLIENTES 🌟\n');

// Simulación del algoritmo de scoring
const SCORING_CONFIG = {
  ATTENDED: { points: 1, weight: 1 },
  NO_SHOW: { points: -2, weight: 1 },
  CANCELLED_LATE: { points: -1, weight: 0.8 },
  CANCELLED_GOOD: { points: 0.5, weight: 0.5 }
};

const getTimeWeight = (eventDate) => {
  const daysDiff = Math.floor((new Date() - new Date(eventDate)) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 30) return 1.0;
  if (daysDiff <= 90) return 0.8;
  if (daysDiff <= 180) return 0.6;
  return 0.4;
};

const calculateStarRating = (totalPoints, totalWeight) => {
  if (totalWeight === 0) return null;
  
  const average = totalPoints / totalWeight;
  const percentage = Math.max(0, Math.min(1, (average + 2) / 4));
  
  if (percentage < 0.2) return 1;
  if (percentage < 0.4) return 2;
  if (percentage < 0.6) return 3;
  if (percentage < 0.8) return 4;
  return 5;
};

// Ejemplo de cliente
console.log('👤 EJEMPLO DE CLIENTE: Juan Pérez');
console.log('📧 Email: juan.perez@email.com');
console.log('📱 Teléfono: +5491123456789\n');

// Simular eventos de cliente
const events = [
  { date: '2024-01-15', type: 'ATTENDED', desc: 'Asistió puntualmente' },
  { date: '2024-01-22', type: 'ATTENDED', desc: 'Cliente excelente' },
  { date: '2024-02-05', type: 'NO_SHOW', desc: 'No se presentó' },
  { date: '2024-02-12', type: 'ATTENDED', desc: 'Volvió y se disculpó' },
  { date: '2024-02-20', type: 'CANCELLED_GOOD', desc: 'Canceló con 2 días de anticipación' },
  { date: '2024-03-01', type: 'ATTENDED', desc: 'Reserva reciente' }
];

console.log('📋 HISTORIAL DE EVENTOS:');
let totalPoints = 0;
let totalWeight = 0;
let attendedCount = 0;
let noShowCount = 0;

events.forEach((event, index) => {
  const config = SCORING_CONFIG[event.type];
  const timeWeight = getTimeWeight(event.date);
  const finalWeight = config.weight * timeWeight;
  const weightedPoints = config.points * timeWeight;
  
  totalPoints += weightedPoints;
  totalWeight += finalWeight;
  
  if (event.type === 'ATTENDED') attendedCount++;
  if (event.type === 'NO_SHOW') noShowCount++;
  
  const icon = event.type === 'ATTENDED' ? '✅' : 
               event.type === 'NO_SHOW' ? '❌' : 
               event.type === 'CANCELLED_GOOD' ? '📅' : '⚠️';
  
  console.log(`   ${index + 1}. ${icon} ${event.date} - ${event.type}`);
  console.log(`      ${event.desc}`);
  console.log(`      Puntos: ${config.points} × ${timeWeight.toFixed(1)} = ${weightedPoints.toFixed(1)}`);
});

const starRating = calculateStarRating(totalPoints, totalWeight);
const attendanceRate = Math.round((attendedCount / events.length) * 100);

console.log('\n⭐ RESULTADO DEL SCORING:');
console.log(`   🌟 Estrellas: ${starRating}/5`);
console.log(`   📊 Total eventos: ${events.length}`);
console.log(`   ✅ Asistencias: ${attendedCount} (${attendanceRate}%)`);
console.log(`   ❌ No-shows: ${noShowCount}`);
console.log(`   📈 Puntos totales: ${totalPoints.toFixed(2)}`);
console.log(`   ⚖️ Peso total: ${totalWeight.toFixed(2)}`);

console.log('\n🎯 INTERPRETACIÓN:');
if (starRating === null) {
  console.log('   Sin historial suficiente');
} else if (starRating <= 2) {
  console.log('   🔴 Cliente problemático - Revisar historial');
} else if (starRating <= 3) {
  console.log('   🟡 Cliente irregular - Monitorear');
} else if (starRating <= 4) {
  console.log('   🔵 Cliente confiable - Buen historial');
} else {
  console.log('   🟢 Cliente excelente - Muy confiable');
}

console.log('\n🔧 ENDPOINTS DISPONIBLES:');
console.log('   GET  /api/client-scoring/score?email=juan@email.com');
console.log('   POST /api/client-scoring/event (requiere auth)');
console.log('   GET  /api/client-scoring/stats (requiere auth)');

console.log('\n📱 INTEGRACIÓN CON RESERVAS:');
console.log('   • Se muestra automáticamente en nuevas reservas');
console.log('   • Aparece en el calendario del negocio');
console.log('   • Se actualiza al completar/cancelar citas');
console.log('   • Funciona entre múltiples locales');

console.log('\n✨ ¡Sistema de scoring listo para usar!'); 