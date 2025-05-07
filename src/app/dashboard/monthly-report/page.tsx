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
  TableCaption,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Users, CalendarCheck, CalendarX, Activity } from 'lucide-react'; // Added Activity icon
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project, type WorkflowHistoryEntry } from '@/services/project-service';
import { generateExcelReport, generatePdfReport } from '@/lib/report-generator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

interface MonthlyReportData {
  completed: Project[];
  canceled: Project[];
  inProgress: Project[];
}

export default function MonthlyReportPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [reportDict, setReportDict] = React.useState(() => dict.monthlyReportPage);
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear()));
  const [reportData, setReportData] = React.useState<MonthlyReportData | null>(null);

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
        const month = parseInt(selectedMonth, 10); // 1-indexed
        const year = parseInt(selectedYear, 10);

        const startDateOfMonth = new Date(year, month - 1, 1);
        startDateOfMonth.setHours(0, 0, 0, 0);
        const endDateOfMonth = new Date(year, month, 0); // Last day of the (selected month - 1), effectively the last day of selected month
        endDateOfMonth.setHours(23, 59, 59, 999);

        const getFinalStatusTimestamp = (project: Project, targetStatus: 'Completed' | 'Canceled'): Date | null => {
            const actionKeywords = targetStatus === 'Completed'
                ? ['completed', 'success'] // Keywords indicating completion
                : ['cancel']; // Keywords indicating cancellation

            // Search backwards through history for the relevant action
            for (let i = project.workflowHistory.length - 1; i >= 0; i--) {
                const entry = project.workflowHistory[i];
                if (actionKeywords.some(keyword => entry.action.toLowerCase().includes(keyword))) {
                    try {
                        return new Date(entry.timestamp);
                    } catch (e) { return null; } // Invalid timestamp
                }
            }
            // If current status matches target but no explicit history entry found,
            // use the timestamp of the last history entry if the project's current status is the target status.
            // This handles cases where status might be set without a specific "Marked as X" action.
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
                // Check for "In Progress" during the month
                // 1. Project must be created on or before the last day of the reporting month.
                if (projectCreationDate > endDateOfMonth) {
                    continue;
                }

                // 2. Project must not have been completed or canceled *before* the start of the reporting month.
                if (completionDate && completionDate < startDateOfMonth) {
                    continue; // Completed before this month
                }
                if (cancellationDate && cancellationDate < startDateOfMonth) {
                    continue; // Canceled before this month
                }

                // If it reaches here, it was active during the month or started during the month and wasn't finalized before it.
                // Or it was finalized *after* this month (meaning it was in progress during this month).
                inProgressThisMonth.push(project);
            }
        }

        setReportData({
            completed: completedThisMonth,
            canceled: canceledThisMonth,
            inProgress: inProgressThisMonth,
        });

    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast({ variant: 'destructive', title: reportDict.errorGeneratingReport || "Error", description: error.message || 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };


  const handleDownload = async (format: 'excel' | 'pdf') => {
    if (!reportData || !isClient) return;
    setIsDownloading(true);

    try {
      const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString(language, { month: 'long' });
      const filenameBase = `Monthly_Report_${monthName}_${selectedYear}`;
      
      let fileContent = '';
      let blobType = '';
      let fileExtension = '';
      let toastTitle = '';
      
      if (format === 'excel') {
        fileContent = await generateExcelReport(reportData.completed, reportData.canceled, reportData.inProgress);
        blobType = 'text/csv;charset=utf-8;';
        fileExtension = '.csv';
        toastTitle = reportDict.toast?.downloadedExcel || "Excel Report Downloaded";
      } else { // PDF (simulated as .txt)
        fileContent = await generatePdfReport(reportData.completed, reportData.canceled, reportData.inProgress, monthName, selectedYear);
        if (!fileContent || fileContent.trim() === "") {
            toast({ variant: 'destructive', title: "Report Empty", description: "The generated PDF report content is empty." });
            setIsDownloading(false);
            return;
        }
        blobType = 'text/plain;charset=utf-8;';
        fileExtension = '.txt'; 
        toastTitle = reportDict.toast?.downloadedPdf || "PDF Report Downloaded";
      }

      if (!fileContent && format === 'excel') { // Also check for excel if it could be empty
        toast({ variant: 'destructive', title: "Report Empty", description: "The generated Excel report content is empty." });
        setIsDownloading(false);
        return;
      }

      const blob = new Blob([fileContent], { type: blobType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenameBase}${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: toastTitle, description: `Report ${filenameBase}${fileExtension} downloaded.` });

    } catch (error) {
      console.error(`Failed to download ${format} report:`, error);
      toast({ variant: 'destructive', title: reportDict.errorDownloadingReport || "Download Error", description: (error as Error).message || 'Unknown error' });
    } finally {
      setIsDownloading(false);
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
            <Skeleton className="h-40 w-full" />
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
    label: new Date(currentYear, i).toLocaleString(language, { month: 'long' }),
  }));

  const allReportedProjects = reportData ? [...reportData.completed, ...reportData.canceled, ...reportData.inProgress] : [];
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
      return getLastTimestamp(b) - getLastTimestamp(a); // Sort descending (newest first)
  });


  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{isClient ? reportDict.title : defaultDict.monthlyReportPage.title}</CardTitle>
          <CardDescription>{isClient ? reportDict.description : defaultDict.monthlyReportPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 items-end">
            <div className="space-y-1">
              <Label htmlFor="month-select">{isClient ? reportDict.selectMonthLabel : defaultDict.monthlyReportPage.selectMonthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select">
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
                <SelectTrigger id="year-select">
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
            <Button onClick={handleGenerateReport} disabled={isLoading || !selectedMonth || !selectedYear} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isClient ? (isLoading ? reportDict.generatingReportButton : reportDict.generateReportButton) : defaultDict.monthlyReportPage.generateReportButton}
            </Button>
          </div>

          {isLoading ? (
             <div className="text-center py-8">
               <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
             </div>
          ) : reportData ? (
            reportData.completed.length > 0 || reportData.canceled.length > 0 || reportData.inProgress.length > 0 ? (
                <Card className="mt-6 border-primary">
                    <CardHeader>
                        <CardTitle className="text-lg">{reportDict.reportFor} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                         <CardDescription>
                           {reportDict.totalProjectsDesc
                             .replace('{total}', (reportData.completed.length + reportData.canceled.length + reportData.inProgress.length).toString())
                             .replace('{completed}', reportData.completed.length.toString())
                             .replace('{canceled}', reportData.canceled.length.toString())
                             .replace('{inProgress}', reportData.inProgress.length.toString())
                           }
                         </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="max-h-[60vh] w-full">
                            <Table>
                                <TableCaption className="mt-4">{reportDict.tableCaption}</TableCaption>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{reportDict.tableHeaderTitle}</TableHead>
                                        <TableHead>{reportDict.tableHeaderStatus}</TableHead>
                                        <TableHead>{reportDict.tableHeaderLastActivityDate}</TableHead>
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
                                        let badgeClassName = "";

                                        let displayStatus = project.status;
                                        // If the project is in the "inProgress" category from reportData, but its status is "Completed" or "Canceled"
                                        // it means it was completed/canceled *after* the reporting month. For the report, show its status at the end of the month as "In Progress".
                                        if (reportData.inProgress.some(p => p.id === project.id) && (project.status === 'Completed' || project.status === 'Canceled')) {
                                            displayStatus = 'In Progress';
                                        }

                                        switch (displayStatus) {
                                            case 'Completed':
                                                statusIcon = <CalendarCheck className="mr-1 h-3 w-3" />;
                                                badgeVariant = 'default';
                                                badgeClassName = 'bg-green-500 hover:bg-green-600 text-white';
                                                break;
                                            case 'Canceled':
                                                statusIcon = <CalendarX className="mr-1 h-3 w-3" />;
                                                badgeVariant = 'destructive';
                                                break;
                                            case 'In Progress':
                                            default: // For all other in-progress like statuses
                                                statusIcon = <Activity className="mr-1 h-3 w-3" />;
                                                badgeVariant = 'secondary';
                                                badgeClassName = 'bg-blue-500 text-white hover:bg-blue-600';
                                                break;
                                        }

                                        return (
                                            <TableRow key={project.id}>
                                                <TableCell className="font-medium">{project.title}</TableCell>
                                                <TableCell>
                                                    <Badge variant={badgeVariant} className={badgeClassName}>
                                                         {statusIcon}
                                                         {getTranslatedStatus(displayStatus)}
                                                     </Badge>
                                                </TableCell>
                                                <TableCell>{lastActivityDate}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Users className="h-3 w-3"/>
                                                        <span>{contributors || reportDict.none}</span>
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
                      <Button variant="outline" onClick={() => handleDownload('excel')} disabled={isDownloading || !reportData} className="w-full sm:w-auto">
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isClient ? (isDownloading ? reportDict.downloadingButton : reportDict.downloadExcel) : defaultDict.monthlyReportPage.downloadExcel}
                      </Button>
                      <Button variant="outline" onClick={() => handleDownload('pdf')} disabled={isDownloading || !reportData} className="w-full sm:w-auto">
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isClient ? (isDownloading ? reportDict.downloadingButton : reportDict.downloadPdf) : defaultDict.monthlyReportPage.downloadPdf}
                      </Button>
                    </CardFooter>
                </Card>
            ) : (
               <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8" />
                  {reportDict.noDataForMonth}
               </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

