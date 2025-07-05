// src/app/dashboard/users/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import UsersPageClient from '@/components/dashboard/UsersPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types/user-types';

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
           <Card>
               <CardHeader>
                   <Skeleton className="h-7 w-1/3 mb-2" />
                   <Skeleton className="h-4 w-2/3" />
               </CardHeader>
               <CardContent>
                   <Skeleton className="h-40 w-full" />
               </CardContent>
           </Card>
       </div>
   );
}

export default function ManageUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        setUsers(data);
    } catch (error) {
        console.error(error);
        // handle error display if needed
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        fetchUsers();
    }
  }, [currentUser, fetchUsers]);


  if (isLoading) {
      return <PageSkeleton />;
  }

  return <UsersPageClient initialUsers={users} />;
}
