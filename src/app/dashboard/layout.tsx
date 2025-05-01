'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Building,
  UserCog,
  PanelRightOpen,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// Mock user data - replace with actual user data from auth context
const user = {
  name: 'Admin User',
  role: 'General Admin', // Example roles: Owner, General Admin, Admin Proyek, Arsitek, Struktur
  avatarUrl: 'https://picsum.photos/100/100?random=1',
  initials: 'AU',
};

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage(); // Get current language
  const [isClient, setIsClient] = useState(false); // State to track client-side mount
  const [dict, setDict] = useState(() => getDictionary(language)); // Initialize dict directly
  const layoutDict = dict.dashboardLayout; // Specific dictionary section

  useEffect(() => {
    setIsClient(true); // Component has mounted client-side
  }, []);

  useEffect(() => {
    setDict(getDictionary(language)); // Update dictionary when language changes
  }, [language]);

  // TODO: Fetch user data and determine visible menu items based on role

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur"] },
    { href: "/dashboard/tasks", icon: ClipboardList, labelKey: "tasks", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur"] },
    { href: "/dashboard/users", icon: Users, labelKey: "manageUsers", roles: ["General Admin", "Owner"] }, // Added Owner
    { href: "/dashboard/admin-actions", icon: UserCog, labelKey: "adminActions", roles: ["Owner", "General Admin", "Admin Proyek"] },
    { href: "/dashboard/settings", icon: Settings, labelKey: "settings", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur"] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
             <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
                <Building className="h-6 w-6" />
                {/* Render title only on client to avoid mismatch */}
                <span>{isClient ? layoutDict.appTitle : defaultDict.dashboardLayout.appTitle}</span>
              </Link>

            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <PanelRightOpen className="h-5 w-5" />
                    {/* Render translated text only on client */}
                    <span className="sr-only">{isClient ? layoutDict.toggleMenu : defaultDict.dashboardLayout.toggleMenu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[300px] sm:w-[320px] flex flex-col p-4">
                  <SheetHeader className="mb-4 text-left">
                     {/* Render translated text only on client */}
                    <SheetTitle className="text-primary-foreground text-xl">{isClient ? layoutDict.menuTitle : defaultDict.dashboardLayout.menuTitle}</SheetTitle>
                    <SheetDescription className="text-primary-foreground/80">
                     {isClient ? layoutDict.menuDescription : defaultDict.dashboardLayout.menuDescription}
                    </SheetDescription>
                  </SheetHeader>

                  <nav className="flex-1 space-y-2 overflow-y-auto">
                    {visibleMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      >
                        <item.icon className="h-5 w-5" />
                        {/* Render translated label only on client */}
                        <span>{isClient ? layoutDict[item.labelKey as keyof typeof layoutDict] : defaultDict.dashboardLayout[item.labelKey as keyof typeof defaultDict.dashboardLayout]}</span>
                      </Link>
                    ))}
                  </nav>

                   <Separator className="my-4 bg-primary-foreground/20" />

                   <div className="mt-auto space-y-4">
                     <div className="flex items-center gap-3 rounded-md p-2">
                       <Avatar className="h-10 w-10 border-2 border-primary-foreground/30">
                         <AvatarImage src={user.avatarUrl} alt={user.name} />
                         <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">{user.initials}</AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium truncate text-primary-foreground">{user.name}</span>
                         <span className="text-xs text-primary-foreground/70 truncate">{user.role}</span>
                       </div>
                     </div>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                      <Link href="/"> {/* Redirect to login on logout */}
                        <LogOut className="h-5 w-5" />
                         {/* Render translated text only on client */}
                        <span>{isClient ? layoutDict.logout : defaultDict.dashboardLayout.logout}</span>
                      </Link>
                    </Button>
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
      </div>
    </div>
  );
}
