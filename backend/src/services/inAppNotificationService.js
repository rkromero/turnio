const { prisma } = require('../config/database');

class InAppNotificationService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Iniciar el servicio de notificaciones
   * Verifica cada 10 minutos si hay turnos recién terminados
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ [IN-APP NOTIFICATIONS] Servicio ya está corriendo');
      return;
    }

    console.log('🔔 [IN-APP NOTIFICATIONS] Iniciando servicio de notificaciones in-app');
    console.log('   ⏰ Intervalo: cada 10 minutos');

    // Ejecutar inmediatamente
    this.checkForCompletedAppointments();

    // Luego cada 10 minutos
    this.checkInterval = setInterval(() => {
      this.checkForCompletedAppointments();
    }, 10 * 60 * 1000); // 10 minutos

    this.isRunning = true;
    console.log('✅ [IN-APP NOTIFICATIONS] Servicio iniciado correctamente');
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
   * Verificar si hay turnos que acaban de terminar
   */
  async checkForCompletedAppointments() {
    try {
      console.log('🔄 [IN-APP NOTIFICATIONS] Verificando turnos terminados...');

      const now = new Date();
      // Buscar turnos que terminaron en los últimos 15 minutos
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      // Buscar turnos confirmados que ya terminaron pero aún no tienen notificación
      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          endTime: {
            gte: fifteenMinutesAgo,
            lt: now
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

      console.log(`✅ [IN-APP NOTIFICATIONS] Proceso completado:`);
      console.log(`   📊 Turnos procesados: ${appointments.length}`);
      console.log(`   ✅ Notificaciones creadas: ${created}`);
      console.log(`   ⏭️ Omitidas (ya existían): ${skipped}`);

    } catch (error) {
      console.error('❌ [IN-APP NOTIFICATIONS] Error verificando turnos:', error);
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

