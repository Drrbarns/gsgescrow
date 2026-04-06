import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 36,
          border: '8px solid #ffffff',
          color: '#ffffff',
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: 2,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        GSG
      </div>
    ),
    size
  );
}
