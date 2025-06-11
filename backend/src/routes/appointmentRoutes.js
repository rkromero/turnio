// Endpoint temporal de debug
router.get('/public/debug/users-branches', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

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

    const result = businesses.map(business => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      branches: business.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        isMain: branch.isMain,
        users: branch.users.map(user => ({
          id: user.id,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }))
      })),
      allUsers: business.users.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        branchId: user.branchId
      }))
    }));

    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug'
    });
  }
}); 