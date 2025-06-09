import React from 'react';

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
  // Base de datos limpia - sin reseñas de ejemplo
  const sampleReviews: Review[] = [];

  const averageRating = sampleReviews.length > 0 
    ? sampleReviews.reduce((sum, review) => sum + review.rating, 0) / sampleReviews.length 
    : 0;

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
        {sampleReviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay reseñas aún</h4>
            <p className="text-gray-500 text-sm">
              Cuando completes servicios, tus clientes podrán dejarte reseñas que aparecerán aquí.
            </p>
          </div>
        ) : (
          sampleReviews.slice(0, limit).map((review) => (
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
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-center text-sm text-gray-500">
          Las reseñas ayudan a otros clientes a tomar decisiones informadas
        </p>
      </div>
    </div>
  );
} 