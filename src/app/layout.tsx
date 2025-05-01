import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/context/LanguageContext'; // Import LanguageProvider

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'TaskTrackPro',
  description: 'Employee task management application for various divisions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
         {/* Wrap the entire application with LanguageProvider */}
        <LanguageProvider>
            {children}
            <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
