// src/components/auth/login-page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
// Firebase Auth imports removed

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react'; // Import Loader2
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
// Separator, Alert, AlertTriangle, GoogleIcon removed as Google Sign-In is removed
import { verifyUserCredentials } from '@/services/user-service'; // Import local user service

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define schema using a function to access translations
const getLoginSchema = (dict: ReturnType<typeof getDictionary>['login']) => z.object({
  username: z.string().min(1, dict.validation.usernameRequired), // Use translated message
  password: z.string().min(1, dict.validation.passwordRequired), // Use translated message
});


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const [dict, setDict] = React.useState(defaultDict.login);
  const [isClient, setIsClient] = React.useState(false);
  // isGoogleLoading and firebaseError state removed

  React.useEffect(() => {
      setIsClient(true);
      setDict(getDictionary(language).login);
      // Firebase check removed
  }, [language]); // Rerun if language changes

  // Initialize schema based on current language dict
  const loginSchema = getLoginSchema(dict);
  type LoginFormValues = z.infer<typeof loginSchema>;


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
    context: { dict },
  });

  // Update resolver if language/dict changes
  React.useEffect(() => {
      if(isClient) form.trigger(); // Trigger validation on client side only after dict update
  }, [dict, form, isClient]);

  const onSubmit = async (data: LoginFormValues) => {
    console.log('Login attempt:', data.username);
    form.clearErrors(); // Clear previous errors

    try {
        const user = await verifyUserCredentials(data.username, data.password);

        if (user) {
            // TODO: Implement session management (e.g., set a secure cookie or token)
            console.log('Login successful for user:', user.username, 'Role:', user.role);
            toast({
                title: isClient ? dict.success : defaultDict.login.success,
                description: isClient ? dict.redirecting : defaultDict.login.redirecting,
            });
            router.push('/dashboard'); // Redirect to dashboard on success
        } else {
            console.log('Invalid credentials for:', data.username);
            toast({
                variant: 'destructive',
                title: isClient ? dict.fail : defaultDict.login.fail,
                description: isClient ? dict.invalidCredentials : defaultDict.login.invalidCredentials,
            });
            form.setError('username', { type: 'manual', message: ' ' }); // Add error marker without specific message
            form.setError('password', { type: 'manual', message: isClient ? dict.invalidCredentials : defaultDict.login.invalidCredentials });
            form.resetField('password');
        }
    } catch (error: any) {
        console.error('Login error:', error);
        toast({
            variant: 'destructive',
            title: isClient ? dict.fail : defaultDict.login.fail, // Use fail title for general error too
            description: error.message || 'An unexpected error occurred during login.',
        });
        form.resetField('password');
    }
  };

  // handleGoogleSignIn function removed

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {isClient ? dict.title : defaultDict.login.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Firebase error alert removed */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? dict.usernameLabel : defaultDict.login.usernameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={isClient ? dict.usernamePlaceholder : defaultDict.login.usernamePlaceholder} {...field} autoComplete="username" />
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
                    <FormLabel>{isClient ? dict.passwordLabel : defaultDict.login.passwordLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isClient ? dict.passwordPlaceholder : defaultDict.login.passwordPlaceholder}
                        {...field}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full accent-teal" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 {isClient ? (form.formState.isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>

          {/* Separator and Google Button Removed */}
          {/* <Separator className="my-6" /> */}
          {/* <Button ... onClick={handleGoogleSignIn} ... /> */}
          {/* <p className="mt-2 text-center text-xs text-muted-foreground"> ... </p> */}

        </CardContent>
      </Card>
    </div>
  );
}
