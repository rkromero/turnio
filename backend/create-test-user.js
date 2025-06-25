const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creando usuario de prueba con suscripción activa...');

    // Eliminar usuario existente si existe
    await prisma.user.deleteMany({
      where: { email: 'prueba@turnio.com' }
    });

    await prisma.business.deleteMany({
      where: { email: 'prueba@turnio.com' }
    });

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash('123456', 12);

    // Crear negocio de prueba
    const business = await prisma.business.create({
      data: {
        business_name: 'Negocio de Prueba TurnIO',
        email: 'prueba@turnio.com',
        phone: '+1234567890',
        address: 'Calle de Prueba 123',
        business_type: 'salon',
        subscription_status: 'ACTIVE',
        plan_type: 'PREMIUM',
        subscription_start: new Date(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        subscription_auto_renew: true,
        mp_connected: false
      }
    });

    console.log('✅ Negocio creado:', business.business_name);

    // Crear usuario administrador
    const user = await prisma.user.create({
      data: {
        name: 'Usuario Prueba',
        email: 'prueba@turnio.com',
        password: hashedPassword,
        role: 'admin',
        business_id: business.id,
        is_active: true
      }
    });

    console.log('✅ Usuario creado:', user.email);

    // Crear suscripción activa
    const subscription = await prisma.subscription.create({
      data: {
        business_id: business.id,
        plan_type: 'PREMIUM',
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        auto_renew: true,
        payment_method: 'credit_card',
        amount: 29.99,
        currency: 'USD',
        mp_subscription_id: 'test_subscription_' + Date.now()
      }
    });

    console.log('✅ Suscripción creada:', subscription.plan_type);

    // Crear algunos servicios de ejemplo
    const services = await prisma.service.createMany({
      data: [
        {
          business_id: business.id,
          name: 'Corte de Cabello',
          description: 'Corte moderno y profesional',
          duration: 30,
          price: 25.00,
          is_active: true
        },
        {
          business_id: business.id,
          name: 'Tinte',
          description: 'Coloración completa',
          duration: 90,
          price: 65.00,
          is_active: true
        }
      ]
    });

    console.log('✅ Servicios creados');

    console.log('\n🎉 USUARIO DE PRUEBA CREADO EXITOSAMENTE');
    console.log('📧 Email: prueba@turnio.com');
    console.log('🔑 Password: 123456');
    console.log('💼 Plan: PREMIUM (Activo por 1 año)');
    console.log('🌐 Frontend: https://turnio-frontend-production.up.railway.app');
    
  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 