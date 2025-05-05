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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, type Project } from '@/services/project-service';
import { generateExcelReport, generatePdfReport } from '@/lib/report-generator'; // Assume these exist

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function MonthlyReportPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [reportDict, setReportDict] = React.useState(() => dict.monthlyReportPage);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear()));
  const [reportData, setReportData] = React.useState<{ completed: Project[], canceled: Project[] } | null>(null);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setReportDict(newDict.monthlyReportPage);
  }, [language]);

  const canAccessReport = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const handleGenerateReport = async () => {
    if (!selectedMonth || !selectedYear) return;
    setIsLoading(true);
    setReportData(null); // Clear previous report

    try {
      const allProjects = await getAllProjects();
      const month = parseInt(selectedMonth, 10);
      const year = parseInt(selectedYear, 10);

      // Filter projects based on completion/cancelation timestamp within the selected month/year
      const filteredProjects = allProjects.filter(project => {
        const history = project.workflowHistory;
        if (!history || history.length === 0) return false;

        const lastAction = history[history.length - 1];
        // Ensure timestamp is valid before creating Date object
        if (!lastAction.timestamp || isNaN(new Date(lastAction.timestamp).getTime())) {
            console.warn(`Invalid timestamp found for project ${project.id}: ${lastAction.timestamp}`);
            return false;
        }
        const lastActionDate = new Date(lastAction.timestamp);


        return (
            lastActionDate.getMonth() + 1 === month &&
            lastActionDate.getFullYear() === year &&
            (project.status === 'Completed' || project.status === 'Canceled')
        );
      });

      const completed = filteredProjects.filter(p => p.status === 'Completed');
      const canceled = filteredProjects.filter(p => p.status === 'Canceled');

      setReportData({ completed, canceled });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({ variant: 'destructive', title: reportDict.errorGeneratingReport });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (format: 'excel' | 'pdf') => {
    if (!reportData) return;
    setIsDownloading(true);

    // **Important Explanation:**
    // The `generateExcelReport` and `generatePdfReport` functions in `report-generator.ts`
    // are currently placeholders. They only *simulate* report generation by logging messages
    // and adding a delay. They do NOT actually create or trigger a file download in the browser.
    //
    // To make the download work, you need to:
    // 1. Install Libraries: Add libraries like `exceljs` (for Excel) and `jspdf` or `pdfkit` (for PDF)
    //    to your project (`npm install exceljs jspdf`).
    // 2. Implement Generation Logic: Replace the placeholder logic in `report-generator.ts`
    //    with actual code using these libraries to create the file content (Excel buffer or PDF blob).
    // 3. Implement Client-Side Download Trigger: The `report-generator.ts` functions (being server-side)
    //    cannot directly trigger a browser download. You'll need to either:
    //    a) Make this `handleDownload` function call an API route that generates the file and sends it back
    //       with the correct `Content-Disposition` header to trigger the download.
    //    b) Move the report generation logic entirely to the client-side (using the libraries directly here),
    //       create a Blob, generate a download URL (`URL.createObjectURL`), and simulate a click on an `<a>` tag.
    //       (This is feasible for smaller reports but not recommended for large ones).
    //
    // The current implementation *will not* result in a file being downloaded.
    // I am proceeding with calling the existing simulation functions.

    console.warn(`Calling simulated report generation for ${format}. Actual download is not implemented.`);

    try {
      const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleString(language, { month: 'long' });
      const filename = `Monthly_Report_${monthName}_${selectedYear}`;

      if (format === 'excel') {
        // Calls the simulation function
        await generateExcelReport(reportData.completed, reportData.canceled, filename);
        toast({ title: reportDict.toast.downloadedExcel, description: `Simulation complete for ${filename}.xlsx` });
      } else {
        // Calls the simulation function
        await generatePdfReport(reportData.completed, reportData.canceled, filename);
        toast({ title: reportDict.toast.downloadedPdf, description: `Simulation complete for ${filename}.pdf` });
      }
    } catch (error) {
      console.error(`Failed to simulate download for ${format} report:`, error);
      toast({ variant: 'destructive', title: reportDict.errorDownloadingReport });
    } finally {
      setIsDownloading(false);
    }
  };


  // Loading state or Access Denied
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

  // Generate month and year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i)); // Last 5 years
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: new Date(currentYear, i).toLocaleString(language, { month: 'long' }), // Use current language
  }));


  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{isClient ? reportDict.title : defaultDict.monthlyReportPage.title}</CardTitle>
          <CardDescription>{isClient ? reportDict.description : defaultDict.monthlyReportPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Month and Year Selection */}
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

          {/* Report Display Area */}
          {isLoading ? (
             <div className="text-center py-8">
               <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
             </div>
          ) : reportData ? (
            reportData.completed.length > 0 || reportData.canceled.length > 0 ? (
              <Card className="mt-6 border-primary">
                <CardHeader>
                   <CardTitle className="text-lg">{reportDict.reportFor} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="font-medium">{reportDict.totalProjects} <span className="font-bold">{reportData.completed.length + reportData.canceled.length}</span></p>
                     <div>
                        <h4 className="font-semibold mb-2">{reportDict.completedProjects} ({reportData.completed.length})</h4>
                         {reportData.completed.length > 0 ? (
                             <ul className="list-disc list-inside text-sm space-y-1 text-green-600">
                                 {reportData.completed.map(project => (
                                    <li key={project.id}>{project.title}</li>
                                 ))}
                             </ul>
                         ) : <p className="text-sm text-muted-foreground">{reportDict.none}</p>}
                     </div>
                     <div>
                        <h4 className="font-semibold mb-2">{reportDict.canceledProjects} ({reportData.canceled.length})</h4>
                         {reportData.canceled.length > 0 ? (
                             <ul className="list-disc list-inside text-sm space-y-1 text-destructive">
                                 {reportData.canceled.map(project => (
                                     <li key={project.id}>{project.title}</li>
                                 ))}
                             </ul>
                          ) : <p className="text-sm text-muted-foreground">{reportDict.none}</p>}
                     </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => handleDownload('excel')} disabled={isDownloading} className="w-full sm:w-auto">
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isClient ? (isDownloading ? reportDict.downloadingButton : reportDict.downloadExcel) : defaultDict.monthlyReportPage.downloadExcel}
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload('pdf')} disabled={isDownloading} className="w-full sm:w-auto">
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
          ) : null /* Show nothing initially before generation */}
        </CardContent>
      </Card>
    </div>
  );
}

    