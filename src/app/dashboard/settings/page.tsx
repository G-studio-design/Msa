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

export default function SettingsPage() {
   const { language, setLanguage } = useLanguage(); // Get language state and setter
   const dict = getDictionary(language); // Get dictionary for the current language
   const settingsDict = dict.settingsPage; // Specific dictionary section
   const { toast } = useToast(); // Initialize toast

   // State for profile update
   const [username, setUsername] = React.useState('current_username'); // TODO: Replace with actual username from auth context
   const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

   // State for password fields and submission status
   const [currentPassword, setCurrentPassword] = React.useState('');
   const [newPassword, setNewPassword] = React.useState('');
   const [confirmPassword, setConfirmPassword] = React.useState('');
   const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  // TODO: Implement actual settings logic (e.g., profile update, notification prefs)

  const handleLanguageChange = (value: string) => {
     // Type assertion as the SelectItem values are guaranteed to be 'en' or 'id'
    setLanguage(value as 'en' | 'id');
    console.log("Language selected:", value);
  };

  const handleProfileUpdate = async () => {
      if (!username.trim()) {
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.usernameRequired });
         return;
      }
      // Basic validation (e.g., length) - Add more complex validation if needed
      if (username.length < 3) {
         toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.usernameTooShort });
         return;
      }

      setIsUpdatingProfile(true);
      console.log(`Attempting profile update for username: ${username}`);

      // Simulate API call to update username
      // TODO: Replace with actual API call - verify user, update username in DB/Auth system
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success/failure
      const success = true; // Replace with actual API response handling

      if (success) {
          toast({ title: settingsDict.toast.success, description: settingsDict.toast.profileUpdated });
          // Optionally update local state/context if needed, though fetching on next load might be better
      } else {
          toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.profileUpdateFailed });
      }

      setIsUpdatingProfile(false);
  };


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
    console.log('Attempting password update for current user...');

    // Simulate API call to update password
    // TODO: Replace with actual API call - verify currentPassword and update to newPassword
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success/failure (replace with actual API response handling)
    const success = true; // Simulate success for now

    if (success) {
        toast({ title: settingsDict.toast.success, description: settingsDict.toast.passwordUpdated });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } else {
        toast({ variant: 'destructive', title: settingsDict.toast.error, description: settingsDict.toast.passwordUpdateFailed });
        // Don't clear current password on failure, but clear new ones
        setNewPassword('');
        setConfirmPassword('');
    }

    setIsUpdatingPassword(false);
  };


  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{settingsDict.title}</CardTitle>
          <CardDescription>{settingsDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* Profile Update Card */}
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="username">{settingsDict.usernameLabel}</Label>
                        <Input
                           id="username"
                           value={username}
                           onChange={(e) => setUsername(e.target.value)}
                           placeholder={settingsDict.usernamePlaceholder}
                           disabled={isUpdatingProfile}
                        />
                         {/* <p className="text-xs text-muted-foreground">{settingsDict.usernameHint}</p> */}
                    </div>
                     <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile || !username.trim()}>
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
