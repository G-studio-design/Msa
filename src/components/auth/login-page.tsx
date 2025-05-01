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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react'; // Using Lucide for icon
import { useRouter } from 'next/navigation'; // Import useRouter
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define schema using a function to access translations
const getLoginSchema = (dict: ReturnType<typeof getDictionary>['login']) => z.object({
  username: z.string().min(1, dict.invalidCredentials), // Use translated message
  password: z.string().min(1, dict.invalidCredentials), // Use translated message
});


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter(); // Initialize router
  const { language } = useLanguage(); // Get current language
  const [dict, setDict] = React.useState(defaultDict.login); // Initialize with default dict section
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount

  React.useEffect(() => {
      setIsClient(true); // Component has mounted client-side
      setDict(getDictionary(language).login); // Update dictionary based on context language
  }, [language]); // Re-run if language changes


  // Initialize schema based on current language dict
  const loginSchema = getLoginSchema(dict);
  type LoginFormValues = z.infer<typeof loginSchema>;


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // Use the dynamic schema
    defaultValues: {
      username: '',
      password: '',
    },
    context: { dict }, // Pass dict to resolver context if needed (unlikely for this simple schema)
  });

  // Update resolver if language/dict changes (to get new validation messages)
  React.useEffect(() => {
      form.trigger(); // Re-validate on language change if needed
  }, [dict, form]);


  // TODO: Implement actual authentication logic
  const onSubmit = (data: LoginFormValues) => {
    console.log('Login attempt:', data);
    // Simulate login success/failure
    // Replace with actual authentication call
    // Accept the newly added user 'admin'/'admin'
    if ((data.username === 'admin' && data.password === 'admin') || (data.username === 'testuser' && data.password === 'password')) { // Added 'admin' user check
      toast({
        title: dict.success,
        description: dict.redirecting,
      });
      // Redirect user to dashboard
       router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: dict.fail,
        description: dict.invalidCredentials,
      });
       form.resetField('password'); // Clear password field on failure
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {/* Render title only on client to avoid mismatch */}
            {isClient ? dict.title : defaultDict.login.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    {/* Render label only on client */}
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
                     {/* Render label only on client */}
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
                <LogIn className="mr-2 h-4 w-4" /> {/* Render button text only on client */}
                 {isClient ? (form.formState.isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
