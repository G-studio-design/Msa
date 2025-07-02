
'use client';

// src/app/dashboard/settings/page.tsx
import * as React from 'react';
import Image from 'next/image'; // Import next/image
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
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Loader2, Upload, Link as LinkIcon, Unlink } from 'lucide-react'; // Import icons
import { updatePassword, updateUserProfile, clearUserGoogleTokens, type User, type UpdateProfileData } from '@/services/user-service'; // Import user service functions
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useSearchParams, useRouter } from 'next/navigation'; // Import for reading URL params

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function SettingsPage() {
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
   const [currentProfilePictureUrl, setCurrentProfilePictureUrl] = React.useState<string | null | undefined>(undefined);
   const [profilePicturePreview, setProfilePicturePreview] = React.useState<string | null>(null);
   const [isUploading, setIsUploading] = React.useState(false);
   const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
   const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

   const [isDisconnectingGoogle, setIsDisconnectingGoogle] = React.useState(false);

   // FIX: Extract search param values outside useEffect
   const successParam = searchParams.get('success');
   const errorParam = searchParams.get('error');
   const emailParam = searchParams.get('email');


   React.useEffect(() => {
       if (currentUser) {
            setUsername(currentUser.username);
            setEmail(currentUser.email || '');
            setWhatsappNumber(currentUser.whatsappNumber || '');
            setCurrentProfilePictureUrl(currentUser.profilePictureUrl);
            setProfilePicturePreview(null);
            setSelectedFile(null);
       }
   }, [currentUser]);

   React.useEffect(() => {
       setIsClient(true);
   }, []);

   React.useEffect(() => {
       if (isClient) {
            setDict(getDictionary(language));
       }
   }, [language, isClient]);

   // Effect to show toast messages based on URL query params from OAuth redirect
   React.useEffect(() => {
       if (isClient) {
           if (successParam === 'google_linked') {
               toast({ title: settingsDict.googleCalendarLinkSuccess, description: settingsDict.googleCalendarConnected });
               router.replace('/dashboard/settings', { scroll: false }); // Clean URL
           }
           if (errorParam) {
               let description = settingsDict.googleCalendarOAuthFailed;
               if (errorParam === 'google_user_not_found' && emailParam) {
                   description = (settingsDict.googleCalendarUserNotFound || 'User with email {email} not found.').replace('{email}', decodeURIComponent(emailParam));
               } else if (settingsDict.toast[errorParam as keyof typeof settingsDict.toast]) {
                   description = settingsDict.toast[errorParam as keyof typeof settingsDict.toast];
               } else if (errorParam) {
                    description = decodeURIComponent(errorParam);
               }
               toast({ variant: 'destructive', title: settingsDict.googleCalendarError, description: description });
               router.replace('/dashboard/settings', { scroll: false }); // Clean URL
           }
       }
   }, [isClient, successParam, errorParam, emailParam, router, toast, settingsDict]); // FIX: Use extracted values in dependency array

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'id');
    toast({ title: settingsDict.toast.languageChanged, description: settingsDict.toast.languageChangedDesc });
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
           setSelectedFile(file);
           if (typeof window !== 'undefined' && window.FileReader) {
               const reader = new FileReader();
               reader.onloadend = () => {
                   if (typeof reader.result === 'string') setProfilePicturePreview(reader.result);
               };
               reader.readAsDataURL(file);
           }
       } else {
           setSelectedFile(null);
           setProfilePicturePreview(null);
       }
       if (event.target) event.target.value = '';
   };

  const handleProfileUpdate = async () => {
     if (!currentUser) return;
     if (!username.trim() || !email.trim()) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.requiredFields });
         return;
     }
     if (!/\S+@\S+\.\S+/.test(email)) {
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.invalidEmail });
         return;
     }

    setIsUpdatingProfile(true);
    setIsUploading(!!selectedFile);

    let uploadedPictureUrl = currentProfilePictureUrl;

    try {
        if (selectedFile) {
             console.warn("Image compression/upload simulation. Using placeholder URL.");
             await new Promise(resolve => setTimeout(resolve, 800));
             uploadedPictureUrl = `https://picsum.photos/seed/${selectedFile.name}${Date.now()}/200`;
             setIsUploading(false);
        }

        const updatedUserData: UpdateProfileData = {
            userId: currentUser.id,
            username: username,
            role: currentUser.role,
            email: email,
            whatsappNumber: whatsappNumber,
            displayName: username,
            profilePictureUrl: uploadedPictureUrl,
        };

        const updatedUser = await updateUserProfile(updatedUserData);
        if (updatedUser) {
            updateAuthContextUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setCurrentProfilePictureUrl(updatedUser.profilePictureUrl || undefined);
        }
        setProfilePicturePreview(null);
        setSelectedFile(null);
        toast({ title: settingsDict.toast.success, description: settingsDict.toast.profileUpdated });

    } catch (error: any) {
        let description = settingsDict.toast.profileUpdateFailed;
        if (error.message === 'USERNAME_EXISTS') description = settingsDict.toast.usernameExistsError;
        toast({ variant: 'destructive', title: settingsDict.toast.error, description });
    } finally {
        setIsUploading(false);
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
        await updatePassword({ userId: currentUser.id, currentPassword, newPassword });
        toast({ title: settingsDict.toast.success, description: settingsDict.toast.passwordUpdated });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } catch (error: any) {
        let description = settingsDict.toast.passwordUpdateFailed;
        if (error.message === 'PASSWORD_MISMATCH') description = settingsDict.toast.passwordMismatchError;
        toast({ variant: 'destructive', title: settingsDict.toast.error, description });
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
        if (!response.ok) {
            throw new Error(result.error || settingsDict.googleCalendarErrorUnlinking);
        }
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
        <CardHeader>
             <CardTitle className="text-xl md:text-2xl">{settingsDict.title}</CardTitle>
            <CardDescription>{settingsDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Card>
                 <CardHeader>
                     <CardTitle className="text-lg">{settingsDict.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                          <Avatar className="h-20 w-20 border-2 border-primary/30">
                              <AvatarImage
                                  src={profilePicturePreview || currentProfilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/100`}
                                  key={profilePicturePreview || currentProfilePictureUrl}
                                  alt={currentUser.displayName || currentUser.username}
                                  data-ai-hint="user avatar placeholder"
                              />
                              <AvatarFallback className="text-xl bg-muted">{getUserInitials(currentUser.displayName || currentUser.username)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-center sm:items-start">
                             <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                                 <Button asChild variant="outline" size="sm" disabled={isUploading || isUpdatingProfile}>
                                      <span>
                                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                          {isUploading ? settingsDict.uploadingPictureButton : settingsDict.changePictureButton}
                                      </span>
                                 </Button>
                             </Label>
                              <Input id="profile-picture-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleProfilePictureChange} disabled={isUploading || isUpdatingProfile} />
                             <p className="text-xs text-muted-foreground mt-1 text-center sm:text-left">{settingsDict.pictureHint}</p>
                              {selectedFile && !isUploading && (<p className="text-xs text-muted-foreground mt-1 text-center sm:text-left">Selected: {selectedFile.name}</p>)}
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                         <div className="space-y-1"><Label htmlFor="username">{settingsDict.usernameLabel}</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={settingsDict.usernamePlaceholder} disabled={isUpdatingProfile || isUploading}/></div>
                         <div className="space-y-1"><Label htmlFor="display-name">{settingsDict.displayNameLabel}</Label><Input id="display-name" value={currentUser?.displayName || ''} readOnly disabled className="cursor-not-allowed bg-muted/50"/></div>
                         <div className="space-y-1"><Label htmlFor="email">{settingsDict.emailLabel}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={settingsDict.emailPlaceholder} disabled={isUpdatingProfile || isUploading}/></div>
                         <div className="space-y-1"><Label htmlFor="whatsapp">{settingsDict.whatsappLabel}</Label><Input id="whatsapp" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder={settingsDict.whatsappPlaceholder} disabled={isUpdatingProfile || isUploading}/></div>
                    </div>
                     <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile || isUploading} className="w-full sm:w-auto">
                         {(isUpdatingProfile || isUploading) ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{settingsDict.updatingProfileButton}</>) : (settingsDict.updateProfileButton)}
                    </Button>
                 </CardContent>
            </Card>

            <Card>
                 <CardHeader><CardTitle className="text-lg">{settingsDict.passwordCardTitle}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-1"><Label htmlFor="current-password">{settingsDict.currentPasswordLabel}</Label><Input id="current-password" type="password" placeholder={settingsDict.currentPasswordPlaceholder} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="current-password"/></div>
                     <div className="space-y-1"><Label htmlFor="new-password">{settingsDict.newPasswordLabel}</Label><Input id="new-password" type="password" placeholder={settingsDict.newPasswordPlaceholder} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="new-password"/></div>
                     <div className="space-y-1"><Label htmlFor="confirm-password">{settingsDict.confirmPasswordLabel}</Label><Input id="confirm-password" type="password" placeholder={settingsDict.confirmPasswordPlaceholder} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isUpdatingPassword} autoComplete="new-password"/></div>
                     <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full sm:w-auto">
                        {isUpdatingPassword ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{settingsDict.updatingPasswordButton}</>) : (settingsDict.updatePasswordButton)}
                    </Button>
                 </CardContent>
            </Card>

            <Card>
                 <CardHeader><CardTitle className="text-lg">{settingsDict.googleCalendarCardTitle}</CardTitle></CardHeader>
                 <CardContent>
                    {isGoogleConnected ? (
                        <div className="space-y-4">
                            <p className="text-sm text-green-600 font-medium">{settingsDict.googleCalendarConnected}</p>
                            <Button variant="destructive" onClick={handleGoogleDisconnect} disabled={isDisconnectingGoogle} className="w-full sm:w-auto">
                                {isDisconnectingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                                {settingsDict.disconnectGoogleCalendar}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">{settingsDict.googleCalendarConnectDesc}</p>
                            <Button asChild className="accent-teal w-full sm:w-auto">
                                <a href="/api/auth/google/connect">
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    {settingsDict.connectGoogleCalendar}
                                </a>
                            </Button>
                        </div>
                    )}
                 </CardContent>
            </Card>
            
            <Card>
                 <CardHeader><CardTitle className="text-lg">{settingsDict.languageCardTitle}</CardTitle><CardDescription>{settingsDict.languageCardDescription}</CardDescription></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="language-select">{settingsDict.languageSelectLabel}</Label>
                         <Select value={language} onValueChange={handleLanguageChange}>
                             <SelectTrigger id="language-select" className="w-full md:w-[280px]"><SelectValue placeholder={settingsDict.languageSelectPlaceholder} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">{settingsDict.languageEnglish}</SelectItem>
                              <SelectItem value="id">{settingsDict.languageIndonesian}</SelectItem>
                            </SelectContent>
                          </Select>
                         <p className="text-xs text-muted-foreground">{settingsDict.languageSelectHint}</p>
                    </div>
                 </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-lg">{settingsDict.notificationsCardTitle}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1 flex-1">
                            <span>{settingsDict.emailNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">{settingsDict.emailNotificationsHint}</span>
                        </Label>
                        <Switch id="email-notifications" defaultChecked disabled />
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1 flex-1">
                            <span>{settingsDict.inAppNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs sm:text-sm">{settingsDict.inAppNotificationsHint}</span>
                        </Label>
                        <Switch id="in-app-notifications" defaultChecked disabled />
                    </div>
                 </CardContent>
            </Card>

        </CardContent>
      </Card>
    </div>
  );
}
