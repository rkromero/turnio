const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creando usuario de prueba...');
    
    // Crear negocio de prueba
    const business = await prisma.business.upsert({
      where: { slug: 'test-payments' },
      update: {},
      create: {
        name: 'Negocio Prueba Pagos',
        slug: 'test-payments',
        phone: '1234567890',
        address: 'Dirección de prueba',
        businessType: 'SALON'
      }
    });
    
    console.log('✅ Negocio creado:', business.name);
    
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        password: hashedPassword
      },
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Usuario Prueba',
        businessId: business.id,
        role: 'OWNER'
      }
    });
    
    console.log('✅ Usuario creado:', user.email);
    console.log('📋 Credenciales:');
    console.log('   Email: test@example.com');
    console.log('   Password: 123456');
    console.log('   Role:', user.role);
    
    return { user, business };
    
  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 