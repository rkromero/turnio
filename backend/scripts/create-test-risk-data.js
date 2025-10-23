#!/usr/bin/env node

/**
 * Script para crear datos de prueba del sistema de predicción de riesgo
 * Genera turnos con diferentes niveles de riesgo para probar la funcionalidad
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestRiskData() {
  try {
    console.log('🎯 Creando datos de prueba para predicción de riesgo...');

    // 1. Buscar un negocio existente
    const business = await prisma.business.findFirst({
      include: {
        branches: true,
        services: true
      }
    });

    if (!business) {
      console.error('❌ No se encontró ningún negocio. Crea un negocio primero.');
      return;
    }

    console.log(`✅ Usando negocio: ${business.name}`);

    const branch = business.branches[0];
    const service = business.services[0];

    if (!branch || !service) {
      console.error('❌ El negocio no tiene sucursales o servicios. Crea estos datos primero.');
      return;
    }

    // 2. Crear clientes de prueba con diferentes perfiles de riesgo
    const testClients = [
      {
        name: 'Cliente Problemático',
        email: 'problematico@test.com',
        phone: '+5491111111111',
        profile: 'HIGH_RISK'
      },
      {
        name: 'Cliente Confiable',
        email: 'confiable@test.com',
        phone: '+5492222222222',
        profile: 'LOW_RISK'
      },
      {
        name: 'Cliente Nuevo',
        email: 'nuevo@test.com',
        phone: '+5493333333333',
        profile: 'NEW_CLIENT'
      },
      {
        name: 'Cliente Inactivo',
        email: 'inactivo@test.com',
        phone: '+5494444444444',
        profile: 'INACTIVE'
      }
    ];

    // Crear o actualizar clientes
    for (const clientData of testClients) {
      const client = await prisma.client.upsert({
        where: { email: clientData.email },
        update: clientData,
        create: {
          ...clientData,
          businessId: business.id,
          branchId: branch.id
        }
      });

      console.log(`✅ Cliente creado/actualizado: ${client.name}`);
    }

    // 3. Crear scoring de clientes para simular historial
    await createClientScoring(business.id);

    // 4. Crear estadísticas de franjas horarias
    await createTimeSlotStats(business.id, branch.id);

    // 5. Crear turnos de prueba con diferentes niveles de riesgo
    await createTestAppointments(business.id, branch.id, service.id);

    console.log('🎉 Datos de prueba creados exitosamente!');
    console.log('📊 Ahora puedes probar el sistema de predicción de riesgo en el dashboard.');

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createClientScoring(businessId) {
  console.log('📊 Creando scoring de clientes...');

  // Cliente problemático
  await prisma.clientScore.upsert({
    where: { 
      email_businessId: {
        email: 'problematico@test.com',
        businessId: businessId
      }
    },
    update: {},
    create: {
      email: 'problematico@test.com',
      phone: '+5491111111111',
      businessId: businessId,
      totalBookings: 10,
      attendedCount: 4,
      cancelledCount: 4,
      noShowCount: 2,
      cancellationRate: 0.4, // 40% de cancelaciones
      noShowRate: 0.2, // 20% de no-shows
      starRating: 2.5, // Calificación baja
      lastCancellationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Hace 7 días
      lastAppointmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Hace 30 días
    }
  });

  // Cliente confiable
  await prisma.clientScore.upsert({
    where: { 
      email_businessId: {
        email: 'confiable@test.com',
        businessId: businessId
      }
    },
    update: {},
    create: {
      email: 'confiable@test.com',
      phone: '+5492222222222',
      businessId: businessId,
      totalBookings: 15,
      attendedCount: 14,
      cancelledCount: 1,
      noShowCount: 0,
      cancellationRate: 0.067, // 6.7% de cancelaciones
      noShowRate: 0, // 0% de no-shows
      starRating: 4.8, // Calificación alta
      lastCancellationDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Hace 6 meses
      lastAppointmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Hace 7 días
    }
  });

  // Cliente inactivo
  await prisma.clientScore.upsert({
    where: { 
      email_businessId: {
        email: 'inactivo@test.com',
        businessId: businessId
      }
    },
    update: {},
    create: {
      email: 'inactivo@test.com',
      phone: '+5494444444444',
      businessId: businessId,
      totalBookings: 5,
      attendedCount: 3,
      cancelledCount: 1,
      noShowCount: 1,
      cancellationRate: 0.2,
      noShowRate: 0.2,
      starRating: 3.0,
      lastCancellationDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // Hace 200 días
      lastAppointmentDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) // Hace 200 días
    }
  });

  console.log('✅ Scoring de clientes creado');
}

async function createTimeSlotStats(businessId, branchId) {
  console.log('⏰ Creando estadísticas de franjas horarias...');

  // Lunes temprano - alto riesgo
  await prisma.timeSlotStats.upsert({
    where: {
      businessId_branchId_dayOfWeek_hour: {
        businessId: businessId,
        branchId: branchId,
        dayOfWeek: 1, // Lunes
        hour: 9
      }
    },
    update: {},
    create: {
      businessId: businessId,
      branchId: branchId,
      dayOfWeek: 1,
      hour: 9,
      totalAppointments: 20,
      cancelledCount: 8,
      noShowCount: 3,
      cancellationRate: 0.4, // 40% de cancelaciones
      noShowRate: 0.15 // 15% de no-shows
    }
  });

  // Viernes tarde - alto riesgo
  await prisma.timeSlotStats.upsert({
    where: {
      businessId_branchId_dayOfWeek_hour: {
        businessId: businessId,
        branchId: branchId,
        dayOfWeek: 5, // Viernes
        hour: 18
      }
    },
    update: {},
    create: {
      businessId: businessId,
      branchId: branchId,
      dayOfWeek: 5,
      hour: 18,
      totalAppointments: 15,
      cancelledCount: 6,
      noShowCount: 2,
      cancellationRate: 0.4,
      noShowRate: 0.13
    }
  });

  // Horario normal - bajo riesgo
  await prisma.timeSlotStats.upsert({
    where: {
      businessId_branchId_dayOfWeek_hour: {
        businessId: businessId,
        branchId: branchId,
        dayOfWeek: 3, // Miércoles
        hour: 14
      }
    },
    update: {},
    create: {
      businessId: businessId,
      branchId: branchId,
      dayOfWeek: 3,
      hour: 14,
      totalAppointments: 25,
      cancelledCount: 2,
      noShowCount: 1,
      cancellationRate: 0.08, // 8% de cancelaciones
      noShowRate: 0.04 // 4% de no-shows
    }
  });

  console.log('✅ Estadísticas de franjas horarias creadas');
}

async function createTestAppointments(businessId, branchId, serviceId) {
  console.log('📅 Creando turnos de prueba...');

  const now = new Date();
  
  // Turnos de alto riesgo
  const highRiskAppointments = [
    {
      // Cliente problemático + Lunes temprano + Reserva anticipada
      clientEmail: 'problematico@test.com',
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // En 2 días (lunes)
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // 9 AM lunes
      anticipationHours: 48, // 2 días de anticipación
      reminderSent: true,
      reminderOpenedAt: null, // No abrió el recordatorio
      reminderConfirmed: false
    },
    {
      // Cliente inactivo + Viernes tarde + Reserva muy anticipada
      clientEmail: 'inactivo@test.com',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // Viernes 6 PM
      anticipationHours: 720, // 30 días de anticipación
      reminderSent: true,
      reminderOpenedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Abrió hace 2 horas
      reminderConfirmed: false
    }
  ];

  // Turnos de riesgo medio
  const mediumRiskAppointments = [
    {
      // Cliente nuevo + Horario problemático
      clientEmail: 'nuevo@test.com',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // Martes 8 AM
      anticipationHours: 72, // 3 días
      reminderSent: false,
      reminderOpenedAt: null,
      reminderConfirmed: false
    }
  ];

  // Turno de bajo riesgo
  const lowRiskAppointment = {
    // Cliente confiable + Horario normal + Confirmado
    clientEmail: 'confiable@test.com',
    startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Mañana 2 PM
    anticipationHours: 24, // 1 día
    reminderSent: true,
    reminderOpenedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Abrió hace 1 hora
    reminderConfirmed: true
  };

  // Crear todos los turnos
  const allAppointments = [...highRiskAppointments, ...mediumRiskAppointments, lowRiskAppointment];

  for (const appointmentData of allAppointments) {
    const client = await prisma.client.findUnique({
      where: { email: appointmentData.clientEmail }
    });

    if (client) {
      const appointment = await prisma.appointment.create({
        data: {
          businessId: businessId,
          branchId: branchId,
          serviceId: serviceId,
          clientId: client.id,
          startTime: appointmentData.startTime,
          endTime: new Date(appointmentData.startTime.getTime() + 60 * 60 * 1000), // 1 hora
          status: 'CONFIRMED',
          anticipationHours: appointmentData.anticipationHours,
          reminderSent: appointmentData.reminderSent,
          reminderOpenedAt: appointmentData.reminderOpenedAt,
          reminderConfirmed: appointmentData.reminderConfirmed
        }
      });

      console.log(`✅ Turno creado: ${client.name} - ${appointmentData.startTime.toLocaleString()}`);
    }
  }

  console.log('✅ Turnos de prueba creados');
}

// Ejecutar el script
if (require.main === module) {
  createTestRiskData()
    .then(() => {
      console.log('🎉 Script completado exitosamente!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

module.exports = { createTestRiskData };
