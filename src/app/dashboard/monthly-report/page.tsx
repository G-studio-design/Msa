// src/app/dashboard/monthly-report/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Users, CalendarCheck, CalendarX, Activity, BarChart3, CheckSquare, XSquare, PieChart as PieChartIcon, FileCode } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project } from '@/services/project-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { generateExcelReport, generateWordReport } from '@/lib/report-generator';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Pie, ResponsiveContainer, PieChart as RechartsPieChart, Cell, TooltipProps } from "recharts"; // Added TooltipProps
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { toPng } from 'html-to-image';


// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

interface MonthlyReportData {
  completed: Project[];
  canceled: Project[];
  inProgress: Project[];
  monthName: string;
  year: string;
}

const CHART_COLORS = {
    inProgress: "hsl(210, 80%, 60%)", // Brighter Blue
    completed: "hsl(140, 60%, 50%)", // Softer Green
    canceled: "hsl(0, 70%, 55%)",   // Clearer Red
};

// Custom Tooltip for Recharts Pie Chart
const CustomPieTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  const { language } = useLanguage();
  const dict = getDictionary(language).monthlyReportPage;

  if (active && payload && payload.length) {
    const data = payload[0].payload; // Access the payload object from the item
    const name = data.name; // The translated name from summaryChartData
    const value = data.value;

    return (
      <div className="rounded-lg border bg-background p-2.5 text-sm shadow-lg">
        <p className="font-medium">{`${name}: ${value} ${dict.totalProjectsShort || 'projects'}`}</p>
      </div>
    );
  }
  return null;
};


