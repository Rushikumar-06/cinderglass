import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
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
          background: '#050506',
        }}
      >
        <div
          style={{
            width: 15,
            height: 15,
            borderRadius: 15,
            background: '#ff5a1a',
            boxShadow: '0 0 12px 3px #ff5a1a',
          }}
        />
      </div>
    ),
    size,
  );
}
