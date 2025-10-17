const { prisma } = require('../config/database');
const {
  isValidPlanType,
  validatePaymentData,
  validateSubscriptionData,
  VALID_PLAN_TYPES
} = require('../utils/subscriptionValidators');

// Constantes de planes
const PLAN_PRICES = {
  'FREE': 0,
  'BASIC': 18900,
  'PREMIUM': 24900,
  'ENTERPRISE': 90900
};

const PLAN_HIERARCHY = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];

class PlanChangeService {
  
  // Helper: Obtener precio de un plan
  static getPlanPrice(planType) {
    return PLAN_PRICES[planType] || 0;
  }

  // Helper: Determinar tipo de cambio
  static getChangeType(currentPlan, newPlan) {
    const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
    const newIndex = PLAN_HIERARCHY.indexOf(newPlan);
    
    if (currentIndex === newIndex) return 'SAME';
    if (newIndex > currentIndex) return 'UPGRADE';
    return 'DOWNGRADE';
  }

  // Calcular diferencia pro-rata entre planes
  static calculateProRataDifference(currentPlan, newPlan, daysRemaining) {
    const currentPrice = PLAN_PRICES[currentPlan] || 0;
    const newPrice = PLAN_PRICES[newPlan] || 0;
    
    // Calcular precio por día
    const currentPricePerDay = currentPrice / 30;
    const newPricePerDay = newPrice / 30;
    
    // Calcular diferencia
    const priceDifferencePerDay = newPricePerDay - currentPricePerDay;
    const totalDifference = priceDifferencePerDay * daysRemaining;
    
    return {
      currentPrice,
      newPrice,
      currentPricePerDay,
      newPricePerDay,
      priceDifferencePerDay,
      daysRemaining,
      totalDifference: Math.max(0, totalDifference), // No cobrar si es downgrade
      isUpgrade: totalDifference > 0,
      isDowngrade: totalDifference < 0
    };
  }

