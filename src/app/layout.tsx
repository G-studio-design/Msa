
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Msarch App - Verification',
  description: 'Verification step.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
