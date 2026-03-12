import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function auditLog(params: {
  actor_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  reason?: string;
  ip_address?: string;
  request_id?: string;
}) {
  const { error } = await supabaseAdmin.from('audit_logs').insert(params);
  if (error) console.error('[AUDIT_LOG_FAIL]', error.message, params);
}

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? null;
}
