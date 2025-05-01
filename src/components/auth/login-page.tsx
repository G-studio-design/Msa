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

// Define schema using a function to access translations
const getLoginSchema = (dict: ReturnType<typeof getDictionary>['login']) => z.object({
  username: z.string().min(1, dict.invalidCredentials), // Use translated message
  password: z.string().min(1, dict.invalidCredentials), // Use translated message
});


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter(); // Initialize router
  const { language } = useLanguage(); // Get current language
  const dict = getDictionary(language); // Get dictionary for the current language
  const loginDict = dict.login; // Specific dictionary section for login

  // Initialize schema based on current language
  const loginSchema = getLoginSchema(loginDict);
  type LoginFormValues = z.infer<typeof loginSchema>;


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // Use the dynamic schema
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // TODO: Implement actual authentication logic
  const onSubmit = (data: LoginFormValues) => {
    console.log('Login attempt:', data);
    // Simulate login success/failure
    // Replace with actual authentication call
    // Accept the newly added user 'admin'/'admin'
    if ((data.username === 'admin' && data.password === 'admin') || (data.username === 'testuser' && data.password === 'password')) { // Added 'admin' user check
      toast({
        title: loginDict.success,
        description: loginDict.redirecting,
      });
      // Redirect user to dashboard
       router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: loginDict.fail,
        description: loginDict.invalidCredentials,
      });
       form.resetField('password'); // Clear password field on failure
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {loginDict.title}
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
                    <FormLabel>{loginDict.usernameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={loginDict.usernamePlaceholder} {...field} autoComplete="username" />
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
                    <FormLabel>{loginDict.passwordLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={loginDict.passwordPlaceholder}
                        {...field}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full accent-teal" disabled={form.formState.isSubmitting}>
                <LogIn className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? loginDict.loggingIn : loginDict.loginButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
