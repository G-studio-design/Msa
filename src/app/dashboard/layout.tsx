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
} from "@/components/ui/popover"; // Import Popover
import {
  LayoutDashboard,
  Users,
  ClipboardList, // Kept for Project icon
  Settings,
  LogOut,
  Building,
  UserCog,
  PanelRightOpen,
  Code,
  User,
  Loader2,
  Bell, // Added Bell icon
  MessageSquareWarning, // Added for empty state
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Import Badge
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import { cn } from '@/lib/utils'; // Import cn utility

// Define a type for notifications
interface Notification {
  id: string;
  message: string;
  projectId: string; // ID of the project related to the notification
  timestamp: string; // ISO string
  isRead: boolean;
}

// Mock notification data (replace with actual fetching logic)
// Updated messages to use project title if available, otherwise ID
// Let's assume getProjectTitleById is a function that fetches the title (could be cached)
// For demonstration, we'll just use the ID or a placeholder title
const getProjectTitle = (projectId: string): string => {
    // In a real app, fetch the title based on ID, maybe from a cached project list
    // Example: const project = projects.find(p => p.id === projectId); return project?.title || projectId;
    if (projectId === 'project_alpha_id') return 'Canggu Residence';
    if (projectId === 'project_beta_id') return 'Mengwi Villa';
    if (projectId === 'project_gamma_id') return 'Jimbaran Project';
    return `Project ID "${projectId}"`; // Fallback to ID
}

const mockNotifications: Notification[] = [
  { id: 'notif1', message: `${getProjectTitle('project_alpha_id')} needs your approval.`, projectId: 'project_alpha_id', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
  { id: 'notif2', message: `New files uploaded for ${getProjectTitle('project_beta_id')}.`, projectId: 'project_beta_id', timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: false },
  { id: 'notif3', message: `Sidang scheduled for ${getProjectTitle('project_gamma_id')}.`, projectId: 'project_gamma_id', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true },
];


// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { language } = useLanguage(); // Get current language
  const { currentUser, logout } = useAuth(); // Get current user and logout function from AuthContext
  const { toast } = useToast(); // Initialize toast
  const router = useRouter(); // Initialize router
  const [isClient, setIsClient] = useState(false); // State to track client-side mount
  const [dict, setDict] = useState(() => getDictionary(language)); // Initialize dict directly
  const [layoutDict, setLayoutDict] = useState(() => dict.dashboardLayout); // Initialize specific section
  const [notifications, setNotifications] = useState<Notification[]>([]); // State for notifications
  const [unreadCount, setUnreadCount] = useState(0); // State for unread count

  useEffect(() => {
    setIsClient(true); // Component has mounted client-side
    // Simulate fetching notifications
    if (currentUser) {
       // In a real app, fetch notifications specific to the currentUser here
       // Example: Fetch notifications using a service function
       // const fetchedNotifications = await getNotificationsForUser(currentUser.id);
       // setNotifications(fetchedNotifications);
       setNotifications(mockNotifications); // Use mock data for now
    } else {
        setNotifications([]); // Clear notifications if no user
    }
  }, [currentUser]); // Re-fetch or clear notifications when user changes

  useEffect(() => {
    // Calculate unread count when notifications change
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);


  // Effect to request notification permission on client mount after user is logged in
  useEffect(() => {
      if (isClient && currentUser) {
          // Check if Notification API is supported
          if ('Notification' in window) {
              // Check current permission status
              if (Notification.permission === 'default') {
                  console.log('Requesting notification permission...');
                  Notification.requestPermission().then(permission => {
                      console.log('Notification permission status:', permission);
                      if (permission === 'granted') {
                          toast({
                              title: dict.notifications.permissionGrantedTitle, // Use translated text
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
              // Optionally inform the user that notifications aren't supported
              // toast({ title: dict.notifications.notSupportedTitle, description: dict.notifications.notSupportedDesc });
          }
      }
  }, [isClient, currentUser, toast, dict?.notifications]); // Add dict.notifications to dependencies


  useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict); // Update dictionary when language changes
      setLayoutDict(newDict.dashboardLayout); // Update specific section
  }, [language]);

  const menuItems = [
    { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "Admin Developer"] },
    { href: "/dashboard/projects", icon: ClipboardList, labelKey: "projects", roles: ["Owner", "General Admin", "Admin Proyek", "Arsitek", "Struktur", "Admin Developer"] },
    { href: "/dashboard/users", icon: Users, labelKey: "manageUsers", roles: ["Owner", "General Admin", "Admin Developer"] }, // Restricted access
    { href: "/dashboard/admin-actions", icon: UserCog, labelKey: "adminActions", roles: ["Owner", "General Admin"] },
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
          case 'Admin Proyek': return UserCog; // Keep the icon for Admin Proyek
          case 'Arsitek': return User;
          case 'Struktur': return User;
          case 'Admin Developer': return Code;
          default: return User;
      }
  }
  // Define RoleIcon only when client-side and user is available
  const RoleIcon = isClient && currentUser ? getUserRoleIcon(currentUser.role) : User;

  // Helper function to get user initials for avatar fallback
  const getUserInitials = (name: string | undefined): string => {
      if (!name) return '?';
      return name.split(' ')
                 .map(n => n[0])
                 .join('')
                 .toUpperCase()
                 .slice(0, 2);
  }

  // Get translated role name
   const getTranslatedRole = (role: string): string => {
       if (!isClient) return '...'; // Avoid server/client mismatch
       const rolesDict = dict?.manageUsersPage?.roles;
       return rolesDict?.[role as keyof typeof rolesDict] || role; // Fallback to original role
   }

    // Helper function to format timestamps relatively (or absolute if needed)
   const formatTimestamp = (timestamp: string): string => {
       if (!isClient) return '...';
       // Example: Simple relative time (could use date-fns for better formatting)
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

   // Handle notification click
   const handleNotificationClick = (notification: Notification) => {
       console.log(`Notification clicked: ${notification.id}, Project ID: ${notification.projectId}`);
       // Mark notification as read (update state and potentially backend)
       setNotifications(prev =>
           prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
       );
       // Navigate to the project details page
       // Assuming project IDs are stable and can be used in URLs
       router.push(`/dashboard/projects?projectId=${notification.projectId}`);
   };


  return (
    <div className="flex min-h-screen w-full">
      {/* Content Area */}
      <div className="flex-1 flex flex-col">
          {/* Header */}
           <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-4 sm:px-6"> {/* Reduced gap */}
             <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-base sm:text-lg text-primary"> {/* Adjusted font size */}
                <Building className="h-5 w-5 sm:h-6 sm:w-6" /> {/* Adjusted icon size */}
                {/* Use defaultDict on server, dict on client */}
                 <span className="hidden sm:inline">{isClient && layoutDict ? layoutDict.appTitle : defaultDict?.dashboardLayout?.appTitle}</span> {/* Hide title on small screens */}
                 <span className="sm:hidden">Msaarch</span> {/* Short title for small screens */}
              </Link>

            {/* Right side actions - Notification Popover and Sheet Trigger */}
             <div className="flex items-center gap-2"> {/* Reduced gap */}
              {/* Notification Popover */}
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10"> {/* Adjusted size */}
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Adjusted icon size */}
                       {isClient && unreadCount > 0 && (
                          <Badge
                             variant="destructive"
                              className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-[10px] sm:text-xs" /* Adjusted badge size/text */
                           >
                             {unreadCount > 9 ? '9+' : unreadCount} {/* Cap count display */}
                           </Badge>
                       )}
                        <span className="sr-only">{isClient && dict?.notifications ? dict?.notifications?.tooltip : defaultDict?.notifications?.tooltip}</span>
                   </Button>
                </PopoverTrigger>
                 <PopoverContent className="w-80 p-0"> {/* Adjusted width and removed padding */}
                  <div className="p-4 border-b">
                      <h4 className="font-medium leading-none">{isClient && dict?.notifications ? dict?.notifications?.title : defaultDict?.notifications?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isClient && dict?.notifications ? dict?.notifications?.description : defaultDict?.notifications?.description}
                      </p>
                  </div>
                   <div className="max-h-60 overflow-y-auto"> {/* Scrollable area */}
                   {isClient && notifications.length > 0 ? (
                       notifications.map(notification => (
                         <div
                             key={notification.id}
                             onClick={() => handleNotificationClick(notification)}
                             className={cn(
                                 "p-3 flex items-start gap-3 hover:bg-accent cursor-pointer border-b last:border-b-0",
                                 !notification.isRead && "bg-secondary/50 hover:bg-secondary/70" // Highlight unread
                             )}
                         >
                           {/* Simple visual indicator for read/unread */}
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


              {/* User Menu Sheet Trigger */}
              <Sheet>
                <SheetTrigger asChild>
                   <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10"> {/* Adjusted size */}
                     <PanelRightOpen className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Adjusted icon size */}
                    <span className="sr-only">{isClient && layoutDict ? layoutDict.toggleMenu : defaultDict?.dashboardLayout?.toggleMenu}</span>
                  </Button>
                </SheetTrigger>
                 <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[80vw] max-w-[300px] sm:max-w-[320px] flex flex-col p-4"> {/* Responsive width */}
                  {/* Sheet Header */}
                  <SheetHeader className="mb-4 text-left">
                     <SheetTitle className="text-primary-foreground text-lg sm:text-xl">{isClient && layoutDict ? layoutDict.menuTitle : defaultDict?.dashboardLayout?.menuTitle}</SheetTitle> {/* Adjusted font size */}
                    <SheetDescription className="text-primary-foreground/80">
                     {isClient && layoutDict ? layoutDict.menuDescription : defaultDict?.dashboardLayout?.menuDescription}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Navigation Links */}
                   <nav className="flex-1 space-y-2 overflow-y-auto">
                     {isClient && currentUser ? (
                         visibleMenuItems.map((item) => (
                           <Link
                             key={item.href}
                             href={item.href}
                             className="flex items-center gap-3 rounded-md px-3 py-2 text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                           >
                             <item.icon className="h-5 w-5" />
                             {/* Translate labels */}
                             <span>{layoutDict?.[item.labelKey as keyof typeof layoutDict]}</span>
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

                   {/* User Info and Logout Section */}
                   <div className="mt-auto space-y-4">
                     {/* User Profile Display - Updated */}
                     {isClient && currentUser ? (
                       <div className="flex items-center gap-3 rounded-md p-2">
                         <Avatar className="h-10 w-10 border-2 border-primary-foreground/30">
                            {/* Use picsum for placeholder, ideally use actual URL */}
                           <AvatarImage
                                src={currentUser.profilePictureUrl || `https://picsum.photos/seed/${currentUser.id}/100`} // Use context user ID for seed
                                alt={currentUser.displayName || currentUser.username}
                                data-ai-hint="user avatar placeholder" // AI Hint
                            />
                           <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                               {/* Display initials */}
                               {getUserInitials(currentUser.displayName || currentUser.username)}
                           </AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col overflow-hidden">
                           {/* Display Name or Username */}
                           <span className="text-sm font-medium truncate text-primary-foreground">{currentUser.displayName || currentUser.username}</span>
                            {/* Role with Icon and Translated Name */}
                           <span className="text-xs text-primary-foreground/70 truncate flex items-center gap-1">
                             <RoleIcon className="h-3 w-3 flex-shrink-0" />
                             {getTranslatedRole(currentUser.role)}
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

                    {/* Logout Button */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                      onClick={logout} // Call logout function from context
                      disabled={!isClient || !currentUser} // Disable if not client or no user
                    >
                      <LogOut className="h-5 w-5" />
                      <span>{isClient && layoutDict ? layoutDict.logout : defaultDict?.dashboardLayout?.logout}</span>
                    </Button>
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Main Content */}
           <main className="flex-1 overflow-y-auto p-4 md:p-6"> {/* Adjusted padding */}
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
