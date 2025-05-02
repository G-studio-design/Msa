// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link'; // Import Link
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Import Button
import { CheckCircle, XCircle, Clock, AlertTriangle, PlusCircle, Loader2, PieChart as PieChartIcon } from 'lucide-react'; // Import PlusCircle, Loader2, PieChartIcon
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { getAllTasks, type Task } from '@/services/task-service'; // Import task service
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"; // Import Chart components
import { PieChart, Pie, Cell } from "recharts"; // Import Recharts components

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardPage() {
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const { toast } = useToast(); // Initialize toast
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage); // Initialize specific section
  const [tasks, setTasks] = React.useState<Task[]>([]); // State to hold fetched tasks
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(true); // Loading state for tasks

  React.useEffect(() => {
      setIsClient(true);
      // Fetch tasks when component mounts and user is available
       const fetchTasks = async () => {
            if (currentUser) { // Only fetch if user is loaded
                setIsLoadingTasks(true);
                try {
                    const fetchedTasks = await getAllTasks(); // Fetch all tasks for now
                    setTasks(fetchedTasks);
                } catch (error) {
                    console.error("Failed to fetch tasks:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load task data.' });
                } finally {
                    setIsLoadingTasks(false);
                }
            }
       };
       fetchTasks();
  }, [currentUser, toast]);

  React.useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict);
      setDashboardDict(newDict.dashboardPage); // Update specific section
  }, [language]);

  // Get user role from context, default to empty string if null/undefined
  const userRole = currentUser?.role || '';

  // Check if the current user can add tasks based on role from context
  const canAddTask = ['Owner', 'General Admin'].includes(userRole);

  // Helper function to get translated status
  const getTranslatedStatus = (statusKey: string): string => {
      if (!isClient || !dashboardDict?.status) return statusKey;
      const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || statusKey;
  }

  // Helper function to get status icon and color using translated status
  const getStatusBadge = (status: string) => {
    if (!isClient) return <Skeleton className="h-5 w-20" />; // Skeleton during hydration mismatch check
    if (!dashboardDict?.status) return <Badge variant="secondary">{status}</Badge>; // Fallback

    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status; // Fallback to original

    // Define badge variants based on status
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";
    let Icon = Clock;

     switch (status.toLowerCase()) {
        case 'completed':
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white'; // Added text-white for consistency
            Icon = CheckCircle;
            break;
        case 'inprogress':
        case 'sedang berjalan': // Add Indonesian translation
            variant = 'secondary';
            className = 'bg-blue-500 text-white hover:bg-blue-600';
            Icon = Clock;
            break;
        case 'pendingapproval':
        case 'menunggu persetujuan': // Add Indonesian translation
            variant = 'outline';
            className = 'border-yellow-500 text-yellow-600';
            Icon = AlertTriangle;
            break;
        case 'delayed':
        case 'tertunda': // Add Indonesian translation
             variant = 'destructive'; // Use destructive for delay color, but style it orange
             className = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'; // Custom orange style
             Icon = Clock;
             break;
        case 'canceled':
        case 'dibatalkan': // Add Indonesian translation
             variant = 'destructive';
             Icon = XCircle;
             break;
        case 'pending':
        case 'pendinginput':
        case 'menunggu input': // Add Indonesian translation
        case 'pendingoffer': // Make this stand out slightly?
        case 'menunggu penawaran': // Add Indonesian translation
            variant = 'outline'; // Example: Use outline for pending offer
            className = 'border-blue-500 text-blue-600'; // Example: blue outline
            Icon = Clock;
            break;
        case 'pendingdpinvoice':
        case 'menunggu faktur dp': // Add Indonesian translation
        case 'pendingadminfiles':
        case 'menunggu file admin': // Add Indonesian translation
        case 'pendingarchitectfiles':
        case 'menunggu file arsitek': // Add Indonesian translation
        case 'pendingstructurefiles':
        case 'menunggu file struktur': // Add Indonesian translation
        case 'pendingfinalcheck':
        case 'menunggu pemeriksaan akhir': // Add Indonesian translation
        case 'pendingscheduling':
        case 'menunggu penjadwalan': // Add Indonesian translation
            variant = 'secondary';
            Icon = Clock;
            break;
        case 'scheduled':
        case 'terjadwal': // Add Indonesian translation
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
        if (!userRole || !isClient || isLoadingTasks) return []; // Don't filter if not client or still loading
        if (['Owner', 'General Admin', 'Admin Developer'].includes(userRole)) {
            return tasks; // These roles see all tasks
        }
        // Admin Proyek can also see all tasks
        if (userRole === 'Admin Proyek') {
          return tasks;
        }
        // Other roles see tasks assigned to them OR requiring their action (based on nextAction)
         // Use translated role names for filtering if necessary, or keep using English keys
        return tasks.filter(task =>
            task.assignedDivision === userRole ||
            (task.nextAction && task.nextAction.toLowerCase().includes(userRole.toLowerCase()))
        );
   }, [userRole, tasks, isClient, isLoadingTasks]); // Recalculate when userRole, tasks, or client status changes

  const activeTasks = filteredTasks.filter(task => task.status !== 'Completed' && task.status !== 'Canceled');
  const completedTasksCount = filteredTasks.filter(task => task.status === 'Completed').length;
  const pendingTasksCount = filteredTasks.filter(task => task.status === 'Pending' || task.status === 'Pending Approval' || task.status === 'Menunggu Persetujuan' || task.status === 'Pending Input' || task.status === 'Pending Offer' || task.status === 'Pending DP Invoice' || task.status === 'Pending Admin Files' || task.status === 'Pending Architect Files' || task.status === 'Pending Structure Files' || task.status === 'Pending Final Check' || task.status === 'Pending Scheduling').length;

  // --- Chart Data Preparation ---
  const taskStatusData = React.useMemo(() => {
    if (!isClient || !dashboardDict?.status || filteredTasks.length === 0) {
        return [];
    }

    const statusCounts: { [key: string]: number } = {};

    // Initialize counts for all known statuses to ensure they appear in the legend
    Object.keys(dashboardDict.status).forEach(key => {
        // Convert status key back to original English format if needed for lookup, or rely on translation keys
        // This assumes keys in dashboardDict.status match the keys used in tasks.status (lowercase, no space)
         const originalStatus = Object.entries(dashboardDict.status).find(([origKey, trans]) => origKey === key)?.[0] ?? key;
        statusCounts[originalStatus] = 0;
    });


    filteredTasks.forEach(task => {
        const statusKey = task.status.toLowerCase().replace(/ /g, '');
        const translatedStatus = dashboardDict.status[statusKey as keyof typeof dashboardDict.status] || task.status;
        statusCounts[translatedStatus] = (statusCounts[translatedStatus] || 0) + 1;
    });

    // Filter out statuses with zero counts before creating chart data
    return Object.entries(statusCounts)
           .filter(([, count]) => count > 0)
           .map(([status, count]) => ({
                status,
                count,
                // Define fill color here or in chartConfig
           }));
  }, [filteredTasks, isClient, dashboardDict]);

  // --- Chart Configuration ---
  const chartConfig = React.useMemo(() => {
      if (!isClient || !dashboardDict?.chartColors) return {} as ChartConfig;

       const config: ChartConfig = {};
       taskStatusData.forEach((data) => {
         // Find the key corresponding to the translated status
         const statusKey = Object.entries(dashboardDict.status).find(([, translated]) => translated === data.status)?.[0];
          if (statusKey) {
            config[data.status] = {
              label: data.status, // Use the translated status as the label
              color: dashboardDict.chartColors[statusKey as keyof typeof dashboardDict.chartColors] || "#cccccc", // Use color from dict or fallback
              };
          }
       });
       return config;
  }, [isClient, dashboardDict, taskStatusData]);


   // Render loading state if user is not yet available on the client or tasks are loading
   if (!isClient || !currentUser || isLoadingTasks) {
       return (
           <div className="container mx-auto py-4 space-y-6">
               {/* Skeleton for Header */}
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    {/* Skeleton for Add Task Button (if applicable) */}
                    {(currentUser?.role === 'Owner' || currentUser?.role === 'General Admin') && <Skeleton className="h-10 w-32" />}
                </div>
               {/* Skeleton for Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"> {/* Updated grid to 4 cols */}
                    {[...Array(4)].map((_, i) => (
                         <Card key={`summary-skel-${i}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-2/4" />
                                <Skeleton className="h-4 w-4 rounded-full" />
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
                                          <Skeleton className="h-5 w-20 rounded-full" />
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
          {isClient ? dashboardDict.title : defaultDict.dashboardPage.title}
        </h1>
        {/* Conditionally render Add Task Button based on role */}
        {canAddTask && (
            <Button asChild>
                 <Link href="/dashboard/add-task">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isClient ? dashboardDict.addNewTask : defaultDict.dashboardPage.addNewTask}
                </Link>
            </Button>
        )}
      </div>

       {/* Summary Cards & Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"> {/* Changed to 4 columns */}
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

        {/* Task Status Distribution Chart Card */}
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.taskStatusChartTitle : defaultDict.dashboardPage.taskStatusChartTitle}</CardTitle>
               <PieChartIcon className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             {taskStatusData.length > 0 ? (
               <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[150px]"> {/* Adjust height */}
                 <PieChart>
                   <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                   <Pie
                      data={taskStatusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={40} // Make it a donut chart
                      strokeWidth={2}
                      labelLine={false} // Hide label lines
                      label={({ percent, x, y, midAngle }) => { // Custom small label inside segment
                            const RADIAN = Math.PI / 180;
                            const radius = 15 + 25 * 0.7; // Position label inside
                            const lx = x + radius * Math.cos(-midAngle * RADIAN);
                            const ly = y + radius * Math.sin(-midAngle * RADIAN);
                            return (
                                <text
                                    x={lx}
                                    y={ly}
                                    fill="white" // White text for contrast
                                    textAnchor={lx > x ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    fontSize="10px" // Smaller font size
                                    fontWeight="bold"
                                >
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                    >
                     {taskStatusData.map((entry) => (
                       <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                     ))}
                   </Pie>
                   <ChartLegend
                      content={<ChartLegendContent nameKey="status" />}
                      className="-translate-y-2 flex-wrap gap-1 [&>*]:basis-1/4 [&>*]:justify-center"
                    />
                 </PieChart>
               </ChartContainer>
             ) : (
               <p className="text-xs text-muted-foreground text-center h-[150px] flex items-center justify-center">
                 {isClient ? dashboardDict.noDataForChart : defaultDict.dashboardPage.noDataForChart}
               </p>
             )}
           </CardContent>
         </Card>
      </div>

       {/* Task List */}
      <Card>
         <CardHeader>
           <CardTitle>{isClient ? dashboardDict.taskOverview : defaultDict.dashboardPage.taskOverview}</CardTitle>
           <CardDescription>
             {isClient ? (userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer' || userRole === 'Admin Proyek'
                ? dashboardDict.allTasksDesc
                : dashboardDict.divisionTasksDesc.replace('{division}', getTranslatedStatus(userRole))) : '...'}
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
                         {isClient && dashboardDict ? `${dashboardDict.assignedTo}: ${getTranslatedStatus(task.assignedDivision)} ${task.nextAction ? `| ${dashboardDict.nextAction}: ${task.nextAction}` : ''}` : '...'}
                       </CardDescription>
                     </div>
                     {getStatusBadge(task.status)}
                  </CardHeader>
                  <CardContent>
                     {task.status !== 'Canceled' && task.status !== 'Completed' && ( // Don't show progress for completed/canceled
                       <>
                          <Progress value={task.progress} className="w-full h-2 mb-1" />
                          <span className="text-xs text-muted-foreground">
                            {isClient && dashboardDict ? dashboardDict.progress.replace('{progress}', task.progress.toString()) : '...'}
                          </span>
                       </>
                     )}
                     {task.status === 'Canceled' && (
                        <p className="text-sm text-destructive font-medium">
                          {isClient ? getTranslatedStatus(task.status) : defaultDict.dashboardPage.taskCanceled}
                        </p>
                     )}
                     {task.status === 'Completed' && (
                         <p className="text-sm text-green-600 font-medium">
                           {isClient ? getTranslatedStatus(task.status) : defaultDict.dashboardPage.taskCompleted}
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
