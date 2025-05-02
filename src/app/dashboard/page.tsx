// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link'; // Import Link
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Import Button
import { CheckCircle, XCircle, Clock, AlertTriangle, PlusCircle, Loader2, TrendingUp } from 'lucide-react'; // Import PlusCircle, Loader2, TrendingUp
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { getAllProjects, type Project } from '@/services/project-service';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'; // Import Recharts components

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define colors for the pie chart (consistent with status badge colors if possible)
const PIE_COLORS = {
    'Pending Approval': '#f59e0b', // Yellow-orange
    'In Progress': '#3b82f6', // Blue
    'Pending Offer': '#6366f1', // Indigo
    'Pending Input': '#a855f7', // Purple
    'Pending DP Invoice': '#ec4899', // Pink
    'Pending Admin Files': '#f43f5e', // Rose
    'Pending Architect Files': '#10b981', // Emerald
    'Pending Structure Files': '#facc15', // Yellow
    'Pending Final Check': '#84cc16', // Lime
    'Pending Scheduling': '#d946ef', // Fuchsia
    'Scheduled': '#6d28d9', // Violet
    'Completed': '#22c55e', // Green
    'Canceled': '#ef4444', // Red
    'Delayed': '#f97316', // Orange (from custom destructive style)
    'Default': '#6b7280', // Gray for others
};

// Function to get color based on status
const getPieColor = (status: string): string => {
    const normalizedStatus = status.replace(/ /g, ''); // Remove spaces for key matching
    const key = Object.keys(PIE_COLORS).find(k => k.replace(/ /g, '') === normalizedStatus);
    return key ? PIE_COLORS[key as keyof typeof PIE_COLORS] : PIE_COLORS['Default'];
};

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
  }, [isClient, dashboardDict]); // Memoize this helper


  // Helper function to get status icon and color using translated status
  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !dashboardDict?.status || !status) return <Skeleton className="h-5 w-20" />; // Skeleton during hydration mismatch check or if status is missing

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

   // --- Project Status Distribution Calculation - MEMOIZED ---
  const projectStatusDistribution = React.useMemo(() => {
    if (!filteredProjects || filteredProjects.length === 0) {
      return [];
    }
    const statusCounts = filteredProjects.reduce((acc, project) => {
      const status = getTranslatedStatus(project.status); // Use translated status for grouping
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

     return Object.entries(statusCounts).map(([name, value]) => ({
       name, // Translated status name
       value, // Count for this status
       fill: getPieColor(name), // Get color based on original status name if possible, fallback needed
     }));
  }, [filteredProjects, getTranslatedStatus]); // Added getTranslatedStatus dependency


   // Render loading state if user is not yet available on the client or projects are loading
   if (!isClient || !currentUser || isLoadingProjects) {
       return (
           <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
               {/* Skeleton for Header */}
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    {/* Skeleton for Add Project Button (if applicable) */}
                    {(currentUser?.role === 'Owner' || currentUser?.role === 'General Admin') && <Skeleton className="h-10 w-32" />}
                </div>
               {/* Skeleton for Summary Cards & Chart */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6"> {/* Adjusted grid for 3 items + chart */}
                     {/* Skeletons for 3 summary cards */}
                    {[...Array(3)].map((_, i) => (
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
                     {/* Skeleton for Chart Card */}
                     <Card className="md:col-span-1 lg:col-span-1"> {/* Chart takes 1 column */}
                          <CardHeader className="pb-2">
                             <Skeleton className="h-5 w-3/5 mb-2" />
                             <Skeleton className="h-3 w-4/5" />
                          </CardHeader>
                          <CardContent className="flex justify-center items-center h-[200px]"> {/* Fixed height for chart area */}
                              <Skeleton className="h-36 w-36 rounded-full" />
                          </CardContent>
                      </Card>
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
                                  <Card key={`project-skel-${i}`} > {/* Updated key */}
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
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"> {/* Flex column on mobile */}
        <h1 className="text-2xl md:text-3xl font-bold text-primary"> {/* Adjusted font size */}
          {isClient ? dashboardDict.title : defaultDict.dashboardPage.title}
        </h1>
        {/* Conditionally render Add Project Button based on role */}
        {canAddProject && (
           <Button asChild className="w-full sm:w-auto accent-teal"> {/* Ensure only Link is the child */}
              <Link href="/dashboard/add-project" className="flex items-center"> {/* Apply flex directly to Link */}
                <PlusCircle className="mr-2 h-4 w-4" />
                {isClient ? dashboardDict.addNewProject : defaultDict.dashboardPage.addNewProject}
              </Link>
           </Button>
        )}
      </div>

       {/* Summary Cards & Chart */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6"> {/* Adjusted grid */}
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

         {/* Project Status Distribution Chart */}
          <Card className="md:col-span-2 lg:col-span-1"> {/* Chart takes 2 cols on md, 1 on lg */}
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium">{isClient ? dashboardDict.statusDistributionTitle : defaultDict.dashboardPage.statusDistributionTitle}</CardTitle>
               <CardDescription className="text-xs text-muted-foreground">{isClient ? dashboardDict.statusDistributionDesc : defaultDict.dashboardPage.statusDistributionDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                 {projectStatusDistribution.length > 0 ? (
                   <PieChart>
                     <Pie
                       data={projectStatusDistribution}
                       cx="50%"
                       cy="50%"
                       labelLine={false}
                       // label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} // Simple label
                       outerRadius={80}
                       fill="#8884d8" // Default fill, overridden by Cell
                       dataKey="value"
                       stroke="hsl(var(--border))" // Add border to segments
                       paddingAngle={1} // Add padding between segments
                     >
                       {projectStatusDistribution.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fill} />
                       ))}
                     </Pie>
                      <Tooltip
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                          itemStyle={{ color: 'hsl(var(--foreground))' }}
                          formatter={(value, name) => [`${value} ${value === 1 ? 'project' : 'projects'}`, name]} // Custom formatter
                      />
                      <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: '12px', lineHeight: '1.5' }} />
                   </PieChart>
                 ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                      {isClient ? dashboardDict.noProjectDataForChart : defaultDict.dashboardPage.noProjectDataForChart}
                    </div>
                 )}
              </ResponsiveContainer>
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
                <Link key={project.id} href={`/dashboard/projects?projectId=${project.id}`} passHref>
                   <Card className="hover:shadow-md transition-shadow cursor-pointer block"> {/* Use block for Link */}
                    <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2"> {/* Flex column on mobile */}
                       <div className="flex-1"> {/* Allow title to take space */}
                         <CardTitle className="text-lg">{project.title}</CardTitle>
                         <CardDescription className="text-xs text-muted-foreground mt-1"> {/* Added margin top */}
                           {isClient && dashboardDict ? `${dashboardDict.assignedTo}: ${getTranslatedStatus(project.assignedDivision)} ${project.nextAction ? `| ${dashboardDict.nextAction}: ${project.nextAction}` : ''}` : '...'}
                         </CardDescription>
                       </div>
                       <div className="flex-shrink-0 mt-2 sm:mt-0"> {/* Prevent badge shrinking */}
                          {getStatusBadge(project.status)}
                       </div>
                    </CardHeader>
                    <CardContent>
                       {project.status !== 'Canceled' && project.status !== 'Completed' && ( // Don't show progress for completed/canceled
                         <div className="flex items-center gap-2">
                            <Progress value={project.progress} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground font-medium">
                              {project.progress}%
                            </span>
                         </div>
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
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


    