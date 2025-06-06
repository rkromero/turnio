import React from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../components/Logo';

const BookingPage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <Logo size="xl" className="justify-center mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">
            Reservar Turno
          </h2>
          <p className="mt-2 text-gray-600">
            Negocio: {businessSlug}
          </p>
        </div>

        <div className="card max-w-2xl mx-auto">
          <div className="card-body">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Página en Construcción
              </h3>
              <p className="text-gray-600 mb-6">
                La funcionalidad de reservas públicas estará disponible próximamente.
              </p>
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Selección de servicios</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Calendario de disponibilidad</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Formulario de datos del cliente</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Confirmación automática</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            ¿Eres el dueño de este negocio?{' '}
            <a href="/login" className="text-primary-600 hover:underline">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingPage; 