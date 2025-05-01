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

// Simple function to simulate image compression and upload
async function simulateUploadAndCompress(file: File): Promise<string> {
  console.log(`Simulating compression for ${file.name}...`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In a real app:
  // 1. Use a library like browser-image-compression to compress the file.
  // 2. Upload the compressed file to a storage service (Firebase Storage, S3, etc.).
  // 3. Return the public URL of the uploaded file.

  // For simulation, we'll generate a placeholder URL based on the file name/time
  // Using a fixed seed but varying path based on filename for more stable simulation
  const simulatedUrl = `https://picsum.photos/seed/${file.name}/${Date.now()}/200`;
  console.log(`Simulated upload complete. URL: ${simulatedUrl}`);
  return simulatedUrl;
}


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
   // Use local state for profile picture URL to reflect changes immediately
   const [currentProfilePictureUrl, setCurrentProfilePictureUrl] = React.useState<string | undefined>(undefined);
   const [profilePicturePreview, setProfilePicturePreview] = React.useState<string | null>(null); // For previewing selected image
   const [isUploading, setIsUploading] = React.useState(false); // For upload loading state
   const [selectedFile, setSelectedFile] = React.useState<File | null>(null); // Store the selected file
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
            setCurrentProfilePictureUrl(currentUser.profilePictureUrl); // Initialize local state
            setProfilePicturePreview(null); // Reset preview on user change
            setSelectedFile(null); // Reset selected file
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

  // Handle profile picture change
   const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
           console.log("New profile picture selected:", file.name);
           setSelectedFile(file); // Store the file object

           // Create a preview URL
           const reader = new FileReader();
           reader.onloadend = () => {
               setProfilePicturePreview(reader.result as string);
           };
           reader.readDataURL(file);
       } else {
            setSelectedFile(null);
            setProfilePicturePreview(null);
       }
        // Reset the input value to allow selecting the same file again if needed
        event.target.value = '';
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
    setIsUploading(!!selectedFile); // Set uploading state if file is selected
    console.log(`Attempting profile update for user ID: ${currentUser.id}`);

    let newPictureUrl = currentProfilePictureUrl; // Start with current local state URL

    try {
        // --- Simulate Image Upload and Compression ---
        if (selectedFile) {
            try {
                newPictureUrl = await simulateUploadAndCompress(selectedFile);
                // Update local state immediately for UI feedback, final context/DB update happens after profile save
                 setCurrentProfilePictureUrl(newPictureUrl);
                 console.log("Simulated URL obtained:", newPictureUrl);
            } catch (uploadError) {
                console.error("Simulated upload error:", uploadError);
                 toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not simulate image upload.' });
                 setIsUploading(false);
                 setIsUpdatingProfile(false);
                 return; // Stop profile update if upload fails
            } finally {
                setIsUploading(false); // Upload finished (success or fail)
            }
        }
        // --- End Simulation ---

        // Prepare payload with potentially updated picture URL
        const updatedUserData = {
            userId: currentUser.id,
            username: username,
            role: currentUser.role, // Role is not changed here
            email: email,
            whatsappNumber: whatsappNumber,
            displayName: username, // Assume displayName should match username for simplicity here
            profilePictureUrl: newPictureUrl, // Use the new URL (or original if no upload)
        };

        // TODO: Call notification service before updating profile
        // await notifyAdminsOfProfileChange(currentUser.username, updatedUserData);

        console.log("Calling updateUserProfile with data:", updatedUserData);
        await updateUserProfile(updatedUserData);
        console.log("updateUserProfile successful.");

        // Update AuthContext with the new user data AFTER successful DB update
        updateAuthContextUser(prev => prev ? {
             ...prev,
             username: updatedUserData.username,
             email: updatedUserData.email,
             whatsappNumber: updatedUserData.whatsappNumber,
             displayName: updatedUserData.displayName,
             profilePictureUrl: updatedUserData.profilePictureUrl // Update URL in context
            } : null);

        // Reset preview and selected file state after successful update
        setProfilePicturePreview(null);
        setSelectedFile(null);

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
        setIsUploading(false); // Ensure upload state is reset
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
                              <AvatarImage
                                  // Show preview if available, otherwise show the current stored URL from local state
                                  src={profilePicturePreview || currentProfilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/100`}
                                  // Force re-render if URL changes by using key
                                  key={profilePicturePreview || currentProfilePictureUrl}
                                  alt={currentUser.displayName || currentUser.username}
                                  data-ai-hint="user avatar placeholder" // AI Hint
                              />
                              <AvatarFallback className="text-xl bg-muted">
                                  {getUserInitials(currentUser.displayName || currentUser.username)}
                              </AvatarFallback>
                          </Avatar>
                         <div>
                             <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                                  {/* Disable button while uploading OR updating profile */}
                                 <Button asChild variant="outline" size="sm" disabled={isUploading || isUpdatingProfile}>
                                      <span>
                                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                          {isUploading ? (isClient ? settingsDict.uploadingPictureButton : 'Uploading...') : (isClient ? settingsDict.changePictureButton : defaultDict.settingsPage.changePictureButton)}
                                      </span>
                                 </Button>
                             </Label>
                              {/* File input hidden, triggered by the button's label */}
                              <Input
                                 id="profile-picture-upload"
                                 type="file"
                                 className="hidden"
                                 accept="image/png, image/jpeg" // Specify accepted image types
                                 onChange={handleProfilePictureChange} // Add onChange handler
                                 disabled={isUploading || isUpdatingProfile} // Disable while uploading/updating
                              />
                             <p className="text-xs text-muted-foreground mt-1">{isClient ? settingsDict.pictureHint : defaultDict.settingsPage.pictureHint}</p>
                             {/* Display selected file name if any */}
                              {selectedFile && !isUploading && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Selected: {selectedFile.name}
                                </p>
                              )}
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
                                disabled={isUpdatingProfile || isUploading}
                             />
                         </div>
                         <div className="space-y-1">
                            {/* Display Name - Display only for now, assuming tied to username */}
                            <Label htmlFor="display-name">{isClient ? settingsDict.displayNameLabel : defaultDict.settingsPage.displayNameLabel}</Label>
                             <Input
                                id="display-name"
                                value={currentUser?.displayName || ''} // Display from context
                                readOnly
                                disabled // Usually not directly editable separate from username
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
                                disabled={isUpdatingProfile || isUploading}
                             />
                         </div>
                         <div className="space-y-1">
                            <Label htmlFor="whatsapp">{isClient ? settingsDict.whatsappLabel : defaultDict.settingsPage.whatsappLabel}</Label>
                             <Input
                                id="whatsapp"
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder={isClient ? settingsDict.whatsappPlaceholder : defaultDict.settingsPage.whatsappPlaceholder}
                                disabled={isUpdatingProfile || isUploading}
                             />
                         </div>
                    </div>

                    <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile || isUploading}>
                         {(isUpdatingProfile || isUploading) ? (
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
                           autoComplete="current-password" // Helps password managers
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
                           autoComplete="new-password" // Helps password managers
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
                           autoComplete="new-password" // Helps password managers
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
