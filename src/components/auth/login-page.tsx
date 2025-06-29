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
import { LogIn, Loader2, AlertTriangle } from 'lucide-react'; // Removed ShieldCheck
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { verifyUserCredentials, type User } from '@/services/user-service'; // Import local user service functions
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Separator } from '@/components/ui/separator'; // Keep Separator if used elsewhere, remove if not

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
  const [dict, setDict] = React.useState(defaultDict.login); // Initialize with default dict section
  const [isClient, setIsClient] = React.useState(false);
  // Removed isBypassing state
  const [loginError, setLoginError] = React.useState<string | null>(null); // State for specific login errors
  const [isSubmitting, setIsSubmitting] = React.useState(false); // State for login submission


  React.useEffect(() => {
      setIsClient(true);
  }, []);

   React.useEffect(() => {
       const newDict = getDictionary(language);
       setDict(newDict.login); // Update login dict
   }, [language]);

  // Initialize schemas based on current language dict using useMemo
   const loginSchema = React.useMemo(() => {
        // Use the correct validation object from the dict
        const validationDict = dict?.validation ?? defaultDict.login.validation;
        return getLoginSchema(validationDict);
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

  // Re-validate forms if language/dict changes
   React.useEffect(() => {
       if (isClient) {
           form.trigger(); // Trigger validation on client side only after dict update
           setLoginError(null); // Clear error when language changes
       }
   }, [dict, form, isClient]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true); // Set submitting state to true
    console.log('Login attempt:', data.username);
    form.clearErrors(); // Clear previous zod errors
    setLoginError(null); // Clear previous custom error

    try {
        const user = await verifyUserCredentials(data.username, data.password);

        if (user) {
            console.log('Login successful for user:', user.username, 'Role:', user.role);
            // --- Set Current User in Context ---
             // Password should not be included in user object returned by verifyUserCredentials
             setCurrentUser(user); // Assuming verifyUserCredentials returns user without password
            // --- End Set Current User ---
            toast({
                title: dict.success,
                description: dict.redirecting,
            });
            router.push('/dashboard'); // Redirect to dashboard on success
            // No need to set isSubmitting to false here as we are navigating away
        } else {
            console.log('Invalid credentials for:', data.username);
            setLoginError(dict.invalidCredentials); // Set custom error message
            form.setError('username', { type: 'manual', message: ' ' }); // Add error marker without specific message
            form.setError('password', { type: 'manual', message: ' '}); // Add error marker
            form.resetField('password');
            setIsSubmitting(false); // Reset submitting state on failure
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
        setIsSubmitting(false); // Reset submitting state on error
    }
  };

  // Removed handleBypassLogin function


  return (
     <div className="flex min-h-screen items-center justify-center bg-secondary p-4"> {/* Added padding */}
       <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
           <CardTitle className="text-center text-2xl font-bold text-primary">
            {isClient ? dict.title : defaultDict.login.title}
          </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
                {isClient ? dict.description : defaultDict.login.description}
            </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Input
                         placeholder={isClient ? dict.usernamePlaceholder : defaultDict.login.usernamePlaceholder}
                         {...field}
                         autoComplete="off"
                         disabled={isSubmitting} // Removed isBypassing from disabled state
                      />
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
                        disabled={isSubmitting} // Removed isBypassing from disabled state
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                 type="submit"
                 className="w-full accent-teal"
                 disabled={isSubmitting} // Removed isBypassing from disabled state
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 {isClient ? (isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>

           {/* Removed Bypass Login section */}

        </CardContent>
      </Card>

    </div>
  );
}
