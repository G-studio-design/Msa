// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Import Button
import { CheckCircle, XCircle, Clock, AlertTriangle, PlusCircle, Loader2 } from 'lucide-react'; // Import PlusCircle & Loader2
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock data - Replace with actual data fetching based on user role
const tasks = [
  { id: 1, title: "Project Alpha - Phase 1", status: "Completed", progress: 100, assignedDivision: "Owner", nextAction: null },
  { id: 2, title: "Project Beta - Design Specs", status: "In Progress", progress: 60, assignedDivision: "Arsitek", nextAction: "Submit Design Files" },
  { id: 3, title: "Project Gamma - Offer Prep", status: "Pending Approval", progress: 20, assignedDivision: "Admin Proyek", nextAction: "Owner Review" },
  { id: 4, title: "Project Delta - Structure Plan", status: "Delayed", progress: 45, assignedDivision: "Struktur", nextAction: "Upload Structure Files" },
  { id: 5, title: "Project Epsilon - Canceled", status: "Canceled", progress: 10, assignedDivision: "Owner", nextAction: null },
  { id: 6, title: "Project Zeta - Admin Setup", status: "Pending", progress: 5, assignedDivision: "General Admin", nextAction: "Generate DP Invoice" },
];

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardPage() {
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const { toast } = useToast(); // Initialize toast
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const dashboardDict = dict.dashboardPage; // Specific dictionary section

  React.useEffect(() => {
      setIsClient(true);
  }, []);

  React.useEffect(() => {
      setDict(getDictionary(language));
  }, [language]);

  // Get user role from context, default to empty string if null/undefined
  const userRole = currentUser?.role || '';

  // Check if the current user can add tasks based on role from context
  const canAddTask = ['Owner', 'General Admin'].includes(userRole);

  // Placeholder function for adding a new task
  const handleAddTaskClick = () => {
    toast({ title: dashboardDict.addNewTask, description: 'Task creation functionality not implemented yet.' });
    console.log('Add New Task button clicked');
  };

  // Helper function to get status icon and color using translated status
  const getStatusBadge = (status: string) => {
    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status; // Fallback to original

    // Define badge variants based on status
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";
    let Icon = Clock;

     switch (status.toLowerCase()) {
        case 'completed':
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600';
            Icon = CheckCircle;
            break;
        case 'inprogress':
            variant = 'secondary';
            className = 'bg-blue-500 text-white hover:bg-blue-600';
            Icon = Clock;
            break;
        case 'pendingapproval':
            variant = 'outline';
            className = 'border-yellow-500 text-yellow-600';
            Icon = AlertTriangle;
            break;
        case 'delayed':
             variant = 'destructive'; // Use destructive for delay color, but style it orange
             className = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'; // Custom orange style
             Icon = Clock;
             break;
        case 'canceled':
             variant = 'destructive';
             Icon = XCircle;
             break;
        case 'pending':
        case 'pendinginput':
        case 'pendingoffer':
        case 'pendingdpinvoice':
        case 'pendingadminfiles':
        case 'pendingarchitectfiles':
        case 'pendingstructurefiles':
        case 'pendingfinalcheck':
        case 'pendingscheduling':
            variant = 'secondary';
            Icon = Clock;
            break;
        case 'scheduled':
            variant = 'secondary';
            className = 'bg-purple-500 text-white hover:bg-purple-600';
            Icon = Clock;
            break;
        default:
            variant = 'secondary'; // Default fallback
            Icon = Clock;
    }

    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  };


  // Filter tasks based on user role from context
   const filteredTasks = React.useMemo(() => {
        if (!userRole) return []; // No user, no tasks
        if (['Owner', 'General Admin', 'Admin Developer'].includes(userRole)) {
            return tasks; // These roles see all tasks
        }
        // Other roles see tasks assigned to them OR requiring their action (based on nextAction)
        return tasks.filter(task =>
            task.assignedDivision === userRole ||
            (task.nextAction && task.nextAction.toLowerCase().includes(userRole.toLowerCase()))
        );
   }, [userRole]); // Recalculate when userRole changes

  const activeTasks = filteredTasks.filter(task => task.status !== 'Completed' && task.status !== 'Canceled');
  const completedTasksCount = filteredTasks.filter(task => task.status === 'Completed').length;
  const pendingTasksCount = filteredTasks.filter(task => task.status === 'Pending' || task.status === 'Pending Approval').length;

   // Render loading state if user is not yet available on the client
   if (!isClient || !currentUser) {
       return (
           <div className="container mx-auto py-4 space-y-6">
               {/* Skeleton for Header */}
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    {/* Skeleton for Add Task Button (if applicable) */}
                    {canAddTask && <Skeleton className="h-10 w-32" />}
                </div>
               {/* Skeleton for Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                    {[...Array(3)].map((_, i) => (
                         <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-2/4" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                 <Skeleton className="h-6 w-1/4 mb-2" />
                                 <Skeleton className="h-3 w-3/4" />
                             </CardContent>
                         </Card>
                    ))}
                 </div>
                {/* Skeleton for Task List */}
                 <Card>
                    <CardHeader>
                         <Skeleton className="h-6 w-1/3 mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                             {[...Array(3)].map((_, i) => (
                                 <Card key={`task-skel-${i}`}>
                                     <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                          <div>
                                              <Skeleton className="h-5 w-3/5 mb-1" />
                                              <Skeleton className="h-3 w-4/5" />
                                          </div>
                                          <Skeleton className="h-5 w-20" />
                                     </CardHeader>
                                     <CardContent>
                                         <Skeleton className="h-2 w-full mb-1" />
                                         <Skeleton className="h-3 w-1/4" />
                                      </CardContent>
                                 </Card>
                             ))}
                         </div>
                     </CardContent>
                 </Card>
           </div>
       );
   }


  return (
    <div className="container mx-auto py-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {dashboardDict.title}
        </h1>
        {/* Conditionally render Add Task Button based on role */}
        {canAddTask && (
            <Button onClick={handleAddTaskClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {dashboardDict.addNewTask}
            </Button>
        )}
      </div>


       {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.activeTasks}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.activeTasksDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.completedTasks}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasksCount}</div>
             <p className="text-xs text-muted-foreground">{dashboardDict.completedTasksDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.pendingActions}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount}</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.pendingActionsDesc}</p>
          </CardContent>
        </Card>
      </div>

       {/* Task List */}
      <Card>
         <CardHeader>
           <CardTitle>{dashboardDict.taskOverview}</CardTitle>
           <CardDescription>
             {userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer'
                ? dashboardDict.allTasksDesc
                : dashboardDict.divisionTasksDesc.replace('{division}', userRole)}
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{dashboardDict.noTasks}</p>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <div>
                       <CardTitle className="text-lg">{task.title}</CardTitle>
                       <CardDescription className="text-xs text-muted-foreground">
                         {`${dashboardDict.assignedTo}: ${task.assignedDivision} ${task.nextAction ? `| ${dashboardDict.nextAction}: ${task.nextAction}` : ''}`}
                       </CardDescription>
                     </div>
                     {getStatusBadge(task.status)}
                  </CardHeader>
                  <CardContent>
                     {task.status !== 'Canceled' && task.status !== 'Completed' && ( // Don't show progress for completed/canceled
                       <>
                          <Progress value={task.progress} className="w-full h-2 mb-1" />
                          <span className="text-xs text-muted-foreground">
                            {dashboardDict.progress.replace('{progress}', task.progress.toString())}
                          </span>
                       </>
                     )}
                     {task.status === 'Canceled' && (
                        <p className="text-sm text-destructive font-medium">
                          {dashboardDict.taskCanceled}
                        </p>
                     )}
                     {task.status === 'Completed' && (
                         <p className="text-sm text-green-600 font-medium">
                           {dashboardDict.taskCompleted}
                         </p>
                      )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
