const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const PaymentValidationService = require('../src/services/paymentValidationService');

// Mock de Express app para testing
const express = require('express');
const app = express();
app.use(express.json());

// Importar controladores
const paymentController = require('../src/controllers/paymentController');
app.get('/api/payments/payment-options', paymentController.getPaymentOptions);

const prisma = new PrismaClient();

describe('🔧 Sistema de Validación de Pagos basado en Scoring', () => {
  let testBusiness;
  let testService;
  let testUser;
  let testBranch;

  // Setup antes de todos los tests
  beforeAll(async () => {
    // Crear negocio de prueba
    testBusiness = await prisma.business.create({
      data: {
        name: 'Test Business',
        email: 'test@business.com',
        slug: 'test-business',
        planType: 'PREMIUM'
      }
    });

    // Crear sucursal de prueba
    testBranch = await prisma.branch.create({
      data: {
        businessId: testBusiness.id,
        name: 'Sucursal Principal',
        slug: 'principal',
        isMain: true,
        isActive: true
      }
    });

    // Crear usuario/profesional de prueba
    testUser = await prisma.user.create({
      data: {
        businessId: testBusiness.id,
        branchId: testBranch.id,
        name: 'Dr. Test',
        email: 'doctor@test.com',
        password: 'test123',
        role: 'ADMIN',
        isActive: true
      }
    });

    // Crear servicio de prueba
    testService = await prisma.service.create({
      data: {
        businessId: testBusiness.id,
        name: 'Consulta Test',
        description: 'Servicio de prueba',
        duration: 60,
        price: 5000,
        isActive: true
      }
    });
  });

  // Cleanup después de todos los tests
  afterAll(async () => {
    await prisma.clientHistory.deleteMany({});
    await prisma.clientScore.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.service.deleteMany({ where: { businessId: testBusiness.id } });
    await prisma.user.deleteMany({ where: { businessId: testBusiness.id } });
    await prisma.branch.deleteMany({ where: { businessId: testBusiness.id } });
    await prisma.business.delete({ where: { id: testBusiness.id } });
    await prisma.$disconnect();
  });

  // Limpiar datos entre tests
  beforeEach(async () => {
    await prisma.appointment.deleteMany({});
    await prisma.clientHistory.deleteMany({});
    await prisma.clientScore.deleteMany({});
    await prisma.client.deleteMany({});
  });

  describe('📊 PaymentValidationService - Lógica de Scoring', () => {
    
    test('✅ Cliente sin historial - ambas opciones disponibles', async () => {
      const options = await PaymentValidationService.getPaymentOptions(
        'nuevo@cliente.com', 
        '1234567890'
      );

      expect(options.canPayLater).toBe(true);
      expect(options.canPayOnline).toBe(true);
      expect(options.requiresPayment).toBe(false);
      expect(options.scoring).toBeNull();
      expect(options.reason).toContain('Cliente sin historial');
    });

    test('⭐ Cliente confiable (>3.5★) - ambas opciones disponibles', async () => {
      // Crear cliente con buen scoring
      const clientScore = await prisma.clientScore.create({
        data: {
          email: 'confiable@cliente.com',
          phone: '9876543210',
          name: 'Cliente Confiable',
          totalPoints: 8,
          totalWeight: 2,
          starRating: 4, // 4 estrellas > 3.5
          totalBookings: 5,
          attendedCount: 5,
          noShowCount: 0
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'confiable@cliente.com', 
        '9876543210'
      );

      expect(options.canPayLater).toBe(true);
      expect(options.canPayOnline).toBe(true);
      expect(options.requiresPayment).toBe(false);
      expect(options.scoring.starRating).toBe(4);
      expect(options.reason).toContain('Cliente confiable (4★)');
    });

    test('❌ Cliente riesgoso (≤3.5★) - solo pago adelantado', async () => {
      // Crear cliente con mal scoring
      const clientScore = await prisma.clientScore.create({
        data: {
          email: 'riesgoso@cliente.com',
          phone: '5555555555',
          name: 'Cliente Riesgoso',
          totalPoints: -4,
          totalWeight: 3,
          starRating: 2, // 2 estrellas ≤ 3.5
          totalBookings: 4,
          attendedCount: 1,
          noShowCount: 3
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'riesgoso@cliente.com', 
        '5555555555'
      );

      expect(options.canPayLater).toBe(false);
      expect(options.canPayOnline).toBe(true);
      expect(options.requiresPayment).toBe(true);
      expect(options.scoring.starRating).toBe(2);
      expect(options.reason).toContain('Cliente con historial deficiente (2★)');
    });

    test('🔍 Búsqueda por email solamente', async () => {
      await prisma.clientScore.create({
        data: {
          email: 'solo-email@test.com',
          phone: null,
          name: 'Cliente Solo Email',
          starRating: 5,
          totalBookings: 3,
          attendedCount: 3,
          noShowCount: 0
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'solo-email@test.com', 
        null
      );

      expect(options.canPayLater).toBe(true);
      expect(options.scoring.starRating).toBe(5);
    });

    test('📱 Búsqueda por teléfono solamente', async () => {
      await prisma.clientScore.create({
        data: {
          email: null,
          phone: '1111111111',
          name: 'Cliente Solo Teléfono',
          starRating: 3,
          totalBookings: 2,
          attendedCount: 1,
          noShowCount: 1
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        null, 
        '1111111111'
      );

      expect(options.canPayLater).toBe(false); // 3 ≤ 3.5
      expect(options.requiresPayment).toBe(true);
      expect(options.scoring.starRating).toBe(3);
    });

    test('🚨 Error en evaluación - opción por defecto', async () => {
      // Mockear error en clientScoringService
      const originalMethod = PaymentValidationService.getPaymentOptions;
      
      // Simular un error interno
      jest.spyOn(PaymentValidationService, 'getPaymentOptions').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'error@test.com', 
        '9999999999'
      );

      expect(options.canPayLater).toBe(true); // Conservador en caso de error
      expect(options.canPayOnline).toBe(true);
      expect(options.requiresPayment).toBe(false);
      expect(options.reason).toContain('Error evaluando historial');

      // Restaurar método original
      PaymentValidationService.getPaymentOptions.mockRestore();
    });
  });

  describe('🌐 API Endpoint - /api/payments/payment-options', () => {
    
    test('✅ GET /api/payments/payment-options con email válido', async () => {
      const response = await request(app)
        .get('/api/payments/payment-options?email=test@endpoint.com&phone=2222222222')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentOptions).toHaveProperty('canPayLater');
      expect(response.body.data.paymentOptions).toHaveProperty('canPayOnline');
      expect(response.body.data.paymentOptions).toHaveProperty('requiresPayment');
      expect(response.body.data.message).toBeDefined();
    });

    test('❌ GET /api/payments/payment-options sin email ni teléfono', async () => {
      const response = await request(app)
        .get('/api/payments/payment-options')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Se requiere email o teléfono');
    });
  });

  describe('📝 Reservas Públicas - Validación de Pago', () => {
    
    test('✅ Reserva sin pago (cliente confiable)', async () => {
      // Crear cliente confiable
      await prisma.clientScore.create({
        data: {
          email: 'confiable-reserva@test.com',
          phone: '3333333333',
          name: 'Cliente Confiable Reserva',
          starRating: 5,
          totalBookings: 10,
          attendedCount: 10,
          noShowCount: 0
        }
      });

      const reservaData = {
        clientName: 'Cliente Confiable Reserva',
        clientEmail: 'confiable-reserva@test.com',
        clientPhone: '3333333333',
        serviceId: testService.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
        notes: 'Test de reserva sin pago',
        professionalId: testUser.id,
        paymentMethod: 'local'
      };

      // Mock del endpoint de reservas públicas
      const mockRequest = {
        params: { businessSlug: testBusiness.slug },
        body: reservaData
      };

      // Simular la lógica del endpoint
      const PaymentValidationService = require('../src/services/paymentValidationService');
      const paymentValidation = await PaymentValidationService.getPaymentOptions(
        reservaData.clientEmail, 
        reservaData.clientPhone
      );

      // Cliente confiable NO debe requerir pago obligatorio
      expect(paymentValidation.requiresPayment).toBe(false);
      expect(paymentValidation.canPayLater).toBe(true);
      
      // Con paymentMethod = 'local' debe permitir la reserva
      if (paymentValidation.requiresPayment && reservaData.paymentMethod !== 'online') {
        throw new Error('Este cliente debe pagar por adelantado');
      }

      // Si llegamos aquí, la validación pasó correctamente
      expect(true).toBe(true);
    });

    test('🚫 Reserva rechazada (cliente riesgoso sin pago)', async () => {
      // Crear cliente riesgoso
      await prisma.clientScore.create({
        data: {
          email: 'riesgoso-reserva@test.com',
          phone: '4444444444',
          name: 'Cliente Riesgoso Reserva',
          starRating: 1,
          totalBookings: 5,
          attendedCount: 1,
          noShowCount: 4
        }
      });

      const reservaData = {
        clientName: 'Cliente Riesgoso Reserva',
        clientEmail: 'riesgoso-reserva@test.com',
        clientPhone: '4444444444',
        serviceId: testService.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test de reserva rechazada',
        professionalId: testUser.id,
        paymentMethod: 'local' // ❌ Intenta pagar en local
      };

      const PaymentValidationService = require('../src/services/paymentValidationService');
      const paymentValidation = await PaymentValidationService.getPaymentOptions(
        reservaData.clientEmail, 
        reservaData.clientPhone
      );

      // Cliente riesgoso DEBE requerir pago obligatorio
      expect(paymentValidation.requiresPayment).toBe(true);
      expect(paymentValidation.canPayLater).toBe(false);

      // Con paymentMethod = 'local' debe rechazar la reserva
      let shouldReject = false;
      if (paymentValidation.requiresPayment && reservaData.paymentMethod !== 'online') {
        shouldReject = true;
      }

      expect(shouldReject).toBe(true);
    });

    test('💳 Reserva con pago online (cliente riesgoso)', async () => {
      // Crear cliente riesgoso
      await prisma.clientScore.create({
        data: {
          email: 'riesgoso-pago@test.com',
          phone: '6666666666',
          name: 'Cliente Riesgoso Pago',
          starRating: 2,
          totalBookings: 3,
          attendedCount: 1,
          noShowCount: 2
        }
      });

      const reservaData = {
        clientName: 'Cliente Riesgoso Pago',
        clientEmail: 'riesgoso-pago@test.com',
        clientPhone: '6666666666',
        serviceId: testService.id,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test de reserva con pago online',
        professionalId: testUser.id,
        paymentMethod: 'online' // ✅ Acepta pagar online
      };

      const PaymentValidationService = require('../src/services/paymentValidationService');
      const paymentValidation = await PaymentValidationService.getPaymentOptions(
        reservaData.clientEmail, 
        reservaData.clientPhone
      );

      // Cliente riesgoso requiere pago, pero acepta pagar online
      expect(paymentValidation.requiresPayment).toBe(true);
      expect(paymentValidation.canPayOnline).toBe(true);

      // Con paymentMethod = 'online' debe permitir la reserva
      let shouldAllow = false;
      if (reservaData.paymentMethod === 'online' && paymentValidation.canPayOnline) {
        shouldAllow = true;
      }

      expect(shouldAllow).toBe(true);
    });
  });

  describe('🔄 Casos Edge y Manejo de Errores', () => {
    
    test('📧 Email inválido - manejo graceful', async () => {
      const options = await PaymentValidationService.getPaymentOptions(
        '', // Email vacío
        '7777777777'
      );

      // Debe manejar el caso graciosamente
      expect(options).toBeDefined();
      expect(options.canPayLater).toBeDefined();
      expect(options.canPayOnline).toBeDefined();
    });

    test('📞 Teléfono inválido - manejo graceful', async () => {
      const options = await PaymentValidationService.getPaymentOptions(
        'valid@email.com',
        '' // Teléfono vacío
      );

      expect(options).toBeDefined();
      expect(options.canPayLater).toBeDefined();
      expect(options.canPayOnline).toBeDefined();
    });

    test('🔄 Scoring exacto en el límite (3.5)', async () => {
      await prisma.clientScore.create({
        data: {
          email: 'limite@test.com',
          phone: '8888888888',
          name: 'Cliente Límite',
          starRating: 3.5, // Exactamente en el límite
          totalBookings: 2,
          attendedCount: 1,
          noShowCount: 1
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'limite@test.com', 
        '8888888888'
      );

      // 3.5 NO es > 3.5, así que debe requerir pago
      expect(options.canPayLater).toBe(false);
      expect(options.requiresPayment).toBe(true);
    });

    test('💬 Formato de mensajes personalizados', async () => {
      // Cliente confiable
      await prisma.clientScore.create({
        data: {
          email: 'mensaje@test.com',
          phone: '9999999999',
          name: 'Cliente Mensaje',
          starRating: 5,
          totalBookings: 8,
          attendedCount: 8,
          noShowCount: 0
        }
      });

      const options = await PaymentValidationService.getPaymentOptions(
        'mensaje@test.com', 
        '9999999999'
      );

      const message = PaymentValidationService.formatPaymentOptionsMessage(options);
      
      expect(message).toContain('5★'); // Debe mostrar las estrellas
      expect(message).toContain('8 citas'); // Debe mostrar el número de citas
      expect(message).toContain('Excelente'); // Mensaje positivo
    });
  });

  describe('📈 Estadísticas y Métricas del Sistema', () => {
    
    test('📊 Distribución de scoring de clientes', async () => {
      // Crear varios clientes con diferentes scores
      const clientes = [
        { email: 'score1@test.com', starRating: 1 },
        { email: 'score2@test.com', starRating: 2 },
        { email: 'score3@test.com', starRating: 3 },
        { email: 'score4@test.com', starRating: 4 },
        { email: 'score5@test.com', starRating: 5 }
      ];

      for (const cliente of clientes) {
        await prisma.clientScore.create({
          data: {
            email: cliente.email,
            name: `Cliente ${cliente.starRating}★`,
            starRating: cliente.starRating,
            totalBookings: 1,
            attendedCount: cliente.starRating > 3 ? 1 : 0,
            noShowCount: cliente.starRating <= 3 ? 1 : 0
          }
        });
      }

      // Verificar que el sistema clasifica correctamente
      let clientesConfiables = 0;
      let clientesRiesgosos = 0;

      for (const cliente of clientes) {
        const options = await PaymentValidationService.getPaymentOptions(cliente.email, null);
        
        if (options.requiresPayment) {
          clientesRiesgosos++;
        } else {
          clientesConfiables++;
        }
      }

      // Clientes con score > 3.5 deben ser confiables (4★ y 5★ = 2 clientes)
      expect(clientesConfiables).toBe(2);
      // Clientes con score ≤ 3.5 deben requerir pago (1★, 2★, 3★ = 3 clientes)
      expect(clientesRiesgosos).toBe(3);
    });
  });
});

// Función helper para limpiar la consola durante los tests
console.log = jest.fn(); // Silenciar logs durante tests 