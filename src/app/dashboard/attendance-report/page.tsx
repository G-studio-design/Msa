// src/app/dashboard/attendance-report/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, FileText, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { id as idLocale, enUS as enLocale } from 'date-fns/locale';

const defaultDict = getDictionary('en');

export default function AttendanceReportPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict.attendanceReportPage);

  const currentMonth = (new Date().getMonth() + 1).toString();
  const currentYear = new Date().getFullYear().toString();

  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = React.useState<string>(currentYear);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const newDictData = getDictionary(language);
    setDict(newDictData.attendanceReportPage);
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

  const handleDownload = async () => {
    if (!selectedMonth || !selectedYear) {
      toast({ variant: 'destructive', title: dict.toast.error, description: dict.toast.selectMonthYear });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-report/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(selectedMonth, 10),
          year: parseInt(selectedYear, 10),
          monthName: getMonthName(parseInt(selectedMonth, 10)),
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
      a.download = `attendance_report_${selectedYear}_${getMonthName(parseInt(selectedMonth, 10))}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: dict.toast.success, description: dict.toast.downloadStarted });
    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.error, description: error.message });
    } finally {
      setIsGenerating(false);
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
          </div>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isGenerating ? dict.generatingButton : dict.downloadButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
