let app: any;
let loadError: string | null = null;

try {
  app = require('../src/index').default;
} catch (err: any) {
  loadError = err?.message || 'Unknown startup error';
  console.error('[VERCEL] Failed to load app:', loadError, err?.stack);
}

export default function handler(req: any, res: any) {
  if (loadError) {
    res.status(500).json({
      error: 'Backend failed to start',
      message: loadError,
      hint: 'Check that all required environment variables are set in your Vercel project settings.',
    });
    return;
  }
  return app(req, res);
}
