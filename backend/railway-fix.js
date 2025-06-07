const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./src/utils/auth');

const prisma = new PrismaClient();

async function fixRailwayDatabase() {
  try {
    console.log('🔧 Iniciando diagnóstico y corrección de Railway...');
    
    // 1. Verificar conexión a la base de datos
    console.log('📊 Verificando conexión a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');

    // 2. Verificar si existe el negocio 'cdfa'
    console.log('🔍 Buscando negocio con slug "cdfa"...');
    const business = await prisma.business.findUnique({
      where: { slug: 'cdfa' },
      include: {
        services: {
          where: { isActive: true }
        },
        _count: {
          select: {
            services: true,
            clients: true,
            appointments: true
          }
        }
      }
    });

    if (!business) {
      console.log('❌ Negocio "cdfa" no encontrado. Creando...');
      
      // Crear el negocio
      const hashedPassword = await hashPassword('admin123');
      
      const result = await prisma.$transaction(async (tx) => {
        // Crear el negocio
        const newBusiness = await tx.business.create({
          data: {
            name: 'CDFA',
            email: 'admin@cdfa.com',
            slug: 'cdfa',
            phone: '+54 9 11 1234-5678',
            address: 'Buenos Aires, Argentina',
            description: 'Centro de Formación y Desarrollo Académico',
            planType: 'PREMIUM',
            maxAppointments: 500
          }
        });

        // Crear usuario administrador
        const adminUser = await tx.user.create({
          data: {
            businessId: newBusiness.id,
            name: 'Administrador CDFA',
            email: 'admin@cdfa.com',
            password: hashedPassword,
            role: 'ADMIN'
          }
        });

        // Crear servicios de ejemplo
        const services = await tx.service.createMany({
          data: [
            {
              businessId: newBusiness.id,
              name: 'Consultoría Académica',
              description: 'Asesoramiento académico personalizado',
              duration: 60,
              price: 5000,
              isActive: true,
              color: '#3B82F6'
            },
            {
              businessId: newBusiness.id,
              name: 'Tutoría Individual',
              description: 'Sesión de tutoría uno a uno',
              duration: 90,
              price: 7500,
              isActive: true,
              color: '#10B981'
            },
            {
              businessId: newBusiness.id,
              name: 'Taller Grupal',
              description: 'Sesión de trabajo grupal',
              duration: 120,
              price: 4000,
              isActive: true,
              color: '#F59E0B'
            }
          ]
        });

        return { business: newBusiness, user: adminUser, services };
      });

      console.log('✅ Negocio creado exitosamente:');
      console.log(`- ID: ${result.business.id}`);
      console.log(`- Nombre: ${result.business.name}`);
      console.log(`- Slug: ${result.business.slug}`);
      console.log(`- Email: ${result.user.email}`);
      console.log(`- Contraseña: admin123`);
      console.log(`- Servicios creados: ${result.services.count}`);
      
    } else {
      console.log('✅ Negocio "cdfa" encontrado:');
      console.log(`- ID: ${business.id}`);
      console.log(`- Nombre: ${business.name}`);
      console.log(`- Email: ${business.email}`);
      console.log(`- Servicios activos: ${business._count.services}`);
      console.log(`- Clientes: ${business._count.clients}`);
      console.log(`- Citas: ${business._count.appointments}`);

      // 3. Verificar servicios activos
      if (business._count.services === 0) {
        console.log('⚠️ No hay servicios activos. Creando servicios...');
        
        await prisma.service.createMany({
          data: [
            {
              businessId: business.id,
              name: 'Consultoría Académica',
              description: 'Asesoramiento académico personalizado',
              duration: 60,
              price: 5000,
              isActive: true,
              color: '#3B82F6'
            },
            {
              businessId: business.id,
              name: 'Tutoría Individual',
              description: 'Sesión de tutoría uno a uno',
              duration: 90,
              price: 7500,
              isActive: true,
              color: '#10B981'
            },
            {
              businessId: business.id,
              name: 'Taller Grupal',
              description: 'Sesión de trabajo grupal',
              duration: 120,
              price: 4000,
              isActive: true,
              color: '#F59E0B'
            }
          ]
        });
        
        console.log('✅ Servicios creados exitosamente');
      }
    }

    // 4. Verificar la ruta pública
    console.log('🌐 Verificando ruta pública...');
    const publicServices = await prisma.service.findMany({
      where: {
        business: {
          slug: 'cdfa'
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        color: true
      }
    });

    console.log(`✅ Servicios públicos disponibles: ${publicServices.length}`);
    publicServices.forEach(service => {
      console.log(`  - ${service.name} (${service.duration}min - $${service.price})`);
    });

    console.log('🎉 Diagnóstico completado exitosamente!');
    console.log('🔗 La URL pública debería funcionar ahora:');
    console.log('   https://turnio-backend-production.up.railway.app/api/services/public/cdfa');

  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  fixRailwayDatabase()
    .then(() => {
      console.log('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { fixRailwayDatabase }; 