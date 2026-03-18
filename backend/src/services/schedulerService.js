const { prisma } = require('../config/database');
const SubscriptionValidationService = require('./subscriptionValidationService');

// Tiempo máximo que una suscripción puede estar en PENDING antes de marcarla PAYMENT_FAILED
const STALE_PENDING_HOURS = 48;

class SchedulerService {

  constructor() {
    this.intervals = new Map();
  }

  // Iniciar el scheduler de validaciones (cada 6 horas)
  startValidationScheduler() {
    console.log('🚀 Iniciando scheduler de validaciones de suscripción...');

    const validationInterval = setInterval(async () => {
      try {
        console.log('\n⏰ Ejecutando validaciones programadas...');
        await SubscriptionValidationService.runAllValidations();
      } catch (error) {
        console.error('❌ Error en validación programada:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas

    this.intervals.set('validation', validationInterval);

    // Ejecutar validaciones al iniciar (con delay para que la DB esté lista)
    setTimeout(async () => {
      try {
        console.log('🚀 Ejecutando validación inicial...');
        await SubscriptionValidationService.runAllValidations();
      } catch (error) {
        console.error('❌ Error en validación inicial:', error);
      }
    }, 5000);

    console.log('✅ Scheduler de validaciones iniciado');
  }

  // Recuperar suscripciones PENDING abandonadas (checkout iniciado pero nunca completado)
  // Se ejecuta cada 6 horas para limpiar estados colgados.
  startRenewalScheduler() {
    console.log('🚀 Iniciando scheduler de recuperación de PENDING abandonados...');

    const renewalInterval = setInterval(async () => {
      try {
        await this.recoverStalePendingSubscriptions();
      } catch (error) {
        console.error('❌ Error en scheduler de renovación:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas

    this.intervals.set('renewal', renewalInterval);
    console.log('✅ Scheduler de renovación iniciado');
  }

  // Marca como PAYMENT_FAILED las suscripciones en PENDING > STALE_PENDING_HOURS horas
  // (el usuario abrió el checkout de MP pero nunca autorizó)
  async recoverStalePendingSubscriptions() {
    const cutoff = new Date(Date.now() - STALE_PENDING_HOURS * 60 * 60 * 1000);

    const stale = await prisma.subscription.findMany({
      where: {
        status: 'PENDING',
        updatedAt: { lt: cutoff }
      },
      include: { business: true }
    });

    if (stale.length === 0) return;

    console.log(`🔍 Encontradas ${stale.length} suscripciones PENDING abandonadas`);

    for (const sub of stale) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAYMENT_FAILED' }
      });
      console.log(`⚠️ PENDING → PAYMENT_FAILED: ${sub.business.name} (sin actividad por ${STALE_PENDING_HOURS}h)`);
    }
  }

  // Detener todos los schedulers
  stopValidationScheduler() {
    const interval = this.intervals.get('validation');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('validation');
      console.log('⏹️  Scheduler de validaciones detenido');
    }
  }

  stopRenewalScheduler() {
    const interval = this.intervals.get('renewal');
    if (interval) {
      clearInterval(interval);
      this.intervals.delete('renewal');
      console.log('⏹️  Scheduler de renovación detenido');
    }
  }

  async runValidationsOnce() {
    return SubscriptionValidationService.runAllValidations();
  }

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