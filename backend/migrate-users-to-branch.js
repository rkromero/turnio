const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateUsersToMainBranch() {
  try {
    console.log('🔄 Iniciando migración de usuarios a sucursales...');

    // Obtener todos los negocios
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });

    console.log(`📊 Encontrados ${businesses.length} negocios`);

    for (const business of businesses) {
      console.log(`\n🏢 Procesando negocio: ${business.name} (${business.id})`);

      // Buscar usuarios sin branchId
      const usersWithoutBranch = await prisma.user.findMany({
        where: {
          businessId: business.id,
          branchId: null
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (usersWithoutBranch.length === 0) {
        console.log('✅ Todos los usuarios ya tienen sucursal asignada');
        continue;
      }

      console.log(`👥 Encontrados ${usersWithoutBranch.length} usuarios sin sucursal:`);
      usersWithoutBranch.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });

      // Obtener o crear sucursal principal
      let mainBranch = await prisma.branch.findFirst({
        where: {
          businessId: business.id,
          isMain: true,
          isActive: true
        }
      });

      if (!mainBranch) {
        console.log('🔄 No existe sucursal principal, creando...');
        
        // Buscar cualquier sucursal activa
        let anyBranch = await prisma.branch.findFirst({
          where: {
            businessId: business.id,
            isActive: true
          }
        });

        if (!anyBranch) {
          console.log('🆕 Creando nueva sucursal principal...');
          
          // Obtener datos del negocio para crear la sucursal
          const businessData = await prisma.business.findUnique({
            where: { id: business.id },
            select: { name: true, address: true, phone: true }
          });

          anyBranch = await prisma.branch.create({
            data: {
              businessId: business.id,
              name: `${businessData.name} - Sucursal Principal`,
              slug: 'principal',
              address: businessData.address || '',
              phone: businessData.phone || '',
              description: 'Sucursal principal (creada automáticamente durante migración)',
              isMain: true,
              isActive: true
            }
          });
          
          console.log(`✅ Sucursal principal creada: ${anyBranch.name}`);
        }

        // Marcar como principal si no lo era
        if (!anyBranch.isMain) {
          await prisma.branch.update({
            where: { id: anyBranch.id },
            data: { isMain: true }
          });
          console.log(`✅ Sucursal marcada como principal: ${anyBranch.name}`);
        }

        mainBranch = anyBranch;
      }

      console.log(`🎯 Sucursal principal: ${mainBranch.name} (${mainBranch.id})`);

      // Migrar usuarios a la sucursal principal
      const updateResult = await prisma.user.updateMany({
        where: {
          businessId: business.id,
          branchId: null
        },
        data: {
          branchId: mainBranch.id
        }
      });

      console.log(`✅ ${updateResult.count} usuarios migrados a la sucursal principal`);

      // Verificar la migración
      const remainingUsers = await prisma.user.count({
        where: {
          businessId: business.id,
          branchId: null
        }
      });

      if (remainingUsers === 0) {
        console.log('🎉 Migración completa para este negocio');
      } else {
        console.log(`⚠️ Quedan ${remainingUsers} usuarios sin migrar`);
      }
    }

    console.log('\n🎉 ¡Migración de usuarios completada exitosamente!');

    // Resumen final
    const totalUsersWithoutBranch = await prisma.user.count({
      where: { branchId: null }
    });

    if (totalUsersWithoutBranch === 0) {
      console.log('✅ Todos los usuarios tienen sucursal asignada');
    } else {
      console.log(`⚠️ Quedan ${totalUsersWithoutBranch} usuarios globalmente sin sucursal`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la migración
migrateUsersToMainBranch()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  }); 