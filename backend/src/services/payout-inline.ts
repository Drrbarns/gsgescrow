import * as paystack from './paystack';
import { supabaseAdmin, auditLog } from './supabase';
import { sendInlineNotification } from './notify-inline';

export async function processPayoutInline(data: {
  payout_id: string;
  transaction_id: string;
  type: string;
  amount: number;
  destination: { type: string; name: string; account_number: string; bank_code: string };
  idempotency_key: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { payout_id, transaction_id, type, amount, destination, idempotency_key, reason } = data;

  try {
    await supabaseAdmin
      .from('payouts')
      .update({ status: 'PROCESSING', attempts: 1 })
      .eq('id', payout_id);

    const recipientResult = await paystack.createTransferRecipient({
      type: destination.type === 'bank' ? 'nuban' : 'mobile_money',
      name: destination.name,
      account_number: destination.account_number,
      bank_code: destination.bank_code,
    });

    const recipientCode = recipientResult.data.recipient_code;
    const transferRef = `payout_${payout_id}_${Date.now()}`;

    const transferResult = await paystack.initiateTransfer({
      amount,
      recipient_code: recipientCode,
      reference: transferRef,
      reason: reason || `${type} payout for transaction`,
    });

    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'SUCCESS',
        provider_ref: transferResult.data?.reference || transferRef,
        transfer_code: transferResult.data?.transfer_code,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payout_id);

    const bucket = type === 'RIDER' ? 'DELIVERY' : 'PRODUCT';
    await supabaseAdmin.from('ledger_entries').insert({
      transaction_id,
      bucket,
      direction: 'DEBIT',
      amount,
      ref: transferRef,
      description: `${type} payout completed`,
    });

    await auditLog({
      action: 'PAYOUT_SUCCESS',
      entity: 'payouts',
      entity_id: payout_id,
      after_state: { transfer_ref: transferRef, amount },
    });

    try {
      await sendInlineNotification('PAYOUT_SUCCESS', transaction_id);
    } catch { /* best-effort */ }

    return { success: true };
  } catch (err: any) {
    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'FAILED',
        last_error: err?.message || 'Payout processing failed',
        attempts: 1,
      })
      .eq('id', payout_id);

    return { success: false, error: err?.message || 'Payout failed' };
  }
}
