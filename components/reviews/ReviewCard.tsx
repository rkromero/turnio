import React from 'react';
import { Review } from '../../types/review';

interface ReviewCardProps {
  review: Review;
  showActions?: boolean;
  onApprove?: (reviewId: string) => void;
  onReject?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

export default function ReviewCard({
  review,
  showActions = false,
  onApprove,
  onReject,
  onDelete
}: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className="w-4 h-4"
        fill={i < rating ? '#fbbf24' : '#e5e7eb'}
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            {review.client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{review.client.name}</h4>
            <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {renderStars(review.rating)}
          </div>
          <span className="text-sm text-gray-600">({review.rating}/5)</span>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-1">
          Servicio: <span className="font-medium">{review.appointment.service.name}</span>
        </p>
        {review.comment && (
          <p className="text-gray-700 leading-relaxed">{review.comment}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!review.isApproved && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Pendiente
            </span>
          )}
          {review.isApproved && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Aprobada
            </span>
          )}
          {!review.isPublic && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Privada
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            {!review.isApproved && onApprove && (
              <button
                onClick={() => onApprove(review.id)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Aprobar
              </button>
            )}
            {review.isApproved && onReject && (
              <button
                onClick={() => onReject(review.id)}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                Rechazar
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(review.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 