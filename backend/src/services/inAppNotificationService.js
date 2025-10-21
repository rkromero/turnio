const { prisma } = require('../config/database');

class InAppNotificationService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Iniciar el servicio de notificaciones
   * Verifica cada 60 minutos si hay turnos recién terminados y auto-completa los antiguos
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [IN-APP NOTIFICATIONS] Servicio ya está corriendo');
      return;
    }

    console.log('🔔 [IN-APP NOTIFICATIONS] Iniciando servicio de notificaciones in-app');
    console.log('   ⏰ Intervalo: cada 60 minutos');

    // Ejecutar inmediatamente
    this.processAppointments();

    // Luego cada 60 minutos
    this.checkInterval = setInterval(() => {
      this.processAppointments();
    }, 60 * 60 * 1000); // 60 minutos

    this.isRunning = true;
    console.log('✅ [IN-APP NOTIFICATIONS] Servicio iniciado correctamente');
  }

  /**
   * Procesar turnos: crear notificaciones y auto-completar antiguos
   */
  async processAppointments() {
    await this.checkForCompletedAppointments();
    await this.autoCompleteOldAppointments();
  }

  /**
   * Detener el servicio
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('🛑 [IN-APP NOTIFICATIONS] Servicio detenido');
    }
  }

  /**
   * Verificar si hay turnos que terminaron hace más de 15 minutos y crear notificaciones
   * La notificación se crea UNA SOLA VEZ por turno
   */
  async checkForCompletedAppointments() {
    try {
      console.log('🔄 [IN-APP NOTIFICATIONS] Verificando turnos terminados...');

      const now = new Date();
      // Buscar turnos que terminaron hace MÁS de 15 minutos
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      // Buscar turnos confirmados que ya terminaron hace más de 15 min
      // y que aún no tienen notificación
      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          endTime: {
            lt: fifteenMinutesAgo // Terminaron hace MÁS de 15 minutos
          },
          userId: { not: null } // Solo si tiene profesional asignado
        },
        include: {
          user: true,
          client: true,
          service: true,
          inAppNotifications: true // Para verificar si ya existe notificación
        }
      });

      console.log(`   📋 Encontrados ${appointments.length} turnos terminados`);

      let created = 0;
      let skipped = 0;

      for (const appointment of appointments) {
        // Verificar si ya existe notificación para este turno
        const existingNotification = appointment.inAppNotifications.find(
          n => n.userId === appointment.userId && n.appointmentId === appointment.id
        );

        if (existingNotification) {
          skipped++;
          continue;
        }

        // Crear notificación para el profesional
        try {
          await prisma.inAppNotification.create({
            data: {
              userId: appointment.userId,
              businessId: appointment.businessId,
              appointmentId: appointment.id,
              type: 'EVALUATE_APPOINTMENT',
              title: '⏰ Turno terminado',
              message: `Evalúa la asistencia de ${appointment.client.name} - ${appointment.service.name}`
            }
          });

          created++;
          console.log(`   ✅ Notificación creada para turno ${appointment.id}`);
        } catch (error) {
          console.error(`   ❌ Error creando notificación para turno ${appointment.id}:`, error);
        }
      }

      console.log(`✅ [IN-APP NOTIFICATIONS] Proceso de notificaciones completado:`);
      console.log(`   📊 Turnos procesados: ${appointments.length}`);
      console.log(`   ✅ Notificaciones creadas: ${created}`);
      console.log(`   ⏭️ Omitidas (ya existían): ${skipped}`);

    } catch (error) {
      console.error('❌ [IN-APP NOTIFICATIONS] Error verificando turnos:', error);
    }
  }

  /**
   * Auto-completar turnos con más de 12 horas sin evaluar
   * Los marca como COMPLETED (asumimos que asistió)
   */
  async autoCompleteOldAppointments() {
    try {
      console.log('🔄 [AUTO-COMPLETE] Verificando turnos antiguos sin evaluar...');

      const now = new Date();
      // Buscar turnos que terminaron hace más de 12 horas
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Buscar turnos CONFIRMED que ya pasaron hace más de 12 horas
      const oldAppointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          endTime: {
            lt: twelveHoursAgo
          }
        },
        include: {
          client: true,
          service: true
        }
      });

      console.log(`   📋 Encontrados ${oldAppointments.length} turnos antiguos sin evaluar`);

      let completed = 0;

      for (const appointment of oldAppointments) {
        try {
          // Marcar como COMPLETED (asumimos que asistió)
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'COMPLETED' }
          });

          completed++;
          console.log(`   ✅ Turno ${appointment.id} auto-completado (${appointment.client.name} - ${appointment.service.name})`);
        } catch (error) {
          console.error(`   ❌ Error auto-completando turno ${appointment.id}:`, error);
        }
      }

      console.log(`✅ [AUTO-COMPLETE] Proceso completado:`);
      console.log(`   📊 Turnos procesados: ${oldAppointments.length}`);
      console.log(`   ✅ Auto-completados: ${completed}`);

    } catch (error) {
      console.error('❌ [AUTO-COMPLETE] Error auto-completando turnos:', error);
    }
  }

  /**
   * Crear notificación manualmente para un turno específico
   */
  async createNotificationForAppointment(appointmentId) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          client: true,
          service: true
        }
      });

      if (!appointment || !appointment.userId) {
        return { success: false, message: 'Turno no encontrado o sin profesional asignado' };
      }

      // Verificar si ya existe notificación
      const existing = await prisma.inAppNotification.findFirst({
        where: {
          userId: appointment.userId,
          appointmentId: appointment.id
        }
      });

      if (existing) {
        return { success: false, message: 'La notificación ya existe' };
      }

      const notification = await prisma.inAppNotification.create({
        data: {
          userId: appointment.userId,
          businessId: appointment.businessId,
          appointmentId: appointment.id,
          type: 'EVALUATE_APPOINTMENT',
          title: '⏰ Turno terminado',
          message: `Evalúa la asistencia de ${appointment.client.name} - ${appointment.service.name}`
        }
      });

      return { success: true, data: notification };
    } catch (error) {
      console.error('Error creando notificación manual:', error);
      return { success: false, message: error.message };
    }
  }
}

// Exportar instancia única (singleton)
const inAppNotificationService = new InAppNotificationService();

module.exports = inAppNotificationService;

