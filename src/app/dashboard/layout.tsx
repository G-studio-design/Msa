

'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Building,
  UserCog,
  PanelRightOpen,
  User,
  Loader2,
  Bell,
  MessageSquareWarning,
  FileBarChart,
  GitFork, 
  Wrench, 
  Replace,
  Plane, 
  ShieldCheck, 
  Code,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getNotificationsForUser, markNotificationAsRead, type Notification } from '@/services/notification-service';

// Define the type for the layout dictionary keys
type LayoutDictKeys = keyof ReturnType<typeof getDictionary>['dashboardLayout'];


// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [dict, setDict] = useState(() => getDictionary(language));
  const [layoutDict, setLayoutDict] = useState(() => dict.dashboardLayout);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsClient(true);

    const fetchNotifications = async () => {
      if (currentUser) {
        try {
          const fetchedNotifications = await getNotificationsForUser(currentUser.id);
          setNotifications(fetchedNotifications);
          console.log(`Fetched ${fetchedNotifications.length} notifications for user ${currentUser.id}`);
        } catch (error) {
           console.error("Failed to fetch notifications:", error);
        }
      } else {
        setNotifications([]);
        console.log("No current user, clearing notifications.");
      }
    };

    fetchNotifications();
  }, [currentUser]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);


  useEffect(() => {
      if (isClient && currentUser) {
          if ('Notification' in window) {
              if (Notification.permission === 'default') {
                  console.log('Requesting notification permission...');
                  Notification.requestPermission().then(permission => {
                      console.log('Notification permission status:', permission);
                      if (permission === 'granted') {
                          toast({
                              title: dict.notifications.permissionGrantedTitle,
                              description: dict.notifications.permissionGrantedDesc,
                          });
                      } else if (permission === 'denied') {
                           toast({
                              title: dict.notifications.permissionDeniedTitle,
                              description: dict.notifications.permissionDeniedDesc,
                              variant: 'destructive'
                          });
                      }
                  }).catch(err => {
                      console.error('Error requesting notification permission:', err);
                      toast({
                          title: dict.notifications.permissionErrorTitle,
                          description: dict.notifications.permissionErrorDesc,
                          variant: 'destructive'
                      });
                  });
              } else if (Notification.permission === 'granted') {
                  console.log('Notification permission already granted.');
              } else {
                  console.log('Notification permission previously denied.');
              }
          } else {
              console.warn('This browser does not support desktop notification');
          }
      }
  }, [isClient, currentUser, toast, dict?.notifications]);


  useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict);
      setLayoutDict(newDict.dashboardLayout);
  }, [language]);

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "MEP", "Admin Developer"] },
    { href: "/dashboard/projects", icon: ClipboardList, labelKey: "projects" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "MEP", "Admin Developer"] },
    { href: "/dashboard/users", icon: Users, labelKey: "manageUsers" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Admin Developer"] },
    { href: "/dashboard/leave-request/new", icon: Plane, labelKey: "requestLeave" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "MEP", "Admin Developer"] },
    { href: "/dashboard/admin-actions/leave-approvals", icon: ShieldCheck, labelKey: "leaveApprovals" as LayoutDictKeys, roles: ["Owner"] }, 
    { href: "/dashboard/admin-actions", icon: Replace, labelKey: "adminActions" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Admin Developer"] },
    { href: "/dashboard/admin-actions/workflows", icon: GitFork, labelKey: "manageWorkflows" as LayoutDictKeys, roles: ["Admin Developer"] }, // HANYA Admin Developer
    { href: "/dashboard/monthly-report", icon: FileBarChart, labelKey: "monthlyReport" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Admin Developer"] },
    { href: "/dashboard/settings", icon: Settings, labelKey: "settings" as LayoutDictKeys, roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "MEP", "Admin Developer"] },
  ];


  const visibleMenuItems = isClient && currentUser
    ? menuItems.filter(item => currentUser.role && item.roles.includes(currentUser.role))
    : [];


  const getUserRoleIcon = (role: string | undefined) => {
      if (!role) return User;
      switch(role.toLowerCase()) { 
          case 'owner': return User;
          case 'general admin': return UserCog;
          case 'admin proyek': return UserCog; 
          case 'arsitek': return User; 
          case 'struktur': return User; 
          case 'mep': return Wrench; 
          case 'admin developer': return Code; 
          default: return User;
      }
  }

  const RoleIcon = isClient && currentUser ? getUserRoleIcon(currentUser.role) : User;


  const getUserInitials = (name: string | undefined): string => {
      if (!name) return '?';
      return name.split(' ')
                 .map(n => n[0])
                 .join('')
                 .toUpperCase()
                 .slice(0, 2);
  }


   const getTranslatedRole = (role: string): string => {
       if (!isClient || !dict?.manageUsersPage?.roles) return role; 
       const rolesDict = dict.manageUsersPage.roles;

       const roleKey = role.replace(/\s+/g, '').toLowerCase() as keyof NonNullable<typeof rolesDict>;
       return rolesDict?.[roleKey] || role;
   }


   const formatTimestamp = (timestamp: string): string => {
       if (!isClient) return '...';

       const now = new Date();
       const past = new Date(timestamp);
       const diffSeconds = Math.round((now.getTime() - past.getTime()) / 1000);
       const diffMinutes = Math.round(diffSeconds / 60);
       const diffHours = Math.round(diffMinutes / 60);
       const diffDays = Math.round(diffHours / 24);

       if (diffSeconds < 60) return `${diffSeconds}s ago`;
       if (diffMinutes < 60) return `${diffMinutes}m ago`;
       if (diffHours < 24) return `${diffHours}h ago`;
       return `${diffDays}d ago`;
   }


   const handleNotificationClick = async (notification: Notification) => {
       console.log(`Notification clicked: ${notification.id}, Project ID: ${notification.projectId}`);

       if (!notification.isRead) {
           try {
               await markNotificationAsRead(notification.id);
               setNotifications(prev =>
                   prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
               );
               console.log(`Notification ${notification.id} marked as read successfully.`);
           } catch (error) {
                console.error("Failed to mark notification as read:", error);
           }
       }

       if (notification.projectId) {
           router.push(`/dashboard/projects?projectId=${notification.projectId}`);
       } else if (notification.message.toLowerCase().includes("izin") || notification.message.toLowerCase().includes("leave")) {
           if (currentUser?.role === 'Owner') {
               router.push("/dashboard/admin-actions/leave-approvals");
           } else {
                
                console.warn("Leave-related notification clicked by non-owner. Target page TBD.");
           }
       } else {
            console.warn("Notification clicked, but no project ID or leave context. Target page TBD.");
       }
   };


  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <div className="flex-1 flex flex-col">
           <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-4 sm:px-6">
             <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-base sm:text-lg text-primary">
                <Building className="h-5 w-5 sm:h-6 sm:w-6" />
                 <span className="hidden sm:inline">{isClient && layoutDict ? layoutDict.appTitle : defaultDict?.dashboardLayout?.appTitle}</span>
                 <span className="sm:hidden">{isClient && layoutDict ? layoutDict.appTitleShort : defaultDict?.dashboardLayout?.appTitleShort || defaultDict?.dashboardLayout?.appTitle}</span>
              </Link>


             <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                       {isClient && unreadCount > 0 && (
                          <Badge
                             variant="destructive"
                              className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-[10px] sm:text-xs"
                           >
                             {unreadCount > 9 ? '9+' : unreadCount}
                           </Badge>
                       )}
                        <span className="sr-only">{isClient && dict?.notifications ? dict?.notifications?.tooltip : defaultDict?.notifications?.tooltip}</span>
                   </Button>
                </PopoverTrigger>
                 <PopoverContent className="w-80 p-0">
                  <div className="p-4 border-b">
                      <h4 className="font-medium leading-none">{isClient && dict?.notifications ? dict?.notifications?.title : defaultDict?.notifications?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isClient && dict?.notifications ? dict?.notifications?.description : defaultDict?.notifications?.description}
                      </p>
                  </div>
                   <div className="max-h-60 overflow-y-auto">
                   {isClient && notifications.length > 0 ? (
                       notifications.map(notification => (
                         <div
                             key={notification.id}
                             onClick={() => handleNotificationClick(notification)}
                             className={cn(
                                 "p-3 flex items-start gap-3 hover:bg-accent cursor-pointer border-b last:border-b-0",
                                 !notification.isRead && "bg-secondary/50 hover:bg-secondary/70"
                             )}
                         >
                           <div className={cn(
                             "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                             notification.isRead ? "bg-muted-foreground/30" : "bg-primary"
                           )}></div>
                           <div className="flex-1">
                               <p className="text-sm">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</p>
                           </div>
                         </div>
                       ))
                   ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                       <MessageSquareWarning className="h-6 w-6" />
                       {isClient && dict?.notifications ? dict?.notifications?.empty : defaultDict?.notifications?.empty}
                     </div>
                   )}
                 </div>
                </PopoverContent>
              </Popover>


              <Sheet>
                <SheetTrigger asChild>
                   <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                     <PanelRightOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">{isClient && layoutDict ? layoutDict.toggleMenu : defaultDict?.dashboardLayout?.toggleMenu}</span>
                  </Button>
                </SheetTrigger>
                 <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[80vw] max-w-[300px] sm:max-w-[320px] flex flex-col p-4">
                  <SheetHeader className="mb-4 text-left">
                     <SheetTitle className="text-primary-foreground text-lg sm:text-xl">{isClient && layoutDict ? layoutDict.menuTitle : defaultDict?.dashboardLayout?.menuTitle}</SheetTitle>
                    <SheetDescription className="text-primary-foreground/80">
                     {isClient && layoutDict ? layoutDict.menuDescription : defaultDict?.dashboardLayout?.menuDescription}
                    </SheetDescription>
                  </SheetHeader>


                   <nav className="flex-1 space-y-2 overflow-y-auto">
                     {isClient && currentUser ? (
                         visibleMenuItems.map((item) => (
                           <Link
                             key={item.href}
                             href={item.href}
                             className="flex items-center gap-3 rounded-md px-3 py-2 text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                           >
                             <item.icon className="h-5 w-5" />
                             <span>{layoutDict?.[item.labelKey]}</span>
                           </Link>
                         ))
                     ) : (
                         <div className="space-y-2">
                           {[...Array(6)].map((_, i) => ( 
                               <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                                   <Skeleton className="h-5 w-5 rounded-full bg-primary-foreground/20" />
                                   <Skeleton className="h-4 w-32 bg-primary-foreground/20" />
                               </div>
                           ))}
                         </div>
                     )}
                   </nav>

                   <Separator className="my-4 bg-primary-foreground/20" />


                   <div className="mt-auto space-y-4">
                     {isClient && currentUser ? (
                       <div className="flex items-center gap-3 rounded-md p-2">
                         <Avatar className="h-10 w-10 border-2 border-primary-foreground/30">
                           <AvatarImage
                                src={currentUser.profilePictureUrl || `https://placehold.co/100x100.png`}
                                data-ai-hint="user avatar placeholder"
                                alt={currentUser.displayName || currentUser.username}
                            />
                           <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                               {getUserInitials(currentUser.displayName || currentUser.username)}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col overflow-hidden">
                           <span className="text-sm font-medium truncate text-primary-foreground">{currentUser.displayName || currentUser.username}</span>
                           <span className="text-xs text-primary-foreground/70 truncate flex items-center gap-1">
                             <RoleIcon className="h-3 w-3 flex-shrink-0" />
                             {getTranslatedRole(currentUser.role)}
                           </span>
                         </div>
                       </div>
                     ) : (
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
                      onClick={logout}
                      disabled={!isClient || !currentUser}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>{isClient && layoutDict ? layoutDict.logout : defaultDict?.dashboardLayout?.logout}</span>
                    </Button>
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>


           <main className="flex-1 overflow-y-auto p-4 md:p-6">
             {isClient && currentUser ? children : (
                   <div className="flex justify-center items-center h-[calc(100vh-56px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              )}
          </main>
      </div>
    </div>
  );
}

