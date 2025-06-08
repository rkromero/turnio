export interface Branch {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  description?: string;
  isActive: boolean;
  isMain: boolean;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relaciones incluidas
  _count?: {
    users?: number;
    appointments?: number;
    services?: number;
  };
  
  users?: BranchUser[];
  services?: BranchService[];
}

export interface BranchUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  avatar?: string;
}

export interface BranchService {
  id: string;
  serviceId: string;
  price?: number;
  isActive: boolean;
  service: {
    id: string;
    name: string;
    description?: string;
    duration: number;
    price: number;
    color?: string;
    isGlobal: boolean;
  };
}

export interface CreateBranchData {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  description?: string;
  isMain?: boolean;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UpdateBranchData extends Partial<CreateBranchData> {
  isActive?: boolean;
} 