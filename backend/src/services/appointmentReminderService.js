const { prisma } = require('../config/database');
const notificationService = require('./notificationService');

/**
 * Servicio de Recordatorios Automáticos de Citas
 * Se ejecuta periódicamente para enviar recordatorios
 */
class AppointmentReminderService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * Procesa y envía recordatorios de citas
   * @returns {Promise<Object>} Estadísticas del procesamiento
   */
  async processReminders() {
    if (this.isRunning) {
      console.log('⚠️ Proceso de recordatorios ya está en ejecución');
      return { skipped: true };
    }

    this.isRunning = true;
    console.log('🔄 [REMINDERS] Iniciando proceso de recordatorios...');

    const startTime = Date.now(); // Para calcular duración total

    try {
      // Obtener todas las configuraciones de notificaciones activas
      const allSettings = await prisma.notificationSettings.findMany({
        where: {
          sendReminderEmail: true
        }
      });

      console.log(`📋 [REMINDERS] ${allSettings.length} negocios con recordatorios activos`);

      let totalProcessed = 0;
      let totalSent = 0;
      let totalFailed = 0;
      let totalSkipped = 0;

      // Procesar cada negocio
      for (const settings of allSettings) {
        const { businessId, reminderHoursBefore } = settings;

        console.log(`\n🏢 [REMINDERS] Procesando negocio: ${businessId}`);
        console.log(`   ⏰ Enviando recordatorios ${reminderHoursBefore} horas antes`);

        // Calcular ventana de tiempo para los recordatorios
        const now = new Date();
        const targetTime = new Date(now.getTime() + reminderHoursBefore * 60 * 60 * 1000);
        
        // Ventana de 1 hora: targetTime ± 30 minutos
        const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
        const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

        console.log(`   📅 Buscando citas entre:`);
        console.log(`      ${windowStart.toLocaleString('es-AR')}`);
        console.log(`      ${windowEnd.toLocaleString('es-AR')}`);

        // Buscar citas que necesitan recordatorio
        const appointments = await prisma.appointment.findMany({
          where: {
            businessId,
            status: 'CONFIRMED',
            reminderSent: false,
            startTime: {
              gte: windowStart,
              lte: windowEnd
            }
          },
          include: {
            business: true,
            client: true,
            service: true,
            user: {
              select: {
                id: true,
                name: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                latitude: true,
                longitude: true,
                isMain: true
              }
            }
          }
        });

        console.log(`   📧 ${appointments.length} citas encontradas para recordatorios`);

        // Procesar cada cita
        for (const appointment of appointments) {
          totalProcessed++;

          try {
            // Calcular horas hasta la cita
            const hoursUntil = Math.round(
              (new Date(appointment.startTime) - now) / (1000 * 60 * 60)
            );

            console.log(`   📤 Enviando recordatorio para cita ${appointment.id} (en ${hoursUntil}h)`);

            // Enviar recordatorio
            const result = await notificationService.sendAppointmentReminder(
              appointment,
              hoursUntil
            );

            if (result.success) {
              // Marcar recordatorio como enviado
              await prisma.appointment.update({
                where: { id: appointment.id },
                data: { reminderSent: true }
              });

              totalSent++;
              console.log(`   ✅ Recordatorio enviado a ${appointment.client.email}`);
            } else {
              totalSkipped++;
              console.log(`   ⚠️ Recordatorio omitido: ${result.error}`);
            }

            // Pequeña pausa entre emails (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            totalFailed++;
            console.error(`   ❌ Error procesando cita ${appointment.id}:`, error);
          }
        }
      }

      const stats = {
        timestamp: new Date().toISOString(),
        businesses: allSettings.length,
        totalProcessed,
        totalSent,
        totalFailed,
        totalSkipped,
        duration: Date.now() - startTime
      };

      console.log('\n✅ [REMINDERS] Proceso completado:');
      console.log(`   📊 Negocios: ${stats.businesses}`);
      console.log(`   📧 Procesadas: ${stats.totalProcessed}`);
      console.log(`   ✅ Enviadas: ${stats.totalSent}`);
      console.log(`   ⚠️ Omitidas: ${stats.totalSkipped}`);
      console.log(`   ❌ Fallidas: ${stats.totalFailed}`);
      console.log(`   ⏱️ Duración: ${Math.round(stats.duration / 1000)}s\n`);

      this.isRunning = false;
      return stats;
    } catch (error) {
      console.error('❌ [REMINDERS] Error en proceso de recordatorios:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Inicia el servicio de recordatorios automáticos
   * @param {number} intervalMinutes - Intervalo en minutos (default: 60)
   */
  start(intervalMinutes = 60) {
    if (this.interval) {
      console.log('⚠️ Servicio de recordatorios ya está iniciado');
      return;
    }

    console.log(`🚀 [REMINDERS] Iniciando servicio de recordatorios automáticos`);
    console.log(`   ⏰ Intervalo: cada ${intervalMinutes} minutos`);

    // Ejecutar inmediatamente
    this.processReminders().catch(error => {
      console.error('❌ [REMINDERS] Error en ejecución inicial:', error);
    });

    // Configurar ejecución periódica
    this.interval = setInterval(() => {
      this.processReminders().catch(error => {
        console.error('❌ [REMINDERS] Error en ejecución periódica:', error);
      });
    }, intervalMinutes * 60 * 1000);

    console.log('✅ [REMINDERS] Servicio iniciado correctamente');
  }

  /**
   * Detiene el servicio de recordatorios automáticos
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 [REMINDERS] Servicio de recordatorios detenido');
    }
  }

  /**
   * Envía un recordatorio manual para una cita específica
   * @param {string} appointmentId - ID de la cita
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendManualReminder(appointmentId) {
    try {
      console.log(`📧 [REMINDERS] Enviando recordatorio manual para cita ${appointmentId}`);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          business: true,
          client: true,
          service: true,
          user: {
            select: {
              id: true,
              name: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true,
              isMain: true
            }
          }
        }
      });

      if (!appointment) {
        return {
          success: false,
          error: 'APPOINTMENT_NOT_FOUND',
          message: 'Cita no encontrada'
        };
      }

      if (appointment.status !== 'CONFIRMED') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: 'Solo se pueden enviar recordatorios a citas confirmadas'
        };
      }

      // Calcular horas hasta la cita
      const now = new Date();
      const hoursUntil = Math.round(
        (new Date(appointment.startTime) - now) / (1000 * 60 * 60)
      );

      // Enviar recordatorio
      const result = await notificationService.sendAppointmentReminder(
        appointment,
        hoursUntil
      );

      if (result.success) {
        // Marcar como enviado (solo si no estaba enviado)
        if (!appointment.reminderSent) {
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { reminderSent: true }
          });
        }
      }

      return result;
    } catch (error) {
      console.error(`❌ [REMINDERS] Error enviando recordatorio manual:`, error);
      return {
        success: false,
        error: 'SEND_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Envía recordatorios extra a citas con alto riesgo de cancelación
   * @param {string} businessId - ID del negocio (opcional, si no se especifica procesa todos)
   * @returns {Promise<Object>} Estadísticas del procesamiento
   */
  async sendHighRiskReminders(businessId = null) {
    console.log('🚨 [RISK-REMINDERS] Iniciando recordatorios de alto riesgo...');
    
    try {
      // Construir filtro
      const where = {
        status: 'CONFIRMED',
        startTime: { 
          gte: new Date(), // Solo futuras
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 días
        },
        riskPrediction: {
          riskLevel: 'HIGH' // Solo alto riesgo
        }
      };

      if (businessId) {
        where.businessId = businessId;
      }

      // Obtener citas de alto riesgo
      const riskyAppointments = await prisma.appointment.findMany({
        where,
        include: {
          business: true,
          client: true,
          service: true,
          user: {
            select: {
              id: true,
              name: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true,
              isMain: true
            }
          },
          riskPrediction: true
        }
      });

      console.log(`📋 [RISK-REMINDERS] ${riskyAppointments.length} citas de alto riesgo encontradas`);

      let sent = 0;
      let failed = 0;

      // Enviar recordatorio a cada una
      for (const appointment of riskyAppointments) {
        try {
          // Calcular horas hasta la cita
          const now = new Date();
          const hoursUntil = Math.round(
            (new Date(appointment.startTime) - now) / (1000 * 60 * 60)
          );

          // Enviar recordatorio con mensaje especial de alto riesgo
          const result = await notificationService.sendAppointmentReminder(
            appointment,
            hoursUntil,
            { 
              isHighRisk: true,
              riskScore: appointment.riskPrediction.riskScore 
            }
          );

          if (result.success) {
            sent++;
            console.log(`✅ [RISK-REMINDERS] Recordatorio enviado para cita ${appointment.id}`);
          } else {
            failed++;
            console.log(`❌ [RISK-REMINDERS] Error enviando recordatorio para cita ${appointment.id}: ${result.message}`);
          }

          // Pequeña pausa para no saturar el servicio de email
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          failed++;
          console.error(`❌ [RISK-REMINDERS] Error procesando cita ${appointment.id}:`, error);
        }
      }

      const result = {
        success: true,
        total: riskyAppointments.length,
        sent,
        failed,
        message: `Recordatorios de alto riesgo: ${sent} enviados, ${failed} fallidos`
      };

      console.log(`✅ [RISK-REMINDERS] Proceso completado:`, result);

      return result;
    } catch (error) {
      console.error(`❌ [RISK-REMINDERS] Error en proceso:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exportar instancia única (singleton)
const appointmentReminderService = new AppointmentReminderService();

module.exports = appointmentReminderService;

