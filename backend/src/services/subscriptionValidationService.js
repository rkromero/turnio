const { prisma } = require('../config/database');
const PlanChangeService = require('./planChangeService');

class SubscriptionValidationService {
  
  // Verificar suscripciones vencidas y actualizar su estado
  static async validateExpiredSubscriptions() {
    try {
      console.log('🔍 === VALIDANDO SUSCRIPCIONES VENCIDAS ===');
      
      const now = new Date();
      
      // Buscar suscripciones que han vencido por fecha
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          AND: [
            { planType: { not: 'FREE' } },
            { status: { not: 'CANCELLED' } },
            { nextBillingDate: { lt: now } }
          ]
        },
        include: {
          business: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      console.log(`📊 Encontradas ${expiredSubscriptions.length} suscripciones vencidas`);

      for (const subscription of expiredSubscriptions) {
        console.log(`\n🔍 Procesando: ${subscription.business.name} (${subscription.planType})`);
        console.log(`📅 Fecha de vencimiento: ${subscription.nextBillingDate}`);
        console.log(`📅 Días de atraso: ${Math.floor((now - subscription.nextBillingDate) / (1000 * 60 * 60 * 24))}`);

        // Verificar si hay pagos pendientes o recientes
        const hasRecentPayment = subscription.payments.length > 0 && 
                                subscription.payments[0].status === 'APPROVED' &&
                                subscription.payments[0].createdAt > subscription.nextBillingDate;

        if (hasRecentPayment) {
          // Si hay un pago reciente, actualizar la fecha de próximo cobro
          console.log('✅ Pago reciente encontrado, actualizando fecha de próximo cobro');
          
          const nextBillingDate = new Date(subscription.nextBillingDate);
          if (subscription.billingCycle === 'MONTHLY') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'ACTIVE',
              nextBillingDate: nextBillingDate
            }
          });
        } else {
          // No hay pago reciente, suspender la suscripción
          console.log('❌ No hay pago reciente, suspendiendo suscripción');
          
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'SUSPENDED'
            }
          });

          // Opcional: Enviar notificación al usuario
          console.log(`📧 Enviando notificación de suspensión a ${subscription.business.email}`);
        }
      }

      console.log('\n✅ Validación de suscripciones completada');
      return expiredSubscriptions.length;
      
    } catch (error) {
      console.error('❌ Error validando suscripciones:', error);
      throw error;
    }
  }

  // Verificar suscripciones que están próximas a vencer (advertencia)
  static async checkUpcomingExpirations() {
    try {
      console.log('🔍 === VERIFICANDO SUSCRIPCIONES PRÓXIMAS A VENCER ===');
      
      const now = new Date();
      const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
      
      const upcomingExpirations = await prisma.subscription.findMany({
        where: {
          AND: [
            { planType: { not: 'FREE' } },
            { status: 'ACTIVE' },
            { nextBillingDate: { 
              gte: now,
              lte: warningDate 
            }}
          ]
        },
        include: {
          business: true
        }
      });

      console.log(`📊 Encontradas ${upcomingExpirations.length} suscripciones próximas a vencer`);

      for (const subscription of upcomingExpirations) {
        const daysUntilExpiration = Math.ceil((subscription.nextBillingDate - now) / (1000 * 60 * 60 * 24));
        
        console.log(`\n⚠️  ${subscription.business.name}: vence en ${daysUntilExpiration} días`);
        
        // Opcional: Enviar notificación de advertencia
        if (daysUntilExpiration <= 3) {
          console.log(`📧 Enviando notificación urgente a ${subscription.business.email}`);
        } else {
          console.log(`📧 Enviando notificación de recordatorio a ${subscription.business.email}`);
        }
      }

      return upcomingExpirations.length;
      
    } catch (error) {
      console.error('❌ Error verificando expiraciones próximas:', error);
      throw error;
    }
  }

  // Verificar pagos fallidos y reintentar
  static async checkFailedPayments() {
    try {
      console.log('🔍 === VERIFICANDO PAGOS FALLIDOS ===');
      
      const failedPayments = await prisma.payment.findMany({
        where: {
          status: 'REJECTED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        },
        include: {
          subscription: {
            include: {
              business: true
            }
          }
        }
      });

      console.log(`📊 Encontrados ${failedPayments.length} pagos fallidos recientes`);

      for (const payment of failedPayments) {
        console.log(`\n💳 Pago fallido: ${payment.subscription.business.name} - $${payment.amount}`);
        
        // Opcional: Reintentar el pago automáticamente
        // await this.retryPayment(payment);
        
        // Opcional: Enviar notificación de pago fallido
        console.log(`📧 Enviando notificación de pago fallido a ${payment.subscription.business.email}`);
      }

      return failedPayments.length;
      
    } catch (error) {
      console.error('❌ Error verificando pagos fallidos:', error);
      throw error;
    }
  }

  // Procesar downgrades pendientes
  static async processPendingDowngrades() {
    try {
      console.log('🔍 === PROCESANDO DOWNGRADES PENDIENTES ===');
      
      const downgradeCount = await PlanChangeService.processPendingDowngrades();
      
      console.log(`📊 Procesados ${downgradeCount} downgrades pendientes`);
      return downgradeCount;
      
    } catch (error) {
      console.error('❌ Error procesando downgrades pendientes:', error);
      throw error;
    }
  }

  // Ejecutar todas las validaciones
  static async runAllValidations() {
    try {
      console.log('🚀 === INICIANDO VALIDACIONES DE SUSCRIPCIÓN ===\n');
      
      const expiredCount = await this.validateExpiredSubscriptions();
      const upcomingCount = await this.checkUpcomingExpirations();
      const failedCount = await this.checkFailedPayments();
      const downgradeCount = await this.processPendingDowngrades();
      
      console.log('\n📊 === RESUMEN DE VALIDACIONES ===');
      console.log(`✅ Suscripciones vencidas procesadas: ${expiredCount}`);
      console.log(`⚠️  Suscripciones próximas a vencer: ${upcomingCount}`);
      console.log(`❌ Pagos fallidos encontrados: ${failedCount}`);
      console.log(`📉 Downgrades pendientes procesados: ${downgradeCount}`);
      
      return {
        expiredCount,
        upcomingCount,
        failedCount,
        downgradeCount
      };
      
    } catch (error) {
      console.error('❌ Error ejecutando validaciones:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionValidationService; 