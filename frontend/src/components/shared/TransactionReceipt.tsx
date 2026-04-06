'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Share2, Shield } from 'lucide-react';

interface ReceiptProps {
  receipt: {
    receipt_number: string;
    receipt_type: string;
    data: Record<string, any>;
    created_at: string;
  };
}

export function TransactionReceipt({ receipt }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const d = receipt.data;

  function handlePrint() {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt ${receipt.receipt_number}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; max-width: 400px; margin: 0 auto; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { font-size: 18px; font-weight: bold; color: #6b21a8; }
        .receipt-no { font-size: 11px; color: #666; margin-top: 4px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .row.total { font-weight: bold; font-size: 15px; border-top: 2px solid #e5e7eb; padding-top: 10px; margin-top: 6px; }
        .label { color: #666; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
        .badge { display: inline-block; background: #f0fdf4; color: #15803d; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 16px; }
        .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #999; }
      </style></head><body>
      <div class="header">
        <div class="logo">🛡️ Sell-Safe Buy-Safe</div>
        <div class="receipt-no">${receipt.receipt_number}</div>
        <div style="font-size:12px;color:#666;margin-top:4px">${new Date(receipt.created_at).toLocaleString('en-GH')}</div>
      </div>
      <div class="row"><span class="label">Transaction</span><span>${d.short_id}</span></div>
      <div class="row"><span class="label">Product</span><span>${d.product_name}</span></div>
      <div class="row"><span class="label">Buyer</span><span>${d.buyer_name}</span></div>
      <div class="row"><span class="label">Seller</span><span>${d.seller_name}</span></div>
      <hr/>
      <div class="row"><span class="label">Product Total</span><span>GHS ${Number(d.product_total).toFixed(2)}</span></div>
      <div class="row"><span class="label">Delivery Fee</span><span>GHS ${Number(d.delivery_fee).toFixed(2)}</span></div>
      <div class="row"><span class="label">Platform Fee</span><span>GHS ${Number(d.buyer_platform_fee).toFixed(2)}</span></div>
      <div class="row total"><span>Grand Total</span><span>GHS ${Number(d.grand_total).toFixed(2)}</span></div>
      <div style="text-align:center"><div class="badge">${d.escrow_status || 'Payment Confirmed'}</div></div>
      <div class="footer">
        <p>GSG BRANDS • sellbuysafe.gsgbrands.com</p>
        <p>This is an official secure transaction receipt</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function handleShareWhatsApp() {
    const text = `🛡️ Sell-Safe Buy-Safe Receipt\n\nReceipt: ${receipt.receipt_number}\nTransaction: ${d.short_id}\nProduct: ${d.product_name}\nAmount: GHS ${Number(d.grand_total).toFixed(2)}\nStatus: ${d.escrow_status || 'Confirmed'}\n\nVerify at: ${typeof window !== 'undefined' ? window.location.origin : ''}/tracking`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div ref={receiptRef} className="rounded-2xl border bg-card p-6 max-w-sm mx-auto">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 text-primary font-bold text-lg">
          <Shield className="h-5 w-5" />
          Sell-Safe Buy-Safe
        </div>
        <p className="text-xs text-muted-foreground mt-1">{receipt.receipt_number}</p>
        <p className="text-xs text-muted-foreground">{new Date(receipt.created_at).toLocaleString('en-GH')}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Transaction</span><span className="font-mono">{d.short_id}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="text-right max-w-[180px] truncate">{d.product_name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span>{d.buyer_name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span>{d.seller_name}</span></div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Product Total</span><span>GHS {Number(d.product_total).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Delivery Fee</span><span>GHS {Number(d.delivery_fee).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Platform Fee</span><span>GHS {Number(d.buyer_platform_fee).toFixed(2)}</span></div>
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">GHS {Number(d.grand_total).toFixed(2)}</span></div>
      </div>

      {d.escrow_status && (
        <div className="mt-4 rounded-full bg-green-50 px-4 py-2 text-center text-xs font-semibold text-green-700">
          {d.escrow_status}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 rounded-full gap-1.5">
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
        <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="flex-1 rounded-full gap-1.5 border-green-300 text-green-700 hover:bg-green-50">
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </div>
    </div>
  );
}
