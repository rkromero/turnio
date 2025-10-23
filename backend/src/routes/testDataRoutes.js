/**
 * Rutas para crear datos de prueba
 * Solo para desarrollo/testing
 */

const express = require('express');
const router = express.Router();
const { createTestRiskData } = require('../../scripts/create-test-risk-data');

/**
 * @route   POST /api/test-data/create-risk-data
 * @desc    Crear datos de prueba para predicción de riesgo
 * @access  Public (solo para testing)
 */
router.post('/create-risk-data', async (req, res) => {
  try {
    console.log('🎯 Iniciando creación de datos de prueba...');
    
    // Ejecutar el script
    await createTestRiskData();
    
    res.json({
      success: true,
      message: 'Datos de prueba creados exitosamente',
      data: {
        clients: '4 clientes de prueba creados',
        appointments: '4 turnos de prueba creados',
        scoring: 'Scoring de clientes configurado',
        timeSlots: 'Estadísticas de franjas horarias creadas'
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando datos de prueba',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/test-data/status
 * @desc    Verificar estado de los datos de prueba
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Contar datos existentes
    const clientCount = await prisma.client.count();
    const appointmentCount = await prisma.appointment.count();
    const scoringCount = await prisma.clientScore.count();
    const timeSlotStatsCount = await prisma.timeSlotStats.count();
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: {
        clients: clientCount,
        appointments: appointmentCount,
        clientScoring: scoringCount,
        timeSlotStats: timeSlotStatsCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado',
      error: error.message
    });
  }
});

module.exports = router;
