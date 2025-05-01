// src/app/auth/setup-account/page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { Loader2 } from 'lucide-react';
import { createUserAccount } from '@/services/user-service'; // Import the service function

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define schema using a function to access translations and password validation
const getSetupSchema = (dictValidation: ReturnType<typeof getDictionary>['accountSetup']['validation']) => z.object({
    username: z.string().min(3, dictValidation.usernameMin),
    password: z.string().min(6, dictValidation.passwordMin),
    confirmPassword: z.string().min(1, dictValidation.confirmPasswordRequired), // Basic requirement
}).refine((data) => data.password === data.confirmPassword, {
    message: dictValidation.passwordMismatch, // Use translated message for mismatch
    path: ['confirmPassword'], // Apply error to confirmPassword field
});


export default function AccountSetupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [dict, setDict] = React.useState(defaultDict.accountSetup);
  const [isClient, setIsClient] = React.useState(false);

  // Extract Google user info from query params (use cautiously)
  const email = searchParams.get('email') || '';
  const displayName = searchParams.get('displayName') || 'User';
  const googleUid = searchParams.get('googleUid') || '';

  React.useEffect(() => {
      setIsClient(true);
      setDict(getDictionary(language).accountSetup);
  }, [language]);

  // Initialize schema based on current language dict
  const setupSchema = getSetupSchema(dict.validation);
  type SetupFormValues = z.infer<typeof setupSchema>;

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
    context: { dict: dict.validation }, // Pass validation dict to resolver context
  });

  // Update resolver if language/dict changes
  React.useEffect(() => {
      form.trigger();
  }, [dict, form]);

  const onSubmit = async (data: SetupFormValues) => {
    console.log('Account Setup attempt:', data);

    // TODO: Implement actual account creation logic
    // This should involve:
    // 1. Checking if the chosen username already exists in your user database.
    // 2. Securely hashing the chosen password.
    // 3. Storing the new user details (username, HASHED password, associated Google UID/email, initial role 'Pending') in your database.
    // 4. Sending a notification (e.g., email, in-app message) to users with 'Owner' or 'General Admin' roles.

    try {
        // Simulate API call to backend/service function
        await createUserAccount({
            username: data.username,
            password: data.password, // Send plain password - HASH ON SERVER
            email: email,
            googleUid: googleUid,
            displayName: displayName,
        });

        toast({
            title: dict.successTitle,
            description: dict.successDescription,
        });
        // Redirect to login page or a pending activation page
        router.push('/');

    } catch (error: any) {
        console.error("Account setup error:", error);
        // Handle specific errors (e.g., username exists)
        if (error.message === 'USERNAME_EXISTS') {
            form.setError('username', { type: 'manual', message: dict.usernameExists });
            toast({
                variant: 'destructive',
                title: dict.failTitle,
                description: dict.usernameExists,
            });
        } else {
            toast({
                variant: 'destructive',
                title: dict.failTitle,
                description: error.message || 'An unknown error occurred during setup.',
            });
        }
    }
  };

  // Redirect if required params are missing (basic check)
  React.useEffect(() => {
    if (isClient && (!email || !googleUid)) {
        console.warn("Missing email or googleUid for account setup. Redirecting.");
        toast({ variant: 'destructive', title: 'Setup Error', description: 'Missing required information.' });
        router.replace('/'); // Use replace to avoid history entry
    }
  }, [isClient, email, googleUid, router, toast]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {isClient ? dict.title : defaultDict.accountSetup.title}
          </CardTitle>
          <CardDescription className="text-center text-sm text-muted-foreground pt-2">
            {isClient ? dict.welcomeMessage.replace('{displayName}', displayName) : ''}
          </CardDescription>
           <CardDescription className="text-center text-xs text-muted-foreground">
              {isClient ? dict.info.replace('{email}', email) : ''}
           </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? dict.usernameLabel : defaultDict.accountSetup.usernameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={isClient ? dict.usernamePlaceholder : defaultDict.accountSetup.usernamePlaceholder} {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? dict.passwordLabel : defaultDict.accountSetup.passwordLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isClient ? dict.passwordPlaceholder : defaultDict.accountSetup.passwordPlaceholder}
                        {...field}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? dict.confirmPasswordLabel : defaultDict.accountSetup.confirmPasswordLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isClient ? dict.confirmPasswordPlaceholder : defaultDict.accountSetup.confirmPasswordPlaceholder}
                        {...field}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full accent-teal" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isClient ? (form.formState.isSubmitting ? dict.submittingButton : dict.submitButton) : defaultDict.accountSetup.submitButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
