'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/components/auth/login-page';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // This effect runs only on the client
    if (currentUser) {
      router.replace('/dashboard');
    } else {
      setIsCheckingAuth(false);
    }
  }, [currentUser, router]);

  // While checking auth, show a loader to prevent a flash of the login page
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated, show the LoginPage
  return <LoginPage />;
}
