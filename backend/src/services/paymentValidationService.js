const clientScoringService = require('./clientScoringService');

class PaymentValidationService {
  
  /**
   * Determinar opciones de pago disponibles basado en el scoring del cliente
   * @param {string} email - Email del cliente
   * @param {string} phone - Teléfono del cliente
   * @returns {Object} Opciones de pago disponibles
   */
  static async getPaymentOptions(email, phone) {
    try {
      // Obtener scoring del cliente
      const clientScore = await clientScoringService.getClientScore(email, phone);
      
      console.log('💳 [PAYMENT OPTIONS] Evaluando opciones para:', { 
        email, 
        phone, 
        hasScore: clientScore?.hasScore,
        starRating: clientScore?.starRating 
      });

      // Cliente sin historial - permitir ambas opciones
      if (!clientScore || !clientScore.hasScore || clientScore.starRating === null) {
        return {
          canPayLater: true,
          canPayOnline: true,
          requiresPayment: false,
          scoring: null,
          reason: 'Cliente sin historial - ambas opciones disponibles'
        };
      }

      const starRating = clientScore.starRating;

      // Scoring > 3.5 - Cliente confiable, ambas opciones
      if (starRating > 3.5) {
        return {
          canPayLater: true,
          canPayOnline: true,
          requiresPayment: false,
          scoring: {
            starRating,
            totalBookings: clientScore.totalBookings,
            attendedCount: clientScore.attendedCount,
            noShowCount: clientScore.noShowCount
          },
          reason: `Cliente confiable (${starRating}★) - ambas opciones disponibles`
        };
      }

      // Scoring <= 3.5 - Cliente con mal historial, solo pago adelantado
      return {
        canPayLater: false,
        canPayOnline: true,
        requiresPayment: true,
        scoring: {
          starRating,
          totalBookings: clientScore.totalBookings,
          attendedCount: clientScore.attendedCount,
          noShowCount: clientScore.noShowCount
        },
        reason: `Cliente con historial deficiente (${starRating}★) - requiere pago adelantado`
      };

    } catch (error) {
      console.error('❌ [PAYMENT OPTIONS] Error evaluating payment options:', error);
      
      // En caso de error, ser conservador pero funcional
      return {
        canPayLater: true,
        canPayOnline: true,
        requiresPayment: false,
        scoring: null,
        reason: 'Error evaluando historial - ambas opciones disponibles por defecto',
        error: error.message
      };
    }
  }

  /**
   * Validar si un cliente puede hacer una reserva sin pago
   * @param {string} email - Email del cliente
   * @param {string} phone - Teléfono del cliente
   * @returns {Object} Resultado de la validación
   */
  static async canBookWithoutPayment(email, phone) {
    const options = await this.getPaymentOptions(email, phone);
    
    return {
      allowed: options.canPayLater,
      requiresPayment: options.requiresPayment,
      scoring: options.scoring,
      reason: options.reason
    };
  }

  /**
   * Formatear mensaje para mostrar al usuario
   * @param {Object} paymentOptions - Opciones de pago obtenidas
   * @returns {string} Mensaje formateado para el usuario
   */
  static formatPaymentOptionsMessage(paymentOptions) {
    if (!paymentOptions.scoring) {
      return "Como es tu primera reserva, puedes elegir pagar ahora o en el local.";
    }

    const { starRating, totalBookings } = paymentOptions.scoring;

    if (paymentOptions.canPayLater) {
      return `¡Excelente! Con tu puntuación de ${starRating}★ (${totalBookings} citas), puedes elegir pagar ahora o en el local.`;
    } else {
      return `Para confirmar tu reserva, necesitas pagar por adelantado. Tu historial actual es ${starRating}★ (${totalBookings} citas).`;
    }
  }
}

module.exports = PaymentValidationService; 