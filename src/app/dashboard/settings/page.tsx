
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

export default function SettingsPage() {
  // TODO: Implement actual settings logic (e.g., profile update, notification prefs, language persistence)
  const [language, setLanguage] = React.useState('en'); // Default language 'en'

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    // TODO: Add logic to actually change the app language (e.g., using i18n library)
    console.log("Language selected:", value);
  };

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Manage your account and application settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue="current_username" disabled />
                         <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input id="current-password" type="password" placeholder="Enter current password" />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" placeholder="Enter new password" />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                    </div>
                    <Button disabled>Update Password</Button> {/* TODO: Enable and add logic */}
                 </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Notification Preferences</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                            <span>Email Notifications</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                            Receive email updates for task assignments and status changes.
                            </span>
                        </Label>
                        <Switch id="email-notifications" defaultChecked disabled /> {/* TODO: Enable and add logic */}
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1">
                            <span>In-App Notifications</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                            Show notifications within the TaskTrackPro application.
                            </span>
                        </Label>
                        <Switch id="in-app-notifications" defaultChecked disabled /> {/* TODO: Enable and add logic */}
                    </div>
                 </CardContent>
            </Card>

             <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">Language Settings</CardTitle>
                    <CardDescription>Choose your preferred display language.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="language-select">Display Language</Label>
                         <Select value={language} onValueChange={handleLanguageChange}>
                            <SelectTrigger id="language-select" className="w-[280px]">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            </SelectContent>
                          </Select>
                         <p className="text-xs text-muted-foreground">Select the language for the application interface.</p>
                    </div>
                    {/* Button might not be needed if language changes immediately on select */}
                    {/* <Button disabled>Save Language Preference</Button> */}
                 </CardContent>
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
