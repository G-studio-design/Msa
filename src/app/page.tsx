'use client';
import LoginPage from '@/components/auth/login-page';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const { currentUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (currentUser) {
            router.replace('/dashboard');
        }
    }, [currentUser, router]);

    // If there is a user, this component will redirect.
    // Otherwise, it will render the LoginPage.
    return <LoginPage />;
}
