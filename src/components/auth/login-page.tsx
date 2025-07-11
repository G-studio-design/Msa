// src/components/auth/login-page.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import type { User } from '@/types/user-types';
import { useAuth } from '@/context/AuthContext';

const defaultDict = getDictionary('en');

const getLoginSchema = (dictValidation: ReturnType<typeof getDictionary>['login']['validation']) => z.object({
    username: z.string().min(1, dictValidation.usernameRequired),
    password: z.string().min(1, dictValidation.passwordRequired),
});


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const { setCurrentUser } = useAuth();
  const [dict, setDict] = React.useState(defaultDict.login);
  const [isClient, setIsClient] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
      setIsClient(true);
  }, []);

   React.useEffect(() => {
       const newDict = getDictionary(language);
       setDict(newDict.login);
   }, [language]);

   const loginSchema = React.useMemo(() => {
        const validationDict = dict?.validation ?? defaultDict.login.validation;
        return getLoginSchema(validationDict);
   }, [dict]);

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
    context: { dict: dict?.validation },
  });

   React.useEffect(() => {
       if (isClient) {
           form.trigger();
           setLoginError(null);
       }
   }, [dict, form, isClient]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    form.clearErrors();
    setLoginError(null);

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'An unexpected error occurred.');
        }

        console.log('Login successful for user:', result.username, 'Role:', result.role);
        setCurrentUser(result as User);
        toast({
            title: dict.success,
            description: dict.redirecting,
        });
        router.push('/dashboard');

    } catch (error: any) {
        console.error('Login error:', error);
        const errorMessage = error.message || dict.invalidCredentials;
        setLoginError(errorMessage);
        if (errorMessage.toLowerCase().includes('invalid')) {
            form.setError('username', { type: 'manual', message: ' ' });
            form.setError('password', { type: 'manual', message: ' '});
        }
        form.resetField('password');
        setIsSubmitting(false);
    }
  };

  return (
     <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
       <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
           <div className="flex justify-center mb-4">
               <Image src="/msarch-logo.png" alt="MsArch App Logo" width={64} height={64} />
           </div>
           <CardTitle className="text-center text-2xl font-bold text-primary">
            MsArch App
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
                         disabled={isSubmitting}
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
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                 type="submit"
                 className="w-full accent-teal"
                 disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                 {isClient ? (isSubmitting ? dict.loggingIn : dict.loginButton) : defaultDict.login.loginButton}
              </Button>
            </form>
          </Form>

        </CardContent>
      </Card>

    </div>
  );
}
