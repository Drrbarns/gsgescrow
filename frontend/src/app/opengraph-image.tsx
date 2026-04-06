import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #f8f6ff 0%, #ffffff 55%, #eef2ff 100%)',
          color: '#0f172a',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 34px',
              borderRadius: 999,
              border: '6px solid #ffffff',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)',
              color: '#ffffff',
              fontSize: 58,
              fontWeight: 800,
              boxShadow: '0 18px 34px rgba(109, 40, 217, 0.28)',
              letterSpacing: 2,
            }}
          >
            GSG
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: 1 }}>BRANDS</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>Sell-Safe Buy-Safe</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#4f46e5' }}>Secure Every Transaction. Protect Every Deal.</div>
          <div style={{ fontSize: 28, color: '#475569' }}>
            Licensed PSP protection for online buying and selling in Ghana.
          </div>
        </div>
      </div>
    ),
    size
  );
}
