require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUsersBranches() {
  try {
    console.log('🔄 Iniciando corrección de usuarios sin sucursal...');

    // Buscar usuarios sin branchId
    const usersWithoutBranch = await prisma.user.findMany({
      where: {
        branchId: null
      },
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`👥 Encontrados ${usersWithoutBranch.length} usuarios sin sucursal asignada`);

    if (usersWithoutBranch.length === 0) {
      console.log('✅ Todos los usuarios ya tienen sucursal asignada');
      return;
    }

    // Agrupar por negocio
    const usersByBusiness = {};
    usersWithoutBranch.forEach(user => {
      if (!usersByBusiness[user.businessId]) {
        usersByBusiness[user.businessId] = {
          business: user.business,
          users: []
        };
      }
      usersByBusiness[user.businessId].users.push(user);
    });

    let totalFixed = 0;

    // Procesar cada negocio
    for (const businessId in usersByBusiness) {
      const businessData = usersByBusiness[businessId];
      console.log(`\n🏢 Procesando negocio: ${businessData.business.name}`);
      console.log(`   - Usuarios sin sucursal: ${businessData.users.length}`);

      // Buscar sucursal principal
      let mainBranch = await prisma.branch.findFirst({
        where: {
          businessId: businessId,
          isMain: true,
          isActive: true
        }
      });

      // Si no hay sucursal principal, buscar cualquier sucursal activa
      if (!mainBranch) {
        mainBranch = await prisma.branch.findFirst({
          where: {
            businessId: businessId,
            isActive: true
          }
        });
      }

      // Si no hay ninguna sucursal, crear una
      if (!mainBranch) {
        console.log('   🆕 Creando sucursal principal...');
        
        mainBranch = await prisma.branch.create({
          data: {
            businessId: businessId,
            name: `${businessData.business.name} - Sucursal Principal`,
            slug: 'principal',
            address: '',
            phone: '',
            description: 'Sucursal principal (creada automáticamente)',
            isMain: true,
            isActive: true
          }
        });
        
        console.log(`   ✅ Sucursal creada: ${mainBranch.name}`);
      } else {
        // Marcar como principal si no lo era
        if (!mainBranch.isMain) {
          await prisma.branch.update({
            where: { id: mainBranch.id },
            data: { isMain: true }
          });
          console.log(`   ✅ Sucursal marcada como principal: ${mainBranch.name}`);
        } else {
          console.log(`   🎯 Usando sucursal principal existente: ${mainBranch.name}`);
        }
      }

      // Asignar usuarios a la sucursal
      const updateResult = await prisma.user.updateMany({
        where: {
          businessId: businessId,
          branchId: null
        },
        data: {
          branchId: mainBranch.id
        }
      });

      console.log(`   ✅ ${updateResult.count} usuarios asignados a la sucursal`);
      totalFixed += updateResult.count;

      // Mostrar usuarios migrados
      businessData.users.forEach(user => {
        console.log(`     - ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    console.log(`\n🎉 ¡Migración completada!`);
    console.log(`📊 Total de usuarios corregidos: ${totalFixed}`);

    // Verificación final
    const remainingUsers = await prisma.user.count({
      where: { branchId: null }
    });

    if (remainingUsers === 0) {
      console.log('✅ Todos los usuarios ahora tienen sucursal asignada');
    } else {
      console.log(`⚠️ Quedan ${remainingUsers} usuarios sin sucursal`);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la migración
if (require.main === module) {
  fixUsersBranches()
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = fixUsersBranches; 