export default function MonthlyReportPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [reportDict, setReportDict] = React.useState(() => dict.monthlyReportPage);
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = React.useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear()));
  const [reportData, setReportData] = React.useState<MonthlyReportData | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setReportDict(newDict.monthlyReportPage);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);

  const canAccessReport = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const formatDateOnly = React.useCallback((timestamp: string): string => {
      if (!isClient) return '...';
      const locale = language === 'id' ? 'id-ID' : 'en-US';
      try {
            return new Date(timestamp).toLocaleDateString(locale, {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch (e) {
            console.error("Error formatting date:", timestamp, e);
            return "Invalid Date";
        }
  }, [isClient, language]);

  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
      if (!isClient || !dashboardDict || !dashboardDict.status || !statusKey) return statusKey;
      const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);

  const handleGenerateReport = async () => {
    if (!selectedMonth || !selectedYear) return;
    setIsLoading(true);
    setReportData(null);

    try {
        const allProjects = await getAllProjects();
        const month = parseInt(selectedMonth, 10);
        const year = parseInt(selectedYear, 10);

        const startDateOfMonth = new Date(year, month - 1, 1);
        startDateOfMonth.setHours(0, 0, 0, 0);
        const endDateOfMonth = new Date(year, month, 0);
        endDateOfMonth.setHours(23, 59, 59, 999);

        const monthName = startDateOfMonth.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long' });


        const getFinalStatusTimestamp = (project: Project, targetStatus: 'Completed' | 'Canceled'): Date | null => {
            const actionKeywords = targetStatus === 'Completed'
                ? ['completed', 'success', 'marked as completed', 'marked as success']
                : ['cancel', 'canceled project'];

            for (let i = project.workflowHistory.length - 1; i >= 0; i--) {
                const entry = project.workflowHistory[i];
                if (actionKeywords.some(keyword => entry.action.toLowerCase().includes(keyword))) {
                    try {
                        return new Date(entry.timestamp);
                    } catch (e) { return null; }
                }
            }
            if (project.status === targetStatus && project.workflowHistory.length > 0) {
                 const lastEntry = project.workflowHistory[project.workflowHistory.length -1];
                 if (lastEntry && lastEntry.timestamp) {
                     try {
                        return new Date(lastEntry.timestamp);
                     } catch (e) { return null; }
                 }
            }
            return null;
        };

        const completedThisMonth: Project[] = [];
        const canceledThisMonth: Project[] = [];
        const inProgressThisMonth: Project[] = [];

        for (const project of allProjects) {
            let projectCreationDate: Date;
            try {
                projectCreationDate = new Date(project.createdAt);
            } catch (e) {
                console.warn(`Invalid creation date for project ${project.id}: ${project.createdAt}. Skipping.`);
                continue;
            }

            const completionDate = getFinalStatusTimestamp(project, 'Completed');
            const cancellationDate = getFinalStatusTimestamp(project, 'Canceled');

            if (project.status === 'Completed' && completionDate && completionDate >= startDateOfMonth && completionDate <= endDateOfMonth) {
                completedThisMonth.push(project);
            } else if (project.status === 'Canceled' && cancellationDate && cancellationDate >= startDateOfMonth && cancellationDate <= endDateOfMonth) {
                canceledThisMonth.push(project);
            } else {
                // Check if project was created *after* the reporting month ended
                if (projectCreationDate > endDateOfMonth) {
                    continue;
                }
                // Check if project was completed *before* the reporting month started
                if (completionDate && completionDate < startDateOfMonth) {
                    continue;
                }
                // Check if project was canceled *before* the reporting month started
                if (cancellationDate && cancellationDate < startDateOfMonth) {
                    continue;
                }
                inProgressThisMonth.push(project);
            }
        }

        setReportData({
            completed: completedThisMonth,
            canceled: canceledThisMonth,
            inProgress: inProgressThisMonth,
            monthName: monthName,
            year: selectedYear
        });

    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast({ variant: 'destructive', title: reportDict.errorGeneratingReport || "Error", description: error.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };


  const handleDownloadExcel = async () => {
    if (!reportData || !isClient) return;
    setIsDownloadingExcel(true);
    try {
        const filenameBase = `Monthly_Report_${reportData.monthName}_${reportData.year}`;
        const fileContent = await generateExcelReport(reportData.completed, reportData.canceled, reportData.inProgress, language); 

        if (!fileContent.trim()) {
            toast({ variant: 'destructive', title: "Report Empty", description: `The generated Excel report content is empty.` });
            setIsDownloadingExcel(false);
            return;
        }

        const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: reportDict.toast?.downloadedExcel || "Excel Report Downloaded", description: `Report ${a.download} downloaded.` });
    } catch (error) {
        console.error(`Failed to download Excel report:`, error);
        toast({ variant: 'destructive', title: reportDict.errorDownloadingReport || "Download Error", description: (error as Error).message || 'Unknown error' });
    } finally {
        setIsDownloadingExcel(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!reportData || !isClient) return;
    setIsDownloadingWord(true);

    let chartImageDataUrl: string | undefined = undefined;
    if (chartRef.current) {
        try {
            chartImageDataUrl = await toPng(chartRef.current, {
                quality: 0.95,
                backgroundColor: 'white',
                // Ensure fonts are embedded or use web-safe fonts in the chart if Word compatibility is an issue
                // skipFonts: true, // This was causing issues for some users. Test without it.
             });
        } catch (error) {
            console.error('Error capturing chart image:', error);
            toast({ variant: 'destructive', title: 'Chart Capture Error', description: 'Could not capture chart image for Word report.' });
        }
    }

    try {
        const response = await fetch('/api/generate-report/word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                completed: reportData.completed,
                canceled: reportData.canceled,
                inProgress: reportData.inProgress,
                monthName: reportData.monthName,
                year: reportData.year,
                chartImageDataUrl,
                language: language, 
            }),
        });

        if (!response.ok) {
            let errorDetails = 'Failed to generate Word report from server.';
            let responseText = '';
            try {
                // Try to get text first, as response might not be JSON
                responseText = await response.text();
                const errorData = JSON.parse(responseText); // Then try to parse as JSON
                errorDetails = errorData.details || errorData.error || errorDetails;
                console.error("Server JSON error details for Word generation:", errorData);
            } catch (jsonError) {
                 // If parsing JSON fails, use the responseText (if available) or statusText
                errorDetails = responseText || response.statusText || `Server returned status ${response.status}.`;
                console.error("Non-JSON error response from server for Word generation:", responseText || errorDetails);
            }
            throw new Error(errorDetails);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Monthly_Report_${reportData.monthName}_${reportData.year}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: reportDict.toast?.downloadedWord || "Word Report Downloaded", description: `Report ${a.download} downloaded.` });
    } catch (error: any) {
        console.error('Failed to download Word report (client-side):', error);
        toast({
            variant: 'destructive',
            title: reportDict.errorDownloadingReport || "Download Error",
            description: error.message || 'Unknown error during Word download.'
        });
    } finally {
        setIsDownloadingWord(false);
    }
  };


  if (!isClient || !currentUser) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-40 w-full" /> {/* Chart Skeleton */}
            <Skeleton className="h-40 w-full mt-4" /> {/* Table Skeleton */}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canAccessReport) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{isClient ? dict.manageUsersPage.accessDeniedTitle : defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{isClient ? dict.manageUsersPage.accessDeniedDesc : defaultDict.manageUsersPage.accessDeniedDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(currentYear, i).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long' }),
  }));

  const allReportedProjects = reportData ? [...reportData.inProgress, ...reportData.completed, ...reportData.canceled ] : [];
  allReportedProjects.sort((a, b) => {
      const getLastTimestamp = (project: Project): number => {
          if (project.workflowHistory && project.workflowHistory.length > 0) {
            try {
              return new Date(project.workflowHistory[project.workflowHistory.length - 1].timestamp).getTime();
            } catch { /* ignore invalid date */ }
          }
          try {
            return new Date(project.createdAt).getTime();
          } catch { return 0; }
      };
      const statusOrderValue = (project: Project) => {
          let currentStatus = project.status;
          if (reportData?.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
              currentStatus = 'In Progress';
          }
          if (currentStatus === 'In Progress') return 0;
          if (currentStatus === 'Completed') return 1;
          if (currentStatus === 'Canceled') return 2;
          return 3;
      };

      const orderA = statusOrderValue(a);
      const orderB = statusOrderValue(b);

      if (orderA !== orderB) {
          return orderA - orderB;
      }
      return getLastTimestamp(b) - getLastTimestamp(a);
  });

   const summaryChartData = reportData ? [
        { name: reportDict.inProgressProjectsShort, value: reportData.inProgress.length, fill: CHART_COLORS.inProgress },
        { name: reportDict.completedProjectsShort, value: reportData.completed.length, fill: CHART_COLORS.completed },
        { name: reportDict.canceledProjectsShort, value: reportData.canceled.length, fill: CHART_COLORS.canceled },
   ].filter(item => item.value > 0) : [];


  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{isClient ? reportDict.title : defaultDict.monthlyReportPage.title}</CardTitle>
          <CardDescription>{isClient ? reportDict.description : defaultDict.monthlyReportPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 items-end">
            <div className="space-y-1">
              <Label htmlFor="month-select">{isClient ? reportDict.selectMonthLabel : defaultDict.monthlyReportPage.selectMonthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select" className="w-full">
                  <SelectValue placeholder={isClient ? reportDict.selectMonthPlaceholder : defaultDict.monthlyReportPage.selectMonthPlaceholder}/>
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="year-select">{isClient ? reportDict.selectYearLabel : defaultDict.monthlyReportPage.selectYearLabel}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select" className="w-full">
                  <SelectValue placeholder={isClient ? reportDict.selectYearPlaceholder : defaultDict.monthlyReportPage.selectYearPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={isLoading || !selectedMonth || !selectedYear} className="w-full md:w-auto md:self-end">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              {isClient ? (isLoading ? reportDict.generatingReportButton : reportDict.generateReportButton) : defaultDict.monthlyReportPage.generateReportButton}
            </Button>
          </div>

          {isLoading && (
             <div className="text-center py-8">
               <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
               <p className="mt-2 text-muted-foreground">{isClient ? reportDict.generatingReportButton : defaultDict.monthlyReportPage.generatingReportButton}</p>
             </div>
          )}

          {reportData && !isLoading && (
             <>
                <div ref={chartRef} className="bg-card p-4 rounded-lg shadow-md border-primary/20">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-lg flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-primary" />
                           {reportDict.reportFor} {reportData.monthName} {reportData.year} - {language === 'id' ? 'Ringkasan' : 'Summary'}
                        </CardTitle>
                     </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                             <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4 text-center md:text-left">
                                 <Card className="p-4 rounded-lg" style={{ backgroundColor: CHART_COLORS.inProgress + '20' }}> {/* Lighter bg with opacity */}
                                     <div className="flex items-center justify-center md:justify-start gap-2">
                                       <Activity className="h-5 w-5" style={{ color: CHART_COLORS.inProgress }}/>
                                       <p className="text-sm font-medium" style={{ color: CHART_COLORS.inProgress }}>{reportDict.inProgressProjectsShort}</p>
                                     </div>
                                     <p className="text-2xl font-bold" style={{ color: CHART_COLORS.inProgress }}>{reportData.inProgress.length}</p>
                                 </Card>
                                 <Card className="p-4 rounded-lg" style={{ backgroundColor: CHART_COLORS.completed + '20' }}>
                                     <div className="flex items-center justify-center md:justify-start gap-2">
                                       <CheckSquare className="h-5 w-5" style={{ color: CHART_COLORS.completed }}/>
                                       <p className="text-sm font-medium" style={{ color: CHART_COLORS.completed }}>{reportDict.completedProjectsShort}</p>
                                     </div>
                                     <p className="text-2xl font-bold" style={{ color: CHART_COLORS.completed }}>{reportData.completed.length}</p>
                                 </Card>
                                 <Card className="p-4 rounded-lg" style={{ backgroundColor: CHART_COLORS.canceled + '20' }}>
                                    <div className="flex items-center justify-center md:justify-start gap-2">
                                       <XSquare className="h-5 w-5" style={{ color: CHART_COLORS.canceled }}/>
                                       <p className="text-sm font-medium" style={{ color: CHART_COLORS.canceled }}>{reportDict.canceledProjectsShort}</p>
                                     </div>
                                     <p className="text-2xl font-bold" style={{ color: CHART_COLORS.canceled }}>{reportData.canceled.length}</p>
                                 </Card>
                             </div>
                             {summaryChartData.length > 0 ? (
                                <ChartContainer config={{}} className="h-[220px] sm:h-[280px] w-full"> {/* Increased height */}
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                            <ChartTooltip content={<CustomPieTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                            <Pie 
                                                data={summaryChartData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={90} // Increased radius
                                                innerRadius={50} // Donut chart
                                                labelLine={false} 
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = outerRadius + 15; // Position label outside
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    const textAnchor = x > cx ? 'start' : 'end';
                                                    return (
                                                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={textAnchor} dominantBaseline="central" fontSize={11} fontWeight="medium">
                                                            {`${name}: ${(percent * 100).toFixed(0)}% (${value})`}
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {summaryChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            {/* <ChartLegend content={<ChartLegendContent nameKey="name" />} /> */}
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                             ) : (
                                <div className="flex items-center justify-center h-[220px] sm:h-[280px] text-muted-foreground">
                                    <PieChartIcon className="h-10 w-10 mr-2 text-primary/50"/>
                                    <p className="text-lg">{language === 'id' ? 'Tidak ada data untuk grafik.' : 'No data for chart.'}</p>
                                </div>
                             )}
                        </div>
                     </CardContent>
                </div>

                {allReportedProjects.length > 0 ? (
                <Card className="mt-6 shadow-md">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-lg">{reportDict.tableCaption}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="max-h-[60vh] w-full rounded-md border">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[200px] sm:w-[250px]">{reportDict.tableHeaderTitle}</TableHead>
                                        <TableHead className="w-[120px] sm:w-[150px]">{reportDict.tableHeaderStatus}</TableHead>
                                        <TableHead className="w-[150px] sm:w-[180px]">{reportDict.tableHeaderLastActivityDate}</TableHead>
                                        <TableHead>{reportDict.tableHeaderContributors}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allReportedProjects.map((project) => {
                                        const contributors = [...new Set(project.files.map(f => f.uploadedBy))].join(', ');
                                        const lastActivityEntry = project.workflowHistory && project.workflowHistory.length > 0 ? project.workflowHistory[project.workflowHistory.length - 1] : null;
                                        const lastActivityDate = lastActivityEntry ? formatDateOnly(lastActivityEntry.timestamp) : formatDateOnly(project.createdAt);
                                        let statusIcon;
                                        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                                        let badgeClassName = "font-semibold";

                                        let displayStatus = project.status;
                                        if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                            displayStatus = 'In Progress';
                                        }

                                        switch (displayStatus) {
                                            case 'Completed':
                                                statusIcon = <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />;
                                                badgeClassName += ' bg-green-100 text-green-700 border-green-300';
                                                badgeVariant = "outline";
                                                break;
                                            case 'Canceled':
                                                statusIcon = <CalendarX className="mr-1.5 h-3.5 w-3.5" />;
                                                badgeClassName += ' bg-red-100 text-red-700 border-red-300';
                                                 badgeVariant = "outline";
                                                break;
                                            case 'In Progress':
                                            default:
                                                statusIcon = <Activity className="mr-1.5 h-3.5 w-3.5" />;
                                                badgeClassName += ' bg-blue-100 text-blue-700 border-blue-300';
                                                badgeVariant = "outline";
                                                break;
                                        }

                                        return (
                                            <TableRow key={project.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium py-3">{project.title}</TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant={badgeVariant} className={badgeClassName}>
                                                         {statusIcon}
                                                         {getTranslatedStatus(displayStatus)}
                                                     </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 text-sm text-muted-foreground">{lastActivityDate}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5"/>
                                                        <span className="truncate max-w-[150px] sm:max-w-xs">{contributors || reportDict.none}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4 mt-4">
                      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDownloadingExcel || isDownloadingWord} className="w-full sm:w-auto">
                        {isDownloadingExcel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isClient ? (isDownloadingExcel ? reportDict.downloadingButton : reportDict.downloadExcel) : defaultDict.monthlyReportPage.downloadExcel}
                      </Button>
                       <Button variant="default" onClick={handleDownloadWord} disabled={isDownloadingWord || isDownloadingExcel} className="w-full sm:w-auto">
                        {isDownloadingWord ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
                        {isClient ? (isDownloadingWord ? reportDict.downloadingButton : reportDict.downloadWord) : defaultDict.monthlyReportPage.downloadWord}
                      </Button>
                    </CardFooter>
                </Card>
            ) : (
               <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3 mt-6 border rounded-lg">
                  <FileText className="h-10 w-10" />
                  <p className="text-lg">{reportDict.noDataForMonth}</p>
                  <p className="text-sm">{reportDict.tryDifferentMonthYear || "Try selecting a different month or year."}</p>
               </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
