export type UserRole = 'client' | 'driver' | 'admin';

export interface LocationInfo {
  lat: number;
  lng: number;
  address?: string;
  updatedAt?: any;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  status: 'active' | 'inactive';
  location?: LocationInfo;
  createdAt: any;
}

export type OrderStatus = 'pending' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
export type OrderType = 'delivery' | 'errand';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface Order {
  id: string;
  clientId: string;
  driverId: string | null;
  status: OrderStatus;
  type: OrderType;
  requiresTrailer?: boolean;
  description: string;
  origin: LocationInfo;
  destination: LocationInfo;
  price: number;
  tip?: number;
  paymentMethod: PaymentMethod;
  createdAt: any;
  updatedAt: any;
}

export const HUAJUAPAN_CENTER = { lat: 17.8078, lng: -97.7789 };
