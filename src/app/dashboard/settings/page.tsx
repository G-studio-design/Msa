// src/app/dashboard/settings/page.tsx
'use client';

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
import { Loader2, Upload } from 'lucide-react'; // Import Loader2 and Upload icons
import { updatePassword, updateUserProfile, type User } from '@/services/user-service'; // Import user service functions and User type
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function SettingsPage() {
   const { language, setLanguage } = useLanguage(); // Get language state and setter
   const { currentUser, setCurrentUser: updateAuthContextUser } = useAuth(); // Get current user from AuthContext
   const { toast } = useToast(); // Initialize toast
   const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
   const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
   const settingsDict = dict.settingsPage; // Specific dictionary section

   // State for profile update fields, initialized from currentUser
   const [username, setUsername] = React.useState('');
   const [email, setEmail] = React.useState('');
   const [whatsappNumber, setWhatsappNumber] = React.useState('');
   const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | undefined>(undefined);
   // const [displayName, setDisplayName] = React.useState(''); // Explicit state for display name if needed
   const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

   // State for password fields and submission status
   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

   // Effect to initialize form fields when currentUser is available/changes
   React.useEffect(() => {
       if (currentUser) {
            setUsername(currentUser.username);
            setEmail(currentUser.email || '');
            setWhatsappNumber(currentUser.whatsappNumber || '');
            setProfilePictureUrl(currentUser.profilePictureUrl);
            // setDisplayName(currentUser.displayName || currentUser.username); // Initialize display name
       }
   }, [currentUser]);


   React.useEffect(() => {
       setIsClient(true); // Component has mounted client-side
   }, []);

   React.useEffect(() => {
       setDict(getDictionary(language)); // Update dictionary based on context language
   }, [language]); // Re-run if language changes


  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'id');
    console.log("Language selected:", value);
    toast({ title: settingsDict.toast.languageChanged, description: settingsDict.toast.languageChangedDesc });
  };

  // Handle profile picture change (future implementation)
   const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
           console.log("New profile picture selected:", file.name);
           // TODO: Implement image upload logic here
           // 1. Upload file to storage (e.g., Firebase Storage, Cloudinary)
           // 2. Get the public URL of the uploaded image
           // 3. Update the `profilePictureUrl` state with the new URL
           // 4. Include the new URL in the `handleProfileUpdate` payload
           toast({ title: 'Feature Coming Soon', description: 'Profile picture upload is not yet implemented.' });
       }
   };

  const handleProfileUpdate = async () => {
     if (!currentUser) return; // Should not happen if UI is rendered correctly
     if (!username.trim() || !email.trim()) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.requiredFields });
         return;
     }
     if (!/\S+@\S+\.\S+/.test(email)) {
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.invalidEmail });
         return;
     }

    setIsUpdatingProfile(true);
    console.log(`Attempting profile update for user ID: ${currentUser.id}`);

    try {
        const updatedUserData = {
            userId: currentUser.id,
            username: username,
            role: currentUser.role, // Role is not changed here
            email: email,
            whatsappNumber: whatsappNumber,
            displayName: username, // Assume displayName should match username for simplicity here
            // profilePictureUrl: newUploadedUrl || profilePictureUrl, // Add logic if implementing uploads
        };

        // TODO: Call notification service before updating profile
        // await notifyAdminsOfProfileChange(currentUser.username, updatedUserData);

        await updateUserProfile(updatedUserData);

        // Update AuthContext with the new user data (excluding password)
        // Use functional update to ensure we're updating based on the latest previous state
        updateAuthContextUser(prev => prev ? { ...prev, ...updatedUserData, profilePictureUrl: profilePictureUrl } : null); // Include profilePic


        toast({ title: settingsDict.toast.success, description: settingsDict.toast.profileUpdated });

    } catch (error: any) {
        console.error("Profile update error:", error);
        let description = settingsDict.toast.profileUpdateFailed;
        if (error.message === 'USERNAME_EXISTS') {
            description = settingsDict.toast.usernameExistsError;
        } else if (error.message === 'USER_NOT_FOUND') {
            description = 'User not found.'; // Should ideally not happen here
        } else {
            description = error.message || description;
        }
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: description });
    } finally {
        setIsUpdatingProfile(false);
    }
  };


  const handlePasswordUpdate = async () => {
    if (!currentUser) return; // Should not happen
    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.fieldsRequired });
        return;
    }
    if (newPassword !== confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordsDontMatch });
        setNewPassword('');
        setConfirmPassword('');
        return;
    }
    if (newPassword.length < 6) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordTooShort });
        return;
    }

    setIsUpdatingPassword(true);
    console.log(`Attempting password update for user ID: ${currentUser.id}`);

    try {
        // TODO: Call notification service before updating password
        // await notifyAdminsOfPasswordChange(currentUser.username);

        await updatePassword({
            userId: currentUser.id,
            currentPassword: currentPassword,
            newPassword: newPassword,
        });

        toast({ title: settingsDict.toast.success, description: settingsDict.toast.passwordUpdated });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

    } catch (error: any) {
        console.error("Password update error:", error);
        let description = settingsDict.toast.passwordUpdateFailed;
        if (error.message === 'USER_NOT_FOUND') {
            description = 'User not found.'; // Should not happen
        } else if (error.message === 'PASSWORD_MISMATCH') {
            description = settingsDict.toast.passwordMismatchError;
            setCurrentPassword(''); // Clear current password field on mismatch
            setNewPassword('');
            setConfirmPassword('');
        } else {
            description = error.message || description;
        }
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: description });
    } finally {
        setIsUpdatingPassword(false);
    }
  };

   // Helper function to get user initials for avatar fallback
   const getUserInitials = (name: string | undefined): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   }


  // Loading state while waiting for currentUser from context
  if (!isClient || !currentUser) {
      return (
          <div className="container mx-auto py-4 space-y-6">
              {/* Skeleton for main card */}
              <Card>
                  <CardHeader>
                      <Skeleton className="h-7 w-1/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-6">
                       {/* Skeleton for Profile Card */}
                        <Card>
                             <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                             <CardContent className="space-y-4">
                                  <div className="flex items-center space-x-4">
                                       <Skeleton className="h-20 w-20 rounded-full" />
                                       <div className="space-y-2">
                                           <Skeleton className="h-8 w-32" />
                                           <Skeleton className="h-3 w-40" />
                                       </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <Skeleton className="h-10 w-full" />
                                      <Skeleton className="h-10 w-full" />
                                      <Skeleton className="h-10 w-full" />
                                      <Skeleton className="h-10 w-full" />
                                  </div>
                                  <Skeleton className="h-10 w-32" />
                             </CardContent>
                        </Card>
                       {/* Skeleton for Password Card */}
                        <Card>
                            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-36" />
                            </CardContent>
                        </Card>
                       {/* Skeleton for Notifications Card */}
                       <Card>
                           <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                           <CardContent className="space-y-4">
                               <Skeleton className="h-10 w-full" />
                               <Skeleton className="h-10 w-full" />
                           </CardContent>
                       </Card>
                       {/* Skeleton for Language Card */}
                       <Card>
                           <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                           <CardContent className="space-y-4">
                               <Skeleton className="h-10 w-full md:w-1/2" />
                           </CardContent>
                       </Card>
                  </CardContent>
              </Card>
          </div>
      );
  }

  // Render content when user is loaded
  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
            <CardTitle className="text-2xl">{settingsDict.title}</CardTitle>
            <CardDescription>{settingsDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

             {/* Profile Info Card - Updated */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     {/* Profile Picture Section */}
                     <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20 border-2 border-primary/30">
                              <AvatarImage
                                  src={profilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/100`} // Use context user ID for seed
                                  alt={currentUser.displayName || currentUser.username}
                                  data-ai-hint="user avatar placeholder" // AI Hint
                              />
                              <AvatarFallback className="text-xl bg-muted">
                                  {getUserInitials(currentUser.displayName || currentUser.username)}
                              </AvatarFallback>
                          </Avatar>
                         <div>
                             <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                                 <Button asChild variant="outline" size="sm" disabled={isUpdatingProfile}>
                                      <span>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {settingsDict.changePictureButton}
                                      </span>
                                 </Button>
                             </Label>
                              {/* File input hidden, triggered by the button's label */}
                              <Input
                                 id="profile-picture-upload"
                                 type="file"
                                 className="hidden"
                                 accept="image/*"
                                 onChange={handleProfilePictureChange} // Add onChange handler
                                 disabled={isUpdatingProfile}
                              />
                             <p className="text-xs text-muted-foreground mt-1">{settingsDict.pictureHint}</p>
                         </div>
                     </div>

                     {/* User Info Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                             <Label htmlFor="username">{settingsDict.usernameLabel}</Label>
                             <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={settingsDict.usernamePlaceholder}
                                disabled={isUpdatingProfile}
                             />
                         </div>
                         <div className="space-y-1">
                            {/* Display Name - Display only for now, assuming tied to username */}
                            <Label htmlFor="display-name">{settingsDict.displayNameLabel}</Label>
                             <Input
                                id="display-name"
                                value={currentUser?.displayName || ''} // Display from context
                                readOnly
                                disabled // Usually not directly editable separate from username
                                className="cursor-not-allowed bg-muted/50"
                             />
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="email">{settingsDict.emailLabel}</Label>
                             <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={settingsDict.emailPlaceholder}
                                disabled={isUpdatingProfile}
                             />
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="whatsapp">{settingsDict.whatsappLabel}</Label>
                             <Input
                                id="whatsapp"
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder={settingsDict.whatsappPlaceholder}
                                disabled={isUpdatingProfile}
                             />
                         </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile}>
                         {isUpdatingProfile ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 {settingsDict.updatingProfileButton}
                             </>
                         ) : (
                            settingsDict.updateProfileButton
                         )}
                    </Button>
                 </CardContent>
            </Card>


            {/* Password Update Card */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.passwordCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-1">
                        <Label htmlFor="current-password">{settingsDict.currentPasswordLabel}</Label>
                        <Input
                           id="current-password"
                           type="password"
                           placeholder={settingsDict.currentPasswordPlaceholder}
                           value={currentPassword}
                           onChange={(e) => setCurrentPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="current-password" // Helps password managers
                        />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="new-password">{settingsDict.newPasswordLabel}</Label>
                        <Input
                           id="new-password"
                           type="password"
                           placeholder={settingsDict.newPasswordPlaceholder}
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="new-password" // Helps password managers
                        />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="confirm-password">{settingsDict.confirmPasswordLabel}</Label>
                        <Input
                           id="confirm-password"
                           type="password"
                           placeholder={settingsDict.confirmPasswordPlaceholder}
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="new-password" // Helps password managers
                        />
                    </div>
                    <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}>
                        {isUpdatingPassword ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {settingsDict.updatingPasswordButton}
                            </>
                        ) : (
                           settingsDict.updatePasswordButton
                        )}
                    </Button>
                 </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.notificationsCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                            <span>{settingsDict.emailNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                               {settingsDict.emailNotificationsHint}
                            </span>
                        </Label>
                        {/* TODO: Implement notification preference logic */}
                        <Switch id="email-notifications" defaultChecked disabled />
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1">
                            <span>{settingsDict.inAppNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {settingsDict.inAppNotificationsHint}
                            </span>
                        </Label>
                         {/* TODO: Implement notification preference logic */}
                        <Switch id="in-app-notifications" defaultChecked disabled />
                    </div>
                 </CardContent>
            </Card>

             {/* Language Card */}
             <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.languageCardTitle}</CardTitle>
                    <CardDescription>{settingsDict.languageCardDescription}</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="language-select">{settingsDict.languageSelectLabel}</Label>
                         <Select value={language} onValueChange={handleLanguageChange}>
                            <SelectTrigger id="language-select" className="w-[280px]">
                              <SelectValue placeholder={settingsDict.languageSelectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">{settingsDict.languageEnglish}</SelectItem>
                              <SelectItem value="id">{settingsDict.languageIndonesian}</SelectItem>
                            </SelectContent>
                          </Select>
                         <p className="text-xs text-muted-foreground">{settingsDict.languageSelectHint}</p>
                    </div>
                 </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
