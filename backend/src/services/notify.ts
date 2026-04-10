import { notificationQueue } from './queue';
import { sendInlineNotification } from './notify-inline';

const isVercel = !!process.env.VERCEL;

export async function sendNotification(type: string, transactionId: string) {
  if (isVercel) {
    await sendInlineNotification(type, transactionId);
  } else {
    await notificationQueue.add('send', { type, transaction_id: transactionId });
  }
}
