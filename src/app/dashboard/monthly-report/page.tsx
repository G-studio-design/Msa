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
  TableCaption
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Users, CalendarCheck, CalendarX, Activity, BarChart3, CheckSquare, XSquare, PieChart as PieChartIcon, FileCode } from 'lucide-react';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project } from '@/services/project-service';
import { generateExcelReport } from '@/lib/report-generator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { toPng } from 'html-to-image';


const defaultDict = getDictionary('en');
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); 
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  labelEn: new Date(0, i).toLocaleString('en-US', { month: 'long' }),
  labelId: new Date(0, i).toLocaleString('id-ID', { month: 'long' }),
}));

function formatDateOnly(timestamp: string | undefined | null, lang: Language = 'en'): string {
    if (!timestamp) return "N/A";
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale }); 
    } catch (e) {
        console.error("[ReportGenerator] Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}


function getContributors(project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage'], currentLang: Language): string {
    if (!project.files || project.files.length === 0) {
        return dict?.none || (currentLang === 'id' ? "Tidak Ada" : "None");
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy || 'Unknown'))];
    return contributors.join(', ');
}


export default function MonthlyReportPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [reportDict, setReportDict] = React.useState(() => dict.monthlyReportPage);
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage);

  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear.toString());
  const [reportData, setReportData] = React.useState<{ completed: Project[], canceled: Project[], inProgress: Project[] } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [chartImageDataUrl, setChartImageDataUrl] = React.useState<string | null>(null);


  React.useEffect(() => {
    setIsClient(true);
    const fetchProjects = async () => {
      if (currentUser && ['Owner', 'General Admin'].includes(currentUser.role)) {
        setIsLoadingProjects(true);
        try {
          const fetchedProjects = await getAllProjects();
          setAllProjects(fetchedProjects);
        } catch (error) {
          console.error("Failed to fetch projects for report:", error);
          toast({ variant: 'destructive', title: reportDict.toast.error, description: reportDict.toast.couldNotLoadProjects });
        } finally {
          setIsLoadingProjects(false);
        }
      } else {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [currentUser, toast, reportDict]);

  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setReportDict(newDict.monthlyReportPage);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);


  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
      if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
      const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);


  const getLastActivityDate = React.useCallback((project: Project): string => {
        if (!project.workflowHistory || project.workflowHistory.length === 0) {
            return formatDateOnly(project.createdAt, language);
        }
        const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
        return formatDateOnly(lastEntry?.timestamp, language);
  }, [language]);


  const processReportData = React.useCallback(async () => {
    if (!selectedMonth || !selectedYear || allProjects.length === 0) {
      setReportData(null);
      setChartImageDataUrl(null);
      return;
    }
    setIsGeneratingReport(true);
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10);

    const filteredProjects = allProjects.filter(project => {
      try {
        const projectDate = parseISO(project.createdAt);
        return projectDate.getFullYear() === year && (projectDate.getMonth() + 1) === month;
      } catch (e) {
        console.error(`Error parsing createdAt date for project ${project.id}: ${project.createdAt}`, e);
        return false;
      }
    });

    const completed = filteredProjects.filter(p => p.status === 'Completed');
    const canceled = filteredProjects.filter(p => p.status === 'Canceled');
    const inProgress = filteredProjects.filter(p => !['Completed', 'Canceled'].includes(p.status));

    setReportData({ completed, canceled, inProgress });

    // Defer chart image generation until after reportData is set and UI might have updated
    // Small timeout to allow DOM update for chart element
    setTimeout(async () => {
        if (typeof window !== 'undefined') {
            const chartElement = document.getElementById('report-chart-container-for-image');
            if (chartElement) {
                try {
                    const dataUrl = await toPng(chartElement, {
                        quality: 0.95,
                        backgroundColor: 'white',
                        pixelRatio: 2, // Increase pixel ratio for better quality
                         // Ensure fonts are loaded - this can be tricky. A more robust solution might involve server-side rendering of the chart.
                        fontEmbedCSS: "@font-face { font-family: 'Inter'; src: url('/_next/static/media/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw-s.p.7b3669ea.woff2') format('woff2'); font-style: normal; font-weight: normal; }"
                    });
                    setChartImageDataUrl(dataUrl);
                    console.log("Chart image generated successfully for report.");
                } catch (error) {
                    console.error('Error generating chart image:', error);
                    toast({
                        variant: 'destructive',
                        title: reportDict.toast.chartImageErrorTitle,
                        description: reportDict.toast.chartImageErrorDesc,
                    });
                    setChartImageDataUrl(null);
                }
            } else {
                console.warn("Chart element for image generation not found.");
                setChartImageDataUrl(null);
            }
        }
        setIsGeneratingReport(false);
    }, 100);


  }, [selectedMonth, selectedYear, allProjects, toast, reportDict]);

  React.useEffect(() => {
    if (allProjects.length > 0 && isClient) {
      processReportData();
    }
  }, [selectedMonth, selectedYear, allProjects, processReportData, isClient]);

  const canViewPage = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const chartData = React.useMemo(() => {
    if (!reportData || !reportDict.status) return [];
    return [
      { name: reportDict.status.inprogress || "In Progress", value: reportData.inProgress.length, fill: 'hsl(var(--chart-1))' },
      { name: reportDict.status.completed || "Completed", value: reportData.completed.length, fill: 'hsl(var(--chart-2))' },
      { name: reportDict.status.canceled || "Canceled", value: reportData.canceled.length, fill: 'hsl(var(--chart-3))' },
    ].filter(item => item.value > 0);
  }, [reportData, reportDict]);


  const handleDownloadExcel = async () => {
    if (!reportData) {
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: reportDict.noDataForMonth });
        return;
    }
    setIsDownloading(true);
    try {
        const csvData = await generateExcelReport(reportData.completed, reportData.canceled, reportData.inProgress, language);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const monthLabel = months.find(m => m.value === selectedMonth)?.[language === 'id' ? 'labelId' : 'labelEn'] || selectedMonth;
        link.setAttribute("href", url);
        link.setAttribute("download", `MsarchApp_Monthly_Report_${monthLabel}_${selectedYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: reportDict.toast.downloadedExcel });
    } catch (error) {
        console.error("Error generating Excel report:", error);
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: (error as Error).message });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!reportData) {
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: reportDict.noDataForMonth });
        return;
    }
    if (!chartImageDataUrl && (reportData.completed.length > 0 || reportData.inProgress.length > 0 || reportData.canceled.length > 0)) {
        toast({ variant: 'default', title: reportDict.toast.generatingChartTitle, description: reportDict.toast.generatingChartDesc });
        // Optionally, trigger chart generation again or wait for it
        // For now, let's assume the user might need to wait a moment for chart image to be ready
        return;
    }

    setIsDownloading(true);
    const monthLabel = months.find(m => m.value === selectedMonth)?.[language === 'id' ? 'labelId' : 'labelEn'] || selectedMonth;

    try {
        const reportPayload = {
            completed: reportData.completed,
            canceled: reportData.canceled,
            inProgress: reportData.inProgress,
            monthName: monthLabel,
            year: selectedYear,
            chartImageDataUrl: chartImageDataUrl,
            language: language,
        };

        const response = await fetch('/api/generate-report/word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload),
        });

        if (!response.ok) {
            let errorDetails = `Word report generation failed (Status: ${response.status}).`;
            const responseText = await response.text(); // Read the body once for error
            if (responseText) {
                try {
                    if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                        const errorData = JSON.parse(responseText);
                        console.error("[Client] Server JSON error details for Word generation:", errorData);
                        errorDetails = errorData.details || errorData.error || 'The server returned an unspecified error.';
                    } else if (responseText.includes('<html')) {
                        errorDetails = "The server returned an HTML error page. Check server logs for details.";
                        console.error("[Client] HTML error response from server for Word generation (first 500 chars):", responseText.substring(0, 500));
                    } else if (responseText.trim()) {
                        errorDetails = `Server error: ${responseText.substring(0, 200)}`;
                        console.error("[Client] Raw non-JSON error response from server for Word generation:", responseText);
                    }
                } catch (e) {
                    console.error("[Client] Error parsing server's error response during Word report generation:", e, "Raw response:", responseText);
                    errorDetails = `Error parsing server's error response. Raw response: ${responseText.substring(0, 200)}`;
                }
            }
            const finalErrorMessage = String(errorDetails || "An unknown error occurred generating the Word report.").replace(/<[^>]*>?/gm, '').substring(0, 500);
            throw new Error(finalErrorMessage);
        }

        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `MsarchApp_Monthly_Report_${monthLabel}_${selectedYear}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: reportDict.toast.downloadedWord });

    } catch (error: any) {
        console.error("[Client] Error in handleDownloadWord:", error);
        toast({
            variant: 'destructive',
            title: reportDict.errorGeneratingReport,
            description: String(error.message || 'An unexpected error occurred while preparing the Word report.'),
        });
    } finally {
        setIsDownloading(false);
    }
};


  if (!isClient || isLoadingProjects) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6 animate-pulse">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-8 w-2/3 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end mb-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full md:w-auto" />
          <Skeleton className="h-10 w-full md:w-auto" />
        </div>
        <Card>
            <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full md:col-span-1" />
                    <Skeleton className="h-80 w-full md:col-span-2" />
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{dict.manageUsersPage.accessDeniedTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{dict.manageUsersPage.accessDeniedDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalReportedProjects = reportData ? reportData.completed.length + reportData.canceled.length + reportData.inProgress.length : 0;

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card className="shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-6">
          <CardTitle className="text-2xl md:text-3xl font-semibold">{reportDict.title}</CardTitle>
          <CardDescription className="text-primary-foreground/80">{reportDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="month-select" className="text-sm font-medium text-muted-foreground">{reportDict.selectMonthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isGeneratingReport || isDownloading}>
                <SelectTrigger id="month-select" className="rounded-md shadow-sm"><SelectValue placeholder={reportDict.selectMonthPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {language === 'id' ? month.labelId : month.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-select" className="text-sm font-medium text-muted-foreground">{reportDict.selectYearLabel}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isGeneratingReport || isDownloading}>
                <SelectTrigger id="year-select" className="rounded-md shadow-sm"><SelectValue placeholder={reportDict.selectYearPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={processReportData} disabled={isGeneratingReport || isLoadingProjects || isDownloading} className="w-full sm:w-auto md:self-end accent-teal rounded-md shadow-md hover:shadow-lg transition-shadow">
              {isGeneratingReport ? <Loader2 className="animate-spin" /> : <BarChart3 />}
              <span className="ml-2">{isGeneratingReport ? reportDict.generatingReportButton : reportDict.generateReportButton}</span>
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 md:self-end w-full sm:w-auto">
                <Button
                    onClick={handleDownloadExcel}
                    disabled={isDownloading || !reportData || totalReportedProjects === 0}
                    variant="outline"
                    className="w-full sm:flex-1 md:w-auto rounded-md shadow-sm hover:shadow-md transition-shadow"
                >
                    {isDownloading && <Loader2 className="animate-spin mr-2" />} <FileText className="mr-2" /> Excel
                </Button>
                <Button
                    onClick={handleDownloadWord}
                    disabled={isDownloading || !reportData || totalReportedProjects === 0 || (totalReportedProjects > 0 && !chartImageDataUrl)}
                    variant="outline"
                    className="w-full sm:flex-1 md:w-auto rounded-md shadow-sm hover:shadow-md transition-shadow"
                >
                   {isDownloading && <Loader2 className="animate-spin mr-2" />} <FileCode className="mr-2" /> Word
                </Button>
            </div>
          </div>

          {(isGeneratingReport || (isLoadingProjects && !reportData)) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{isLoadingProjects ? reportDict.toast.loadingProjects : reportDict.generatingReportButton}</p>
            </div>
          )}

          {!isGeneratingReport && reportData && totalReportedProjects === 0 && (
            <Card className="mt-6 border-dashed border-muted-foreground/50 rounded-lg">
              <CardContent className="py-12 text-center">
                <PieChartIcon className="h-16 w-16 mx-auto text-muted-foreground/70 mb-4" />
                <p className="text-xl font-semibold text-foreground">{reportDict.noDataForMonth}</p>
                <p className="text-md text-muted-foreground">{reportDict.tryDifferentMonthYear}</p>
              </CardContent>
            </Card>
          )}

          {!isGeneratingReport && reportData && totalReportedProjects > 0 && (
            <>
              <Card className="mt-6 shadow-md rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-primary">
                    {reportDict.reportFor} {months.find(m => m.value === selectedMonth)?.[language === 'id' ? 'labelId' : 'labelEn']} {selectedYear}
                  </CardTitle>
                   <CardDescription className="text-sm">
                       {reportDict.totalProjectsDesc
                           .replace('{total}', totalReportedProjects.toString())
                           .replace('{completed}', reportData.completed.length.toString())
                           .replace('{canceled}', reportData.canceled.length.toString())
                           .replace('{inProgress}', reportData.inProgress.length.toString())
                       }
                   </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 bg-card p-4 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-3 text-center text-foreground">{reportDict.status}</h3>
                       <div id="report-chart-container-for-image" className="p-2 bg-background rounded-md">
                          <ChartContainer config={{}} className="h-[250px] w-full sm:h-[220px]">
                            <ResponsiveContainer>
                              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                <Tooltip
                                  cursor={{fill: 'hsl(var(--accent))', stroke: 'hsl(var(--border))'}}
                                  content={<ChartTooltipContent hideLabel nameKey="name" />}
                                />
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}
                                 labelLine={false} 
                                 label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                   const RADIAN = Math.PI / 180;
                                   const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                                   const x  = cx + radius * Math.cos(-midAngle * RADIAN);
                                   const y = cy  + radius * Math.sin(-midAngle * RADIAN);
                                   if (percent * 100 < 5) return null; // Hide small percentage labels
                                   return ( <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="500"> {`${(percent * 100).toFixed(0)}%`} </text> );
                                 }}>
                                  {chartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} stroke={'hsl(var(--border))'} /> ))}
                                </Pie>
                                <Legend content={({ payload }) => (
                                   <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1.5 mt-4 text-xs">
                                     {payload?.map((entry, index) => (
                                       <div key={`item-${index}`} className="flex items-center">
                                         <span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></span>
                                         <span className="text-muted-foreground">{entry.value}</span> <span className="ml-1">({((entry.payload as any)?.percent * 100).toFixed(0)}%)</span>
                                       </div>
                                     ))}
                                   </div>
                                 )} />
                              </PieChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                       </div>
                    </div>
                    <div className="lg:col-span-2">
                       <ScrollArea className="max-h-[400px] w-full rounded-md border shadow-inner">
                          <Table>
                            <TableCaption className="mt-0 mb-2 text-sm">{reportDict.tableCaption}</TableCaption>
                            <TableHeader className="sticky top-0 bg-secondary z-10">
                              <TableRow>
                                <TableHead className="w-[180px] sm:w-[220px] px-3 py-2.5 text-xs font-medium">{reportDict.tableHeaderTitle}</TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium">{reportDict.tableHeaderStatus}</TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium">{reportDict.tableHeaderLastActivityDate}</TableHead>
                                <TableHead className="px-3 py-2.5 text-xs font-medium">{reportDict.tableHeaderContributors}</TableHead>
                                <TableHead className="text-right px-3 py-2.5 text-xs font-medium">{language === 'id' ? 'Progres (%)' : 'Progress (%)'}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project) => (
                                <TableRow key={project.id} className="hover:bg-accent/50 transition-colors">
                                  <TableCell className="font-medium truncate max-w-xs px-3 py-2 text-xs">{project.title}</TableCell>
                                  <TableCell className="px-3 py-2 text-xs"><Badge variant={project.status === 'Completed' ? 'default' : project.status === 'Canceled' ? 'destructive' : 'secondary'} className={`${project.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-300' : project.status === 'Canceled' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-blue-100 text-blue-700 border-blue-300'} text-xs py-0.5 px-1.5 rounded-full`}>{getTranslatedStatus(project.status)}</Badge></TableCell>
                                  <TableCell className="px-3 py-2 text-xs">{getLastActivityDate(project)}</TableCell>
                                  <TableCell className="truncate max-w-[150px] px-3 py-2 text-xs">{getContributors(project, reportDict, language)}</TableCell>
                                  <TableCell className="text-right px-3 py-2 text-xs">{project.progress}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                         <ScrollBar orientation="horizontal" />
                       </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

