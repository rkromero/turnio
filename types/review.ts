export interface Review {
  id: string;
  businessId: string;
  clientId: string;
  appointmentId: string;
  rating: number; // 1-5 estrellas
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

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
    [key: number]: number;
  };
}

export interface ReviewData {
  reviews: Review[];
  stats: ReviewStats;
}

export interface PublicReviewData {
  business: {
    id: string;
    name: string;
    slug: string;
  };
  reviews: Review[];
  stats: ReviewStats;
}

export interface ReviewFormData {
  rating: number;
  comment?: string;
}

export interface ReviewToken {
  appointmentId: string;
  business: {
    name: string;
    slug: string;
  };
  client: {
    name: string;
  };
  service: {
    name: string;
  };
  appointmentDate: string;
  canReview: boolean;
} 