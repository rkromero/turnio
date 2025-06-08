import React from 'react';
import { Professional, UrgencyStats } from '../types/booking';
import { User, Clock, Calendar, Star } from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';

interface ProfessionalSelectorProps {
  professionals: Professional[];
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string | null) => void;
  selectedDate: string;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  showTimeSlots: boolean;
  urgency?: UrgencyStats;
}

const ProfessionalSelector: React.FC<ProfessionalSelectorProps> = ({
  professionals,
  selectedProfessional,
  onProfessionalSelect,
  selectedDate,
  selectedTime,
  onTimeSelect,
  showTimeSlots,
  urgency
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
      <div className="text-center px-4">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
          Elige tu profesional
        </h3>
        <p className="text-gray-600 text-sm md:text-base">
          Selecciona un profesional de tu preferencia o déjanos asignarte uno automáticamente
        </p>
      </div>

      {/* Urgency Badge */}
      {urgency && (
        <div className="px-4">
          <UrgencyBadge urgency={urgency} />
        </div>
      )}

      {/* Opción "Cualquier profesional" */}
      <div className="px-4">
        <div 
          onClick={() => onProfessionalSelect(null)}
          className={`
            relative p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
            ${selectedProfessional === null 
              ? 'border-blue-500 bg-blue-50 shadow-md' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Star className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-base md:text-lg">Cualquier profesional</h4>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Te asignaremos automáticamente el mejor profesional disponible
              </p>
              <div className="flex items-center mt-2 text-xs md:text-sm text-green-600">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {professionals.filter(p => p.workingToday !== false).length} profesionales disponibles
              </div>
            </div>
            {selectedProfessional === null && (
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de profesionales */}
      <div className="px-4 space-y-4">
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
                  relative p-4 md:p-6 rounded-xl border-2 transition-all duration-200
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
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg md:text-xl border-2 border-white shadow-sm">
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
                    <h4 className="font-medium text-gray-900 text-base md:text-lg">{professional.name}</h4>
                    {professional.phone && (
                      <p className="text-sm md:text-base text-gray-600 mt-1">{professional.phone}</p>
                    )}
                    
                    {/* Estado de disponibilidad */}
                    <div className="flex items-center mt-2 text-xs md:text-sm">
                      {isWorkingToday ? (
                        <>
                          <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 text-green-600" />
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
                          <User className="w-3 h-3 md:w-4 md:h-4 mr-1 text-gray-400" />
                          <span className="text-gray-500">No disponible hoy</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Indicador de selección */}
                  {isSelected && isWorkingToday && (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horarios disponibles */}
              {isSelected && showTimeSlots && hasSlots && (
                <div className="ml-4 p-4 md:p-6 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3 text-sm md:text-base">
                    Horarios disponibles para {formatDate(selectedDate)}
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {professional.availableSlots?.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => onTimeSelect(slot.datetime)}
                        className={`
                          px-4 py-3 md:px-6 md:py-4 rounded-lg text-sm md:text-base font-medium transition-colors min-h-[48px] md:min-h-[56px]
                          ${selectedTime === slot.datetime
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
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
        <div className="text-center py-8 px-4">
          <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3" />
          <h4 className="font-medium text-gray-900 mb-2 text-base md:text-lg">No hay profesionales disponibles</h4>
          <p className="text-gray-600 text-sm md:text-base">
            Intenta seleccionar otra fecha o contacta al negocio directamente
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfessionalSelector; 