export const APP_NAME = 'Sell-Safe Buy-Safe';
export const APP_TAGLINE = 'Secure Every Transaction. Protect Every Deal.';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** When false, real Paystack payments are used. Set NEXT_PUBLIC_SIMULATION_MODE=false when ready for production. */
export const SIMULATION_MODE = process.env.NEXT_PUBLIC_SIMULATION_MODE !== 'false';

export const SOURCE_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'other', label: 'Other' },
] as const;

export const PRODUCT_TYPES = [
  { value: 'food', label: 'Food Item (No Replacement)' },
  { value: 'non_food', label: 'Non-Food (Replacement Eligible)' },
] as const;

export const TRANSACTION_STATUSES: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Submitted', color: 'bg-gray-100 text-gray-800' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-purple-100 text-purple-800' },
  IN_TRANSIT: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED_PENDING: { label: 'Delivered (Pending)', color: 'bg-yellow-100 text-yellow-800' },
  REPLACEMENT_PENDING: { label: 'Replacement Pending', color: 'bg-orange-100 text-orange-800' },
  DELIVERED_CONFIRMED: { label: 'Delivery Confirmed', color: 'bg-green-100 text-green-800' },
  COMPLETED: { label: 'Completed', color: 'bg-green-200 text-green-900' },
  DISPUTE: { label: 'Dispute', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-200 text-red-900' },
  HOLD: { label: 'On Hold', color: 'bg-amber-100 text-amber-800' },
};

export const MOMO_PROVIDERS = [
  { value: 'MTN', label: 'MTN Mobile Money', bank_code: 'MTN' },
  { value: 'VOD', label: 'Vodafone Cash', bank_code: 'VOD' },
  { value: 'ATL', label: 'AirtelTigo Money', bank_code: 'ATL' },
] as const;
