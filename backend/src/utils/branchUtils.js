const { prisma } = require('../config/database');

/**
 * Obtiene todas las sucursales activas de un negocio
 * Si no hay sucursales, crea una automáticamente
 */
async function getActiveBranchIds(businessId) {
  try {
    // Obtener sucursales activas
    const activeBranches = await prisma.branch.findMany({
      where: {
        businessId,
        isActive: true
      },
      select: { id: true }
    });

    let branchIds = activeBranches.map(branch => branch.id);

    // Si no hay sucursales, crear una automáticamente
    if (branchIds.length === 0) {
      console.log('🔄 Creando sucursal principal automáticamente para businessId:', businessId);
      
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { 
          id: true,
          name: true, 
          address: true, 
          phone: true 
        }
      });

      if (business) {
        const newBranch = await prisma.branch.create({
          data: {
            businessId,
            name: business.name + ' - Principal',
            slug: 'principal',
            address: business.address,
            phone: business.phone,
            description: 'Sucursal principal (creada automáticamente)',
            isMain: true,
            isActive: true
          }
        });
        branchIds = [newBranch.id];
        console.log('✅ Sucursal principal creada:', newBranch.id);
      }
    }

    return branchIds;
  } catch (error) {
    console.error('Error obteniendo sucursales activas:', error);
    throw error;
  }
}

/**
 * Obtiene la sucursal principal de un negocio
 * Si no existe, crea una automáticamente
 */
async function getMainBranch(businessId) {
  try {
    let mainBranch = await prisma.branch.findFirst({
      where: {
        businessId,
        isMain: true,
        isActive: true
      }
    });

    // Si no hay sucursal principal, crearla
    if (!mainBranch) {
      const branchIds = await getActiveBranchIds(businessId);
      
      // Obtener la primera sucursal y marcarla como principal
      if (branchIds.length > 0) {
        mainBranch = await prisma.branch.update({
          where: { id: branchIds[0] },
          data: { isMain: true }
        });
      }
    }

    return mainBranch;
  } catch (error) {
    console.error('Error obteniendo sucursal principal:', error);
    throw error;
  }
}

/**
 * Añade condiciones de sucursal a un objeto where de Prisma
 */
function addBranchConditions(where, businessId, branchIds) {
  return {
    ...where,
    businessId,
    branchId: { in: branchIds }
  };
}

/**
 * Middleware para asegurar que todas las queries incluyan sucursales válidas
 */
async function ensureBranchAccess(req, res, next) {
  try {
    const businessId = req.businessId;
    
    if (!businessId) {
      return res.status(401).json({
        success: false,
        message: 'Business ID requerido'
      });
    }

    // Obtener sucursales activas
    const branchIds = await getActiveBranchIds(businessId);
    
    // Agregar al request para uso en controladores
    req.branchIds = branchIds;
    req.hasMultipleBranches = branchIds.length > 1;
    
    next();
  } catch (error) {
    console.error('Error en middleware de sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

module.exports = {
  getActiveBranchIds,
  getMainBranch,
  addBranchConditions,
  ensureBranchAccess
}; 