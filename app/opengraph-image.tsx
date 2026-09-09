import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Cinderglass — a study in slow combustion';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#050506',
          backgroundImage:
            'radial-gradient(60% 55% at 50% 46%, rgba(255,90,26,0.30), rgba(5,5,6,0) 68%)',
          color: '#efe9df',
          fontFamily: 'serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, letterSpacing: 6, color: '#78716a' }}>
          <span>FIELD STUDY NO. IX</span>
          <span>MMXXVI</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 148, lineHeight: 1, letterSpacing: -4 }}>Cinderglass</div>
          <div style={{ display: 'flex', width: 420, height: 2, background: '#ff5a1a' }} />
          <div style={{ fontSize: 30, letterSpacing: 8, color: '#b6afa5' }}>
            A STUDY IN SLOW COMBUSTION
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 4, color: '#78716a' }}>
          REAL-TIME WEBGL · 130,000 PARTICLES · ONE DRAW CALL
        </div>
      </div>
    ),
    size,
  );
}
