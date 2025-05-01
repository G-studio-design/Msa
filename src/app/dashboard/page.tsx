// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Import Button
import { CheckCircle, XCircle, Clock, AlertTriangle, PlusCircle } from 'lucide-react'; // Import PlusCircle
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Mock data - Replace with actual data fetching based on user role
const tasks = [
  { id: 1, title: "Project Alpha - Phase 1", status: "Completed", progress: 100, assignedDivision: "Owner", nextAction: null },
  { id: 2, title: "Project Beta - Design Specs", status: "In Progress", progress: 60, assignedDivision: "Arsitek", nextAction: "Submit Design Files" }, // Changed from Architect
  { id: 3, title: "Project Gamma - Offer Prep", status: "Pending Approval", progress: 20, assignedDivision: "Admin Proyek", nextAction: "Owner Review" }, // Changed from Project Admin
  { id: 4, title: "Project Delta - Structure Plan", status: "Delayed", progress: 45, assignedDivision: "Struktur", nextAction: "Upload Structure Files" }, // Changed from Structure
  { id: 5, title: "Project Epsilon - Canceled", status: "Canceled", progress: 10, assignedDivision: "Owner", nextAction: null },
  { id: 6, title: "Project Zeta - Admin Setup", status: "Pending", progress: 5, assignedDivision: "General Admin", nextAction: "Generate DP Invoice" },
];

// Mock current user - Replace with actual auth context data
const currentUser = {
    role: 'General Admin', // Example roles: Owner, General Admin, Admin Proyek, Arsitek, Struktur, Admin Developer
};

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardPage() {
  const { language } = useLanguage(); // Get current language
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

  // TODO: Fetch tasks based on user role (Admin sees all, others see relevant tasks)
  const userRole = currentUser.role; // Use the mock user role

  // Check if the current user can add tasks
  const canAddTask = ['Owner', 'General Admin'].includes(userRole);

  // Placeholder function for adding a new task
  const handleAddTaskClick = () => {
    // TODO: Implement navigation to a task creation page or open a modal
    toast({ title: dashboardDict.addNewTask, description: 'Task creation functionality not implemented yet.' });
    console.log('Add New Task button clicked');
  };

  // Helper function to get status icon and color using translated status
  const getStatusBadge = (status: string) => {
    // Ensure statusKey is valid before accessing translation
    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status; // Fallback to original if no translation

    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
      case 'inprogress': // Corrected key
        return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600"><Clock className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
      case 'pendingapproval': // Corrected key
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
      case 'delayed':
        return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><Clock className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
      case 'canceled':
         return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
       case 'pending':
          return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
        case 'scheduled': // Added case for scheduled
          return <Badge variant="secondary" className="bg-purple-500 text-white hover:bg-purple-600"><Clock className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
         // Added cases for new statuses from tasks page
        case 'pendinginput':
        case 'pendingoffer':
        case 'pendingdpinvoice':
        case 'pendingadminfiles':
        case 'pendingarchitectfiles': // Make sure this key exists in translations
        case 'pendingstructurefiles': // Make sure this key exists in translations
        case 'pendingfinalcheck':
        case 'pendingscheduling':
            return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
      default:
        return <Badge>{translatedStatus}</Badge>;
    }
  };

  const filteredTasks = userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer'
    ? tasks // Admins, Owner, and Dev see all
    : tasks.filter(task => task.assignedDivision === userRole || task.nextAction?.includes(userRole)); // Other roles see tasks assigned to them or requiring their action


  const activeTasks = filteredTasks.filter(task => task.status !== 'Completed' && task.status !== 'Canceled');
  const completedTasksCount = filteredTasks.filter(task => task.status === 'Completed').length;
  const pendingTasksCount = filteredTasks.filter(task => task.status === 'Pending' || task.status === 'Pending Approval').length;


  return (
    <div className="container mx-auto py-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {isClient ? dashboardDict.title : defaultDict.dashboardPage.title}
        </h1>
        {/* Conditionally render Add Task Button */}
        {isClient && canAddTask && (
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
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.activeTasks : defaultDict.dashboardPage.activeTasks}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.activeTasksDesc : defaultDict.dashboardPage.activeTasksDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.completedTasks : defaultDict.dashboardPage.completedTasks}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasksCount}</div>
             <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.completedTasksDesc : defaultDict.dashboardPage.completedTasksDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.pendingActions : defaultDict.dashboardPage.pendingActions}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount}</div>
            <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.pendingActionsDesc : defaultDict.dashboardPage.pendingActionsDesc}</p>
          </CardContent>
        </Card>
      </div>

       {/* Task List */}
      <Card>
         <CardHeader>
           <CardTitle>{isClient ? dashboardDict.taskOverview : defaultDict.dashboardPage.taskOverview}</CardTitle>
           <CardDescription>
             {isClient ? (userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer'
                ? dashboardDict.allTasksDesc
                : dashboardDict.divisionTasksDesc.replace('{division}', userRole)) : ''}
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{isClient ? dashboardDict.noTasks : defaultDict.dashboardPage.noTasks}</p>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <div>
                       <CardTitle className="text-lg">{task.title}</CardTitle>
                       <CardDescription className="text-xs text-muted-foreground">
                         {isClient ? `${dashboardDict.assignedTo}: ${task.assignedDivision} ${task.nextAction ? `| ${dashboardDict.nextAction}: ${task.nextAction}` : ''}` : ''}
                       </CardDescription>
                     </div>
                     {/* Render badge only on client */}
                     {isClient && getStatusBadge(task.status)}
                  </CardHeader>
                  <CardContent>
                     {task.status !== 'Canceled' && task.status !== 'Completed' && ( // Don't show progress for completed/canceled
                       <>
                          <Progress value={task.progress} className="w-full h-2 mb-1" />
                          <span className="text-xs text-muted-foreground">
                            {isClient ? dashboardDict.progress.replace('{progress}', task.progress.toString()) : ''}
                          </span>
                       </>
                     )}
                     {task.status === 'Canceled' && (
                        <p className="text-sm text-destructive font-medium">
                          {isClient ? dashboardDict.taskCanceled : ''}
                        </p>
                     )}
                     {task.status === 'Completed' && (
                         <p className="text-sm text-green-600 font-medium">
                           {isClient ? dashboardDict.taskCompleted : ''}
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

    