import * as Sentry from '@sentry/node';
import { env } from '../config/env';
import { supabaseAdmin } from './supabase';

let sentryReady = false;

export function initTelemetry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENV || env.NODE_ENV,
    tracesSampleRate: 0.05,
  });
  sentryReady = true;
}

export async function logRuntime(
  level: 'info' | 'warn' | 'error',
  tag: string,
  message: string,
  context: Record<string, unknown> = {}
) {
  try {
    await supabaseAdmin.from('ops_runtime_logs').insert({
      level,
      tag,
      message,
      request_id: (context.request_id as string) || null,
      actor_id: (context.actor_id as string) || null,
      context,
    });
  } catch {
    // non-blocking
  }
}

export async function captureException(err: unknown, context: Record<string, unknown> = {}) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  await logRuntime('error', 'runtime', message, { ...context, stack });
  if (sentryReady) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value as any);
      }
      Sentry.captureException(err);
    });
  }
}

export async function captureMessage(level: 'info' | 'warn' | 'error', tag: string, message: string, context: Record<string, unknown> = {}) {
  await logRuntime(level, tag, message, context);
  if (sentryReady && level !== 'info') {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value as any);
      }
      Sentry.captureMessage(`${tag}: ${message}`, level === 'error' ? 'error' : 'warning');
    });
  }
}

