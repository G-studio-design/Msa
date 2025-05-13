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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Users, CalendarCheck, CalendarX, Activity, BarChart3, CheckSquare, XSquare, PieChart as PieChartIcon, FileCode } from 'lucide-react'; // Changed FileWord to FileCode
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project, type WorkflowHistoryEntry } from '@/services/project-service';
import { generateExcelReport, generateWordReport } from '@/lib/report-generator'; // Removed generatePdfReport
import type { Language } from '@/context/LanguageContext';
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


const defaultDict = getDictionary('en');
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); // Last 5 years + current + next 4
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  labelEn: new Date(0, i).toLocaleString('en-US', { month: 'long' }),
  labelId: new Date(0, i).toLocaleString('id-ID', { month: 'long' }),
}));

// Helper function to format date for display
function formatDateOnly(timestamp: string | undefined | null, lang: 'en' | 'id' = 'en'): string {
    if (!timestamp) return "N/A";
    try {
        const locale = lang === 'id' ? IndonesianLocale : EnglishLocale;
        return format(parseISO(timestamp), 'PP', { locale }); // e.g., Sep 29, 2023 or 29 Sep 2023
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return "Invalid Date";
    }
}


function getContributors(project: Project, dict: ReturnType<typeof getDictionary>['monthlyReportPage'], currentLang: 'en' | 'id'): string {
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
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [chartImage, setChartImage] = React.useState<string | null>(null);


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
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data for reports.' });
        } finally {
          setIsLoadingProjects(false);
        }
      } else {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [currentUser, toast]);

  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setReportDict(newDict.monthlyReportPage);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);


  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
      if (!isClient || !dashboardDict || !dashboardDict.status || !statusKey) return statusKey;
      const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);


  const getLastActivityDate = (project: Project): string => {
        if (!project.workflowHistory || project.workflowHistory.length === 0) {
            return formatDateOnly(project.createdAt, language);
        }
        const lastEntry = project.workflowHistory[project.workflowHistory.length - 1];
        return formatDateOnly(lastEntry?.timestamp, language);
    };


  const generateReport = React.useCallback(async () => {
    if (!selectedMonth || !selectedYear || allProjects.length === 0) {
      setReportData(null);
      setChartImage(null);
      return;
    }
    setIsGenerating(true);
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10);

    const filteredProjects = allProjects.filter(project => {
      const projectDate = parseISO(project.createdAt);
      return projectDate.getFullYear() === year && (projectDate.getMonth() + 1) === month;
    });

    const completed = filteredProjects.filter(p => p.status === 'Completed');
    const canceled = filteredProjects.filter(p => p.status === 'Canceled');
    const inProgress = filteredProjects.filter(p => !['Completed', 'Canceled'].includes(p.status));

    setReportData({ completed, canceled, inProgress });

    // Generate chart image (client-side for simplicity here)
    if (typeof window !== 'undefined') {
      const chartElement = document.getElementById('report-chart-container-for-image');
      if (chartElement) {
        try {
          const { toPng } = await import('html-to-image');
          const dataUrl = await toPng(chartElement, {
            quality: 0.9,
            backgroundColor: 'white', // Ensure background for non-transparent PNG
            // Ensure fonts are loaded and embedded
            fontEmbedCSS: "@font-face { font-family: 'Inter'; src: url('/_next/static/media/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw-s.p.7b3669ea.woff2') format('woff2'); font-style: normal; font-weight: normal; }",

          });
          setChartImage(dataUrl);
        } catch (error) {
          console.error('Error generating chart image:', error);
          toast({
            variant: 'destructive',
            title: 'Chart Image Error',
            description: 'Could not generate the project status chart image for the report.',
          });
          setChartImage(null);
        }
      } else {
        setChartImage(null);
      }
    }

    setIsGenerating(false);
  }, [selectedMonth, selectedYear, allProjects, toast]);

  React.useEffect(() => {
    if (allProjects.length > 0) {
      generateReport();
    }
  }, [selectedMonth, selectedYear, allProjects, generateReport]);

  const canViewPage = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);


  const chartData = React.useMemo(() => {
    if (!reportData) return [];
    return [
      { name: reportDict.inProgressProjectsShort, value: reportData.inProgress.length, fill: 'hsl(var(--chart-1))' },
      { name: reportDict.completedProjectsShort, value: reportData.completed.length, fill: 'hsl(var(--chart-2))' },
      { name: reportDict.canceledProjectsShort, value: reportData.canceled.length, fill: 'hsl(var(--chart-3))' },
    ].filter(item => item.value > 0);
  }, [reportData, reportDict]);


  const handleDownloadExcel = async () => {
    if (!reportData) {
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: reportDict.noDataForMonth });
        return;
    }
    setIsGenerating(true);
    try {
        const csvData = await generateExcelReport(reportData.completed, reportData.canceled, reportData.inProgress, language);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `MsarchApp_Monthly_Report_${selectedMonth}_${selectedYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: reportDict.toast.downloadedExcel });
    } catch (error) {
        console.error("Error generating Excel report:", error);
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: (error as Error).message });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!reportData) {
        toast({ variant: 'destructive', title: reportDict.errorGeneratingReport, description: reportDict.noDataForMonth });
        return;
    }
    setIsGenerating(true);

    const monthLabel = months.find(m => m.value === selectedMonth)?.[language === 'id' ? 'labelId' : 'labelEn'] || selectedMonth;

    try {
        const reportPayload = {
            completed: reportData.completed,
            canceled: reportData.canceled,
            inProgress: reportData.inProgress,
            monthName: monthLabel,
            year: selectedYear,
            chartImageDataUrl: chartImage,
            language: language,
        };

        const response = await fetch('/api/generate-report/word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload),
        });

        const responseText = await response.text(); // Read the body once

        if (!response.ok) {
            let errorDetails = `Word report generation failed (Status: ${response.status}).`;
            if (responseText) {
                try {
                    if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                        const errorData = JSON.parse(responseText);
                        console.error("Server JSON error details for Word generation:", errorData);

                        if (typeof errorData.details === 'string' && errorData.details.trim()) {
                             errorDetails = errorData.details;
                        } else if (typeof errorData.error === 'string' && errorData.error.trim()) {
                             errorDetails = errorData.error;
                        } else if (Object.keys(errorData).length === 0) {
                             errorDetails = 'The server returned an empty error object for Word report generation.';
                        } else {
                            errorDetails = 'The server returned an unspecified error for Word report. Check server logs.';
                        }
                    } else if (responseText.includes('<html')) {
                        errorDetails = "The server returned an HTML error page. Check server logs for details.";
                        console.error("HTML error response from server for Word generation (first 500 chars):", responseText.substring(0, 500));
                    } else if (responseText.trim()) {
                        errorDetails = `The server returned a non-JSON error: ${responseText.substring(0, 200)}`;
                        console.error("Raw non-JSON error response from server for Word generation:", responseText);
                    }
                } catch (e) {
                    console.error("Error parsing server response during Word report generation:", e, "Raw response:", responseText);
                    errorDetails = `Error parsing server's error response. Raw response: ${responseText.substring(0, 200)}`;
                }
            }
            const finalErrorMessage = String(errorDetails || "An unknown error occurred generating the Word report.").replace(/<[^>]*>?/gm, '').substring(0, 500);
            console.log(`Throwing error for Word report: ${finalErrorMessage}`);
            throw new Error(finalErrorMessage);
        }

        // If response is OK, convert the already read text (if it was blob-like) or re-fetch as blob
        // Since we read as text, we need to create blob from it if it was successful
        // For binary data (like docx), this approach of reading as text first is problematic.
        // Better to check response.ok and then response.blob() directly.
        // Re-adjusting to directly get blob if response.ok
        // The above responseText logic is for error cases only.

        const blob = await response.blob(); // This should be called if response.ok, after the check
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
        console.error("Error in handleDownloadWord:", error);
        toast({
            variant: 'destructive',
            title: reportDict.errorGeneratingReport,
            description: String(error.message || 'An unexpected error occurred while preparing the Word report.'),
        });
    } finally {
        setIsGenerating(false);
    }
};


  if (!isClient || isLoadingProjects) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{reportDict.title}</CardTitle>
          <CardDescription>{reportDict.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="month-select">{reportDict.selectMonthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select"><SelectValue placeholder={reportDict.selectMonthPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {language === 'id' ? month.labelId : month.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="year-select">{reportDict.selectYearLabel}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select"><SelectValue placeholder={reportDict.selectYearPlaceholder} /></SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={isGenerating || isLoadingProjects} className="w-full sm:w-auto md:self-end accent-teal">
              {isGenerating ? <Loader2 className="animate-spin" /> : <BarChart3 />}
              <span className="ml-2">{isGenerating ? reportDict.generatingReportButton : reportDict.generateReportButton}</span>
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 md:self-end w-full sm:w-auto">
                <Button
                    onClick={handleDownloadExcel}
                    disabled={isGenerating || !reportData || totalReportedProjects === 0}
                    variant="outline"
                    className="w-full sm:w-1/2 md:w-auto"
                >
                    <FileText className="h-4 w-4 mr-2" /> Excel (.csv)
                </Button>
                <Button
                    onClick={handleDownloadWord}
                    disabled={isGenerating || !reportData || totalReportedProjects === 0}
                    variant="outline"
                    className="w-full sm:w-1/2 md:w-auto"
                >
                   <FileCode className="h-4 w-4 mr-2" /> Word (.docx)
                </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">{reportDict.generatingReportButton}</p>
            </div>
          )}

          {!isGenerating && reportData && totalReportedProjects === 0 && (
            <Card className="mt-6">
              <CardContent className="py-8 text-center">
                <PieChartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-lg font-medium">{reportDict.noDataForMonth}</p>
                <p className="text-sm text-muted-foreground">{reportDict.tryDifferentMonthYear}</p>
              </CardContent>
            </Card>
          )}

          {!isGenerating && reportData && totalReportedProjects > 0 && (
            <>
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">{reportDict.reportFor} {months.find(m => m.value === selectedMonth)?.[language === 'id' ? 'labelId' : 'labelEn']} {selectedYear}</CardTitle>
                   <CardDescription>
                       {reportDict.totalProjectsDesc
                           .replace('{total}', totalReportedProjects.toString())
                           .replace('{completed}', reportData.completed.length.toString())
                           .replace('{canceled}', reportData.canceled.length.toString())
                           .replace('{inProgress}', reportData.inProgress.length.toString())
                       }
                   </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <h3 className="text-md font-semibold mb-2">{reportDict.status}</h3>
                       <div id="report-chart-container-for-image" className="p-2 bg-background rounded-md"> {/* Wrapper for image capture */}
                          <ChartContainer config={{}} className="h-[200px] w-full">
                            <ResponsiveContainer>
                              <PieChart>
                                <Tooltip
                                  cursor={false}
                                  content={<ChartTooltipContent hideLabel nameKey="name" />}
                                />
                                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                   const RADIAN = Math.PI / 180;
                                   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                   const x  = cx + radius * Math.cos(-midAngle * RADIAN);
                                   const y = cy  + radius * Math.sin(-midAngle * RADIAN);
                                   return ( <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px"> {`${(percent * 100).toFixed(0)}%`} </text> );
                                 }}>
                                  {chartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                                </Pie>
                                <Legend content={({ payload }) => (
                                   <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs">
                                     {payload?.map((entry, index) => (
                                       <div key={`item-${index}`} className="flex items-center">
                                         <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }}></span>
                                         <span>{entry.value} ({((entry.payload as any)?.percent * 100).toFixed(0)}%)</span>
                                       </div>
                                     ))}
                                   </div>
                                 )} />
                              </PieChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                       </div>
                    </div>
                    <div className="md:col-span-2">
                       <ScrollArea className="h-[300px] w-full">
                          <Table>
                            <TableCaption className="mt-0 mb-2">{reportDict.tableCaption}</TableCaption>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px] sm:w-[250px]">{reportDict.tableHeaderTitle}</TableHead>
                                <TableHead>{reportDict.tableHeaderStatus}</TableHead>
                                <TableHead>{reportDict.tableHeaderLastActivityDate}</TableHead>
                                <TableHead>{reportDict.tableHeaderContributors}</TableHead>
                                <TableHead className="text-right">{language === 'id' ? 'Progres (%)' : 'Progress (%)'}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...reportData.inProgress, ...reportData.completed, ...reportData.canceled].map((project) => (
                                <TableRow key={project.id}>
                                  <TableCell className="font-medium truncate max-w-xs">{project.title}</TableCell>
                                  <TableCell><Badge variant={project.status === 'Completed' ? 'default' : project.status === 'Canceled' ? 'destructive' : 'secondary'} className={project.status === 'Completed' ? 'bg-green-500 hover:bg-green-600' : ''}>{getTranslatedStatus(project.status)}</Badge></TableCell>
                                  <TableCell>{getLastActivityDate(project)}</TableCell>
                                  <TableCell className="truncate max-w-[150px]">{getContributors(project, reportDict, language)}</TableCell>
                                  <TableCell className="text-right">{project.progress}%</TableCell>
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

