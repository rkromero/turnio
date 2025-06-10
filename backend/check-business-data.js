const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusinessData() {
  try {
    console.log('🔍 Checking barberia-rodo business data...');
    
    // Buscar el negocio
    const business = await prisma.business.findUnique({
      where: { slug: 'barberia-rodo' },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            isActive: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
            branchId: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true
          }
        }
      }
    });
    
    if (!business) {
      console.log('❌ Business barberia-rodo not found');
      return;
    }
    
    console.log('✅ Business found:', business.name);
    console.log('📋 Services:', business.services.length);
    business.services.forEach(service => {
      console.log(`  - ${service.name} (${service.duration}min, $${service.price}) - Active: ${service.isActive}`);
    });
    
    console.log('👥 Users:', business.users.length);
    business.users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - Active: ${user.isActive}, Branch: ${user.branchId}`);
    });
    
    console.log('🏢 Branches:', business.branches.length);
    business.branches.forEach(branch => {
      console.log(`  - ${branch.name} (${branch.slug}) - Active: ${branch.isActive}`);
    });
    
    // Si no hay servicios, crear uno de ejemplo
    if (business.services.length === 0) {
      console.log('🔧 No services found, creating example service...');
      
      const exampleService = await prisma.service.create({
        data: {
          businessId: business.id,
          name: 'Corte de Cabello',
          description: 'Corte de cabello básico',
          price: 15.00,
          duration: 30,
          isActive: true
        }
      });
      
      console.log('✅ Example service created:', exampleService);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar check
checkBusinessData(); 