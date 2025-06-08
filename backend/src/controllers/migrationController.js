const { prisma } = require('../config/database');

// Migrar usuarios sin branchId a sucursal principal
const migrateUsersToMainBranch = async (req, res) => {
  try {
    console.log('🔄 Iniciando migración de usuarios a sucursales...');
    
    const results = [];

    // Obtener todos los negocios
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    });

    console.log(`📊 Encontrados ${businesses.length} negocios`);

    for (const business of businesses) {
      const businessResult = {
        businessId: business.id,
        businessName: business.name,
        usersMigrated: 0,
        branchCreated: false,
        branchName: null
      };

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
        businessResult.usersMigrated = 0;
        results.push(businessResult);
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
          businessResult.branchCreated = true;
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
      businessResult.branchName = mainBranch.name;

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
      businessResult.usersMigrated = updateResult.count;

      results.push(businessResult);
    }

    console.log('\n🎉 ¡Migración de usuarios completada exitosamente!');

    // Resumen final
    const totalUsersWithoutBranch = await prisma.user.count({
      where: { branchId: null }
    });

    const totalMigrated = results.reduce((sum, result) => sum + result.usersMigrated, 0);

    res.status(200).json({
      success: true,
      message: 'Migración de usuarios completada exitosamente',
      data: {
        totalBusinesses: businesses.length,
        totalUsersMigrated: totalMigrated,
        remainingUsersWithoutBranch: totalUsersWithoutBranch,
        businessResults: results
      }
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante la migración de usuarios',
      error: error.message
    });
  }
};

// Obtener estadísticas de usuarios por sucursal
const getUserBranchStats = async (req, res) => {
  try {
    const businessId = req.businessId;

    // Usuarios sin sucursal
    const usersWithoutBranch = await prisma.user.count({
      where: {
        businessId,
        branchId: null
      }
    });

    // Usuarios por sucursal
    const usersByBranch = await prisma.branch.findMany({
      where: {
        businessId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        isMain: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    // Total de usuarios
    const totalUsers = await prisma.user.count({
      where: { businessId }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        usersWithoutBranch,
        usersByBranch,
        needsMigration: usersWithoutBranch > 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de usuarios por sucursal'
    });
  }
};

module.exports = {
  migrateUsersToMainBranch,
  getUserBranchStats
}; 