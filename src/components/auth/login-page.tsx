// src/components/auth/login-page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; // Import Firebase Auth modules
import { app as firebaseApp, isFirebaseInitialized, auth as firebaseAuth } from '@/lib/firebase'; // Import Firebase app instance and initialization status

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
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { AlertTriangle } from 'lucide-react'; // Import icon for alert

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
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false); // Loading state for Google button
  const [firebaseError, setFirebaseError] = React.useState<string | null>(null); // State for Firebase error

  React.useEffect(() => {
      setIsClient(true);
      setDict(getDictionary(language).login);
      // Check Firebase status on client mount
      if (!isFirebaseInitialized) {
          // Use a generic message, detailed error is in console
          setFirebaseError(dict.firebaseConfigError || defaultDict.login.firebaseConfigError);
      }
  }, [language, dict.firebaseConfigError]); // Rerun if language changes

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
      form.trigger();
  }, [dict, form]);

  // TODO: Implement actual authentication logic using Firebase or other methods
  const onSubmit = (data: LoginFormValues) => {
    console.log('Login attempt:', data);
    // Simulate login success/failure
    // Replace with actual authentication call
    // Accept the user 'admin'/'admin' defined in `users/page.tsx` mock data
    // !! In a real app, this should check against a secure user database/auth provider !!
    if (data.username === 'admin' && data.password === 'admin') {
      toast({
        title: dict.success,
        description: dict.redirecting,
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: dict.fail,
        description: dict.invalidCredentials,
      });
       form.resetField('password');
    }
  };

  const handleGoogleSignIn = async () => {
    // Double check initialization status before proceeding
    if (!isFirebaseInitialized || !firebaseAuth || !firebaseApp) {
        console.error("Firebase not initialized. Cannot perform Google Sign-In.");
        toast({
             variant: 'destructive',
             title: 'Initialization Error',
             description: firebaseError || 'Firebase is not configured correctly.',
        });
        setFirebaseError(firebaseError || dict.firebaseConfigError || defaultDict.login.firebaseConfigError); // Ensure error is shown
        return;
    }

    setIsGoogleLoading(true);
    setFirebaseError(null); // Clear previous errors
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(firebaseAuth, provider); // Use imported auth instance
      const user = result.user;
      console.log('Google Sign-In Successful:', user);
      toast({
        title: dict.googleSuccess,
        description: dict.googleSetupPrompt,
      });

      // Redirect to setup page, passing Google user info (minimal example)
      // In a real app, use state management or secure tokens
      router.push(`/auth/setup-account?email=${encodeURIComponent(user.email || '')}&displayName=${encodeURIComponent(user.displayName || '')}&googleUid=${encodeURIComponent(user.uid)}`);

    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      // Handle specific Firebase errors if needed
      let description = error.message || dict.googleErrorDefault;
      if (error.code === 'auth/popup-closed-by-user') {
          description = dict.googlePopupClosed;
      } else if (error.code === 'auth/cancelled-popup-request') {
          description = dict.googlePopupCancelled;
      }
      toast({
        variant: 'destructive',
        title: dict.googleFail,
        description: description,
      });
      setIsGoogleLoading(false);
    }
    // No need to set loading to false on success because we navigate away
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
          {isClient && firebaseError && (
              <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{dict.firebaseErrorTitle || 'Configuration Error'}</AlertTitle>
                  <AlertDescription>
                      {firebaseError}
                  </AlertDescription>
              </Alert>
          )}
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
                <LogIn className="mr-2 h-4 w-4" />
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
              disabled={isGoogleLoading || !isClient || !isFirebaseInitialized} // Disable if not initialized or loading
              aria-disabled={!isClient || !isFirebaseInitialized} // Indicate disabled state for accessibility
              title={isClient && !isFirebaseInitialized ? firebaseError || 'Google Sign-In disabled due to configuration error' : ''} // Tooltip
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> // Use Loader2 icon
              ) : (
                <GoogleIcon />
              )}
               <span className="ml-2">{isClient ? (isGoogleLoading ? dict.googleLoading : dict.googleSignInButton) : defaultDict.login.googleSignInButton}</span>
            </Button>

        </CardContent>
      </Card>
    </div>
  );
}
