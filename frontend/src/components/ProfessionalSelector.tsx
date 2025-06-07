import React from 'react';
import { Professional } from '../types/booking';
import { User, Clock, Calendar, Star } from 'lucide-react';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string | null) => void;
  selectedDate: string;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  showTimeSlots: boolean;
}

const ProfessionalSelector: React.FC<ProfessionalSelectorProps> = ({
  professionals,
  selectedProfessional,
  onProfessionalSelect,
  selectedDate,
  selectedTime,
  onTimeSelect,
  showTimeSlots
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    return role === 'ADMIN' ? 'Propietario' : 'Profesional';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Elige tu profesional
        </h3>
        <p className="text-gray-600">
          Selecciona un profesional de tu preferencia o déjanos asignarte uno automáticamente
        </p>
      </div>

      {/* Opción "Cualquier profesional" */}
      <div 
        onClick={() => onProfessionalSelect(null)}
        className={`
          relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
          ${selectedProfessional === null 
            ? 'border-blue-500 bg-blue-50 shadow-md' 
            : 'border-gray-200 bg-white hover:border-gray-300'
          }
        `}
      >
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Star className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Cualquier profesional</h4>
            <p className="text-sm text-gray-600 mt-1">
              Te asignaremos automáticamente el mejor profesional disponible
            </p>
            <div className="flex items-center mt-2 text-xs text-green-600">
              <Calendar className="w-3 h-3 mr-1" />
              {professionals.filter(p => p.workingToday !== false).length} profesionales disponibles
            </div>
          </div>
          {selectedProfessional === null && (
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de profesionales */}
      <div className="grid gap-4">
        {professionals.map((professional) => {
          const isSelected = selectedProfessional === professional.id;
          const hasSlots = professional.availableSlots && professional.availableSlots.length > 0;
          const isWorkingToday = professional.workingToday !== false;
          
          return (
            <div key={professional.id} className="space-y-3">
              {/* Tarjeta del profesional */}
              <div 
                onClick={() => isWorkingToday ? onProfessionalSelect(professional.id) : null}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${!isWorkingToday 
                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                    : isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md cursor-pointer' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="relative">
                    {professional.avatar ? (
                      <img 
                        src={professional.avatar} 
                        alt={professional.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-white shadow-sm">
                        {getInitials(professional.name)}
                      </div>
                    )}
                    {/* Badge de rol */}
                    <div className={`
                      absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${professional.role === 'ADMIN' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-green-100 text-green-800'
                      }
                    `}>
                      {getRoleLabel(professional.role)}
                    </div>
                  </div>

                  {/* Información */}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{professional.name}</h4>
                    {professional.phone && (
                      <p className="text-sm text-gray-600 mt-1">{professional.phone}</p>
                    )}
                    
                    {/* Estado de disponibilidad */}
                    <div className="flex items-center mt-2 text-xs">
                      {isWorkingToday ? (
                        <>
                          <Clock className="w-3 h-3 mr-1 text-green-600" />
                          <span className="text-green-600">
                            {hasSlots 
                              ? `${professional.availableSlots?.length} horarios disponibles`
                              : 'Disponible'
                            }
                          </span>
                          {professional.workingHours && (
                            <span className="text-gray-500 ml-2">
                              {professional.workingHours.start} - {professional.workingHours.end}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1 text-gray-400" />
                          <span className="text-gray-500">No disponible hoy</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Indicador de selección */}
                  {isSelected && isWorkingToday && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horarios disponibles */}
              {isSelected && showTimeSlots && hasSlots && (
                <div className="ml-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">
                    Horarios disponibles para {formatDate(selectedDate)}
                  </h5>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {professional.availableSlots?.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => onTimeSelect(slot.datetime)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${selectedTime === slot.datetime
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mensaje si no hay profesionales */}
      {professionals.length === 0 && (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-2">No hay profesionales disponibles</h4>
          <p className="text-gray-600">
            Intenta seleccionar otra fecha o contacta al negocio directamente
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfessionalSelector; 