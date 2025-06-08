import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, MessageSquare, Filter, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface Review {
  id: string;
  businessId: string;
  clientId: string;
  appointmentId: string;
  rating: number;
  comment?: string;
  isPublic: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  };
  appointment: {
    id: string;
    startTime: string;
    service: {
      name: string;
    };
  };
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewData {
  reviews: Review[];
  stats: ReviewStats;
}

const Reviews: React.FC = () => {
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnapproved, setShowUnapproved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, [showUnapproved]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      // Aquí iría la llamada real a la API
      // const data = await reviewService.getReviews(showUnapproved);
      
      // Por ahora, datos de ejemplo
      const mockData: ReviewData = {
        reviews: [
          {
            id: '1',
            businessId: 'biz1',
            clientId: 'client1',
            appointmentId: 'app1',
            rating: 5,
            comment: 'Excelente servicio, muy profesional y puntual.',
            isPublic: true,
            isApproved: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            client: { id: 'client1', name: 'María García' },
            appointment: {
              id: 'app1',
              startTime: new Date().toISOString(),
              service: { name: 'Corte de cabello' }
            }
          },
          {
            id: '2',
            businessId: 'biz1',
            clientId: 'client2',
            appointmentId: 'app2',
            rating: 4,
            comment: 'Muy buen trato, aunque hubo una pequeña demora.',
            isPublic: true,
            isApproved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            client: { id: 'client2', name: 'Juan Pérez' },
            appointment: {
              id: 'app2',
              startTime: new Date().toISOString(),
              service: { name: 'Manicure' }
            }
          }
        ],
        stats: {
          totalReviews: 15,
          averageRating: 4.3,
          ratingDistribution: {
            5: 8,
            4: 4,
            3: 2,
            2: 1,
            1: 0
          }
        }
      };
      
      setReviewData(mockData);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error cargando reseñas');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      // await reviewService.updateReviewStatus(reviewId, { isApproved: true });
      console.log('Aprobar reseña:', reviewId);
      await loadReviews();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error aprobando reseña');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      // await reviewService.updateReviewStatus(reviewId, { isApproved: false });
      console.log('Rechazar reseña:', reviewId);
      await loadReviews();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error rechazando reseña');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta reseña?')) {
      return;
    }

    try {
      // await reviewService.deleteReview(reviewId);
      console.log('Eliminar reseña:', reviewId);
      await loadReviews();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error eliminando reseña');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const renderStats = () => {
    if (!reviewData?.stats) return null;

    const { stats } = reviewData;
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stats-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Promedio</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">5 Estrellas</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.ratingDistribution[5]}</p>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">1-2 Estrellas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.ratingDistribution[1] + stats.ratingDistribution[2]}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reseñas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Reseñas</h1>
            <p className="mt-2 text-gray-600">
              Administra las reseñas de tus clientes y supervisa tu reputación
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="btn-secondary">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-card">
          <div className="flex">
            <XCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {renderStats()}

      {/* Lista de Reseñas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Reseñas ({reviewData?.reviews.length || 0})
            </h2>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showUnapproved}
                  onChange={(e) => setShowUnapproved(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Mostrar pendientes
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!reviewData?.reviews.length ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay reseñas</h3>
              <p className="text-gray-500">
                Aún no tienes reseñas de clientes. Cuando completes servicios, 
                se enviará automáticamente una solicitud de reseña.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviewData.reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {review.client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{review.client.name}</h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
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
                        <span className="badge badge-warning">
                          Pendiente
                        </span>
                      )}
                      {review.isApproved && (
                        <span className="badge badge-success">
                          Aprobada
                        </span>
                      )}
                      {!review.isPublic && (
                        <span className="badge badge-gray">
                          Privada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!review.isApproved && (
                        <button
                          onClick={() => handleApprove(review.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprobar
                        </button>
                      )}
                      {review.isApproved && (
                        <button
                          onClick={() => handleReject(review.id)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rechazar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reviews; 