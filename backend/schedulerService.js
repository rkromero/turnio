const SubscriptionValidationService = require('./src/services/subscriptionValidationService');
const RenewalReminderService = require('./src/services/renewalReminderService');

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

  // Iniciar el scheduler de recordatorios de renovación
  startRenewalScheduler() {
    console.log('🚀 Iniciando scheduler de recordatorios de renovación...');
    
    // Ejecutar recordatorios cada 12 horas
    const renewalInterval = setInterval(async () => {
      try {
        console.log('\n⏰ Ejecutando tareas de renovación programadas...');
        await RenewalReminderService.runAllRenewalTasks();
      } catch (error) {
        console.error('❌ Error en tareas de renovación:', error);
      }
    }, 12 * 60 * 60 * 1000); // 12 horas

    this.intervals.set('renewal', renewalInterval);
    
    // Ejecutar tareas de renovación inmediatamente al iniciar
    setTimeout(async () => {
      try {
        console.log('🚀 Ejecutando tareas de renovación inicial...');
        await RenewalReminderService.runAllRenewalTasks();
      } catch (error) {
        console.error('❌ Error en tareas de renovación inicial:', error);
      }
    }, 10000); // 10 segundos después de iniciar

    console.log('✅ Scheduler de recordatorios de renovación iniciado');
  }

  // Detener el scheduler de validaciones
  stopValidationScheduler() {
    const interval = this.intervals.get('validation');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('validation');
      console.log('⏹️  Scheduler de validaciones detenido');
    }
  }

  // Detener el scheduler de renovaciones
  stopRenewalScheduler() {
    const interval = this.intervals.get('renewal');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('renewal');
      console.log('⏹️  Scheduler de renovaciones detenido');
    }
  }

  // Detener todos los schedulers
  stopAllSchedulers() {
    this.stopValidationScheduler();
    this.stopRenewalScheduler();
    console.log('⏹️  Todos los schedulers detenidos');
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

  // Ejecutar tareas de renovación una vez (para testing)
  async runRenewalTasksOnce() {
    try {
      console.log('🔍 Ejecutando tareas de renovación una vez...');
      const results = await RenewalReminderService.runAllRenewalTasks();
      console.log('✅ Tareas de renovación completadas:', results);
      return results;
    } catch (error) {
      console.error('❌ Error ejecutando tareas de renovación:', error);
      throw error;
    }
  }

  // Obtener estado del scheduler
  getSchedulerStatus() {
    return {
      validationScheduler: this.intervals.has('validation'),
      renewalScheduler: this.intervals.has('renewal'),
      activeIntervals: Array.from(this.intervals.keys())
    };
  }
}

// Instancia singleton
const schedulerService = new SchedulerService();

module.exports = schedulerService; 