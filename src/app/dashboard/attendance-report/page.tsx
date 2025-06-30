// src/app/dashboard/attendance-report/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, AlertTriangle, BarChart2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';
import { getMonthlyAttendanceReportData, type AttendanceRecord } from '@/services/attendance-service';
import { getAllUsersForDisplay, type User } from '@/services/user-service';

const defaultDict = getDictionary('en');

interface ReportData {
  records: AttendanceRecord[];
  users: Omit<User, 'password'>[];
  summary: { [userId: string]: { present: number; late: number; absent: number } };
  monthName: string;
  year: string;
}

export default function AttendanceReportPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict.attendanceReportPage);
  const [dictGlobal, setDictGlobal] = React.useState(defaultDict);

  const currentMonth = (new Date().getMonth() + 1).toString();
  const currentYear = new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear);
  
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [reportData, setReportData] = React.useState<ReportData | null>(null);

  React.useEffect(() => {
    setIsClient(true);
    const newDictData = getDictionary(language);
    setDict(newDictData.attendanceReportPage);
    setDictGlobal(newDictData);
  }, [language]);

  const canViewPage = currentUser && (currentUser.role === 'Owner' || currentUser.role === 'Admin Developer');

  const getMonthName = React.useCallback((monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    const locale = language === 'id' ? idLocale : enLocale;
    return format(date, 'MMMM', { locale });
  }, [language]);

  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: getMonthName(i + 1) }));
  
  const handleGenerateReport = async () => {
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: dict.toast.error, description: dict.toast.selectMonthYear });
      return;
    }
    setIsGenerating(true);
    setReportData(null);
    try {
      const monthInt = parseInt(selectedMonth, 10);
      const yearInt = parseInt(selectedYear, 10);
      
      const [records, users] = await Promise.all([
        getMonthlyAttendanceReportData(monthInt, yearInt),
        getAllUsersForDisplay()
      ]);

      if (records.length === 0) {
        toast({ title: dict.toast.noDataTitle, description: dict.toast.noDataDesc });
      }

      const userStats: { [userId: string]: { present: number; late: number; absent: number } } = {};
      users.forEach(u => {
        userStats[u.id] = { present: 0, late: 0, absent: 0 };
      });

      records.forEach(r => {
        if (userStats[r.userId]) {
          if (r.status === 'Present') userStats[r.userId].present++;
          if (r.status === 'Late') userStats[r.userId].late++;
        }
      });
      
      setReportData({
        records: records.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.displayName.localeCompare(b.displayName)),
        users: users.sort((a,b) => (a.displayName || a.username).localeCompare(b.displayName || b.username)),
        summary: userStats,
        monthName: getMonthName(monthInt),
        year: selectedYear,
      });

    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.error, description: error.message || dict.toast.generationFailed });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!reportData) {
      toast({ variant: 'destructive', title: dict.toast.error, description: dict.toast.generateFirst });
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-report/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(selectedMonth, 10),
          year: parseInt(selectedYear, 10),
          monthName: reportData.monthName,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || dict.toast.generationFailed);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${selectedYear}_${reportData.monthName.replace(/ /g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: dict.toast.success, description: dict.toast.downloadStarted });
    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.error, description: error.message });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const formatTimeOnly = (isoString?: string): string => {
    if (!isoString) return '--:--';
    try {
      return format(parseISO(isoString), 'HH:mm:ss');
    } catch (e) {
      return 'Invalid';
    }
  };

  if (!isClient) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">{dict.accessDenied}</CardTitle></CardHeader>
          <CardContent><p>{dict.accessDeniedDesc}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">{dict.title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{dict.generateTitle}</CardTitle>
          <CardDescription>{dict.generateDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="month-select">{dict.monthLabel}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year-select">{dict.yearLabel}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={isGenerating} className="accent-teal">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart2 className="mr-2 h-4 w-4" />}
              {isGenerating ? dict.generatingButton : dict.generateButton}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {reportData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{dict.reportTitle} - {reportData.monthName} {reportData.year}</CardTitle>
              <CardDescription>{dict.summaryTitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.tableHeaderEmployee}</TableHead>
                    <TableHead className="text-center">{dict.tableHeaderPresent}</TableHead>
                    <TableHead className="text-center">{dict.tableHeaderLate}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.displayName || user.username}</TableCell>
                      <TableCell className="text-center">{reportData.summary[user.id]?.present || 0}</TableCell>
                      <TableCell className="text-center">{reportData.summary[user.id]?.late || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{dict.detailedLogTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.records.length > 0 ? (
                <Table>
                  <TableCaption>{dict.reportFor} {reportData.monthName} {reportData.year}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.detailHeaderDate}</TableHead>
                      <TableHead>{dict.detailHeaderEmployee}</TableHead>
                      <TableHead>{dict.detailHeaderCheckIn}</TableHead>
                      <TableHead>{dict.detailHeaderCheckOut}</TableHead>
                      <TableHead>{dict.detailHeaderStatus}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.records.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell>{format(parseISO(rec.date), 'PP', { locale: language === 'id' ? idLocale : enLocale })}</TableCell>
                        <TableCell>{rec.displayName}</TableCell>
                        <TableCell>{formatTimeOnly(rec.checkInTime)}</TableCell>
                        <TableCell>{formatTimeOnly(rec.checkOutTime)}</TableCell>
                        <TableCell>{dictGlobal.attendancePage.status[rec.status.toLowerCase() as keyof typeof dictGlobal.attendancePage.status] || rec.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>{dict.toast.noDataDesc}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isDownloading ? dict.downloadingButton : dict.downloadButton}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
