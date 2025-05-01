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
import { updatePassword, updateUserProfile, findUserById, type User } from '@/services/user-service'; // Import user service functions and User type
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Import Avatar components

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Mock current logged-in user ID - Replace with actual auth context data
// In a real app, fetch this from session/token or context
const currentUserId = 'usr_wayangovina'; // Example: Logged in as 'wayangovina'

export default function SettingsPage() {
   const { language, setLanguage } = useLanguage(); // Get language state and setter
   const { toast } = useToast(); // Initialize toast
   const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
   const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
   const settingsDict = dict.settingsPage; // Specific dictionary section

   // State for current user data
   const [currentUser, setCurrentUser] = React.useState<User | null>(null);
   const [isLoadingUser, setIsLoadingUser] = React.useState(true);

   // State for profile update fields
   const [username, setUsername] = React.useState('');
   const [email, setEmail] = React.useState('');
   const [whatsappNumber, setWhatsappNumber] = React.useState('');
   const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | undefined>(undefined); // For displaying current picture
   // const [newProfilePicture, setNewProfilePicture] = React.useState<File | null>(null); // State for new picture file (future implementation)
   const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

   // State for password fields and submission status
   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

   // Fetch user data on mount
   React.useEffect(() => {
       setIsClient(true); // Component has mounted client-side
       async function fetchUserData() {
           setIsLoadingUser(true);
           try {
               if (currentUserId) {
                   const user = await findUserById(currentUserId);
                   if (user) {
                       setCurrentUser(user);
                       setUsername(user.username);
                       setEmail(user.email || '');
                       setWhatsappNumber(user.whatsappNumber || '');
                       setProfilePictureUrl(user.profilePictureUrl); // Use fetched URL
                   } else {
                       toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
                   }
               }
           } catch (error) {
               console.error("Failed to fetch user data:", error);
               toast({ variant: 'destructive', title: 'Error', description: 'Failed to load user data.' });
           } finally {
               setIsLoadingUser(false);
           }
       }
       fetchUserData();
   }, [toast]); // Added toast dependency

   React.useEffect(() => {
       setDict(getDictionary(language)); // Update dictionary based on context language
   }, [language]); // Re-run if language changes


  // TODO: Implement notification preference logic if needed

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'id');
    console.log("Language selected:", value);
    toast({ title: settingsDict.toast.languageChanged, description: settingsDict.toast.languageChangedDesc });
  };

  // Handle profile picture change (future implementation)
  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //    if (event.target.files && event.target.files[0]) {
  //        setNewProfilePicture(event.target.files[0]);
  //        // Optional: Show preview
  //        const reader = new FileReader();
  //        reader.onloadend = () => {
  //           setProfilePictureUrl(reader.result as string); // Show preview
  //        }
  //        reader.readAsDataURL(event.target.files[0]);
  //     }
  // };


  const handleProfileUpdate = async () => {
     if (!currentUser) return;
     if (!username.trim() || !email.trim()) { // Add validation for email
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.requiredFields }); // Add translation for required fields
         return;
     }
     // Add basic email validation (optional)
     if (!/\S+@\S+\.\S+/.test(email)) {
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.invalidEmail }); // Add translation
         return;
     }

    setIsUpdatingProfile(true);
    console.log(`Attempting profile update for user ID: ${currentUser.id}`);

    try {
        // TODO: Handle profile picture upload if newProfilePicture is set
        // This would involve uploading the file (e.g., to Firebase Storage)
        // and getting the new URL to save in the user profile.

        await updateUserProfile({
            userId: currentUser.id,
            username: username,
            role: currentUser.role, // Role is not changed here
            email: email,
            whatsappNumber: whatsappNumber,
            // profilePictureUrl: newUploadedUrl || profilePictureUrl, // Update if new picture was uploaded
        });

        toast({ title: settingsDict.toast.success, description: settingsDict.toast.profileUpdated });
        // Optionally refetch user data or update local state more thoroughly
        setCurrentUser(prev => prev ? {...prev, username, email, whatsappNumber} : null);

    } catch (error: any) {
        console.error("Profile update error:", error);
        let description = settingsDict.toast.profileUpdateFailed;
        if (error.message === 'USERNAME_EXISTS') {
            description = settingsDict.toast.usernameExistsError;
        } else if (error.message === 'USER_NOT_FOUND') {
            description = 'User not found.';
        } else {
            description = error.message || description;
        }
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: description });
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
            description = 'User not found.';
        } else if (error.message === 'PASSWORD_MISMATCH') {
            description = settingsDict.toast.passwordMismatchError;
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

   const getUserInitials = (name: string | undefined): string => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
   }


  if (isLoadingUser) {
      return (
          <div className="container mx-auto py-4 flex justify-center items-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
            <CardTitle className="text-2xl">{isClient ? settingsDict.title : defaultDict.settingsPage.title}</CardTitle>
            <CardDescription>{isClient ? settingsDict.description : defaultDict.settingsPage.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

             {/* Profile Info Card - Updated */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{isClient ? settingsDict.profileCardTitle : defaultDict.settingsPage.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     {/* Profile Picture Section */}
                     <div className="flex items-center space-x-4">
                          <Avatar className="h-20 w-20 border-2 border-primary/30">
                              {/* Use next/image for optimized image loading */}
                              <AvatarImage
                                  src={profilePictureUrl || `https://picsum.photos/seed/${currentUser?.id || 'default'}/100`} // Use fetched URL or fallback
                                  alt={currentUser?.displayName || 'User Avatar'}
                                  data-ai-hint="user avatar placeholder" // AI Hint
                              />
                              <AvatarFallback className="text-xl bg-muted">
                                  {getUserInitials(currentUser?.displayName)}
                              </AvatarFallback>
                          </Avatar>
                         <div>
                             <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                                 {/* Basic file input - Style as needed. Upload logic not implemented yet. */}
                                 <Button asChild variant="outline" size="sm" disabled>
                                      <span>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {isClient ? settingsDict.changePictureButton : defaultDict.settingsPage.changePictureButton}
                                      </span>
                                 </Button>
                             </Label>
                              <Input id="profile-picture-upload" type="file" className="hidden" accept="image/*" disabled />
                             <p className="text-xs text-muted-foreground mt-1">{isClient ? settingsDict.pictureHint : defaultDict.settingsPage.pictureHint}</p>
                         </div>
                     </div>

                     {/* User Info Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                             <Label htmlFor="username">{isClient ? settingsDict.usernameLabel : defaultDict.settingsPage.usernameLabel}</Label>
                             <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={isClient ? settingsDict.usernamePlaceholder : defaultDict.settingsPage.usernamePlaceholder}
                                disabled={isUpdatingProfile}
                             />
                             {/* Username Hint Removed or modified if needed */}
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="display-name">{isClient ? settingsDict.displayNameLabel : defaultDict.settingsPage.displayNameLabel}</Label>
                             <Input
                                id="display-name"
                                value={currentUser?.displayName || ''} // Display name likely comes from initial data
                                readOnly
                                disabled // Usually not directly editable, linked to username or Google Profile
                                className="cursor-not-allowed bg-muted/50"
                             />
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="email">{isClient ? settingsDict.emailLabel : defaultDict.settingsPage.emailLabel}</Label>
                             <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={isClient ? settingsDict.emailPlaceholder : defaultDict.settingsPage.emailPlaceholder}
                                disabled={isUpdatingProfile}
                             />
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="whatsapp">{isClient ? settingsDict.whatsappLabel : defaultDict.settingsPage.whatsappLabel}</Label>
                             <Input
                                id="whatsapp"
                                type="tel" // Use tel for phone numbers
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder={isClient ? settingsDict.whatsappPlaceholder : defaultDict.settingsPage.whatsappPlaceholder}
                                disabled={isUpdatingProfile}
                             />
                         </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile}>
                         {isUpdatingProfile ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 {isClient ? settingsDict.updatingProfileButton : defaultDict.settingsPage.updatingProfileButton}
                             </>
                         ) : (
                            isClient ? settingsDict.updateProfileButton : defaultDict.settingsPage.updateProfileButton
                         )}
                    </Button>
                 </CardContent>
            </Card>


            {/* Password Update Card */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{isClient ? settingsDict.passwordCardTitle : defaultDict.settingsPage.passwordCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="space-y-1">
                        <Label htmlFor="current-password">{isClient ? settingsDict.currentPasswordLabel : defaultDict.settingsPage.currentPasswordLabel}</Label>
                        <Input
                           id="current-password"
                           type="password"
                           placeholder={isClient ? settingsDict.currentPasswordPlaceholder : defaultDict.settingsPage.currentPasswordPlaceholder}
                           value={currentPassword}
                           onChange={(e) => setCurrentPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="current-password"
                        />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="new-password">{isClient ? settingsDict.newPasswordLabel : defaultDict.settingsPage.newPasswordLabel}</Label>
                        <Input
                           id="new-password"
                           type="password"
                           placeholder={isClient ? settingsDict.newPasswordPlaceholder : defaultDict.settingsPage.newPasswordPlaceholder}
                           value={newPassword}
                           onChange={(e) => setNewPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="new-password"
                        />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="confirm-password">{isClient ? settingsDict.confirmPasswordLabel : defaultDict.settingsPage.confirmPasswordLabel}</Label>
                        <Input
                           id="confirm-password"
                           type="password"
                           placeholder={isClient ? settingsDict.confirmPasswordPlaceholder : defaultDict.settingsPage.confirmPasswordPlaceholder}
                           value={confirmPassword}
                           onChange={(e) => setConfirmPassword(e.target.value)}
                           disabled={isUpdatingPassword}
                           autoComplete="new-password"
                        />
                    </div>
                    <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}>
                        {isUpdatingPassword ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isClient ? settingsDict.updatingPasswordButton : defaultDict.settingsPage.updatingPasswordButton}
                            </>
                        ) : (
                           isClient ? settingsDict.updatePasswordButton : defaultDict.settingsPage.updatePasswordButton
                        )}
                    </Button>
                 </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{isClient ? settingsDict.notificationsCardTitle : defaultDict.settingsPage.notificationsCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                            <span>{isClient ? settingsDict.emailNotificationsLabel : defaultDict.settingsPage.emailNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                               {isClient ? settingsDict.emailNotificationsHint : defaultDict.settingsPage.emailNotificationsHint}
                            </span>
                        </Label>
                        {/* TODO: Implement notification preference logic */}
                        <Switch id="email-notifications" defaultChecked disabled />
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1">
                            <span>{isClient ? settingsDict.inAppNotificationsLabel : defaultDict.settingsPage.inAppNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {isClient ? settingsDict.inAppNotificationsHint : defaultDict.settingsPage.inAppNotificationsHint}
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
                    <CardTitle className="text-lg">{isClient ? settingsDict.languageCardTitle : defaultDict.settingsPage.languageCardTitle}</CardTitle>
                    <CardDescription>{isClient ? settingsDict.languageCardDescription : defaultDict.settingsPage.languageCardDescription}</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="language-select">{isClient ? settingsDict.languageSelectLabel : defaultDict.settingsPage.languageSelectLabel}</Label>
                         <Select value={language} onValueChange={handleLanguageChange}>
                            <SelectTrigger id="language-select" className="w-[280px]">
                              <SelectValue placeholder={isClient ? settingsDict.languageSelectPlaceholder : defaultDict.settingsPage.languageSelectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">{isClient ? settingsDict.languageEnglish : defaultDict.settingsPage.languageEnglish}</SelectItem>
                              <SelectItem value="id">{isClient ? settingsDict.languageIndonesian : defaultDict.settingsPage.languageIndonesian}</SelectItem>
                            </SelectContent>
                          </Select>
                         <p className="text-xs text-muted-foreground">{isClient ? settingsDict.languageSelectHint : defaultDict.settingsPage.languageSelectHint}</p>
                    </div>
                 </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
