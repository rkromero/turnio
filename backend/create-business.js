const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./src/utils/auth');

const prisma = new PrismaClient();

async function createBusiness() {
  try {
    // Verificar si ya existe
    const existingBusiness = await prisma.business.findUnique({
      where: { slug: 'cdfa' }
    });

    if (existingBusiness) {
      console.log('✅ El negocio con slug "cdfa" ya existe:');
      console.log('- ID:', existingBusiness.id);
      console.log('- Nombre:', existingBusiness.name);
      console.log('- Email:', existingBusiness.email);
      return;
    }

    // Crear el negocio
    const hashedPassword = await hashPassword('admin123');
    
    const result = await prisma.$transaction(async (tx) => {
      // Crear el negocio
      const business = await tx.business.create({
        data: {
          name: 'CDFA',
          email: 'admin@cdfa.com',
          slug: 'cdfa',
          phone: '+54 9 11 1234-5678',
          address: 'Dirección ejemplo',
          description: 'Negocio creado automáticamente',
          planType: 'FREE',
          maxAppointments: 30
        }
      });

      // Crear el usuario administrador
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          name: 'Administrador CDFA',
          email: 'admin@cdfa.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      // Crear algunos servicios de ejemplo
      const services = await tx.service.createMany({
        data: [
          {
            businessId: business.id,
            name: 'Corte de Cabello',
            description: 'Corte y peinado profesional',
            duration: 45,
            price: 3000,
            isActive: true,
            color: '#3B82F6'
          },
          {
            businessId: business.id,
            name: 'Tinte',
            description: 'Coloración completa',
            duration: 120,
            price: 8000,
            isActive: true,
            color: '#EF4444'
          },
          {
            businessId: business.id,
            name: 'Manicura',
            description: 'Cuidado completo de uñas',
            duration: 60,
            price: 2500,
            isActive: true,
            color: '#10B981'
          }
        ]
      });

      return { business, user, services };
    });

    console.log('✅ Negocio creado exitosamente:');
    console.log('- ID:', result.business.id);
    console.log('- Nombre:', result.business.name);
    console.log('- Slug:', result.business.slug);
    console.log('- Email admin:', result.user.email);
    console.log('- Contraseña admin: admin123');
    console.log('- Servicios creados:', result.services.count);

  } catch (error) {
    console.error('❌ Error creando negocio:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBusiness(); 