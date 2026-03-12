'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface Props {
  transactionId?: string;
  role: 'buyer' | 'seller';
  sellerName?: string;
  productName?: string;
  amount?: number;
  className?: string;
}

export function WhatsAppShare({ transactionId, role, sellerName, productName, amount, className }: Props) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  function getMessage(): string {
    if (role === 'buyer' && transactionId) {
      return `Hello ${sellerName || 'there'},\n\nI have securely placed an order for "${productName || 'my item'}" (GHS ${amount?.toFixed(2) || '0.00'}) using Sell-Safe Buy-Safe Escrow.\n\nMy payment is currently held in a secure vault and will be automatically released to you once I confirm delivery.\n\nPlease view the transaction and dispatch the order here:\n${appUrl}/seller/step-1\n\nTransaction ID: ${transactionId}\n\nThank you! 🤝`;
    }
    if (role === 'seller') {
      return `Hello! For your security and peace of mind, I process all payments through Sell-Safe Buy-Safe (Escrow).\n\nYour funds will be held securely and only released to me after you have received and approved your order.\n\nPlease complete your secure payment here:\n${appUrl}/buyer/step-1\n\nThank you for your business! 🛡️`;
    }
    return `Experience zero-risk online shopping with Sell-Safe Buy-Safe — Ghana's premium escrow platform. Your funds are held securely and only released when delivery is confirmed. Buy and sell with 100% confidence.\n\n${appUrl} 🛡️`;
  }

  function handleShare() {
    const text = encodeURIComponent(getMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={`gap-2 rounded-full border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 ${className || ''}`}
    >
      <MessageCircle className="h-4 w-4" />
      Share via WhatsApp
    </Button>
  );
}

export function WhatsAppSupportButton() {
  return (
    <a
      href="https://wa.me/233000000000?text=Hi%2C%20I%20need%20help%20with%20Sell-Safe%20Buy-Safe"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-all hover:scale-110"
      title="Chat with Support"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
