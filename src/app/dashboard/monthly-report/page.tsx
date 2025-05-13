// src/app/dashboard/monthly-report/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, BarChart3, CheckSquare, XSquare, PieChart as PieChartIcon, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project, type WorkflowHistoryEntry } from '@/services/project-service';
import { generateExcelReport } from '@/lib/report-generator'; 
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import type { Language } from '@/context/LanguageContext';


interface MonthlyReportData {
  completed: Project[];
  inProgress: Project[];
  canceled: Project[];
  monthName: string;
  year: string;
}

const defaultDict = getDictionary('en');

export default function MonthlyReportPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const [reportDict, setReportDict] = React.useState(defaultDict.monthlyReportPage);
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage);

  const currentMonth = (new Date().getMonth() + 1).toString();
  const currentYear = new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear);
  
  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [reportData, setReportData] = React.useState<MonthlyReportData | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState<'excel' | 'word' | null>(null);

  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartImageDataUrl, setChartImageDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => { setIsClient(true); }, []);

  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setReportDict(newDict.monthlyReportPage);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);

  React.useEffect(() => {
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
    if (isClient) fetchProjects();
  }, [currentUser, isClient, toast, reportDict.toast.error, reportDict.toast.couldNotLoadProjects]);

  const canViewPage = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const getMonthName = React.useCallback((monthNumber: number, lang: Language) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    const locale = lang === 'id' ? idLocale : enLocale;
    return format(date, 'MMMM', { locale });
  }, []);
  
  const formatDateOnly = React.useCallback((timestamp: string | undefined | null): string => {
    if (!timestamp) return "N/A";
    try {
        const locale = language === 'id' ? idLocale : enLocale;
        return format(parseISO(timestamp), 'PP', { locale });
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
  }, [language]);

  const getLastActivityDate = React.useCallback((project: Project): string => {
    if (!project.workflowHistory || project.workflowHistory.length === 0) {
        return formatDateOnly(project.createdAt);
    }
    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
    return formatDateOnly(lastEntry?.timestamp);
  }, [formatDateOnly]);

  const getContributors = React.useCallback((project: Project): string => {
    if (!project.files || project.files.length === 0) {
        return reportDict.none;
    }
    const contributors = [...new Set(project.files.map(f => f.uploadedBy || 'Unknown'))];
    return contributors.join(', ');
  }, [reportDict.none]);


  const handleGenerateReport = React.useCallback(async () => {
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: reportDict.toast.error, description: "Please select month and year."});
      return;
    }
    setIsGeneratingReport(true);
    setReportData(null);
    setChartImageDataUrl(null);

    const monthInt = parseInt(selectedMonth, 10);
    const yearInt = parseInt(selectedYear, 10);

    const filteredProjects = allProjects.filter(project => {
        try {
            let relevantDate: Date | null = null;
            if (project.status === 'Completed' || project.status === 'Canceled') {
                if (project.workflowHistory && project.workflowHistory.length > 0) {
                    const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
                    if (lastEntry) relevantDate = parseISO(lastEntry.timestamp);
                }
            } else { 
                 relevantDate = parseISO(project.createdAt); 
            }

            if (!relevantDate) return false;
            
            const projectMatchesMonthYear = getYear(relevantDate) === yearInt && (getMonth(relevantDate) + 1) === monthInt;

             if (project.status !== 'Completed' && project.status !== 'Canceled') {
                const createdBeforeOrDuringMonth = getYear(parseISO(project.createdAt)) < yearInt || (getYear(parseISO(project.createdAt)) === yearInt && (getMonth(parseISO(project.createdAt)) + 1) <= monthInt);
                return createdBeforeOrDuringMonth; 
            }
            
            return projectMatchesMonthYear;

        } catch (e) {
            console.error("Error parsing date for project filtering:", project.id, e);
            return false;
        }
    });
    
    const completed = filteredProjects.filter(p => p.status === 'Completed' && getYear(parseISO(p.workflowHistory[p.workflowHistory.length -1]?.timestamp || p.createdAt)) === yearInt && (getMonth(parseISO(p.workflowHistory[p.workflowHistory.length -1]?.timestamp || p.createdAt)) + 1) === monthInt);
    const canceled = filteredProjects.filter(p => p.status === 'Canceled' && getYear(parseISO(p.workflowHistory[p.workflowHistory.length -1]?.timestamp || p.createdAt)) === yearInt && (getMonth(parseISO(p.workflowHistory[p.workflowHistory.length -1]?.timestamp || p.createdAt)) + 1) === monthInt);
    const inProgress = allProjects.filter(p => {
        const createdDate = parseISO(p.createdAt);
        const createdBeforeOrDuringSelectedMonth = getYear(createdDate) < yearInt || (getYear(createdDate) === yearInt && (getMonth(createdDate) + 1) <= monthInt);
        
        if (!createdBeforeOrDuringSelectedMonth) return false;

        if (p.status === 'Completed' || p.status === 'Canceled') {
             const endDate = parseISO(p.workflowHistory[p.workflowHistory.length-1]?.timestamp || p.createdAt);
             return getYear(endDate) > yearInt || (getYear(endDate) === yearInt && (getMonth(endDate) + 1) > monthInt);
        }
        return true; 
    });


    const currentMonthName = getMonthName(monthInt, language);
    setReportData({ completed, inProgress, canceled, monthName: currentMonthName, year: selectedYear });
    
    if (completed.length === 0 && inProgress.length === 0 && canceled.length === 0) {
      toast({ title: reportDict.noDataForMonth, description: reportDict.tryDifferentMonthYear });
    }

    setTimeout(async () => {
        if (chartContainerRef.current && (completed.length > 0 || inProgress.length > 0 || canceled.length > 0)) {
            try {
                console.log("Attempting to generate chart image...");
                const dataUrl = await toPng(chartContainerRef.current, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
                setChartImageDataUrl(dataUrl);
                console.log("Chart image generated for report.");
            } catch (error) {
                console.error("Error generating chart image:", error);
                setChartImageDataUrl(null);
                toast({ variant: 'destructive', title: reportDict.toast.chartImageErrorTitle, description: (error as Error).message || reportDict.toast.chartImageErrorDesc });
            }
        } else {
            setChartImageDataUrl(null);
            if (completed.length > 0 || inProgress.length > 0 || canceled.length > 0) {
                 console.warn("Chart container ref not found, cannot generate image.");
            }
        }
        setIsGeneratingReport(false); 
    }, 500); 

  }, [selectedMonth, selectedYear, allProjects, toast, reportDict, language, getMonthName]);

  const handleDownloadExcel = async () => {
    if (!reportData) {
      toast({ title: reportDict.toast.error, description: "Generate a report first." });
      return;
    }
    setIsDownloading('excel');
    try {
      const csvData = await generateExcelReport(reportData.completed, reportData.canceled, reportData.inProgress, language);
      const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' }); 
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `MsarchApp_Monthly_Report_${reportData.monthName}_${reportData.year}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: reportDict.toast.downloadedExcel });
    } catch (error) {
      console.error("Error generating Excel report:", error);
      toast({ variant: 'destructive', title: reportDict.toast.errorDownloadingReport, description: (error as Error).message });
    } finally {
      setIsDownloading(null);
    }
  };

 const handleDownloadWord = async () => {
     if (!reportData || !selectedMonth || !selectedYear) {
        toast({ title: reportDict.toast.error, description: "Please generate a report first." });
        return;
    }
    
    const localHasDataForChart = reportData.completed.length > 0 || reportData.inProgress.length > 0 || reportData.canceled.length > 0;
    if (localHasDataForChart && !chartImageDataUrl && !isGeneratingReport) { 
        toast({ variant: 'destructive', title: reportDict.toast.generatingChartTitle, description: reportDict.toast.generatingChartDesc });
        return;
    }
    if (isGeneratingReport) { 
         toast({ variant: 'default', title: reportDict.generatingReportButton, description: reportDict.toast.generatingChartDesc});
         return;
    }

    setIsDownloading('word');
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
                chartImageDataUrl: chartImageDataUrl, 
                language: language,
            }),
        });

        if (!response.ok) {
            const responseText = await response.text(); 
            let errorDetails = "Failed to generate Word report from server."; 
            try {
                if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                    const errorData = JSON.parse(responseText);
                    console.error("[Client/WordDownload] Raw errorData from server:", JSON.stringify(errorData)); 
                    if (typeof errorData === 'object' && errorData !== null && Object.keys(errorData).length === 0) {
                        errorDetails = "The server returned an empty error response. Please check server logs for more details.";
                    } else {
                         errorDetails = String(errorData.details || errorData.error || "Failed to process server error response.");
                    }
                 } else {
                     errorDetails = responseText.length > 500 ? responseText.substring(0,500) + "..." : responseText;
                     if (responseText.toLowerCase().includes('<html')) {
                         errorDetails = "Server returned an HTML error page. Check server logs for details.";
                     }
                 }
            } catch (parseError: any) {
                console.error("[Client/WordDownload] Error parsing/handling error response from server for Word generation:", parseError, "Raw response:", responseText?.substring(0,500));
                errorDetails = `Server returned status ${response.status}. Original error: ${String(responseText || '').substring(0,200)}`;
            }
            throw new Error(String(errorDetails || "An unknown error occurred detailing the server response."));
        }
        
        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `MsarchApp_Monthly_Report_${reportData.monthName}_${reportData.year}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: reportDict.toast.downloadedWord });
    } catch (error) {
        console.error("Error downloading Word report:", error);
        toast({ variant: 'destructive', title: reportDict.toast.errorDownloadingReport, description: (error as Error).message });
    } finally {
        setIsDownloading(null);
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => (currentYear - 5 + i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: getMonthName(i + 1, language) }));

  const chartDisplayData = React.useMemo(() => {
    if (!reportData) return [];
    return [
      { name: reportDict.status.inprogress, count: reportData.inProgress.length, fill: "hsl(var(--chart-2))" },
      { name: reportDict.status.completed, count: reportData.completed.length, fill: "hsl(var(--chart-1))" },
      { name: reportDict.status.canceled, count: reportData.canceled.length, fill: "hsl(var(--destructive))" },
    ].filter(item => item.count > 0);
  }, [reportData, reportDict.status]);

  const chartConfig = {
    count: { label: reportDict.totalProjectsShort, color: "hsl(var(--foreground))" },
    [reportDict.status.inprogress]: { label: reportDict.status.inprogress, color: "hsl(var(--chart-2))" },
    [reportDict.status.completed]: { label: reportDict.status.completed, color: "hsl(var(--chart-1))" },
    [reportDict.status.canceled]: { label: reportDict.status.canceled, color: "hsl(var(--destructive))" },
  };


  if (!isClient || isLoadingProjects && !reportData) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Card><CardHeader><Skeleton className="h-8 w-2/5 mb-2" /><Skeleton className="h-4 w-3/5" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
        <Card><CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">{dict.manageUsersPage.accessDeniedTitle}</CardTitle></CardHeader>
          <CardContent><p>{dict.manageUsersPage.accessDeniedDesc}</p></CardContent>
        </Card>
      </div>
    );
  }
  
  const noData = reportData && reportData.completed.length === 0 && reportData.inProgress.length === 0 && reportData.canceled.length === 0;
  const hasDataForChart = reportData && (reportData.completed.length > 0 || reportData.inProgress.length > 0 || reportData.canceled.length > 0);


  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{reportDict.title}</CardTitle>
          <CardDescription>{reportDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="month-select">{reportDict.selectMonthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select"><SelectValue placeholder={reportDict.selectMonthPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year-select">{reportDict.selectYearLabel}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select"><SelectValue placeholder={reportDict.selectYearPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || isLoadingProjects} className="w-full sm:w-auto md:self-end accent-teal">
              {isGeneratingReport || isLoadingProjects && !reportData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isGeneratingReport || isLoadingProjects && !reportData ? reportDict.generatingReportButton : reportDict.generateReportButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isGeneratingReport && !reportData && (
          <div className="flex flex-col items-center justify-center text-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">{reportDict.generatingReportButton}</p>
          </div>
      )}

      {reportData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{reportDict.reportFor} {reportData.monthName} {reportData.year}</CardTitle>
              <CardDescription>
                {reportDict.totalProjectsDesc
                    .replace('{total}', (reportData.completed.length + reportData.inProgress.length + reportData.canceled.length).toString())
                    .replace('{completed}', reportData.completed.length.toString())
                    .replace('{canceled}', reportData.canceled.length.toString())
                    .replace('{inProgress}', reportData.inProgress.length.toString())
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div ref={chartContainerRef} className="p-4 bg-card rounded-md mb-6"> 
                 {noData ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                        <PieChartIcon className="h-12 w-12 mb-2 opacity-50" />
                        <p>{reportDict.noDataForMonth}</p>
                    </div>
                 ) : (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDisplayData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="#888888" fontSize={10} width={80} interval={0}/>
                                <ChartTooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                                <Bar dataKey="count" radius={4}>
                                    <LabelList dataKey="count" position="right" offset={8} className="fill-foreground" fontSize={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                 )}
               </div>

              {!noData && (
                <ScrollArea className="whitespace-nowrap rounded-md border">
                  <Table>
                    <TableCaption>{reportDict.tableCaption}</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">{reportDict.tableHeaderTitle}</TableHead>
                        <TableHead>{reportDict.tableHeaderStatus}</TableHead>
                        <TableHead>{reportDict.tableHeaderLastActivityDate}</TableHead>
                        <TableHead>{reportDict.tableHeaderContributors}</TableHead>
                        <TableHead className="text-right">{language === 'id' ? 'Progres (%)' : 'Progress (%)'}</TableHead>
                        <TableHead>{language === 'id' ? 'Dibuat Oleh' : 'Created By'}</TableHead>
                        <TableHead>{language === 'id' ? 'Dibuat Pada' : 'Created At'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.inProgress.map((project) => (
                        <TableRow key={`inprog-${project.id}`}>
                          <TableCell className="font-medium truncate max-w-xs">{project.title}</TableCell>
                          <TableCell><Badge variant="secondary">{dashboardDict.status.inprogress}</Badge></TableCell>
                          <TableCell>{getLastActivityDate(project)}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{getContributors(project)}</TableCell>
                          <TableCell className="text-right">{project.progress}%</TableCell>
                          <TableCell>{project.createdBy}</TableCell>
                          <TableCell>{formatDateOnly(project.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.completed.map((project) => (
                        <TableRow key={`comp-${project.id}`}>
                          <TableCell className="font-medium truncate max-w-xs">{project.title}</TableCell>
                          <TableCell><Badge className="bg-green-500 hover:bg-green-600 text-white">{dashboardDict.status.completed}</Badge></TableCell>
                          <TableCell>{getLastActivityDate(project)}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{getContributors(project)}</TableCell>
                          <TableCell className="text-right">{project.progress}%</TableCell>
                           <TableCell>{project.createdBy}</TableCell>
                          <TableCell>{formatDateOnly(project.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                      {reportData.canceled.map((project) => (
                        <TableRow key={`cancel-${project.id}`}>
                          <TableCell className="font-medium truncate max-w-xs">{project.title}</TableCell>
                          <TableCell><Badge variant="destructive">{dashboardDict.status.canceled}</Badge></TableCell>
                          <TableCell>{getLastActivityDate(project)}</TableCell>
                          <TableCell className="truncate max-w-[150px]">{getContributors(project)}</TableCell>
                          <TableCell className="text-right">{project.progress}%</TableCell>
                           <TableCell>{project.createdBy}</TableCell>
                          <TableCell>{formatDateOnly(project.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
            {!noData && (
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button onClick={handleDownloadExcel} disabled={isDownloading === 'excel' || isGeneratingReport} className="w-full sm:w-auto">
                {isDownloading === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                {reportDict.downloadExcel}
              </Button>
              <Button onClick={handleDownloadWord} disabled={isDownloading === 'word' || isGeneratingReport || (hasDataForChart && !chartImageDataUrl)} className="w-full sm:w-auto">
                 {isDownloading === 'word' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {reportDict.downloadWord}
              </Button>
            </CardFooter>
            )}
          </Card>
        </>
      )}
       {reportData && noData && !isGeneratingReport && (
         <Card>
            <CardContent className="py-10 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{reportDict.noDataForMonth}</p>
                <p className="text-sm text-muted-foreground">{reportDict.tryDifferentMonthYear}</p>
            </CardContent>
         </Card>
       )}
    </div>
  );
}

