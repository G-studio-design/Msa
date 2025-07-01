
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/context/LanguageContext'; // Import LanguageProvider
import { AuthProvider } from '@/context/AuthContext'; // Corrected import path

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Msarch App',
  description: 'Employee task management application for various divisions.',
  icons: {
    icon: '/msarch-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Wrap with AuthProvider first, then LanguageProvider */}
        <AuthProvider>
          <LanguageProvider>
              {children}
              <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
