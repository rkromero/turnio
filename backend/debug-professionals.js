// Script para diagnosticar profesionales y horarios
const axios = require('axios');

async function debugProfessionals() {
  console.log('🔍 DIAGNÓSTICO DE PROFESIONALES Y HORARIOS\n');
  
  try {
    // Hacer petición interna usando la base URL del backend
    const { prisma } = require('./src/config/database');
    
    console.log('1️⃣ Buscando negocio CDFA...');
    const business = await prisma.business.findUnique({
      where: { slug: 'cdfa' }
    });
    
    if (!business) {
      console.log('❌ Negocio CDFA no encontrado');
      return;
    }
    
    console.log('   ✅ Negocio encontrado:', business.name);
    
    console.log('\n2️⃣ Buscando profesionales (usuarios)...');
    const professionals = await prisma.user.findMany({
      where: {
        businessId: business.id
      },
      include: {
        workingHours: true,
        _count: {
          select: {
            appointments: true
          }
        }
      }
    });
    
    console.log(`   📊 Total profesionales: ${professionals.length}`);
    
    if (professionals.length === 0) {
      console.log('❌ NO HAY PROFESIONALES REGISTRADOS!');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   1. Debes crear profesionales en el sistema');
      console.log('   2. Asignar horarios de trabajo a cada profesional');
      console.log('   3. Activar los profesionales');
      return;
    }
    
    console.log('\n3️⃣ Detalle de cada profesional:');
    for (let i = 0; i < professionals.length; i++) {
      const prof = professionals[i];
      console.log(`\n   👤 Profesional ${i + 1}:`);
      console.log(`   • ID: ${prof.id}`);
      console.log(`   • Nombre: ${prof.name}`);
      console.log(`   • Email: ${prof.email}`);
      console.log(`   • Activo: ${prof.isActive ? '✅' : '❌'}`);
      console.log(`   • Total citas: ${prof._count.appointments}`);
      console.log(`   • Horarios de trabajo: ${prof.workingHours.length}`);
      
      if (prof.workingHours.length === 0) {
        console.log('     ❌ SIN HORARIOS CONFIGURADOS');
      } else {
        console.log('     📅 Horarios:');
        prof.workingHours.forEach(wh => {
          const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          console.log(`       ${days[wh.dayOfWeek]}: ${wh.startTime} - ${wh.endTime} (${wh.isActive ? 'Activo' : 'Inactivo'})`);
        });
      }
    }
    
    console.log('\n4️⃣ Resumen del problema:');
    const activeProfessionals = professionals.filter(p => p.isActive);
    const professionalsWithSchedules = professionals.filter(p => p.workingHours.length > 0);
    const activeSchedules = professionals.filter(p => 
      p.isActive && p.workingHours.some(wh => wh.isActive)
    );
    
    console.log(`   • Profesionales totales: ${professionals.length}`);
    console.log(`   • Profesionales activos: ${activeProfessionals.length}`);
    console.log(`   • Con horarios configurados: ${professionalsWithSchedules.length}`);
    console.log(`   • Con horarios activos: ${activeSchedules.length}`);
    
    if (activeSchedules.length === 0) {
      console.log('\n❌ PROBLEMA CONFIRMADO:');
      console.log('   No hay profesionales activos con horarios configurados');
      
      console.log('\n🔧 SOLUCIONES:');
      console.log('   1. Ve al panel de administración');
      console.log('   2. Sección "Equipo" o "Profesionales"');
      console.log('   3. Agrega profesionales y configura sus horarios');
      console.log('   4. Asegúrate de que estén marcados como "Activos"');
    } else {
      console.log('\n✅ PROFESIONALES CONFIGURADOS CORRECTAMENTE');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugProfessionals(); 