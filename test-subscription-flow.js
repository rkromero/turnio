const { prisma } = require('./backend/src/config/database');
const { MercadoPagoConfig, Payment, Subscription } = require('mercadopago');
require('dotenv').config();

const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN 
});

async function testSubscriptionFlow() {
  try {
    console.log('🧪 === PRUEBA COMPLETA DEL SISTEMA DE SUSCRIPCIONES ===\n');

    // 1. Crear una suscripción de prueba
    console.log('1️⃣ Creando suscripción de prueba...');
    const subscription = await prisma.subscription.create({
      data: {
        business: {
          create: {
            name: 'Negocio de Prueba',
            email: 'test@example.com',
            phone: '1234567890',
            planType: 'PREMIUM',
            maxAppointments: 500
          }
        },
        planType: 'PREMIUM',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        priceAmount: 9900,
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() - 1000), // Fecha vencida (1 segundo atrás)
        mercadoPagoSubscriptionId: 'test_sub_' + Date.now()
      }
    });

    console.log('✅ Suscripción creada:', {
      id: subscription.id,
      planType: subscription.planType,
      status: subscription.status,
      nextBillingDate: subscription.nextBillingDate
    });

    // 2. Simular proceso de verificación de vencimiento
    console.log('\n2️⃣ Probando verificación de vencimiento...');
    const { checkExpiredSubscriptions } = require('./backend/src/controllers/subscriptionAutoController');
    await checkExpiredSubscriptions();

    // 3. Verificar estado después de la verificación
    console.log('\n3️⃣ Verificando estado actualizado...');
    const updatedSubscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        business: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    console.log('📊 Estado de la suscripción:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      nextBillingDate: updatedSubscription.nextBillingDate
    });

    if (updatedSubscription.payments.length > 0) {
      console.log('💳 Último pago:', {
        id: updatedSubscription.payments[0].id,
        status: updatedSubscription.payments[0].status,
        amount: updatedSubscription.payments[0].amount
      });
    }

    // 4. Simular intento de acceso con suscripción vencida
    console.log('\n4️⃣ Simulando intento de acceso...');
    const { authenticateToken } = require('./backend/src/middleware/auth');
    
    // Crear un mock de req, res, next
    const mockReq = {
      user: {
        id: 'test_user',
        businessId: updatedSubscription.business.id,
        business: {
          subscription: updatedSubscription
        }
      }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log('🔒 Respuesta del middleware:', {
            statusCode: code,
            ...data
          });
          return mockRes;
        }
      })
    };

    const mockNext = () => {
      console.log('✅ Acceso permitido - Middleware pasado correctamente');
    };

    await authenticateToken(mockReq, mockRes, mockNext);

    // 5. Limpiar datos de prueba
    console.log('\n5️⃣ Limpiando datos de prueba...');
    await prisma.subscription.delete({
      where: { id: subscription.id }
    });

    console.log('✅ Pruebas completadas exitosamente');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testSubscriptionFlow(); 