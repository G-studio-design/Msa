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
import { getAllProjects, type Project } from '@/services/project-service';
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
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);

  React.useEffect(() => {
      setIsClient(true);
      // Fetch projects when component mounts and user is available
       const fetchProjects = async () => {
            if (currentUser) { // Only fetch if user is loaded
                setIsLoadingProjects(true);
                try {
                    const fetchedProjects = await getAllProjects();
                    setProjects(fetchedProjects);
                } catch (error) {
                    console.error("Failed to fetch projects:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data.' });
                } finally {
                    setIsLoadingProjects(false);
                }
            }
       };
       fetchProjects();
  }, [currentUser, toast]);

  React.useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict);
      setDashboardDict(newDict.dashboardPage); // Update specific section
  }, [language]);

  // Get user role from context, default to empty string if null/undefined
  const userRole = currentUser?.role || '';

  // Check if the current user can add projects based on role from context
  const canAddProject = ['Owner', 'General Admin'].includes(userRole);

  // Helper function to get translated status
  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
      if (!isClient || !dashboardDict?.status) return statusKey;
      const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]); // Memoize this helper

  // Helper function to get status icon and color using translated status
  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !dashboardDict?.status) return <Skeleton className="h-5 w-20" />; // Skeleton during hydration mismatch check
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
  }, [isClient, dashboardDict]); // Memoize this helper

  // Filter projects based on user role from context - MEMOIZED
   const filteredProjects = React.useMemo(() => {
        if (!userRole || !isClient || isLoadingProjects) return []; // Don't filter if not client or still loading
        if (['Owner', 'General Admin', 'Admin Developer'].includes(userRole)) {
            return projects; // These roles see all projects
        }
        // Admin Proyek can also see all projects
        if (userRole === 'Admin Proyek') {
          return projects;
        }
        // Other roles see projects assigned to them OR requiring their action (based on nextAction)
        return projects.filter(project =>
            project.assignedDivision === userRole ||
            (project.nextAction && project.nextAction.toLowerCase().includes(userRole.toLowerCase()))
        );
   }, [userRole, projects, isClient, isLoadingProjects]); // Recalculate when userRole, projects, or client status changes

  const activeProjects = React.useMemo(() => filteredProjects.filter(project => project.status !== 'Completed' && project.status !== 'Canceled'), [filteredProjects]);
  const completedProjectsCount = React.useMemo(() => filteredProjects.filter(project => project.status === 'Completed').length, [filteredProjects]);
  const pendingProjectsCount = React.useMemo(() => filteredProjects.filter(project => project.status === 'Pending' || project.status === 'Pending Approval' || project.status === 'Menunggu Persetujuan' || project.status === 'Pending Input' || project.status === 'Pending Offer' || project.status === 'Pending DP Invoice' || project.status === 'Pending Admin Files' || project.status === 'Pending Architect Files' || project.status === 'Pending Structure Files' || project.status === 'Pending Final Check' || project.status === 'Pending Scheduling').length, [filteredProjects]);

  // --- Chart Data Preparation - MEMOIZED ---
  const projectStatusData = React.useMemo(() => {
    if (!isClient || !dashboardDict?.status || filteredProjects.length === 0) {
        return [];
    }

    const statusCounts: { [key: string]: number } = {};
    const statusKeyMap: { [key: string]: string } = {}; // Map translated status back to original key

    // Initialize counts for all known statuses and build key map
    Object.entries(dashboardDict.status).forEach(([key, translated]) => {
        statusCounts[translated] = 0; // Use translated status as key for counting display labels
        statusKeyMap[translated] = key; // Store original key for color lookup
    });

    filteredProjects.forEach(project => {
        const statusKey = project.status.toLowerCase().replace(/ /g, '');
        const translatedStatus = dashboardDict.status[statusKey as keyof typeof dashboardDict.status] || project.status;
        if (statusCounts.hasOwnProperty(translatedStatus)) {
           statusCounts[translatedStatus]++;
        } else {
            // Handle unexpected status if necessary (optional)
             console.warn(`Unexpected project status found: ${project.status}`);
             // Initialize count for unexpected status if you want to display it
             // statusCounts[translatedStatus] = 1;
             // statusKeyMap[translatedStatus] = statusKey; // Map it if needed
        }
    });

    // Filter out statuses with zero counts before creating chart data
    return Object.entries(statusCounts)
           .filter(([, count]) => count > 0)
           .map(([status, count]) => ({
                status, // Translated status for display
                count,
                originalKey: statusKeyMap[status] || '', // Original key for color mapping
           }));
  }, [filteredProjects, isClient, dashboardDict]);

  // --- Chart Configuration - MEMOIZED ---
  const chartConfig = React.useMemo(() => {
      if (!isClient || !dashboardDict?.chartColors) return {} as ChartConfig;

       const config: ChartConfig = {};
       projectStatusData.forEach((data) => {
          if (data.originalKey) { // Ensure we have the original key
            config[data.status] = { // Keyed by translated status (used in Pie data)
              label: data.status, // Use the translated status as the label
              // Use color from dict based on originalKey, or fallback
              color: dashboardDict.chartColors[data.originalKey as keyof typeof dashboardDict.chartColors] || "#cccccc",
            };
          }
       });
       return config;
  }, [isClient, dashboardDict, projectStatusData]);


   // Render loading state if user is not yet available on the client or projects are loading
   if (!isClient || !currentUser || isLoadingProjects) {
       return (
           <div className="container mx-auto py-4 space-y-6">
               {/* Skeleton for Header */}
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    {/* Skeleton for Add Project Button (if applicable) */}
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
                 {/* Skeleton for Project List */}
                  <Card>
                     <CardHeader>
                          <Skeleton className="h-6 w-1/3 mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                     </CardHeader>
                     <CardContent>
                          <div className="space-y-4">
                              {[...Array(3)].map((_, i) => (
                                  <Card key={`project-skel-${i}`}> {/* Updated key */}
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
                   {/* Skeleton for Project Chart */}
                   <Card className="mt-6">
                       <CardHeader>
                           <Skeleton className="h-6 w-1/3 mb-2" />
                           <Skeleton className="h-4 w-2/3" />
                       </CardHeader>
                       <CardContent className="flex justify-center items-center h-[200px]">
                           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        {/* Conditionally render Add Project Button based on role */}
        {canAddProject && (
            <Button asChild>
                 <Link href="/dashboard/add-project">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isClient ? dashboardDict.addNewProject : defaultDict.dashboardPage.addNewProject}
                </Link>
            </Button>
        )}
      </div>

       {/* Summary Cards & Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"> {/* Changed to 4 columns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.activeProjects : defaultDict.dashboardPage.activeProjects}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.activeProjectsDesc : defaultDict.dashboardPage.activeProjectsDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.completedProjects : defaultDict.dashboardPage.completedProjects}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjectsCount}</div>
             <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.completedProjectsDesc : defaultDict.dashboardPage.completedProjectsDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.pendingActions : defaultDict.dashboardPage.pendingActions}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProjectsCount}</div>
            <p className="text-xs text-muted-foreground">{isClient ? dashboardDict.pendingActionsDesc : defaultDict.dashboardPage.pendingActionsDesc}</p>
          </CardContent>
        </Card>

        {/* Project Status Distribution Chart Card */}
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.projectStatusChartTitle : defaultDict.dashboardPage.projectStatusChartTitle}</CardTitle>
               <PieChartIcon className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             {projectStatusData.length > 0 ? (
               <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[150px]"> {/* Adjust height */}
                 <PieChart>
                   <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                   <Pie
                      data={projectStatusData}
                      dataKey="count"
                      nameKey="status" // Use translated status for the name key
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
                     {projectStatusData.map((entry) => (
                        // Fill based on the entry's translated status (which is the key in chartConfig)
                       <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                     ))}
                   </Pie>
                   <ChartLegend
                      content={<ChartLegendContent nameKey="status" />} // Use translated status for legend labels
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

       {/* Project List */}
      <Card>
         <CardHeader>
           <CardTitle>{isClient ? dashboardDict.projectOverview : defaultDict.dashboardPage.projectOverview}</CardTitle>
           <CardDescription>
             {isClient ? (userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer' || userRole === 'Admin Proyek'
                ? dashboardDict.allProjectsDesc
                : dashboardDict.divisionProjectsDesc.replace('{division}', getTranslatedStatus(userRole))) : '...'}
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{isClient ? dashboardDict.noProjects : defaultDict.dashboardPage.noProjects}</p>
            ) : (
              filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <div>
                       <CardTitle className="text-lg">{project.title}</CardTitle>
                       <CardDescription className="text-xs text-muted-foreground">
                         {isClient && dashboardDict ? `${dashboardDict.assignedTo}: ${getTranslatedStatus(project.assignedDivision)} ${project.nextAction ? `| ${dashboardDict.nextAction}: ${project.nextAction}` : ''}` : '...'}
                       </CardDescription>
                     </div>
                     {getStatusBadge(project.status)}
                  </CardHeader>
                  <CardContent>
                     {project.status !== 'Canceled' && project.status !== 'Completed' && ( // Don't show progress for completed/canceled
                       <>
                          <Progress value={project.progress} className="w-full h-2 mb-1" />
                          <span className="text-xs text-muted-foreground">
                            {isClient && dashboardDict ? dashboardDict.progress.replace('{progress}', project.progress.toString()) : '...'}
                          </span>
                       </>
                     )}
                     {project.status === 'Canceled' && (
                        <p className="text-sm text-destructive font-medium">
                          {isClient ? getTranslatedStatus(project.status) : defaultDict.dashboardPage.projectCanceled}
                        </p>
                     )}
                     {project.status === 'Completed' && (
                         <p className="text-sm text-green-600 font-medium">
                           {isClient ? getTranslatedStatus(project.status) : defaultDict.dashboardPage.projectCompleted}
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

    