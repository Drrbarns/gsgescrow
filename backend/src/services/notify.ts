import { notificationQueue } from './queue';
import { sendInlineNotification } from './notify-inline';

const isVercel = !!process.env.VERCEL;

export async function sendNotification(type: string, entityId: string, extra: Record<string, any> = {}) {
  if (isVercel) {
    await sendInlineNotification(type, entityId, extra);
  } else {
    await notificationQueue.add('send', { type, transaction_id: entityId, ...extra });
  }
}
