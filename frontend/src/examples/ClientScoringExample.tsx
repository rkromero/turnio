import React from 'react';
import ClientStarRating, { ClientRatingTooltip } from '../components/ClientStarRating';

const ClientScoringExample: React.FC = () => {
  // Ejemplos de diferentes tipos de clientes
  const ejemplosClientes = [
    {
      nombre: 'Juan Pérez',
      email: 'juan.perez@email.com',
      starRating: 5,
      totalBookings: 12,
      attendedCount: 12,
      noShowCount: 0
    },
    {
      nombre: 'María García',
      email: 'maria.garcia@email.com',
      starRating: 4,
      totalBookings: 8,
      attendedCount: 7,
      noShowCount: 1
    },
    {
      nombre: 'Carlos López',
      email: 'carlos.lopez@email.com',
      starRating: 2,
      totalBookings: 5,
      attendedCount: 2,
      noShowCount: 3
    },
    {
      nombre: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      starRating: null,
      totalBookings: 0,
      attendedCount: 0,
      noShowCount: 0
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🌟 Sistema de Scoring de Clientes</h1>
      
      <div className="grid gap-6">
        {/* Lista de clientes con sus ratings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Lista de Reservas</h2>
          
          <div className="space-y-4">
            {ejemplosClientes.map((cliente, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{cliente.nombre}</h3>
                  <p className="text-sm text-gray-500">{cliente.email}</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <ClientStarRating
                    starRating={cliente.starRating}
                    totalBookings={cliente.totalBookings}
                    attendedCount={cliente.attendedCount}
                    noShowCount={cliente.noShowCount}
                    showDetails={true}
                    size="md"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ejemplos de diferentes tamaños */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📏 Diferentes Tamaños</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <span className="w-20 text-sm">Pequeño:</span>
              <ClientStarRating starRating={4} size="sm" />
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="w-20 text-sm">Mediano:</span>
              <ClientStarRating starRating={4} size="md" />
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="w-20 text-sm">Grande:</span>
              <ClientStarRating starRating={4} size="lg" />
            </div>
          </div>
        </div>

        {/* Ejemplo de tooltip */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">💬 Información Detallada</h2>
          
          <div className="border rounded-lg p-4">
            <ClientRatingTooltip
              starRating={4}
              totalBookings={8}
              attendedCount={7}
              noShowCount={1}
            />
          </div>
        </div>

        {/* Guía de uso */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">🔧 Cómo Implementar</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-blue-800">1. En las reservas nuevas:</h3>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// Obtener scoring antes de mostrar la reserva
const clientScore = await fetch('/api/client-scoring/score?email=' + email);
<ClientStarRating starRating={clientScore.starRating} />`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-blue-800">2. Al completar una cita:</h3>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// Registrar evento automáticamente
fetch('/api/client-scoring/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'cliente@email.com',
    appointmentId: 'apt-123',
    eventType: 'ATTENDED' // o 'NO_SHOW', 'CANCELLED_LATE', etc.
  })
});`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-blue-800">3. En el calendario:</h3>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`// Mostrar junto a cada cita
<ClientStarRating 
  starRating={appointment.client.score}
  size="sm"
  className="ml-2"
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientScoringExample; 