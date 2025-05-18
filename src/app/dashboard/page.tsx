
// src/app/dashboard/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, PlusCircle, Loader2, TrendingUp, Percent, BarChartIcon, CalendarDays, Info, Plane, Briefcase, MapPin, PartyPopper, Building as BuildingIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project } from '@/services/project-service';
import { getApprovedLeaveRequests, type LeaveRequest } from '@/services/leave-request-service';
import { getAllHolidays, type HolidayEntry } from '@/services/holiday-service';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Cell } from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { parseISO, format, isSameDay, isValid, eachDayOfInterval, startOfMonth } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Event type for calendar
type CalendarDisplayEvent =
  | (Project & { type: 'sidang' | 'survey' })
  | (LeaveRequest & { type: 'leave' })
  | (HolidayEntry & { type: 'holiday' | 'company_event' });


export default function DashboardPage() {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage);

  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [approvedLeaves, setApprovedLeaves] = React.useState<LeaveRequest[]>([]);
  const [holidaysAndEvents, setHolidaysAndEvents] = React.useState<HolidayEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // State for Calendar
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [displayMonth, setDisplayMonth] = React.useState<Date>(startOfMonth(new Date())); // State for currently displayed month in calendar
  const [eventsForSelectedDate, setEventsForSelectedDate] = React.useState<CalendarDisplayEvent[]>([]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const fetchData = React.useCallback(async () => {
    if (currentUser) {
      setIsLoadingData(true);
      try {
        const [fetchedProjects, fetchedLeaves, fetchedHolidays] = await Promise.all([
          getAllProjects(),
          getApprovedLeaveRequests(),
          getAllHolidays()
        ]);
        setAllProjects(fetchedProjects);
        setApprovedLeaves(fetchedLeaves);
        setHolidaysAndEvents(fetchedHolidays);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (isClient && dashboardDict?.toast?.fetchError) {
          toast({ variant: 'destructive', title: dashboardDict.toast.errorTitle, description: dashboardDict.toast.fetchError });
        } else {
          // Fallback toast if dict is not ready
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load page data.' });
        }
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setIsLoadingData(false);
    }
  }, [currentUser, toast, isClient, dashboardDict]);

  React.useEffect(() => {
    if (isClient && currentUser) {
        fetchData();
    }
  }, [isClient, currentUser, fetchData]);


  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);

  const userRole = currentUser?.role || '';
  const canAddProject = currentUser && ['Owner', 'Admin/Akuntan', 'Admin Proyek', 'Admin Developer'].includes(userRole);

  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
    if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
    const key = statusKey.toLowerCase().replace(/ /g, '') as keyof typeof dashboardDict.status;
    return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);

  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !dashboardDict?.status || !status) return <Skeleton className="h-5 w-20" />;
    const statusKey = status.toLowerCase().replace(/ /g, '') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status;
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "py-1 px-2 text-xs";
    let Icon = TrendingUp;
    switch (status.toLowerCase()) {
      case 'completed': case 'selesai': variant = 'default'; className = `${className} bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-primary-foreground`; Icon = CheckCircle; break;
      case 'inprogress': case 'sedang berjalan': variant = 'secondary'; className = `${className} bg-blue-500 text-white dark:bg-blue-600 dark:text-primary-foreground hover:bg-blue-600 dark:hover:bg-blue-700`; Icon = TrendingUp; break;
      case 'pendingapproval': case 'menunggu persetujuan': variant = 'outline'; className = `${className} border-yellow-500 text-yellow-600 dark:border-yellow-400 dark:text-yellow-500`; Icon = AlertTriangle; break;
      case 'delayed': case 'tertunda': variant = 'destructive'; className = `${className} bg-orange-500 text-white dark:bg-orange-600 dark:text-primary-foreground hover:bg-orange-600 dark:hover:bg-orange-700 border-orange-500 dark:border-orange-600`; Icon = AlertTriangle; break;
      case 'canceled': case 'dibatalkan': variant = 'destructive'; Icon = XCircle; break;
      case 'pending': case 'pendinginput': case 'menunggu input': case 'pendingoffer': case 'menunggu penawaran': variant = 'outline'; className = `${className} border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-500`; Icon = Info; break;
      case 'pendingdpinvoice': case 'menunggu faktur dp': case 'pendingadminfiles': case 'menunggu berkas administrasi': case 'pendingarchitectfiles': case 'menunggu berkas arsitektur': case 'pendingstructurefiles': case 'menunggu berkas struktur': case 'pendingmepfiles': case 'menunggu berkas mep': case 'pendingfinalcheck': case 'menunggu pemeriksaan akhir': case 'pendingscheduling': case 'menunggu penjadwalan': case 'pendingconsultationdocs': case 'menunggu dok. konsultasi': case 'pendingreview': case 'menunggu tinjauan': variant = 'secondary'; Icon = Info; break;
      case 'scheduled': case 'terjadwal': variant = 'secondary'; className = `${className} bg-purple-500 text-white dark:bg-purple-600 dark:text-primary-foreground hover:bg-purple-600 dark:hover:bg-purple-700`; Icon = CalendarDays; break;
      default: variant = 'secondary'; Icon = Info;
    }
    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict]);

  const filteredProjects = React.useMemo(() => {
    if (!currentUser || !isClient || isLoadingData) return [];
    const userRoleLower = userRole.toLowerCase();
    if (['owner', 'admin/akuntan', 'admin proyek', 'admin developer'].includes(userRoleLower)) {
      return allProjects;
    }
    return allProjects.filter(project =>
      (project.assignedDivision?.toLowerCase() === userRoleLower) ||
      (project.nextAction && project.nextAction.toLowerCase().includes(userRoleLower))
    );
  }, [userRole, allProjects, isClient, isLoadingData, currentUser]);


  const activeProjects = React.useMemo(() => filteredProjects.filter(project => project.status !== 'Completed' && project.status !== 'Canceled'), [filteredProjects]);
  const completedProjectsCount = React.useMemo(() => filteredProjects.filter(project => project.status === 'Completed').length, [filteredProjects]);
  const pendingProjectsCount = React.useMemo(() => filteredProjects.filter(project => !['Completed', 'Canceled', 'In Progress', 'Sedang Berjalan'].includes(project.status)).length, [filteredProjects]);

  const averageProgress = React.useMemo(() => {
    if (activeProjects.length === 0) return 0;
    const totalProgress = activeProjects.reduce((sum, project) => sum + project.progress, 0);
    return Math.round(totalProgress / activeProjects.length);
  }, [activeProjects]);

  const chartData = React.useMemo(() => {
    return activeProjects
      .map(project => ({
        title: project.title.length > (language === 'id' ? 15 : 20) ? `${project.title.substring(0, (language === 'id' ? 12 : 17))}...` : project.title,
        progress: project.progress,
        id: project.id
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10); 
  }, [activeProjects, language]);

  const chartConfig = React.useMemo(() => ({
    progress: { label: dashboardDict.progressChart.label, color: "hsl(var(--primary))" },
  }) as ChartConfig, [dashboardDict.progressChart.label]);


  // Calendar Logic
  const calendarEventsData = React.useMemo(() => {
    if (isLoadingData) return { dates: [], eventsByDate: {} };

    const eventsByDate: Record<string, CalendarDisplayEvent[]> = {};
    const markedDates: Date[] = [];

    allProjects.forEach(project => {
      // Sidang
      if (project.status === 'Scheduled' && project.scheduleDetails?.date) {
        try {
          const projectDate = parseISO(project.scheduleDetails.date);
          if (isValid(projectDate)) {
            const dateString = format(projectDate, 'yyyy-MM-dd');
            if (!eventsByDate[dateString]) eventsByDate[dateString] = [];
            if (!markedDates.some(d => isSameDay(d, projectDate))) markedDates.push(projectDate);
            eventsByDate[dateString].push({ ...project, type: 'sidang' });
          }
        } catch (e) { console.error("Error parsing schedule date:", project.id, e); }
      }
      // Survey
      if (project.surveyDetails?.date) {
        try {
          const surveyDate = parseISO(project.surveyDetails.date);
          if (isValid(surveyDate)) {
            const dateString = format(surveyDate, 'yyyy-MM-dd');
            if (!eventsByDate[dateString]) eventsByDate[dateString] = [];
            if (!markedDates.some(d => isSameDay(d, surveyDate))) markedDates.push(surveyDate);
            eventsByDate[dateString].push({ ...project, type: 'survey' });
          }
        } catch (e) { console.error("Error parsing survey date:", project.id, e); }
      }
    });

    approvedLeaves.forEach(leave => {
      try {
        const startDate = parseISO(leave.startDate);
        const endDate = parseISO(leave.endDate);
        if (isValid(startDate) && isValid(endDate) && endDate >= startDate) {
          const leaveDays = eachDayOfInterval({ start: startDate, end: endDate });
          leaveDays.forEach(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            if (!eventsByDate[dateString]) eventsByDate[dateString] = [];
            if (!markedDates.some(d => isSameDay(d, day))) markedDates.push(day);
            // Avoid duplicate display for multi-day leave on the same date string
            if (!eventsByDate[dateString].some(e => e.type === 'leave' && (e as LeaveRequest).id === leave.id)) {
              eventsByDate[dateString].push({ ...leave, type: 'leave' });
            }
          });
        }
      } catch (e) { console.error("Error processing leave dates:", leave.id, e); }
    });

    holidaysAndEvents.forEach(holiday => {
      try {
        const holidayDate = parseISO(holiday.date);
        if (isValid(holidayDate)) {
          const dateString = format(holidayDate, 'yyyy-MM-dd');
          if (!eventsByDate[dateString]) eventsByDate[dateString] = [];
          if (!markedDates.some(d => isSameDay(d, holidayDate))) markedDates.push(holidayDate);
          eventsByDate[dateString].push({ ...holiday, type: holiday.type === "Company Event" ? 'company_event' : 'holiday' });
        }
      } catch (e) { console.error("Error processing holiday date:", holiday.id, e); }
    });

    return { dates: markedDates, eventsByDate };
  }, [allProjects, approvedLeaves, holidaysAndEvents, isLoadingData]);

  const handleDateSelect = React.useCallback((date: Date | undefined) => {
    setSelectedDate(date); // This will highlight the selected day
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setEventsForSelectedDate(calendarEventsData.eventsByDate[dateString] || []);
    } else {
      setEventsForSelectedDate([]);
    }
  }, [calendarEventsData.eventsByDate]);

  React.useEffect(() => {
    if (isClient && !isLoadingData) { // Fetch initial events for current selectedDate (today by default)
      handleDateSelect(selectedDate);
    }
  }, [isClient, isLoadingData, selectedDate, handleDateSelect]);


  const currentLocale = language === 'id' ? IndonesianLocale : EnglishLocale;


  if (!isClient || !currentUser || isLoadingData) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <Skeleton className="h-8 w-3/5 sm:w-48" />
          {canAddProject && <Skeleton className="h-10 w-full sm:w-36" />}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={`summary-skel-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-2/4" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent><Skeleton className="h-6 w-1/4 mb-2" /><Skeleton className="h-3 w-3/4" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><div className="space-y-4">{[...Array(3)].map((_, i) => (<Card key={`project-skel-${i}`} className="opacity-50"><CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4 sm:p-6"><div><Skeleton className="h-5 w-3/5 mb-1" /><Skeleton className="h-3 w-4/5" /></div><Skeleton className="h-5 w-20 rounded-full" /></CardHeader><CardContent className="p-4 sm:p-6 pt-0"><Skeleton className="h-2 w-full mb-1" /><Skeleton className="h-3 w-1/4" /></CardContent></Card>))}</div></CardContent></Card>
      </div>
    );
  }

  const getEventBadge = (eventType: CalendarDisplayEvent['type'], leaveType?: string) => {
    let label = '';
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "text-xs";

    switch (eventType) {
      case 'sidang':
        label = dashboardDict.projectSidangLabel;
        variant = 'default'; className = `${className} bg-primary text-primary-foreground`;
        break;
      case 'survey':
        label = dashboardDict.projectSurveyLabel;
        variant = 'default'; className = `${className} bg-green-600 text-white`;
        break;
      case 'leave':
        label = leaveType ? getTranslatedStatus(leaveType) : dashboardDict.employeeOnLeaveLabel;
        variant = 'destructive';
        break;
      case 'holiday':
        label = dashboardDict.holidayLabel;
        variant = 'outline'; className = `${className} border-orange-500 text-orange-600`;
        break;
      case 'company_event':
        label = dashboardDict.companyEventLabel;
        variant = 'outline'; className = `${className} border-purple-600 text-purple-600`;
        break;
      default:
        label = "Event";
    }
    return <Badge variant={variant} className={className}>{label}</Badge>;
  };


  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          {dashboardDict.title}
        </h1>
        {canAddProject && (
          <Link href="/dashboard/add-project" passHref>
            <Button className="w-full sm:w-auto accent-teal">
              <PlusCircle className="mr-2 h-4 w-4" />{dashboardDict.addNewProject}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.activeProjects}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.activeProjectsDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.completedProjects}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjectsCount}</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.completedProjectsDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.pendingActions}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingProjectsCount}</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.pendingActionsDesc}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dashboardDict.averageProgressTitle}</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length > 0 ? averageProgress : 0}%</div>
            <p className="text-xs text-muted-foreground">{dashboardDict.averageProgressDesc}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{dashboardDict.projectProgressChartTitle}</CardTitle>
              <CardDescription>{dashboardDict.projectProgressChartDesc}</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 pr-4 sm:pr-6">
              {activeProjects.length > 0 && chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: language === 'id' ? 15 : 5, left: language === 'id' ? 5 : -10, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="title" type="category" tickLine={false} axisLine={false} width={language === 'id' ? 100 : 80} interval={0} tick={{ fontSize: 10, textAnchor: 'start' }} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                      <Bar dataKey="progress" fill="hsl(var(--primary))" radius={4} barSize={chartData.length > 5 ? 12 : 16}>
                        <LabelList dataKey="progress" position="right" offset={8} className="fill-foreground" formatter={(value: number) => `${value}%`} fontSize={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-4">
                  <BarChartIcon className="h-12 w-12 mb-2 opacity-50" />
                  <p>{dashboardDict.noActiveProjectsForChart}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{dashboardDict.scheduleAgendaTitle}</CardTitle>
              <CardDescription>{dashboardDict.scheduleAgendaDesc}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setDisplayMonth(startOfMonth(today));
                  handleDateSelect(today); // Ensure events are loaded for today
                }}
                className="mb-3 self-start"
              >
                {dashboardDict.todayButtonLabel}
              </Button>
              <Calendar
                mode="single"
                selected={selectedDate}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                onSelect={handleDateSelect}
                locale={currentLocale}
                className="rounded-md border shadow-sm bg-card text-card-foreground p-3 self-center"
                modifiers={{
                  sunday: { dayOfWeek: [0] },
                  sidang: calendarEventsData.dates.filter(d => calendarEventsData.eventsByDate[format(d, 'yyyy-MM-dd')]?.some(e => e.type === 'sidang')),
                  leave: calendarEventsData.dates.filter(d => calendarEventsData.eventsByDate[format(d, 'yyyy-MM-dd')]?.some(e => e.type === 'leave')),
                  survey: calendarEventsData.dates.filter(d => calendarEventsData.eventsByDate[format(d, 'yyyy-MM-dd')]?.some(e => e.type === 'survey')),
                  holiday: calendarEventsData.dates.filter(d => calendarEventsData.eventsByDate[format(d, 'yyyy-MM-dd')]?.some(e => e.type === 'holiday')),
                  company_event: calendarEventsData.dates.filter(d => calendarEventsData.eventsByDate[format(d, 'yyyy-MM-dd')]?.some(e => e.type === 'company_event')),
                }}
                modifiersClassNames={{
                  sunday: 'text-destructive',
                  sidang: 'text-primary font-bold',
                  leave: 'text-red-500 font-bold',
                  survey: 'text-green-600 font-bold',
                  holiday: 'text-orange-500 font-semibold',
                  company_event: 'text-purple-600 font-semibold',
                }}
                disabled={(date) => date < new Date("1900-01-01") || date > new Date("2999-12-31")}
              />
              <div className="mt-4 w-full space-y-3">
                <h3 className="text-md font-semibold text-foreground text-center">
                  {selectedDate ? dashboardDict.eventsForDate.replace('{date}', format(selectedDate, 'PPP', { locale: currentLocale })) : dashboardDict.selectDatePrompt}
                </h3>
                {selectedDate && eventsForSelectedDate.length > 0 ? (
                  <ul className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                    {eventsForSelectedDate.map((event, index) => {
                      const key = `${event.type}-${(event as any).id}-${index}`;
                      return (
                      <li key={key} className="p-3 border rounded-md bg-muted/30 hover:bg-muted/60 transition-colors shadow-sm">
                        {event.type === 'sidang' && (event as Project).scheduleDetails ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-primary truncate flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4 flex-shrink-0" />
                                <Link href={`/dashboard/projects?projectId=${(event as Project).id}`} className="hover:underline">
                                  {(event as Project).title}
                                </Link>
                              </p>
                              {getEventBadge('sidang')}
                            </div>
                            {(event as Project).scheduleDetails?.time && (
                              <p className="text-xs text-muted-foreground pl-6">
                                {dashboardDict.eventTimeLabel} {(event as Project).scheduleDetails!.time}
                              </p>
                            )}
                            {(event as Project).scheduleDetails?.location && (
                              <p className="text-xs text-muted-foreground pl-6">
                                {dashboardDict.eventLocationLabel} {(event as Project).scheduleDetails!.location}
                              </p>
                            )}
                          </>
                        ) : event.type === 'leave' ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-destructive truncate flex items-center gap-1.5">
                                <Plane className="h-4 w-4 flex-shrink-0" />
                                {(event as LeaveRequest).displayName || (event as LeaveRequest).username}
                              </p>
                               {getEventBadge('leave', (event as LeaveRequest).leaveType)}
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                              {dashboardDict.leaveDurationLabel} {format(parseISO((event as LeaveRequest).startDate), 'PP', { locale: currentLocale })} - {format(parseISO((event as LeaveRequest).endDate), 'PP', { locale: currentLocale })}
                            </p>
                             {(event as LeaveRequest).reason && (
                                <p className="text-xs text-muted-foreground pl-6 mt-0.5 whitespace-pre-wrap">
                                  {dashboardDict.reasonLabel}: {(event as LeaveRequest).reason}
                                </p>
                            )}
                          </>
                        ) : event.type === 'survey' && (event as Project).surveyDetails ? (
                          <>
                           <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-green-600 truncate flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <Link href={`/dashboard/projects?projectId=${(event as Project).id}`} className="hover:underline">
                                  {(event as Project).title}
                                </Link>
                              </p>
                              {getEventBadge('survey')}
                            </div>
                            {(event as Project).surveyDetails?.time && (
                              <p className="text-xs text-muted-foreground pl-6">
                                {dashboardDict.eventTimeLabel} {(event as Project).surveyDetails!.time}
                              </p>
                            )}
                            {(event as Project).surveyDetails?.description && (
                              <p className="text-xs text-muted-foreground pl-6">
                                {dashboardDict.surveyDescriptionLabel} {(event as Project).surveyDetails!.description}
                              </p>
                            )}
                          </>
                        ) : event.type === 'holiday' ? (
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-orange-500 truncate flex items-center gap-1.5">
                                    <PartyPopper className="h-4 w-4 flex-shrink-0" />
                                    {(event as HolidayEntry).name}
                                </p>
                                {getEventBadge('holiday')}
                            </div>
                        ) : event.type === 'company_event' ? (
                             <div className="flex items-center justify-between">
                                <p className="font-medium text-purple-600 truncate flex items-center gap-1.5">
                                    <BuildingIcon className="h-4 w-4 flex-shrink-0" />
                                    {(event as HolidayEntry).name}
                                </p>
                                {getEventBadge('company_event')}
                            </div>
                        ) : null}
                      </li>
                      );
                    })}
                  </ul>
                ) : selectedDate ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">{dashboardDict.noEventsOnDate}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{dashboardDict.projectOverview}</CardTitle>
          <CardDescription>
            {['owner', 'admin/akuntan', 'admin proyek', 'admin developer'].includes(userRole.toLowerCase())
              ? dashboardDict.allProjectsDesc
              : dashboardDict.divisionProjectsDesc.replace('{division}', getTranslatedStatus(userRole))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{dashboardDict.noProjects}</p>
            ) : (
              filteredProjects.map((project) => (
                <Link key={project.id} href={`/dashboard/projects?projectId=${project.id}`} passHref>
                  <div className="block hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 cursor-pointer rounded-lg border bg-card text-card-foreground overflow-hidden">
                    <Card>
                      <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate hover:text-primary transition-colors">{project.title}</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-1 truncate">
                            {dashboardDict.assignedTo}: {getTranslatedStatus(project.assignedDivision) || dashboardDict.status.notassigned || 'N/A'} {project.nextAction ? `| ${dashboardDict.nextAction}: ${project.nextAction}` : ''}
                          </CardDescription>
                        </div>
                        <div className="flex-shrink-0 mt-2 sm:mt-0">
                          {getStatusBadge(project.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
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
                            {getTranslatedStatus(project.status)}
                          </p>
                        )}
                        {project.status === 'Completed' && (
                          <p className="text-sm text-green-600 font-medium">
                            {getTranslatedStatus(project.status)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

