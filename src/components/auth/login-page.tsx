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
import { verifyUserCredentials } from '@/services/user-service'; // Import local user service
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Separator } from '@/components/ui/separator'; // Import Separator

// Mock Google Icon (replace with actual icon library if needed)
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mr-2 h-4 w-4">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.19.81-.65z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
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
  const { setCurrentUser } = useAuth(); // Get setCurrentUser from AuthContext
  const [dict, setDict] = React.useState(() => getDictionary(language).login); // Initialize dict directly
  const [isClient, setIsClient] = React.useState(false);
  const [isBypassing, setIsBypassing] = React.useState(false); // State for bypass button
  const [loginError, setLoginError] = React.useState<string | null>(null); // State for specific login errors
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false); // State for Google Sign-In loading

  React.useEffect(() => {
      setIsClient(true);
      // Firebase check removed, assuming local auth only for now
  }, []);

   React.useEffect(() => {
       setDict(getDictionary(language).login); // Update dict when language changes
   }, [language]);

  // Initialize schema based on current language dict
  const loginSchema = getLoginSchema(dict);
  type LoginFormValues = z.infer<typeof loginSchema>;


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
    context: { dict: dict.validation }, // Pass validation part of dict
  });

  // Re-validate form if language/dict changes
   React.useEffect(() => {
       if (isClient) {
           form.trigger(); // Trigger validation on client side only after dict update
           setLoginError(null); // Clear error when language changes
       }
   }, [dict, form, isClient]);

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
                title: dict.success,
                description: dict.redirecting,
            });
            router.push('/dashboard'); // Redirect to dashboard on success
        } else {
            console.log('Invalid credentials for:', data.username);
            setLoginError(dict.invalidCredentials); // Set custom error message
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
            title: dict.fail,
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
                    title: dict.bypassTitle,
                    description: dict.redirecting,
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
                 };
                 setCurrentUser(fallbackAdmin);
                  toast({
                     title: dict.bypassTitle,
                     description: dict.redirecting,
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

   // Placeholder for Google Sign-In Logic
   const handleGoogleSignIn = async () => {
       setIsGoogleLoading(true);
       setLoginError(null);
       console.log("Attempting Google Sign-In...");
        // TODO: Implement Firebase Google Sign-In Flow
        // 1. Import `signInWithPopup`, `GoogleAuthProvider` from 'firebase/auth'
        // 2. Import `auth`, `isFirebaseInitialized` from '@/lib/firebase'
        // 3. Check `isFirebaseInitialized`
        // 4. Create provider: `const provider = new GoogleAuthProvider();`
        // 5. Call `signInWithPopup(auth, provider)`
        // 6. Handle result:
        //    - On success: Get user info (result.user). Call `findOrCreateUserByGoogleUid`.
        //      Handle potential 'PENDING_ACTIVATION' or 'EMAIL_EXISTS_NON_GOOGLE' errors.
        //      If successful & activated, call `setCurrentUser` and redirect.
        //    - On error: Show toast, setLoginError.
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        setLoginError("Google Sign-In is not implemented yet."); // Placeholder error
        toast({ variant: 'destructive', title: 'Not Implemented', description: 'Google Sign-In feature is under development.'});
        setIsGoogleLoading(false);
   };


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
               <AlertTitle>{dict.fail}</AlertTitle>
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
              <Button type="submit" className="w-full accent-teal" disabled={form.formState.isSubmitting || isBypassing || isGoogleLoading}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 {isClient ? (form.formState.isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>

          {/* Separator */}
           <Separator className="my-6" />

            {/* Google Sign-In Button */}
           <Button
             variant="outline"
             className="w-full"
             onClick={handleGoogleSignIn}
             disabled={isGoogleLoading || form.formState.isSubmitting || isBypassing}
            >
             {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {isClient ? dict.googleSignIn : defaultDict.login.googleSignIn}
           </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
                {isClient ? dict.googleSignInHint : defaultDict.login.googleSignInHint}
            </p>


          {/* Bypass Login Button - Development Only */}
           {process.env.NODE_ENV === 'development' && (
             <>
                <Separator className="my-6" />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBypassLogin}
                  disabled={isBypassing || form.formState.isSubmitting || isGoogleLoading}
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
    </div>
  );
}
