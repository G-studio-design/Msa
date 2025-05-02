// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link'; // Import Link
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Import Button
import { CheckCircle, XCircle, Clock, AlertTriangle, PlusCircle, Loader2, TrendingUp, Percent, BarChartIcon } from 'lucide-react'; // Added Percent, BarChartIcon icons
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
} from "@/components/ui/chart"; // Import base chart components
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"; // Import specific chart types and elements


// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function DashboardPage() {
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const { toast } = useToast(); // Initialize toast
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage); // Initialize specific section

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
            } else {
                setIsLoadingProjects(false); // Stop loading if no user
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
  const canAddProject = currentUser && ['Owner', 'General Admin'].includes(userRole);

  // Helper function to get translated status
  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
       if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
       const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
       return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);


  // Helper function to get status icon and color using translated status
  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !dashboardDict?.status || !status) return <Skeleton className="h-5 w-20" />;

    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status; // Fallback to original

    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";
    let Icon = Clock;

     switch (status.toLowerCase()) {
        case 'completed':
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white';
            Icon = CheckCircle;
            break;
        case 'inprogress':
        case 'sedang berjalan':
            variant = 'secondary';
            className = 'bg-blue-500 text-white hover:bg-blue-600';
            Icon = Clock;
            break;
        case 'pendingapproval':
        case 'menunggu persetujuan':
            variant = 'outline';
            className = 'border-yellow-500 text-yellow-600';
            Icon = AlertTriangle;
            break;
        case 'delayed':
        case 'tertunda':
             variant = 'destructive';
             className = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500';
             Icon = Clock;
             break;
        case 'canceled':
        case 'dibatalkan':
             variant = 'destructive';
             Icon = XCircle;
             break;
        case 'pending':
        case 'pendinginput':
        case 'menunggu input':
        case 'pendingoffer':
        case 'menunggu penawaran':
            variant = 'outline';
            className = 'border-blue-500 text-blue-600';
            Icon = Clock;
            break;
        case 'pendingdpinvoice':
        case 'menunggu faktur dp':
        case 'pendingadminfiles':
        case 'menunggu file admin':
        case 'pendingarchitectfiles':
        case 'menunggu file arsitek':
        case 'pendingstructurefiles':
        case 'menunggu file struktur':
        case 'pendingfinalcheck':
        case 'menunggu pemeriksaan akhir':
        case 'pendingscheduling':
        case 'menunggu penjadwalan':
            variant = 'secondary';
            Icon = Clock;
            break;
        case 'scheduled':
        case 'terjadwal':
            variant = 'secondary';
            className = 'bg-purple-500 text-white hover:bg-purple-600';
            Icon = Clock;
            break;
        default:
            variant = 'secondary';
            Icon = Clock;
    }

    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict]);

  // Filter projects based on user role from context - MEMOIZED
   const filteredProjects = React.useMemo(() => {
        if (!userRole || !isClient || isLoadingProjects) return [];
        if (['Owner', 'General Admin', 'Admin Developer'].includes(userRole)) {
            return projects;
        }
        if (userRole === 'Admin Proyek') {
          return projects;
        }
        return projects.filter(project =>
            project.assignedDivision === userRole ||
            (project.nextAction && project.nextAction.toLowerCase().includes(userRole.toLowerCase()))
        );
   }, [userRole, projects, isClient, isLoadingProjects]);

  const activeProjects = React.useMemo(() => filteredProjects.filter(project => project.status !== 'Completed' && project.status !== 'Canceled'), [filteredProjects]);
  const completedProjectsCount = React.useMemo(() => filteredProjects.filter(project => project.status === 'Completed').length, [filteredProjects]);
  const pendingProjectsCount = React.useMemo(() => filteredProjects.filter(project => ['Pending Approval', 'Pending Input', 'Pending Offer', 'Pending DP Invoice', 'Pending Admin Files', 'Pending Architect Files', 'Pending Structure Files', 'Pending Final Check', 'Pending Scheduling', 'Menunggu Persetujuan', 'Menunggu Input', 'Menunggu Penawaran', 'Menunggu Faktur DP', 'Menunggu File Admin', 'Menunggu File Arsitek', 'Menunggu File Struktur', 'Menunggu Pemeriksaan Akhir', 'Menunggu Penjadwalan'].includes(project.status)).length, [filteredProjects]);

  // Calculate Average Progress - MEMOIZED
  const averageProgress = React.useMemo(() => {
    if (filteredProjects.length === 0) {
      return 0;
    }
    const totalProgress = filteredProjects.reduce((sum, project) => sum + project.progress, 0);
    return Math.round(totalProgress / filteredProjects.length);
  }, [filteredProjects]);

  // Prepare data for the progress chart - MEMOIZED
  const chartData = React.useMemo(() => {
      // Only include active projects (not completed or canceled)
      return activeProjects
          .map(project => ({
              title: project.title.length > 20 ? `${project.title.substring(0, 17)}...` : project.title, // Truncate long titles
              progress: project.progress,
          }))
          .sort((a, b) => b.progress - a.progress); // Optional: sort by progress
  }, [activeProjects]);

   // --- Remove Project Status Distribution Calculation ---
   // const projectStatusDistribution = React.useMemo(() => { ... }, [filteredProjects, getTranslatedStatus]);

   // Render loading state
   if (!isClient || !currentUser || isLoadingProjects) {
       return (
           <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
               {/* Skeleton for Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-48" />
                    {(currentUser?.role === 'Owner' || currentUser?.role === 'General Admin') && <Skeleton className="h-10 w-36" />}
                </div>
               {/* Skeleton for Summary Cards */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                    {[...Array(4)].map((_, i) => ( // Now 4 cards
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
                 {/* Skeleton for Project Progress Chart */}
                 <Card>
                     <CardHeader>
                          <Skeleton className="h-6 w-1/3 mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                     </CardHeader>
                     <CardContent>
                         <Skeleton className="h-64 w-full" /> {/* Skeleton for chart area */}
                     </CardContent>
                 </Card>
                 {/* Skeleton for Project List */}
                  <Card>
                     <CardHeader>
                          <Skeleton className="h-6 w-1/3 mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                     </CardHeader>
                     <CardContent>
                          <div className="space-y-4">
                              {[...Array(3)].map((_, i) => (
                                  <Card key={`project-skel-${i}`} className="opacity-50">
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
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {isClient && dashboardDict ? dashboardDict.title : defaultDict.dashboardPage.title}
        </h1>
        {canAddProject && (
             <Link href="/dashboard/add-project" passHref>
                <Button className="w-full sm:w-auto accent-teal">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isClient && dashboardDict ? dashboardDict.addNewProject : defaultDict.dashboardPage.addNewProject}
                </Button>
             </Link>
        )}
      </div>

       {/* Summary Cards - Updated to 4 columns */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{isClient && dashboardDict ? dashboardDict.activeProjects : defaultDict.dashboardPage.activeProjects}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeProjects.length}</div>
                    <p className="text-xs text-muted-foreground">{isClient && dashboardDict ? dashboardDict.activeProjectsDesc : defaultDict.dashboardPage.activeProjectsDesc}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{isClient && dashboardDict ? dashboardDict.completedProjects : defaultDict.dashboardPage.completedProjects}</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">{isClient && dashboardDict ? dashboardDict.completedProjectsDesc : defaultDict.dashboardPage.completedProjectsDesc}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{isClient && dashboardDict ? dashboardDict.pendingActions : defaultDict.dashboardPage.pendingActions}</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">{isClient && dashboardDict ? dashboardDict.pendingActionsDesc : defaultDict.dashboardPage.pendingActionsDesc}</p>
                </CardContent>
            </Card>
             {/* Average Progress Card */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{isClient && dashboardDict ? dashboardDict.averageProgressTitle : defaultDict.dashboardPage.averageProgressTitle}</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{averageProgress}%</div>
                    <p className="text-xs text-muted-foreground">{isClient && dashboardDict ? dashboardDict.averageProgressDesc : defaultDict.dashboardPage.averageProgressDesc}</p>
                </CardContent>
             </Card>
        </div>

       {/* Project Completion Chart */}
        <Card>
           <CardHeader>
             <CardTitle className="text-lg md:text-xl">{isClient && dashboardDict ? dashboardDict.projectProgressChartTitle : defaultDict.dashboardPage.projectProgressChartTitle}</CardTitle> {/* Adjusted size */}
             <CardDescription>{isClient && dashboardDict ? dashboardDict.projectProgressChartDesc : defaultDict.dashboardPage.projectProgressChartDesc}</CardDescription>
           </CardHeader>
           <CardContent className="pl-2 pr-6"> {/* Adjusted padding for chart */}
              {activeProjects.length > 0 ? (
                  <ChartContainer config={{ progress: { label: "Progress", color: "hsl(var(--primary))" } }} className="h-[250px] sm:h-[300px] w-full"> {/* Adjusted height */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 5, left: -15, bottom: 5 }} // Adjust margin for smaller screens
                        layout="vertical" // Change to vertical layout
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} /> {/* Adjust grid */}
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} /> {/* Smaller tick font */}
                        <YAxis
                          dataKey="title"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={80} // Reduced width for smaller screens
                          interval={0} // Ensure all labels are shown
                          tick={{ fontSize: 10 }} // Adjust font size
                         />
                        <ChartTooltip
                           cursor={false}
                           content={<ChartTooltipContent indicator="line" hideLabel />}
                        />
                        <Bar dataKey="progress" fill="var(--color-progress)" radius={4} barSize={16} /> {/* Reduced barSize */}
                         {/* <ChartLegend content={<ChartLegendContent />} /> Optional: Add legend if needed */}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
              ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                     <BarChartIcon className="h-12 w-12 mb-2" />
                     <p>{isClient && dashboardDict ? dashboardDict.noActiveProjectsForChart : defaultDict.dashboardPage.noActiveProjectsForChart}</p>
                  </div>
              )}
           </CardContent>
        </Card>


       {/* Project List */}
      <Card>
         <CardHeader>
           <CardTitle className="text-lg md:text-xl">{isClient && dashboardDict ? dashboardDict.projectOverview : defaultDict.dashboardPage.projectOverview}</CardTitle> {/* Adjusted size */}
           <CardDescription>
             {isClient && dashboardDict ? (userRole === 'General Admin' || userRole === 'Owner' || userRole === 'Admin Developer' || userRole === 'Admin Proyek'
                ? dashboardDict.allProjectsDesc
                : dashboardDict.divisionProjectsDesc.replace('{division}', getTranslatedStatus(userRole))) : '...'}
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{isClient && dashboardDict ? dashboardDict.noProjects : defaultDict.dashboardPage.noProjects}</p>
            ) : (
              filteredProjects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects?projectId=${project.id}`} passHref legacyBehavior>
                   <a className="block hover:shadow-md transition-shadow cursor-pointer"> {/* Wrap Card with <a> */}
                       <Card>
                           <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6"> {/* Adjusted padding */}
                               <div className="flex-1 min-w-0"> {/* Ensure text can wrap */}
                                   <CardTitle className="text-base sm:text-lg truncate">{project.title}</CardTitle> {/* Truncate */}
                                   <CardDescription className="text-xs text-muted-foreground mt-1 truncate"> {/* Truncate */}
                                       {isClient && dashboardDict && project.assignedDivision ? `${dashboardDict.assignedTo}: ${getTranslatedStatus(project.assignedDivision)} ${project.nextAction ? `| ${dashboardDict.nextAction}: ${project.nextAction}` : ''}` : '...'}
                                   </CardDescription>
                               </div>
                               <div className="flex-shrink-0 mt-2 sm:mt-0">
                                   {getStatusBadge(project.status)}
                               </div>
                           </CardHeader>
                           <CardContent className="p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                               {project.status !== 'Canceled' && project.status !== 'Completed' && (
                                   <div className="flex items-center gap-2">
                                       <Progress value={project.progress} className="flex-1 h-2" />
                                       <span className="text-xs text-muted-foreground font-medium">
                                           {project.progress}%
                                       </span>
                                   </div>
                               )}
                               {project.status === 'Canceled' && (
                                   <p className="text-sm text-destructive font-medium">
                                       {isClient && dashboardDict ? getTranslatedStatus(project.status) : defaultDict.dashboardPage.projectCanceled}
                                   </p>
                               )}
                               {project.status === 'Completed' && (
                                   <p className="text-sm text-green-600 font-medium">
                                       {isClient && dashboardDict ? getTranslatedStatus(project.status) : defaultDict.dashboardPage.projectCompleted}
                                   </p>
                               )}
                           </CardContent>
                       </Card>
                   </a>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
