// src/components/dashboard/SettingsPageClient.tsx
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Link as LinkIcon, Unlink } from 'lucide-react';
import type { User, UpdateProfileData } from '@/types/user-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';

const defaultDict = getDictionary('en');

export default function SettingsPageClient() {
   const { language, setLanguage } = useLanguage();
   const { currentUser, setCurrentUser: updateAuthContextUser } = useAuth();
   const { toast } = useToast();
   const searchParams = useSearchParams();
   const router = useRouter();

   const [isClient, setIsClient] = React.useState(false);
   const [dict, setDict] = React.useState(defaultDict);
   const settingsDict = dict.settingsPage;

   const [username, setUsername] = React.useState('');
   const [email, setEmail] = React.useState('');
   const [whatsappNumber, setWhatsappNumber] = React.useState('');
   const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
   const [isDisconnectingGoogle, setIsDisconnectingGoogle] = React.useState(false);

   const successParam = searchParams.get('success');
   const errorParam = searchParams.get('error');
   const emailParam = searchParams.get('email');

   React.useEffect(() => {
       if (currentUser) {
            setUsername(currentUser.username);
            setEmail(currentUser.email || '');
            setWhatsappNumber(currentUser.whatsappNumber || '');
       }
   }, [currentUser]);

   React.useEffect(() => setIsClient(true), []);
   React.useEffect(() => { if (isClient) setDict(getDictionary(language)); }, [language, isClient]);

   React.useEffect(() => {
       if (isClient) {
           if (successParam === 'google_linked') {
               toast({ title: settingsDict.googleCalendarLinkSuccess, description: settingsDict.googleCalendarConnected });
               router.replace('/dashboard/settings', { scroll: false }); 
           }
           if (errorParam) {
               let description = settingsDict.toast[errorParam as keyof typeof settingsDict.toast] || decodeURIComponent(errorParam);
               if (errorParam === 'google_user_not_found' && emailParam) {
                   description = (settingsDict.googleCalendarUserNotFound || 'User with email {email} not found.').replace('{email}', decodeURIComponent(emailParam));
               }
               toast({ variant: 'destructive', title: settingsDict.googleCalendarError, description: description });
               router.replace('/dashboard/settings', { scroll: false });
           }
       }
   }, [isClient, successParam, errorParam, emailParam, router, toast, settingsDict]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'id');
    toast({ title: settingsDict.toast.languageChanged, description: settingsDict.toast.languageChangedDesc });
  };

  const handleProfileUpdate = async () => {
     if (!currentUser) return;
     if (!username.trim() || !email.trim() || !/\S+@\S+\.\S+/.test(email)) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.invalidEmail });
        return;
     }

    setIsUpdatingProfile(true);
    try {
        const payload: Omit<UpdateProfileData, 'userId' | 'profilePictureUrl'> = {
            username: username,
            displayName: username,
            email: email,
            whatsappNumber: whatsappNumber,
        };

        const response = await fetch(`/api/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        updateAuthContextUser(prev => prev ? { ...prev, ...result } : null);
        toast({ title: settingsDict.toast.success, description: settingsDict.toast.profileUpdated });

    } catch (error: any) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: error.message || settingsDict.toast.profileUpdateFailed });
    } finally {
        setIsUpdatingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentUser) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.fieldsRequired });
        return;
    }
    if (newPassword !== confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordsDontMatch });
        return;
    }
    if (newPassword.length < 6) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordTooShort });
        return;
    }

    setIsUpdatingPassword(true);
    try {
        const response = await fetch(`/api/users/${currentUser.id}/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        toast({ title: settingsDict.toast.success, description: settingsDict.toast.passwordUpdated });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: error.message || settingsDict.toast.passwordUpdateFailed });
    } finally {
        setIsUpdatingPassword(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!currentUser) return;
    setIsDisconnectingGoogle(true);
    try {
        const response = await fetch('/api/auth/google/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || settingsDict.googleCalendarErrorUnlinking);
        
        updateAuthContextUser(prev => prev ? { ...prev, ...result.user } : null);
        toast({ title: settingsDict.googleCalendarUnlinkSuccess });
    } catch (error: any) {
        toast({ variant: 'destructive', title: settingsDict.googleCalendarError, description: error.message });
    } finally {
        setIsDisconnectingGoogle(false);
    }
  };

  const getUserInitials = (name: string | undefined): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isClient || !currentUser) {
      return (
           <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
              <Card><CardHeader><Skeleton className="h-7 w-1/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                  <CardContent className="space-y-6">
                       <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                       <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                  </CardContent>
              </Card>
          </div>
      );
  }

  const isGoogleConnected = !!currentUser.googleRefreshToken;

  return (
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-xl md:text-2xl">{settingsDict.title}</CardTitle><CardDescription>{settingsDict.description}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">{settingsDict.profileCardTitle}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                     <div className="flex items-center space-y-4 sm:space-y-0 sm:space-x-4">
                          <Avatar className="h-20 w-20 border-2 border-primary/30"><AvatarImage src={currentUser.profilePictureUrl || undefined} alt={currentUser.displayName || currentUser.username} data-ai-hint="user avatar placeholder" /><AvatarFallback className="text-xl bg-muted">{getUserInitials(currentUser.displayName || currentUser.username)}</AvatarFallback></Avatar>
                          <div className="text-xs text-muted-foreground mt-1 text-center sm:text-left">{settingsDict.pictureHint.replace("Upload a new profile picture", "Profile picture upload is not available yet")}</div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                         <div className="space-y-1"><Label htmlFor="username">{settingsDict.usernameLabel}</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={settingsDict.usernamePlaceholder} disabled={isUpdatingProfile}/></div>
                         <div className="space-y-1"><Label htmlFor="display-name">{settingsDict.displayNameLabel}</Label><Input id="display-name" value={currentUser?.displayName || ''} readOnly disabled className="cursor-not-allowed bg-muted/50"/></div>
                         <div className="space-y-1"><Label htmlFor="email">{settingsDict.emailLabel}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={settingsDict.emailPlaceholder} disabled={isUpdatingProfile}/></div>
                         <div className="space-y-1"><Label htmlFor="whatsapp">{settingsDict.whatsappLabel}</Label><Input id="whatsapp" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder={settingsDict.whatsappPlaceholder} disabled={isUpdatingProfile}/></div>
                    </div>
                     <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile} className="w-full sm:w-auto">{isUpdatingProfile ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{settingsDict.updatingProfileButton}</>) : (settingsDict.updateProfileButton)}</Button>
                 </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-lg">{settingsDict.passwordCardTitle}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-1"><Label htmlFor="current-password">{settingsDict.currentPasswordLabel}</Label><Input id="current-password" type="password" placeholder={settingsDict.currentPasswordPlaceholder} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="current-password"/></div>
                     <div className="space-y-1"><Label htmlFor="new-password">{settingsDict.newPasswordLabel}</Label><Input id="new-password" type="password" placeholder={settingsDict.newPasswordPlaceholder} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="new-password"/></div>
                     <div className="space-y-1"><Label htmlFor="confirm-password">{settingsDict.confirmPasswordLabel}</Label><Input id="confirm-password" type="password" placeholder={settingsDict.confirmPasswordPlaceholder} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="new-password"/></div>
                     <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full sm:w-auto">{isUpdatingPassword ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{settingsDict.updatingPasswordButton}</>) : (settingsDict.updatePasswordButton)}</Button>
                 </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-lg">{settingsDict.googleCalendarCardTitle}</CardTitle></CardHeader>
                 <CardContent>
                    {isGoogleConnected ? (
                        <div className="space-y-4">
                            <p className="text-sm text-green-600 font-medium">{settingsDict.googleCalendarConnected}</p>
                            <Button variant="destructive" onClick={handleGoogleDisconnect} disabled={isDisconnectingGoogle} className="w-full sm:w-auto">{isDisconnectingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}{settingsDict.disconnectGoogleCalendar}</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">{settingsDict.googleCalendarConnectDesc}</p>
                            <Button asChild className="accent-teal w-full sm:w-auto"><a href="/api/auth/google/connect"><LinkIcon className="mr-2 h-4 w-4" />{settingsDict.connectGoogleCalendar}</a></Button>
                        </div>
                    )}
                 </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-lg">{settingsDict.languageCardTitle}</CardTitle><CardDescription>{settingsDict.languageCardDescription}</CardDescription></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="language-select">{settingsDict.languageSelectLabel}</Label>
                         <Select value={language} onValueChange={handleLanguageChange}>
                             <SelectTrigger id="language-select" className="w-full md:w-[280px]"><SelectValue placeholder={settingsDict.languageSelectPlaceholder} /></SelectTrigger>
                            <SelectContent><SelectItem value="en">{settingsDict.languageEnglish}</SelectItem><SelectItem value="id">{settingsDict.languageIndonesian}</SelectItem></SelectContent>
                          </Select>
                         <p className="text-xs text-muted-foreground">{settingsDict.languageSelectHint}</p>
                    </div>
                 </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-lg">{settingsDict.notificationsCardTitle}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1 flex-1"><span>{settingsDict.emailNotificationsLabel}</span><span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">{settingsDict.emailNotificationsHint}</span></Label>
                        <Switch id="email-notifications" defaultChecked disabled />
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1 flex-1"><span>{settingsDict.inAppNotificationsLabel}</span><span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">{settingsDict.inAppNotificationsHint}</span></Label>
                        <Switch id="in-app-notifications" defaultChecked disabled />
                    </div>
                 </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
