interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  client: {
    name: string;
  };
  appointment: {
    service: {
      name: string;
    };
  };
}

interface ReviewsWidgetProps {
  businessSlug: string;
  limit?: number;
}

export default function ReviewsWidget({ businessSlug, limit = 5 }: ReviewsWidgetProps) {
  // Por ahora, mostraremos reseñas de ejemplo hasta que el backend esté funcionando
  const sampleReviews: Review[] = [
    {
      id: '1',
      rating: 5,
      comment: 'Excelente servicio, muy profesional y puntual. Totalmente recomendado.',
      createdAt: '2024-01-15T10:00:00Z',
      client: { name: 'María García' },
      appointment: { service: { name: 'Corte de cabello' } }
    },
    {
      id: '2',
      rating: 4,
      comment: 'Muy buen trato y calidad. El lugar es limpio y agradable.',
      createdAt: '2024-01-10T14:30:00Z',
      client: { name: 'Juan Pérez' },
      appointment: { service: { name: 'Manicure' } }
    },
    {
      id: '3',
      rating: 5,
      comment: 'Increíble experiencia, superó mis expectativas.',
      createdAt: '2024-01-08T16:15:00Z',
      client: { name: 'Ana López' },
      appointment: { service: { name: 'Masaje relajante' } }
    }
  ];

  const averageRating = sampleReviews.reduce((sum, review) => sum + review.rating, 0) / sampleReviews.length;

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`${size} inline-block`}>
        {i < rating ? '⭐' : '☆'}
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reseñas de Clientes</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {renderStars(Math.round(averageRating))}
          </div>
          <span className="text-sm text-gray-600">
            {averageRating.toFixed(1)} ({sampleReviews.length} reseñas)
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {sampleReviews.slice(0, limit).map((review) => (
          <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {review.client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {review.client.name}
                  </h4>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating, 'w-3 h-3')}
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mb-1">
                  {review.appointment.service.name} • {formatDate(review.createdAt)}
                </p>
                
                {review.comment && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    "{review.comment}"
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-center text-sm text-gray-500">
          Las reseñas ayudan a otros clientes a tomar decisiones informadas
        </p>
      </div>
    </div>
  );
} 