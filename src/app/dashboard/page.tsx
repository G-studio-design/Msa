
// src/app/dashboard/page.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added missing import
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { getAllProjects, type Project } from '@/services/project-service';
import Link from 'next/link';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    ListChecks,
    Loader2,
    FileText,
    Users,
    Briefcase,
    CalendarClock,
    RefreshCw,
    XCircle,
    PlusCircle,
    ExternalLink
} from 'lucide-react';

const defaultGlobalDict = getDictionary('en');

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const dashboardDict = useMemo(() => getDictionary(language).dashboardPage, [language]);
  const projectsDict = useMemo(() => getDictionary(language).projectsPage, [language]);

  useEffect(() => {
    setIsClient(true);
    console.log('[DashboardPage] Component mounted, isClient set to true.');
  }, []);

  const fetchProjects = useCallback(async () => {
    if (currentUser) {
      console.log('[DashboardPage] Fetching projects...');
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await getAllProjects();
        console.log('[DashboardPage] Projects fetched:', fetchedProjects);
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('[DashboardPage] Failed to fetch projects:', error);
      } finally {
        setIsLoadingProjects(false);
        console.log('[DashboardPage] Finished fetching projects, isLoadingProjects set to false.');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (isClient && currentUser) {
      fetchProjects();
    }
  }, [isClient, currentUser, fetchProjects]);

  const getTranslatedStatus = useCallback((statusKey: string): string => {
    if (!dashboardDict?.status || !statusKey) return statusKey;
    const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    return dashboardDict.status[key] || statusKey;
  }, [dashboardDict]);

  const getStatusBadge = useCallback((status: string | undefined | null) => {
    console.log(`[DashboardPage/getStatusBadge] CALLED with status: "${status}"`);
    if (!isClient || !status || !dashboardDict?.status) {
        console.log('[DashboardPage/getStatusBadge] Early exit: not client, no status, or no dashboardDict.status');
        return <Skeleton className="h-5 w-20" />;
    }

    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    console.log(`[DashboardPage/getStatusBadge] Generated statusKey: "${statusKey}" for original status: "${status}"`);

    const translatedStatus = getTranslatedStatus(status);
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "py-1 px-2 text-xs";
    let Icon = Clock;

    switch (statusKey) {
        case 'completed': case 'selesai':
            variant = 'default';
            className = `${className} bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-primary-foreground`;
            Icon = CheckCircle;
            break;
        case 'inprogress': case 'sedangberjalan':
            variant = 'secondary';
            className = `${className} bg-blue-500 text-white dark:bg-blue-600 dark:text-primary-foreground hover:bg-blue-600 dark:hover:bg-blue-700`;
            Icon = Activity;
            break;
        case 'pendingapproval': case 'menunggupersetujuan':
            variant = 'outline';
            className = `${className} border-yellow-500 text-yellow-600 dark:border-yellow-400 dark:text-yellow-500`;
            Icon = AlertTriangle;
            break;
        case 'pendingparalleldesignuploads': case 'menungguunggahandesainparalel':
            variant = 'default';
            className = `${className} bg-fuchsia-500 hover:bg-fuchsia-600 text-white dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700`;
            Icon = ListChecks;
            break;
        case 'pendingpostsidangrevision': case 'menunggurevisipascSidang':
            variant = 'outline';
            className = `${className} border-orange-400 text-orange-500 dark:border-orange-300 dark:text-orange-400`;
            Icon = RefreshCw;
            break;
        case 'delayed': case 'tertunda':
            variant = 'destructive';
            className = `${className} bg-orange-500 text-white dark:bg-orange-600 dark:text-primary-foreground hover:bg-orange-600 dark:hover:bg-orange-700 border-orange-500 dark:border-orange-600`;
            Icon = Clock;
            break;
        case 'canceled': case 'dibatalkan':
            variant = 'destructive';
            Icon = XCircle;
            break;
        case 'pending': case 'pendinginitialinput': case 'menungguinputawal': case 'pendingoffer': case 'menunggupenawaran':
            variant = 'outline';
            className = `${className} border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-500`;
            Icon = Briefcase;
            break;
        case 'pendingdpinvoice': case 'menunggufakturdp': case 'pendingadminfiles': case 'menungguberkasadministrasi': case 'pendingsurveydetails': case 'menunggudetailsurvei': case 'pendingarchitectfiles': case 'menungguberkasarsitektur': case 'pendingstructurefiles':  case 'menungguberkasstruktur': case 'pendingmepfiles': case 'menungguberkasmep': case 'pendingfinalcheck': case 'menunggupemeriksaanakhir': case 'pendingscheduling': case 'menunggupenjadwalan': case 'pendingconsultationdocs':  case 'menungudokkonsultasi': case 'pendingreview':  case 'menunggutinjauan':
            variant = 'secondary';
            Icon = Clock;
            break;
        case 'scheduled': case 'terjadwal':
            variant = 'secondary';
            className = `${className} bg-purple-500 text-white dark:bg-purple-600 dark:text-primary-foreground hover:bg-purple-600 dark:hover:bg-purple-700`;
            Icon = CalendarClock;
            break;
        default:
            console.log(`[DashboardPage/getStatusBadge] Default badge returned for statusKey: "${statusKey}", original status: "${status}"`);
            variant = 'secondary'; Icon = Clock;
    }
    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict, getTranslatedStatus]);

  const activeProjects = useMemo(() => {
    console.log('[DashboardPage] Recalculating activeProjects. Total projects:', projects.length);
    return projects.filter(p => p.status !== 'Completed' && p.status !== 'Canceled');
  }, [projects]);

  if (!isClient || isLoadingProjects) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={`skel-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  console.log('[DashboardPage] Rendering main content. Active projects count:', activeProjects.length);

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {dashboardDict.title}
        </h1>
        {currentUser && ['Owner', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim()) && (
            <Link href="/dashboard/add-project" passHref>
                <Button className="w-full sm:w-auto accent-teal">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    {dashboardDict.addNewProject}
                </Button>
            </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dashboardDict.activeProjects}</CardTitle>
          <CardDescription>
            {currentUser?.role === 'Owner' || currentUser?.role === 'Akuntan' || currentUser?.role === 'Admin Proyek' || currentUser?.role === 'Admin Developer'
              ? dashboardDict.allProjectsDesc
              : dashboardDict.divisionProjectsDesc.replace('{division}', currentUser?.role || '')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeProjects.length === 0 ? (
            <p className="text-muted-foreground">{dashboardDict.noProjects}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeProjects.map(project => {
                console.log(`[DashboardPage] Rendering project card: "${project.title}", Status: "${project.status}"`);
                return (
                  <Link href={`/dashboard/projects?projectId=${project.id}`} key={project.id} passHref>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        {getStatusBadge(project.status)}
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                          <strong>{projectsDict.nextActionLabel}:</strong> {project.nextAction || projectsDict.none}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>{projectsDict.assignedLabel}:</strong> {getTranslatedStatus(project.assignedDivision) || projectsDict.none}
                        </p>
                      </CardContent>
                      <CardFooter>
                          <div className="text-xs text-muted-foreground flex items-center justify-between w-full">
                            <span>{dashboardDict.progress.replace('{progress}', project.progress.toString())}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Tambahkan section lain jika diperlukan */}
    </div>
  );
}
