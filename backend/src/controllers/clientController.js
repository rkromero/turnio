const { prisma } = require('../config/database');
const { validationResult } = require('express-validator');

// Obtener todos los clientes del negocio
const getClients = async (req, res) => {
  try {
    const businessId = req.businessId;

    const clients = await prisma.client.findMany({
      where: { businessId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: clients
    });

  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener un cliente específico
const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;

    const client = await prisma.client.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: client
    });

  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo cliente
const createClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { name, email, phone, notes } = req.body;
    const businessId = req.businessId;

    // Verificar si ya existe un cliente con el mismo email o teléfono
    if (email || phone) {
      const existingClient = await prisma.client.findFirst({
        where: {
          businessId,
          OR: [
            email ? { email } : {},
            phone ? { phone } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con ese email o teléfono'
        });
      }
    }

    // Crear el cliente
    const client = await prisma.client.create({
      data: {
        businessId,
        name,
        email,
        phone,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: client
    });

  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar cliente
const updateClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, email, phone, notes } = req.body;
    const businessId = req.businessId;

    // Verificar que el cliente pertenezca al negocio
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si ya existe otro cliente con el mismo email o teléfono
    if (email || phone) {
      const duplicateClient = await prisma.client.findFirst({
        where: {
          businessId,
          id: { not: id }, // Excluir el cliente actual
          OR: [
            email ? { email } : {},
            phone ? { phone } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (duplicateClient) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro cliente con ese email o teléfono'
        });
      }
    }

    // Actualizar el cliente
    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        notes
      }
    });

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: client
    });

  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar cliente
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.businessId;
    const userRole = req.user.role;

    // Verificar que solo los administradores puedan eliminar clientes
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar clientes'
      });
    }

    // Verificar que el cliente pertenezca al negocio
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        businessId
      }
    });

    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Verificar si el cliente tiene citas pendientes
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        clientId: id,
        status: { in: ['CONFIRMED'] },
        startTime: {
          gt: new Date()
        }
      }
    });

    if (pendingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el cliente porque tiene citas pendientes'
      });
    }

    // Eliminar el cliente
    await prisma.client.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de clientes
const getClientStats = async (req, res) => {
  try {
    const businessId = req.businessId;

    const [
      totalClients,
      clientsWithEmail,
      clientsWithPhone,
      recentClients
    ] = await Promise.all([
      prisma.client.count({
        where: { businessId }
      }),
      prisma.client.count({
        where: {
          businessId,
          email: { not: null }
        }
      }),
      prisma.client.count({
        where: {
          businessId,
          phone: { not: null }
        }
      }),
      prisma.client.count({
        where: {
          businessId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        clientsWithEmail,
        clientsWithPhone,
        recentClients
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats
}; 