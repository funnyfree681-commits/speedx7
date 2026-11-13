export type DocType = 'aadhaar' | 'pan' | 'license' | 'rc';
export type DocStatus = 'pending' | 'verified' | 'rejected';

export type PaymentMethod = 'upi' | 'wallet' | 'card' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type TransactionType = 'ride_payment' | 'wallet_topup' | 'driver_payout';

export interface DriverDocument {
  id: string;
  driver_id: string;
  driver_name?: string;
  driver_email?: string;
  doc_type: DocType;
  doc_number: string;
  holder_name: string;
  expiry_date?: string;
  vehicle_model?: string;
  vehicle_type?: string;
  file_name?: string;
  file_data?: string;
  status: DocStatus;
  rejection_reason?: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'driver' | 'admin';
  balance: number;
  lat?: number;
  lng?: number;
  is_online?: boolean;
}

export interface Ride {
  id: string;
  user_id: string;
  driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  ride_id?: string;
  user_id: string;
  driver_id?: string;
  user_name?: string;
  user_email?: string;
  amount: number;
  type: TransactionType;
  method: PaymentMethod;
  upi_id?: string;
  transaction_ref: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

export interface Settings {
  base_fare: number;
  per_km: number;
  per_minute: number;
}
