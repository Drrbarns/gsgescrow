import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 60%, #6d28d9 100%)',
          borderRadius: 120,
          border: '16px solid #ffffff',
          color: '#ffffff',
          fontSize: 178,
          fontWeight: 800,
          letterSpacing: 4,
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 24px 45px rgba(109, 40, 217, 0.35)',
        }}
      >
        GSG
      </div>
    ),
    size
  );
}
