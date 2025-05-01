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

export default function SettingsPage() {
   const { language, setLanguage } = useLanguage(); // Get language state and setter
   const dict = getDictionary(language); // Get dictionary for the current language
   const settingsDict = dict.settingsPage; // Specific dictionary section

  // TODO: Implement actual settings logic (e.g., profile update, notification prefs)

  const handleLanguageChange = (value: string) => {
     // Type assertion as the SelectItem values are guaranteed to be 'en' or 'id'
    setLanguage(value as 'en' | 'id');
    console.log("Language selected:", value);
  };

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{settingsDict.title}</CardTitle>
          <CardDescription>{settingsDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="text-lg">{settingsDict.profileCardTitle}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="username">{settingsDict.usernameLabel}</Label>
                        <Input id="username" defaultValue="current_username" disabled />
                         <p className="text-xs text-muted-foreground">{settingsDict.usernameHint}</p>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="current-password">{settingsDict.currentPasswordLabel}</Label>
                        <Input id="current-password" type="password" placeholder={settingsDict.currentPasswordPlaceholder} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="new-password">{settingsDict.newPasswordLabel}</Label>
                        <Input id="new-password" type="password" placeholder={settingsDict.newPasswordPlaceholder} />
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="confirm-password">{settingsDict.confirmPasswordLabel}</Label>
                        <Input id="confirm-password" type="password" placeholder={settingsDict.confirmPasswordPlaceholder} />
                    </div>
                    <Button disabled>{settingsDict.updatePasswordButton}</Button> {/* TODO: Enable and add logic */}
                 </CardContent>
            </Card>

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
                        <Switch id="email-notifications" defaultChecked disabled /> {/* TODO: Enable and add logic */}
                    </div>
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="in-app-notifications" className="flex flex-col space-y-1">
                            <span>{settingsDict.inAppNotificationsLabel}</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                {settingsDict.inAppNotificationsHint}
                            </span>
                        </Label>
                        <Switch id="in-app-notifications" defaultChecked disabled /> {/* TODO: Enable and add logic */}
                    </div>
                 </CardContent>
            </Card>

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