  // Procesar UPGRADE de plan
  static async processUpgrade(currentSubscription, currentPlan, newPlanType) {
    console.log('📈 Procesando UPGRADE...');
    
    // Validar plan
    if (!isValidPlanType(newPlanType)) {
      throw new Error(`Plan ${newPlanType} no válido. Válidos: ${VALID_PLAN_TYPES.join(', ')}`);
    }

    const newPlanPrice = this.getPlanPrice(newPlanType);
    if (newPlanPrice === 0) {
      throw new Error(`Plan ${newPlanType} no válido para upgrade`);
    }

    // Preparar datos de pago y validar
    const paymentData = {
      subscriptionId: currentSubscription.id,
      amount: newPlanPrice,
      currency: 'ARS',
      status: 'PENDING',
      billingCycle: currentSubscription.billingCycle,
      paymentMethod: `plan_upgrade_${currentPlan}_to_${newPlanType}`
    };

    const validation = validatePaymentData(paymentData);
    if (!validation.valid) {
      throw new Error(`Datos de pago inválidos: ${validation.errors.join(', ')}`);
    }

    // Crear pago por el plan completo
    const upgradePayment = await prisma.payment.create({ data: paymentData });

    // Actualizar metadata de suscripción para marcar upgrade pendiente
    // Mantener status ACTIVE hasta que se complete el pago
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        metadata: {
          ...currentSubscription.metadata,
          pendingUpgrade: {
            paymentId: upgradePayment.id,
            fromPlan: currentPlan,
            toPlan: newPlanType,
            amount: newPlanPrice,
            requestedAt: new Date().toISOString()
          }
        }
      }
    });

    // Registrar cambio de plan
    await prisma.planChange.create({
      data: {
        businessId: currentSubscription.businessId,
        fromPlan: currentPlan,
        toPlan: newPlanType,
        changeReason: 'upgrade',
        effectiveDate: new Date()
      }
    });

    return {
      success: true,
      message: `Plan actualizado a ${newPlanType}. Debes pagar $${newPlanPrice} para activar el nuevo plan.`,
      requiresPayment: true,
      paymentId: upgradePayment.id,
      amount: newPlanPrice,
      changeType: 'upgrade'
    };
  }

  // Procesar DOWNGRADE de plan
  static async processDowngrade(currentSubscription, currentPlan, newPlanType) {
    console.log('📉 Procesando DOWNGRADE...');
    
    const newPlanPrice = this.getPlanPrice(newPlanType);

    // Actualizar suscripción para cambiar automáticamente cuando venza
    await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        metadata: {
          ...currentSubscription.metadata,
          pendingDowngrade: {
            fromPlan: currentPlan,
            toPlan: newPlanType,
            effectiveDate: currentSubscription.nextBillingDate,
            requestedAt: new Date().toISOString(),
            newPlanPrice: newPlanPrice
          }
        }
      }
    });

    // Registrar cambio de plan
    await prisma.planChange.create({
      data: {
        businessId: currentSubscription.businessId,
        fromPlan: currentPlan,
        toPlan: newPlanType,
        changeReason: 'downgrade',
        effectiveDate: new Date()
      }
    });

    return {
      success: true,
      message: `Plan programado para cambiar a ${newPlanType} el ${currentSubscription.nextBillingDate.toLocaleDateString()}. Mantienes acceso al plan actual hasta esa fecha${newPlanPrice > 0 ? `. El día del cambio se cobrará $${newPlanPrice} por el nuevo plan.` : '.'}`,
      requiresPayment: false,
      effectiveDate: currentSubscription.nextBillingDate,
      changeType: 'downgrade',
      newPlanPrice: newPlanPrice
    };
  }

  // Cambiar plan de suscripción (orquestador principal)
  static async changeSubscriptionPlan(subscriptionId, newPlanType, userId) {
    try {
      console.log(`🔄 Cambiando plan de suscripción: ${subscriptionId} → ${newPlanType}`);

      // Obtener suscripción actual
      const currentSubscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { business: true }
      });

      if (!currentSubscription) {
        throw new Error('Suscripción no encontrada');
      }

      // Verificar que el usuario tiene permisos
      if (currentSubscription.businessId !== userId) {
        throw new Error('No tienes permisos para cambiar esta suscripción');
      }

      const currentPlan = currentSubscription.planType;
      
      // Si es el mismo plan, no hacer nada
      if (currentPlan === newPlanType) {
        return {
          success: true,
          message: 'Ya tienes este plan activo',
          requiresPayment: false,
          changeType: 'SAME'
        };
      }

      // Determinar tipo de cambio
      const changeType = this.getChangeType(currentPlan, newPlanType);
      console.log(`📊 Cambio de plan: ${currentPlan} → ${newPlanType} (${changeType})`);

      // Delegar según tipo de cambio
      if (changeType === 'UPGRADE') {
        return await this.processUpgrade(currentSubscription, currentPlan, newPlanType);
      } else if (changeType === 'DOWNGRADE') {
        return await this.processDowngrade(currentSubscription, currentPlan, newPlanType);
      } else {
        return {
          success: true,
          message: 'No hay cambio en el nivel del plan',
          requiresPayment: false,
          changeType: 'SAME'
        };
      }

    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      throw error;
    }
  }

  // Procesar pago de upgrade
  static async processUpgradePayment(paymentId) {
    try {
      console.log(`💳 Procesando pago de upgrade: ${paymentId}`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: { business: true }
          }
        }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (payment.status !== 'APPROVED') {
        throw new Error('Pago no está aprobado');
      }

      const subscription = payment.subscription;
      const pendingUpgrade = subscription.metadata?.pendingUpgrade;

      if (!pendingUpgrade) {
        throw new Error('No hay upgrade pendiente');
      }

      // Calcular nueva fecha de vencimiento (ciclo completo desde ahora)
      const newBillingDate = new Date();
      if (subscription.billingCycle === 'MONTHLY') {
        newBillingDate.setMonth(newBillingDate.getMonth() + 1);
      } else {
        newBillingDate.setFullYear(newBillingDate.getFullYear() + 1);
      }

      // Actualizar suscripción a ACTIVE con el nuevo plan y ciclo reiniciado
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          planType: pendingUpgrade.toPlan,
          nextBillingDate: newBillingDate,
          priceAmount: payment.amount,
          metadata: {
            ...subscription.metadata,
            pendingUpgrade: null,
            lastUpgrade: {
              date: new Date(),
              paymentId: paymentId,
              fromPlan: pendingUpgrade.fromPlan,
              toPlan: pendingUpgrade.toPlan,
              newBillingDate: newBillingDate
            }
          }
        }
      });

      // Actualizar negocio
      await prisma.business.update({
        where: { id: subscription.businessId },
        data: { planType: pendingUpgrade.toPlan }
      });

      console.log(`✅ Upgrade completado: ${pendingUpgrade.fromPlan} → ${pendingUpgrade.toPlan}`);
      console.log(`📅 Nuevo ciclo desde: ${newBillingDate.toLocaleDateString()}`);

      return {
        success: true,
        message: 'Upgrade completado exitosamente. Nuevo ciclo iniciado.',
        fromPlan: pendingUpgrade.fromPlan,
        toPlan: pendingUpgrade.toPlan,
        newBillingDate: newBillingDate
      };

    } catch (error) {
      console.error('❌ Error procesando upgrade:', error);
      throw error;
    }
  }

  // Procesar downgrades pendientes (llamado por el scheduler)
  static async processPendingDowngrades() {
    try {
      console.log('🔍 Procesando downgrades pendientes...');

      const now = new Date();
      
      // Buscar suscripciones con downgrade pendiente que ya vencieron
      const pendingDowngrades = await prisma.subscription.findMany({
        where: {
          AND: [
            { nextBillingDate: { lte: now } },
            {
              metadata: {
                path: ['pendingDowngrade'],
                not: null
              }
            }
          ]
        },
        include: { business: true }
      });

      console.log(`📊 Encontrados ${pendingDowngrades.length} downgrades pendientes`);

      for (const subscription of pendingDowngrades) {
        const pendingDowngrade = subscription.metadata.pendingDowngrade;
        
        console.log(`🔄 Procesando downgrade: ${pendingDowngrade.fromPlan} → ${pendingDowngrade.toPlan}`);

        // Crear pago por el nuevo plan
        const downgradePayment = await prisma.payment.create({
          data: {
            subscriptionId: subscription.id,
            amount: pendingDowngrade.newPlanPrice,
            currency: 'ARS',
            status: 'PENDING',
            billingCycle: subscription.billingCycle,
            paymentMethod: 'plan_downgrade',
            metadata: {
              type: 'plan_downgrade',
              fromPlan: pendingDowngrade.fromPlan,
              toPlan: pendingDowngrade.toPlan,
              reason: 'downgrade_effective'
            }
          }
        });

        console.log(`💳 Pago creado por downgrade: $${pendingDowngrade.newPlanPrice}`);

        // Calcular nueva fecha de vencimiento para el nuevo plan
        const newBillingDate = new Date();
        if (subscription.billingCycle === 'MONTHLY') {
          newBillingDate.setMonth(newBillingDate.getMonth() + 1);
        } else {
          newBillingDate.setFullYear(newBillingDate.getFullYear() + 1);
        }

        // Actualizar suscripción al nuevo plan (pendiente de pago)
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planType: pendingDowngrade.toPlan,
            status: 'PENDING_DOWNGRADE_PAYMENT',
            nextBillingDate: newBillingDate,
            metadata: {
              ...subscription.metadata,
              pendingDowngrade: null,
              pendingDowngradePayment: {
                paymentId: downgradePayment.id,
                fromPlan: pendingDowngrade.fromPlan,
                toPlan: pendingDowngrade.toPlan,
                amount: pendingDowngrade.newPlanPrice,
                effectiveDate: pendingDowngrade.effectiveDate
              }
            }
          }
        });

        // Actualizar negocio
        await prisma.business.update({
          where: { id: subscription.businessId },
          data: { planType: pendingDowngrade.toPlan }
        });

        console.log(`✅ Downgrade procesado: ${pendingDowngrade.fromPlan} → ${pendingDowngrade.toPlan}`);
        console.log(`📧 Enviando notificación de pago requerido a ${subscription.business.email}`);
      }

      return pendingDowngrades.length;

    } catch (error) {
      console.error('❌ Error procesando downgrades:', error);
      throw error;
    }
  }

  // Procesar pago de downgrade (cuando el usuario paga)
  static async processDowngradePayment(paymentId) {
    try {
      console.log(`💳 Procesando pago de downgrade: ${paymentId}`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: { business: true }
          }
        }
      });

      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      if (payment.status !== 'APPROVED') {
        throw new Error('Pago no está aprobado');
      }

      const subscription = payment.subscription;
      const pendingDowngradePayment = subscription.metadata?.pendingDowngradePayment;

      if (!pendingDowngradePayment) {
        throw new Error('No hay downgrade pendiente de pago');
      }

      // Actualizar suscripción a ACTIVE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          metadata: {
            ...subscription.metadata,
            pendingDowngradePayment: null,
            lastDowngrade: {
              date: new Date(),
              paymentId: paymentId,
              fromPlan: pendingDowngradePayment.fromPlan,
              toPlan: pendingDowngradePayment.toPlan,
              effectiveDate: pendingDowngradePayment.effectiveDate
            }
          }
        }
      });

      console.log(`✅ Downgrade completado: ${pendingDowngradePayment.fromPlan} → ${pendingDowngradePayment.toPlan}`);

      return {
        success: true,
        message: 'Downgrade completado exitosamente',
        fromPlan: pendingDowngradePayment.fromPlan,
        toPlan: pendingDowngradePayment.toPlan
      };

    } catch (error) {
      console.error('❌ Error procesando pago de downgrade:', error);
      throw error;
    }
  }

  // Obtener historial de cambios de plan
  static async getPlanChangeHistory(businessId) {
    try {
      const planChanges = await prisma.planChange.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        include: { business: true }
      });

      return planChanges;
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      throw error;
    }
  }
}

module.exports = PlanChangeService; 