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
} from "@/components/ui/sheet"; // Import Sheet components
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Building,
  UserCog,
  PanelRightOpen, // Icon for the new sheet trigger
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Import Button

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
    <SidebarProvider>
      {/* Sidebar component - uses CSS variables defined in globals.css for colors */}
      <Sidebar>
        <SidebarHeader className="items-center">
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">
            <Building className="h-6 w-6" />
            <span>TaskTrackPro</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Tasks">
                <Link href="/dashboard/tasks">
                  <ClipboardList />
                  <span>Tasks</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Conditional rendering based on role */}
            {user.role === 'General Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Manage Users">
                  <Link href="/dashboard/users">
                    <Users />
                    <span>Manage Users</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
             {['Owner', 'General Admin', 'Admin Proyek'].includes(user.role) && (
               <SidebarMenuItem>
                 <SidebarMenuButton asChild tooltip="Admin Actions">
                   <Link href="/dashboard/admin-actions">
                     <UserCog />
                     <span>Admin Actions</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
             )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <Link href="/dashboard/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</span>
               <span className="text-xs text-sidebar-foreground/70 truncate">{user.role}</span>
             </div>
            {/* TODO: Add logout functionality */}
            <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground hover:text-sidebar-accent-foreground" asChild>
               <Link href="/"> {/* Redirect to login on logout */}
                <LogOut className="h-5 w-5" />
               </Link>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content area - SidebarInset ensures correct spacing */}
      <SidebarInset className="p-4 md:p-6">
        {/* Header within the main content area */}
        <header className="flex items-center justify-between mb-6">
           {/* Mobile Sidebar Trigger and Logo (aligned left) */}
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" /> {/* Mobile sidebar trigger */}
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary md:hidden"> {/* Mobile logo */}
              <Building className="h-6 w-6" />
              <span>TaskTrackPro</span>
            </Link>
          </div>

          {/* Right-aligned Controls (e.g., the new Sheet trigger) */}
          <div className="flex items-center gap-4">
             {/* Add the new Sheet (Blue Box) Trigger */}
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" size="icon">
                   <PanelRightOpen className="h-5 w-5" />
                   <span className="sr-only">Toggle Blue Box</span>
                 </Button>
               </SheetTrigger>
               {/* Sheet content - Remains blue */}
               <SheetContent side="right" className="bg-primary text-primary-foreground border-primary-foreground/20 w-[300px] sm:w-[400px]">
                 <SheetHeader>
                   <SheetTitle className="text-primary-foreground">Blue Box Panel</SheetTitle>
                   <SheetDescription className="text-primary-foreground/80">
                     This is a hideable blue box content area.
                   </SheetDescription>
                 </SheetHeader>
                 <div className="mt-4 space-y-4">
                   {/* Add content for the blue box here */}
                   <p>You can put any components or information needed here.</p>
                   <Button variant="secondary">Example Button</Button>
                 </div>
               </SheetContent>
             </Sheet>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
