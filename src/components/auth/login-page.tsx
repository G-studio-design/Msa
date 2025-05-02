// src/components/auth/login-page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert components
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { verifyUserCredentials, type User } from '@/services/user-service'; // Import local user service functions
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Separator } from '@/components/ui/separator'; // Import Separator
// Firebase imports removed - No longer needed
// import { getAuth, GoogleAuthProvider, signInWithPopup, type UserCredential } from "firebase/auth";
// import { app as firebaseApp, auth as firebaseAuth, isFirebaseInitialized, initializationError } from "@/lib/firebase";
// import { findOrCreateUserByGoogleUid, activateUser } from '@/services/user-service';
// import { notifyUsersByRole } from '@/services/notification-service'; // Import notification service


// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define schema using a function to access translations
const getLoginSchema = (dictValidation: ReturnType<typeof getDictionary>['login']['validation']) => z.object({
    username: z.string().min(1, dictValidation.usernameRequired), // Use translated message
    password: z.string().min(1, dictValidation.passwordRequired), // Use translated message
});


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const { setCurrentUser } = useAuth(); // Get setCurrentUser from AuthContext
  const [dict, setDict] = React.useState(() => getDictionary(language).login); // Initialize dict directly
  const [isClient, setIsClient] = React.useState(false);
  const [isBypassing, setIsBypassing] = React.useState(false); // State for bypass button
  const [loginError, setLoginError] = React.useState<string | null>(null); // State for specific login errors
  // Removed Google Sign-In and Account Setup states

  React.useEffect(() => {
      setIsClient(true);
  }, []);

   React.useEffect(() => {
       const newDict = getDictionary(language);
       setDict(newDict.login); // Update login dict
       // accountSetupDict removed
   }, [language]);

  // Initialize schemas based on current language dict using useMemo
   const loginSchema = React.useMemo(() => {
        if (!dict?.validation) {
             console.warn("Login validation dictionary is not available yet.");
              // Return a base schema using default English messages as fallback
              return z.object({
                username: z.string().min(1, defaultDict.login.validation.usernameRequired),
                password: z.string().min(1, defaultDict.login.validation.passwordRequired),
              });
        }
        return getLoginSchema(dict.validation);
   }, [dict]); // Re-create schema only when dict changes

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // Pass the memoized schema
    defaultValues: {
      username: '',
      password: '',
    },
    context: { dict: dict?.validation }, // Pass validation context
  });

  // accountSetupForm removed

  // Re-validate forms if language/dict changes
   React.useEffect(() => {
       if (isClient) {
           form.trigger(); // Trigger validation on client side only after dict update
           // accountSetupForm.trigger removed
           setLoginError(null); // Clear error when language changes
       }
   }, [dict, form, isClient]); // Removed accountSetupForm dependency

  const onSubmit = async (data: LoginFormValues) => {
    console.log('Login attempt:', data.username);
    form.clearErrors(); // Clear previous zod errors
    setLoginError(null); // Clear previous custom error

    try {
        const user = await verifyUserCredentials(data.username, data.password);

        if (user) {
            console.log('Login successful for user:', user.username, 'Role:', user.role);
            // --- Set Current User in Context ---
             // Ensure password is not stored in context/sessionStorage
             const { password, ...userToStore } = user;
             setCurrentUser(userToStore);
            // --- End Set Current User ---
            toast({
                title: isClient && dict ? dict.success : defaultDict.login.success,
                description: isClient && dict ? dict.redirecting : defaultDict.login.redirecting,
            });
            router.push('/dashboard'); // Redirect to dashboard on success
        } else {
            console.log('Invalid credentials for:', data.username);
            setLoginError(isClient && dict ? dict.invalidCredentials : defaultDict.login.invalidCredentials); // Set custom error message
            form.setError('username', { type: 'manual', message: ' ' }); // Add error marker without specific message
            form.setError('password', { type: 'manual', message: ' '}); // Add error marker
            form.resetField('password');
        }
    } catch (error: any) {
        console.error('Login error:', error);
        const errorMessage = error.message || 'An unexpected error occurred during login.';
         setLoginError(errorMessage); // Set custom error message
         toast({
            variant: 'destructive',
            title: isClient && dict ? dict.fail : defaultDict.login.fail,
            description: errorMessage,
        });
        form.resetField('password');
    }
  };

  const handleBypassLogin = async () => {
      setIsBypassing(true);
      setLoginError(null); // Clear any previous errors
      console.log('Bypassing login as admin (Development Only)');

      // Simulate fetching a default admin user (use a specific known admin if available)
      // In a real bypass, you might skip verification entirely or use a fixed admin user object
      try {
            // Attempt to verify a known admin user (e.g., 'admin' / 'admin123' if exists)
            // Or fetch a specific user known to be an admin directly
            // Replace this with a more robust bypass user fetching if needed
             const adminUser = await verifyUserCredentials('admin', 'admin123'); // Try known credentials

            if (adminUser) {
                const { password, ...adminToStore } = adminUser;
                setCurrentUser(adminToStore); // Set the fetched admin user
                 toast({
                    title: isClient && dict ? dict.bypassTitle : defaultDict.login.bypassTitle,
                    description: isClient && dict ? dict.redirecting : defaultDict.login.redirecting,
                    variant: 'default',
                    duration: 2000,
                });
                router.push('/dashboard');
            } else {
                 // Fallback if 'admin'/'admin123' doesn't work
                 const fallbackAdmin: User = { // Define a fallback Admin structure if needed
                     id: 'bypass-admin',
                     username: 'bypass_admin',
                     role: 'General Admin', // Or 'Owner' or 'Admin Developer'
                     displayName: 'Bypass Admin',
                     email: 'bypass@example.com',
                     password: 'bypass_password' // Add dummy password if needed by type
                 };
                 setCurrentUser(fallbackAdmin);
                  toast({
                     title: isClient && dict ? dict.bypassTitle : defaultDict.login.bypassTitle,
                     description: isClient && dict ? dict.redirecting : defaultDict.login.redirecting,
                     variant: 'default',
                     duration: 2000,
                 });
                 router.push('/dashboard');
                console.warn("Bypassed login with fallback admin object as default admin credentials failed.");
            }

      } catch (error) {
         console.error("Error during bypass login:", error);
         toast({
             variant: 'destructive',
             title: 'Bypass Failed',
             description: 'Could not simulate admin login.',
         });
          setIsBypassing(false);
      }
      // No actual user verification or session creation happens here beyond setting context
  };

  // --- Google Sign-In Logic Removed ---
  // const handleGoogleSignIn = async () => { ... };
  // const onAccountSetupSubmit = async (data: AccountSetupFormValues) => { ... };


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {isClient ? dict.title : defaultDict.login.title}
          </CardTitle>
           {/* Add description if needed */}
            <CardDescription className="text-center text-muted-foreground">
                {isClient ? dict.description : defaultDict.login.description}
            </CardDescription>
        </CardHeader>
        <CardContent>
           {/* Display login error */}
           {loginError && (
             <Alert variant="destructive" className="mb-4">
               <AlertTriangle className="h-4 w-4" />
               <AlertTitle>{isClient ? dict.fail : defaultDict.login.fail}</AlertTitle>
               <AlertDescription>{loginError}</AlertDescription>
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
              <Button type="submit" className="w-full accent-teal" disabled={form.formState.isSubmitting || isBypassing}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 {isClient ? (form.formState.isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>

           {/* Google Sign-In Button Removed */}
           {/* <Separator className="my-6" /> */}
           {/* ... Google Button ... */}

          {/* Bypass Login Button - Development Only */}
           {process.env.NODE_ENV === 'development' && (
             <>
                <Separator className="my-6" />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBypassLogin}
                  disabled={isBypassing || form.formState.isSubmitting}
                >
                  {isBypassing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                   {isClient ? (isBypassing ? dict.bypassing : dict.bypassButton) : defaultDict.login.bypassButton}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    (Development Only)
                </p>
             </>
            )}

        </CardContent>
      </Card>

       {/* Account Setup Dialog Removed */}

    </div>
  );
}
