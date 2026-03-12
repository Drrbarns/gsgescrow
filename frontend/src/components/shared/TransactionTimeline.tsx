'use client';

import { Shield, CreditCard, Truck, Package, PackageCheck, Banknote, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface TimelineStep {
  key: string;
  label: string;
  icon: typeof Shield;
  description?: string;
  timestamp?: string;
  active: boolean;
  completed: boolean;
  error?: boolean;
}

interface Props {
  status: string;
  paidAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export function TransactionTimeline({ status, paidAt, dispatchedAt, deliveredAt, completedAt, createdAt }: Props) {
  const statusOrder = ['SUBMITTED', 'PAID', 'ACCEPTED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED_PENDING', 'DELIVERED_CONFIRMED', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(status);

  const steps: TimelineStep[] = [
    {
      key: 'created',
      label: 'Transaction Created',
      icon: Shield,
      description: 'Escrow transaction initiated by buyer',
      timestamp: createdAt,
      completed: currentIndex >= 0,
      active: currentIndex === 0,
    },
    {
      key: 'paid',
      label: 'Payment Received',
      icon: CreditCard,
      description: 'Funds secured in escrow via Paystack',
      timestamp: paidAt,
      completed: currentIndex >= 1,
      active: currentIndex === 1,
    },
    {
      key: 'dispatched',
      label: 'Item Dispatched',
      icon: Truck,
      description: 'Seller has shipped the item',
      timestamp: dispatchedAt,
      completed: currentIndex >= 3,
      active: currentIndex === 2 || currentIndex === 3,
    },
    {
      key: 'delivered',
      label: 'Delivery Confirmed',
      icon: PackageCheck,
      description: 'Buyer confirmed item received',
      timestamp: deliveredAt,
      completed: currentIndex >= 6,
      active: currentIndex === 5,
    },
    {
      key: 'completed',
      label: 'Payout Released',
      icon: Banknote,
      description: 'Seller and rider paid out',
      timestamp: completedAt,
      completed: currentIndex >= 7,
      active: currentIndex === 7,
    },
  ];

  // Handle special statuses
  const isDispute = status === 'DISPUTE';
  const isReplacement = status === 'REPLACEMENT_REQUESTED';
  const isNoShow = status === 'NO_SHOW';
  const isCancelled = status === 'CANCELLED';

  if (isDispute || isReplacement || isNoShow || isCancelled) {
    steps.push({
      key: 'special',
      label: isDispute ? 'Under Dispute' : isReplacement ? 'Replacement Requested' : isNoShow ? 'No-Show Reported' : 'Cancelled',
      icon: isDispute ? AlertTriangle : isReplacement ? RefreshCw : AlertTriangle,
      description: isDispute ? 'Admin is reviewing the dispute' : isReplacement ? 'Seller to send replacement' : isNoShow ? 'No-show policy applied' : 'Transaction cancelled',
      completed: false,
      active: true,
      error: true,
    });
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-3"
          >
            {/* Line + Dot */}
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                step.error ? 'border-red-500 bg-red-50 text-red-600' :
                step.completed ? 'border-primary bg-primary text-primary-foreground' :
                step.active ? 'border-primary bg-primary/10 text-primary' :
                'border-muted-foreground/20 bg-muted/50 text-muted-foreground/40'
              }`}>
                {step.completed ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[24px] transition-colors ${
                  step.completed ? 'bg-primary' : 'bg-muted-foreground/10'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${!step.completed && !step.active ? 'opacity-40' : ''}`}>
              <p className={`text-sm font-semibold ${step.error ? 'text-red-700' : ''}`}>{step.label}</p>
              {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
              {step.timestamp && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(step.timestamp).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
