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
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Building,
  UserCog,
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
      <SidebarInset className="p-4 md:p-6">
        <header className="flex items-center justify-between mb-6 md:hidden">
          <SidebarTrigger />
           <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
             <Building className="h-6 w-6" />
             <span>TaskTrackPro</span>
           </Link>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
