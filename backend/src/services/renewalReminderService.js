/**
 * Servicio de Recordatorios de Renovación de Suscripción
 * 
 * Este servicio se encarga de:
 * - Detectar suscripciones próximas a vencer
 * - Crear links de pago para renovación
 * - Enviar recordatorios (email/notificación)
 * - Suspender suscripciones vencidas sin pago
 */

const { prisma } = require('../config/database');
const { MercadoPagoConfig, Preference } = require('mercadopago');

class RenewalReminderService {
  
  constructor() {
    this.mpClient = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
    });
  }

  /**
   * Crear link de pago para renovación de suscripción
   */
  async createRenewalPaymentLink(subscription) {
    try {
      console.log(`💳 Creando link de renovación para: ${subscription.business?.name || subscription.businessId}`);

      // Obtener información completa de la suscripción si no está incluida
      let fullSubscription = subscription;
      if (!subscription.business) {
        fullSubscription = await prisma.subscription.findUnique({
          where: { id: subscription.id },
          include: { business: true }
        });
      }

      // Determinar nombre del plan
      const planNames = {
        'FREE': 'Plan Gratuito',
        'BASIC': 'Plan Básico', 
        'PREMIUM': 'Plan Premium',
        'ENTERPRISE': 'Plan Empresa'
      };

      const planName = planNames[fullSubscription.planType] || fullSubscription.planType;
      const billingCycle = fullSubscription.billingCycle === 'YEARLY' ? 'Anual' : 'Mensual';

      // Crear registro de pago pendiente
      const payment = await prisma.payment.create({
        data: {
          subscriptionId: fullSubscription.id,
          amount: fullSubscription.priceAmount,
          billingCycle: fullSubscription.billingCycle,
          status: 'PENDING',
          paymentMethod: 'renewal'
        }
      });

      // Configurar preferencia de MercadoPago
      const preference = new Preference(this.mpClient);
      
      const preferenceData = {
        items: [{
          title: `Renovación ${planName} - ${billingCycle}`,
          description: `Renovación de suscripción para ${fullSubscription.business.name}`,
          quantity: 1,
          unit_price: fullSubscription.priceAmount
        }],
        payer: {
          name: fullSubscription.business.name,
          email: fullSubscription.business.email
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/subscription/success?payment=${payment.id}`,
          failure: `${process.env.FRONTEND_URL}/subscription/failure?payment=${payment.id}`,
          pending: `${process.env.FRONTEND_URL}/subscription/pending?payment=${payment.id}`
        },
        auto_return: 'approved',
        external_reference: payment.id,
        notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`,
        metadata: {
          subscription_id: fullSubscription.id,
          business_id: fullSubscription.businessId,
          payment_id: payment.id,
          plan_type: fullSubscription.planType,
          billing_cycle: fullSubscription.billingCycle,
          is_renewal: true
        }
      };

      const response = await preference.create({ body: preferenceData });

      // Actualizar payment con preferenceId
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          preferenceId: response.id,
          mercadoPagoOrderId: response.id
        }
      });

      console.log(`✅ Link de renovación creado: ${response.init_point}`);

      return {
        paymentId: payment.id,
        preferenceId: response.id,
        initPoint: response.init_point,
        sandboxInitPoint: response.sandbox_init_point
      };

    } catch (error) {
      console.error('❌ Error creando link de renovación:', error);
      throw error;
    }
  }

  /**
   * Enviar recordatorio de renovación
   * TODO: Implementar envío de email real
   */
  async sendRenewalReminder(subscription, daysUntilExpiration, paymentLink) {
    try {
      console.log(`📧 Enviando recordatorio de renovación:`);
      console.log(`   Negocio: ${subscription.business.name}`);
      console.log(`   Email: ${subscription.business.email}`);
      console.log(`   Días hasta vencer: ${daysUntilExpiration}`);
      console.log(`   Link de pago: ${paymentLink}`);

      // TODO: Implementar envío de email con servicio como SendGrid, AWS SES, etc.
      // Ejemplo:
      /*
      await sendEmail({
        to: subscription.business.email,
        subject: `Tu suscripción ${subscription.planType} vence en ${daysUntilExpiration} días`,
        body: `
          Hola ${subscription.business.name},
          
          Tu suscripción al plan ${subscription.planType} vence el ${subscription.nextBillingDate}.
          
          Para renovar tu suscripción, haz clic en el siguiente link:
          ${paymentLink}
          
          Si ya pagaste, ignora este mensaje.
        `
      });
      */

      // Guardar log del recordatorio
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          metadata: {
            ...subscription.metadata,
            lastReminderSent: new Date().toISOString(),
            reminderCount: (subscription.metadata?.reminderCount || 0) + 1
          }
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Error enviando recordatorio:', error);
      return false;
    }
  }

  /**
   * Procesar suscripciones próximas a vencer
   */
  async processUpcomingExpirations() {
    try {
      console.log('\n🔍 === PROCESANDO SUSCRIPCIONES PRÓXIMAS A VENCER ===\n');

      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Buscar suscripciones que vencen en los próximos 7 días
      const upcomingExpirations = await prisma.subscription.findMany({
        where: {
          AND: [
            { planType: { not: 'FREE' } },
            { status: 'ACTIVE' },
            { 
              nextBillingDate: {
                gte: now,
                lte: in7Days
              }
            }
          ]
        },
        include: {
          business: true,
          payments: {
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      console.log(`📊 Encontradas ${upcomingExpirations.length} suscripciones próximas a vencer\n`);

      let processed = 0;

      for (const subscription of upcomingExpirations) {
        const daysUntilExpiration = Math.ceil(
          (subscription.nextBillingDate - now) / (1000 * 60 * 60 * 24)
        );

        console.log(`\n📋 ${subscription.business.name}`);
        console.log(`   Plan: ${subscription.planType}`);
        console.log(`   Vence en: ${daysUntilExpiration} días (${subscription.nextBillingDate.toLocaleDateString()})`);

        // Solo enviar recordatorios en días específicos: 7, 3, 1
        const shouldSendReminder = [7, 3, 1].includes(daysUntilExpiration);
        
        // Verificar que no hayamos enviado recordatorio hoy
        const lastReminder = subscription.metadata?.lastReminderSent;
        const reminderSentToday = lastReminder && 
          new Date(lastReminder).toDateString() === now.toDateString();

        if (shouldSendReminder && !reminderSentToday) {
          // Crear link de pago si no existe uno pendiente
          let paymentLink;
          
          if (subscription.payments.length > 0) {
            // Ya existe un pago pendiente, reutilizar el link
            const existingPayment = subscription.payments[0];
            console.log(`   ♻️  Reutilizando pago pendiente: ${existingPayment.id}`);
            
            // Obtener el link del payment
            if (existingPayment.preferenceId) {
              const isSandbox = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-');
              paymentLink = isSandbox 
                ? `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=${existingPayment.preferenceId}`
                : `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${existingPayment.preferenceId}`;
            }
          } else {
            // Crear nuevo link de pago
            console.log(`   🆕 Creando nuevo link de pago...`);
            const paymentData = await this.createRenewalPaymentLink(subscription);
            paymentLink = paymentData.initPoint;
          }

          // Enviar recordatorio
          if (paymentLink) {
            await this.sendRenewalReminder(subscription, daysUntilExpiration, paymentLink);
            console.log(`   ✅ Recordatorio enviado`);
            processed++;
          }
        } else {
          if (reminderSentToday) {
            console.log(`   ⏭️  Recordatorio ya enviado hoy`);
          } else {
            console.log(`   ⏭️  No es día de recordatorio (solo 7, 3, 1 días antes)`);
          }
        }
      }

      console.log(`\n✅ Procesados ${processed} recordatorios de ${upcomingExpirations.length} suscripciones\n`);

      return {
        total: upcomingExpirations.length,
        processed: processed
      };

    } catch (error) {
      console.error('❌ Error procesando suscripciones próximas a vencer:', error);
      throw error;
    }
  }

  /**
   * Suspender suscripciones vencidas sin pago
   */
  async suspendExpiredSubscriptions() {
    try {
      console.log('\n🔍 === SUSPENDIENDO SUSCRIPCIONES VENCIDAS ===\n');

      const now = new Date();

      // Buscar suscripciones vencidas sin pago reciente aprobado
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          AND: [
            { planType: { not: 'FREE' } },
            { status: 'ACTIVE' },
            { nextBillingDate: { lt: now } }
          ]
        },
        include: {
          business: true,
          payments: {
            where: { 
              status: 'APPROVED',
              paidAt: { gte: now } // Pagos aprobados después de la fecha de vencimiento
            },
            orderBy: { paidAt: 'desc' },
            take: 1
          }
        }
      });

      console.log(`📊 Encontradas ${expiredSubscriptions.length} suscripciones vencidas\n`);

      let suspended = 0;

      for (const subscription of expiredSubscriptions) {
        // Si tiene un pago reciente aprobado, renovar
        if (subscription.payments.length > 0) {
          console.log(`✅ ${subscription.business.name} - Pago reciente encontrado, renovando...`);
          
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

          continue;
        }

        // Sin pago reciente, suspender
        const daysOverdue = Math.floor((now - subscription.nextBillingDate) / (1000 * 60 * 60 * 24));
        
        console.log(`⚠️  ${subscription.business.name}`);
        console.log(`   Plan: ${subscription.planType}`);
        console.log(`   Venció hace: ${daysOverdue} días`);
        console.log(`   Acción: Suspendiendo suscripción...`);

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'SUSPENDED',
            metadata: {
              ...subscription.metadata,
              suspendedAt: now.toISOString(),
              suspensionReason: 'payment_overdue'
            }
          }
        });

        // Cambiar negocio a plan FREE
        await prisma.business.update({
          where: { id: subscription.businessId },
          data: {
            planType: 'FREE',
            maxAppointments: 30
          }
        });

        console.log(`   ✅ Suscripción suspendida - Plan cambiado a FREE`);
        suspended++;

        // TODO: Enviar notificación de suspensión
      }

      console.log(`\n✅ Suspendidas ${suspended} suscripciones de ${expiredSubscriptions.length}\n`);

      return {
        total: expiredSubscriptions.length,
        suspended: suspended
      };

    } catch (error) {
      console.error('❌ Error suspendiendo suscripciones:', error);
      throw error;
    }
  }

  /**
   * Ejecutar todas las tareas de renovación
   */
  async runAllRenewalTasks() {
    try {
      console.log('\n🚀 === INICIANDO TAREAS DE RENOVACIÓN ===\n');

      const upcomingResults = await this.processUpcomingExpirations();
      const suspensionResults = await this.suspendExpiredSubscriptions();

      console.log('\n📊 === RESUMEN DE TAREAS ===');
      console.log(`📧 Recordatorios enviados: ${upcomingResults.processed} de ${upcomingResults.total}`);
      console.log(`🚫 Suscripciones suspendidas: ${suspensionResults.suspended} de ${suspensionResults.total}`);
      console.log('');

      return {
        upcomingExpirations: upcomingResults,
        suspensions: suspensionResults
      };

    } catch (error) {
      console.error('❌ Error ejecutando tareas de renovación:', error);
      throw error;
    }
  }
}

module.exports = new RenewalReminderService();

