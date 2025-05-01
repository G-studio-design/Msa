// src/app/dashboard/settings/page.tsx
'use client';

import * as React from 'react';
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
import { Loader2 } from 'lucide-react'; // Import Loader2 icon
import { updatePassword } from '@/services/user-service'; // Import the local service function

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Mock current logged-in user - Replace with actual auth context data
// In a real app, fetch this from session/token
const currentUser = {
    id: 'usr_7', // Example: Logged in as admin - REPLACE WITH ACTUAL USER ID
    username: 'admin', // Example - REPLACE WITH ACTUAL USERNAME
};

export default function SettingsPage() {
   const { language, setLanguage } = useLanguage(); // Get language state and setter
   const { toast } = useToast(); // Initialize toast
   const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
   const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
   const settingsDict = dict.settingsPage; // Specific dictionary section

   React.useEffect(() => {
       setIsClient(true); // Component has mounted client-side
       setDict(getDictionary(language)); // Update dictionary based on context language
   }, [language]); // Re-run if language changes


   // State for profile update - Username update disabled
   const [username, setUsername] = React.useState(currentUser.username); // Use current user's username
   // const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false); // No longer needed

   // State for password fields and submission status
   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // TODO: Implement notification preference logic if needed

  const handleLanguageChange = (value: string) => {
     // Type assertion as the SelectItem values are guaranteed to be 'en' or 'id'
    setLanguage(value as 'en' | 'id');
    console.log("Language selected:", value);
     toast({ title: settingsDict.toast.languageChanged, description: settingsDict.toast.languageChangedDesc });
  };

  // Profile update logic removed as username change is disabled
  // const handleProfileUpdate = async () => { ... };


  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.fieldsRequired });
        return;
    }
    if (newPassword !== confirmPassword) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordsDontMatch });
        setNewPassword(''); // Clear potentially incorrect fields
        setConfirmPassword('');
        return;
    }
    // Basic complexity check (example: min 6 chars)
    if (newPassword.length < 6) {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordTooShort });
        return;
    }

    setIsUpdatingPassword(true);
    console.log(`Attempting password update for user ID: ${currentUser.id}`);

    try {
        // Call the local service function to update password
        await updatePassword({
            userId: currentUser.id,
            currentPassword: currentPassword, // Provide current password for verification
            newPassword: newPassword,
        });

        toast({ title: settingsDict.toast.success, description: settingsDict.toast.passwordUpdated });
        // Clear all password fields on success
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

    } catch (error: any) {
        console.error("Password update error:", error);
        let description = settingsDict.toast.passwordUpdateFailed;
        if (error.message === 'USER_NOT_FOUND') {
            description = 'User not found.'; // Or a better translation
        } else if (error.message === 'PASSWORD_MISMATCH') {
            description = settingsDict.toast.passwordMismatchError; // Use a specific translation for mismatch
            // Don't clear current password on mismatch, but clear new ones
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


  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
            {/* Render translated title only on client */}
            <CardTitle className="text-2xl">{isClient ? settingsDict.title : defaultDict.settingsPage.title}</CardTitle>
            <CardDescription>{isClient ? settingsDict.description : defaultDict.settingsPage.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Profile Info Card (Username Display Only) */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{isClient ? settingsDict.profileCardTitle : defaultDict.settingsPage.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="username">{isClient ? settingsDict.usernameLabel : defaultDict.settingsPage.usernameLabel}</Label>
                        <Input
                           id="username"
                           value={username}
                           readOnly // Make username read-only
                           disabled // Visually indicate it's disabled
                           className="cursor-not-allowed bg-muted/50"
                        />
                         <p className="text-xs text-muted-foreground">{isClient ? settingsDict.usernameHint : defaultDict.settingsPage.usernameHint}</p>
                    </div>
                     {/* Update Profile Button Removed */}
                     {/* <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile || !username.trim()}>...</Button> */}
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
