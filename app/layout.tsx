import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Cinderglass — A study in slow combustion',
  description:
    'A real-time WebGL piece in five chapters. A field of 130,000 embers ignites, fractures, drifts, anneals and settles. No textures, no models, no HDRIs — every frame is generated on your device.',
  applicationName: 'Cinderglass',
  authors: [{ name: 'Cinderglass' }],
  keywords: ['WebGL', 'three.js', 'generative', 'real-time', 'art piece', 'shader'],
  openGraph: {
    title: 'Cinderglass',
    description: 'A study in slow combustion. A real-time WebGL piece in five chapters.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Cinderglass', description: 'A study in slow combustion.' },
};

export const viewport: Viewport = {
  themeColor: '#050506',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
