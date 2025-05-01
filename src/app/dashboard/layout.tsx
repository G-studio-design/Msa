import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
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

// Mock user data - replace with actual user data from auth context
const user = {
  name: 'Admin User',
  role: 'General Admin', // Example roles: Owner, General Admin, Admin Proyek, Arsitek, Struktur
  avatarUrl: 'https://picsum.photos/100/100?random=1',
  initials: 'AU',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // TODO: Fetch user data and determine visible menu items based on role

  return (
    // Pass collapsible, variant, and side props here
    <SidebarProvider collapsible="icon" variant="sidebar" side="left">
      {/* Sidebar component now inherits these props from the provider */}
      <Sidebar>
        <SidebarHeader className="items-center">
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <Building className="h-6 w-6" />
            <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">TaskTrackPro</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                   <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Tasks">
                <Link href="/dashboard/tasks">
                  <ClipboardList />
                  <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">Tasks</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Conditional rendering based on role */}
            {user.role === 'General Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Manage Users">
                  <Link href="/dashboard/users">
                    <Users />
                    <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">Manage Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
             {['Owner', 'General Admin', 'Admin Proyek'].includes(user.role) && (
               <SidebarMenuItem>
                 <SidebarMenuButton asChild tooltip="Admin Actions">
                   <Link href="/dashboard/admin-actions">
                     <UserCog />
                     <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">Admin Actions</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
             )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/dashboard/settings">
                  <Settings />
                  <span className="group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent transition-colors group-data-[state=collapsed]:group-data-[collapsible=icon]:p-0 group-data-[state=collapsed]:group-data-[collapsible=icon]:justify-center group-data-[state=collapsed]:group-data-[collapsible=icon]:gap-0">
            <Avatar className="h-9 w-9 group-data-[state=collapsed]:group-data-[collapsible=icon]:h-8 group-data-[state=collapsed]:group-data-[collapsible=icon]:w-8">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden">
               <span className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</span>
               <span className="text-xs text-sidebar-foreground/70 truncate">{user.role}</span>
             </div>
            {/* TODO: Add logout functionality */}
            <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground hover:text-sidebar-accent-foreground group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden" asChild>
               <Link href="/"> {/* Redirect to login on logout */}
                <LogOut className="h-5 w-5" />
               </Link>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content area - SidebarInset handles padding dynamically */}
      <SidebarInset>
        {/* Header within the main content area */}
        <header className="flex items-center justify-between mb-6 p-4 md:p-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
             <SidebarTrigger className="hidden md:flex" />
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary md:hidden">
              <Building className="h-6 w-6" />
              <span>TaskTrackPro</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" size="icon">
                   <PanelRightOpen className="h-5 w-5" />
                   <span className="sr-only">Toggle Blue Box</span>
                 </Button>
               </SheetTrigger>
               <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[300px] sm:w-[400px]">
                 <SheetHeader>
                   <SheetTitle className="text-primary-foreground">Blue Box Panel</SheetTitle>
                   <SheetDescription className="text-primary-foreground/80">
                     This is a hideable blue box content area.
                   </SheetDescription>
                 </SheetHeader>
                 <div className="mt-4 space-y-4">
                   <p>You can put any components or information needed here.</p>
                   <Button variant="secondary">Example Button</Button>
                 </div>
               </SheetContent>
             </Sheet>
          </div>
        </header>
         <div className="p-4 md:p-6 pt-0">
           {children}
         </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
