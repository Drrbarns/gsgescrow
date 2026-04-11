import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabase';

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    next();
    return;
  }

  const cacheKey = `idempotency:${idempotencyKey}`;

  const { data: existing } = await supabaseAdmin
    .from('audit_logs')
    .select('after_state')
    .eq('reason', cacheKey)
    .limit(1)
    .maybeSingle();

  if (existing?.after_state) {
    res.status(200).json(existing.after_state);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      (async () => {
        try {
          await supabaseAdmin.from('audit_logs').insert({
            action: 'IDEMPOTENCY_CACHE',
            entity: 'idempotency',
            entity_id: idempotencyKey,
            reason: cacheKey,
            after_state: body,
          });
        } catch { /* best-effort */ }
      })();
    }
    return originalJson(body);
  };

  next();
};
