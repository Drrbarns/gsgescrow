export type UserRole = 'buyer' | 'seller' | 'admin' | 'superadmin';
export type ProductType = 'food' | 'non_food';
export type SourcePlatform = 'facebook' | 'instagram' | 'website' | 'whatsapp' | 'tiktok' | 'x' | 'other';

export type TransactionStatus =
  | 'SUBMITTED' | 'PAID' | 'DISPATCHED' | 'IN_TRANSIT'
  | 'DELIVERED_PENDING' | 'REPLACEMENT_PENDING' | 'DELIVERED_CONFIRMED'
  | 'COMPLETED' | 'DISPUTE' | 'CANCELLED' | 'HOLD';

export type PayoutType = 'RIDER' | 'SELLER';
export type PayoutStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'HELD';
export type LedgerBucket = 'PRODUCT' | 'DELIVERY' | 'PLATFORM';
export type LedgerDirection = 'CREDIT' | 'DEBIT';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  impersonator_id?: string;
  is_impersonation?: boolean;
  impersonation_session_id?: string;
}

export interface CreateTransactionPayload {
  listing_link?: string;
  source_platform: SourcePlatform;
  product_type: ProductType;
  product_name: string;
  delivery_address: string;
  delivery_date?: string;
  buyer_name: string;
  buyer_phone?: string;
  seller_phone: string;
  seller_name: string;
  product_total: number;
  delivery_fee: number;
  refund_bank_details?: Record<string, string>;
}

export interface SellerDispatchPayload {
  transaction_id: string;
  seller_business_location: string;
  rider_name: string;
  rider_phone: string;
  rider_telco: string;
  pickup_address: string;
  additional_info?: string;
  seller_payout_destination: Record<string, string>;
}

export interface VerifyCodePayload {
  transaction_id: string;
  delivery_code?: string;
  partial_code?: string;
}
