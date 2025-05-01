'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
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
  Code,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage(); // Get current language
  const { currentUser, logout } = useAuth(); // Get current user and logout function from AuthContext
  const [isClient, setIsClient] = useState(false); // State to track client-side mount
  const [dict, setDict] = useState(() => getDictionary(language)); // Initialize dict directly
  const layoutDict = dict.dashboardLayout; // Specific dictionary section

  useEffect(() => {
    setIsClient(true); // Component has mounted client-side
  }, []);

  useEffect(() => {
    setDict(getDictionary(language)); // Update dictionary when language changes
  }, [language]);

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "Admin Developer"] },
    { href: "/dashboard/tasks", icon: ClipboardList, labelKey: "tasks", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "Admin Developer"] },
    { href: "/dashboard/users", icon: Users, labelKey: "manageUsers", roles: ["Owner", "General Admin", "Admin Developer"] }, // Restricted access
    { href: "/dashboard/admin-actions", icon: UserCog, labelKey: "adminActions", roles: ["Owner", "General Admin", "Admin Proyek", "Admin Developer"] },
    { href: "/dashboard/settings", icon: Settings, labelKey: "settings", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "Admin Developer"] },
  ];

  // Filter menu items based on the current user's role from context
  const visibleMenuItems = isClient && currentUser
    ? menuItems.filter(item => currentUser.role && item.roles.includes(currentUser.role))
    : [];

  // Get user role icon based on the user's role from context
  const getUserRoleIcon = (role: string | undefined) => {
      if (!role) return User; // Default icon if role is undefined
      switch(role) {
          case 'Owner': return User;
          case 'General Admin': return UserCog;
          case 'Admin Proyek': return UserCog;
          case 'Arsitek': return User;
          case 'Struktur': return User;
          case 'Admin Developer': return Code;
          default: return User;
      }
  }
  const RoleIcon = isClient && currentUser ? getUserRoleIcon(currentUser.role) : User;

  const getUserInitials = (name: string | undefined): string => {
      if (!name) return '?';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
             <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
                <Building className="h-6 w-6" />
                <span>{isClient ? layoutDict.appTitle : defaultDict.dashboardLayout.appTitle}</span>
              </Link>

            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <PanelRightOpen className="h-5 w-5" />
                    <span className="sr-only">{isClient ? layoutDict.toggleMenu : defaultDict.dashboardLayout.toggleMenu}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[300px] sm:w-[320px] flex flex-col p-4">
                  <SheetHeader className="mb-4 text-left">
                    <SheetTitle className="text-primary-foreground text-xl">{isClient ? layoutDict.menuTitle : defaultDict.dashboardLayout.menuTitle}</SheetTitle>
                    <SheetDescription className="text-primary-foreground/80">
                     {isClient ? layoutDict.menuDescription : defaultDict.dashboardLayout.menuDescription}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Navigation */}
                   <nav className="flex-1 space-y-2 overflow-y-auto">
                     {isClient && currentUser ? (
                         visibleMenuItems.map((item) => (
                           <Link
                             key={item.href}
                             href={item.href}
                             className="flex items-center gap-3 rounded-md px-3 py-2 text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                           >
                             <item.icon className="h-5 w-5" />
                             <span>{layoutDict[item.labelKey as keyof typeof layoutDict]}</span>
                           </Link>
                         ))
                     ) : (
                         // Skeleton loader for menu items
                         <div className="space-y-2">
                           {[...Array(4)].map((_, i) => (
                               <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                                   <Skeleton className="h-5 w-5 rounded-full bg-primary-foreground/20" />
                                   <Skeleton className="h-4 w-32 bg-primary-foreground/20" />
                               </div>
                           ))}
                         </div>
                     )}
                   </nav>


                   <Separator className="my-4 bg-primary-foreground/20" />

                   {/* User Info and Logout */}
                   <div className="mt-auto space-y-4">
                     {isClient && currentUser ? (
                       <div className="flex items-center gap-3 rounded-md p-2">
                         <Avatar className="h-10 w-10 border-2 border-primary-foreground/30">
                           <AvatarImage src={currentUser.profilePictureUrl} alt={currentUser.displayName || currentUser.username} />
                           <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                               {getUserInitials(currentUser.displayName || currentUser.username)}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col overflow-hidden">
                           <span className="text-sm font-medium truncate text-primary-foreground">{currentUser.displayName || currentUser.username}</span>
                           <span className="text-xs text-primary-foreground/70 truncate flex items-center gap-1">
                             <RoleIcon className="h-3 w-3 flex-shrink-0" />
                             {dict.manageUsersPage.roles[currentUser.role as keyof typeof dict.manageUsersPage.roles] || currentUser.role}
                           </span>
                         </div>
                       </div>
                     ) : (
                         // Skeleton loader for user info
                          <div className="flex items-center gap-3 rounded-md p-2">
                                <Skeleton className="h-10 w-10 rounded-full bg-primary-foreground/20" />
                                <div className="flex flex-col space-y-1">
                                     <Skeleton className="h-4 w-24 bg-primary-foreground/20" />
                                     <Skeleton className="h-3 w-16 bg-primary-foreground/20" />
                                </div>
                          </div>
                     )}

                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      onClick={logout} // Call logout function from context
                      disabled={!isClient || !currentUser} // Disable if not client or no user
                    >
                      <LogOut className="h-5 w-5" />
                      <span>{isClient ? layoutDict.logout : defaultDict.dashboardLayout.logout}</span>
                    </Button>
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Ensure children only render when user is loaded to prevent unauthorized access flash */}
             {isClient && currentUser ? children : (
                  <div className="flex justify-center items-center h-[calc(100vh-56px)]"> {/* Adjust height based on header */}
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              )}
          </main>
      </div>
    </div>
  );
}
