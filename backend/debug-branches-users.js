const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugBranchesAndUsers() {
  try {
    console.log('🔍 DEBUG: Usuarios y Sucursales\n');

    // Obtener todos los negocios
    const businesses = await prisma.business.findMany({
      include: {
        branches: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            branchId: true
          }
        }
      }
    });

    for (const business of businesses) {
      console.log(`\n🏢 NEGOCIO: ${business.name} (${business.slug})`);
      console.log(`   ID: ${business.id}`);
      
      console.log('\n📍 SUCURSALES:');
      for (const branch of business.branches) {
        console.log(`   • ${branch.name} (${branch.isMain ? 'PRINCIPAL' : 'SECUNDARIA'})`);
        console.log(`     ID: ${branch.id}`);
        console.log(`     Slug: ${branch.slug}`);
        console.log(`     Activa: ${branch.isActive ? '✅' : '❌'}`);
        console.log(`     Empleados en esta sucursal: ${branch.users.length}`);
        
        if (branch.users.length > 0) {
          branch.users.forEach(user => {
            console.log(`       - ${user.name} (${user.role}) ${user.isActive ? '✅' : '❌'}`);
          });
        }
      }

      console.log('\n👥 TODOS LOS USUARIOS:');
      for (const user of business.users) {
        const branch = business.branches.find(b => b.id === user.branchId);
        console.log(`   • ${user.name} (${user.email})`);
        console.log(`     Rol: ${user.role}`);
        console.log(`     Activo: ${user.isActive ? '✅' : '❌'}`);
        console.log(`     Sucursal asignada: ${branch ? branch.name : 'SIN ASIGNAR'} (ID: ${user.branchId})`);
        console.log('');
      }
    }

    console.log('\n🎯 VERIFICACIONES:');
    
    // Verificar usuarios sin sucursal asignada
    const usersWithoutBranch = await prisma.user.findMany({
      where: {
        branchId: null,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (usersWithoutBranch.length > 0) {
      console.log('\n❌ USUARIOS SIN SUCURSAL ASIGNADA:');
      usersWithoutBranch.forEach(user => {
        console.log(`   • ${user.name} (${user.email}) - Rol: ${user.role}`);
      });
    } else {
      console.log('\n✅ Todos los usuarios tienen sucursal asignada');
    }

    // Verificar usuarios con roles incorrectos
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        branchId: true
      }
    });

    console.log('\n👑 USUARIOS ADMIN (no deberían aparecer como profesionales):');
    admins.forEach(admin => {
      console.log(`   • ${admin.name} (${admin.email}) - BranchID: ${admin.branchId}`);
    });

    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        isActive: true
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    console.log('\n👨‍💼 EMPLEADOS (estos SÍ deberían aparecer como profesionales):');
    employees.forEach(emp => {
      console.log(`   • ${emp.name} - Sucursal: ${emp.branch?.name || 'SIN ASIGNAR'} (ID: ${emp.branch?.id})`);
    });

    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBranchesAndUsers(); 