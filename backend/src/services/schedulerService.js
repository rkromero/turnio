const SubscriptionValidationService = require('./subscriptionValidationService');

class SchedulerService {
  
  constructor() {
    this.intervals = new Map();
  }

  // Iniciar el scheduler de validaciones
  startValidationScheduler() {
    console.log('🚀 Iniciando scheduler de validaciones de suscripción...');
    
    // Ejecutar validaciones cada 6 horas
    const validationInterval = setInterval(async () => {
      try {
        console.log('\n⏰ Ejecutando validaciones programadas...');
        await SubscriptionValidationService.runAllValidations();
      } catch (error) {
        console.error('❌ Error en validación programada:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas

    this.intervals.set('validation', validationInterval);
    
    // Ejecutar validaciones inmediatamente al iniciar
    setTimeout(async () => {
      try {
        console.log('🚀 Ejecutando validación inicial...');
        await SubscriptionValidationService.runAllValidations();
      } catch (error) {
        console.error('❌ Error en validación inicial:', error);
      }
    }, 5000); // 5 segundos después de iniciar

    console.log('✅ Scheduler de validaciones iniciado');
  }

  // Detener el scheduler
  stopValidationScheduler() {
    const interval = this.intervals.get('validation');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('validation');
      console.log('⏹️  Scheduler de validaciones detenido');
    }
  }

  // Ejecutar validaciones una vez (para testing)
  async runValidationsOnce() {
    try {
      console.log('🔍 Ejecutando validaciones una vez...');
      const results = await SubscriptionValidationService.runAllValidations();
      console.log('✅ Validaciones completadas:', results);
      return results;
    } catch (error) {
      console.error('❌ Error ejecutando validaciones:', error);
      throw error;
    }
  }

  // Obtener estado del scheduler
  getSchedulerStatus() {
    return {
      validationScheduler: this.intervals.has('validation'),
      activeIntervals: Array.from(this.intervals.keys())
    };
  }
}

// Instancia singleton
const schedulerService = new SchedulerService();

module.exports = schedulerService; 