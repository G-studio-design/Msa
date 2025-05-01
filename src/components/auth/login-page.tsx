// src/components/auth/login-page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
// import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Firebase Auth no longer used
// import { app as firebaseApp, isFirebaseInitialized, auth as firebaseAuth } from '@/lib/firebase'; // Firebase no longer used

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
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { AlertTriangle } from 'lucide-react'; // Import icon for alert
import { verifyUserCredentials } from '@/services/user-service'; // Import local user service

// Google Icon SVG (simple version)
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
    </svg>
);

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
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false); // Still keep for UI disabling
  // const [firebaseError, setFirebaseError] = React.useState<string | null>(null); // Firebase errors no longer relevant

  React.useEffect(() => {
      setIsClient(true);
      setDict(getDictionary(language).login);
      // Firebase check no longer needed
      // if (!isFirebaseInitialized) {
      //     setFirebaseError(dict.firebaseConfigError || defaultDict.login.firebaseConfigError);
      // }
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
                title: dict.success,
                description: dict.redirecting,
            });
            router.push('/dashboard'); // Redirect to dashboard on success
        } else {
            console.log('Invalid credentials for:', data.username);
            toast({
                variant: 'destructive',
                title: dict.fail,
                description: dict.invalidCredentials,
            });
            form.setError('username', { type: 'manual', message: ' ' }); // Add error marker without specific message
            form.setError('password', { type: 'manual', message: dict.invalidCredentials });
            form.resetField('password');
        }
    } catch (error: any) {
        console.error('Login error:', error);
        toast({
            variant: 'destructive',
            title: 'Login Error',
            description: 'An unexpected error occurred during login.',
        });
        form.resetField('password');
    }
  };

  const handleGoogleSignIn = async () => {
      // Google Sign-In is disabled as Firebase is not configured
      setIsGoogleLoading(true); // Keep UI feedback
      console.warn("Google Sign-In is currently disabled because Firebase is not configured for this project.");
      toast({
          variant: 'destructive',
          title: 'Feature Disabled',
          description: 'Google Sign-In is not available.',
      });
      // Simulate a delay then stop loading
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsGoogleLoading(false);

    // Original Firebase logic removed
    // if (!isFirebaseInitialized || !firebaseAuth || !firebaseApp) { ... }
    // const provider = new GoogleAuthProvider();
    // try { const result = await signInWithPopup(firebaseAuth, provider); ... }
    // catch (error: any) { ... }
  };

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
          {/* {isClient && firebaseError && ( ... )} */}
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

          {/* Separator and Google Button */}
           <Separator className="my-6" />

           <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || !isClient} // Disable if not client or loading
              aria-disabled={!isClient} // Indicate disabled state for accessibility
              title={isClient ? dict.googleSignInDisabled : ''} // Tooltip indicating disabled state
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
               <span className="ml-2">{isClient ? (isGoogleLoading ? dict.googleLoading : dict.googleSignInButton) : defaultDict.login.googleSignInButton}</span>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
                {isClient ? dict.googleSignInHint : ''}
            </p>

        </CardContent>
      </Card>
    </div>
  );
}
