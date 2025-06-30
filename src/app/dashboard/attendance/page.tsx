// src/app/dashboard/attendance/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, LogOut, CheckCircle, Clock, XCircle, MapPin, Briefcase, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { checkIn, checkOut, getTodaysAttendance, getAttendanceForUser, type AttendanceRecord } from '@/services/attendance-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { getAppSettings } from '@/services/settings-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const defaultDict = getDictionary('en');

export default function AttendancePage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict.attendancePage);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [todaysRecord, setTodaysRecord] = React.useState<AttendanceRecord | null>(null);
  const [userHistory, setUserHistory] = React.useState<AttendanceRecord[]>([]);
  const [checkOutTime, setCheckOutTime] = React.useState("17:00");
  const [isCheckOutDialogOpen, setIsCheckOutDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const newDictData = getDictionary(language);
    setDict(newDictData.attendancePage);
  }, [language]);

  const fetchData = React.useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const [today, history, settings] = await Promise.all([
          getTodaysAttendance(currentUser.id),
          getAttendanceForUser(currentUser.id),
          getAppSettings(),
        ]);
        setTodaysRecord(today);
        setUserHistory(history);
        setCheckOutTime(settings.check_out_time || "17:00");
      } catch (error: any) {
        toast({ variant: 'destructive', title: dict.toast.errorTitle, description: error.message });
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, toast, dict]);

  React.useEffect(() => {
    if (isClient) {
      fetchData();
    }
  }, [isClient, fetchData]);

  const handleCheckIn = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const record = await checkIn({ 
          userId: currentUser.id, 
          username: currentUser.username, 
          displayName: currentUser.displayName || currentUser.username, 
          location: { latitude, longitude }
        });
        setTodaysRecord(record);
        toast({ title: dict.toast.checkInSuccessTitle, description: `${dict.toast.checkInSuccessDesc} ${format(new Date(record.checkInTime!), 'HH:mm')}` });
        setIsProcessing(false);
      }, async (error) => {
        console.error("Geolocation error:", error);
        toast({ variant: 'destructive', title: dict.toast.errorTitle, description: error.message.includes("User denied Geolocation") ? "Izin lokasi diperlukan untuk absensi." : "Gagal mendapatkan lokasi." });
        setIsProcessing(false);
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.errorTitle, description: error.message });
      setIsProcessing(false);
    }
  };

  const handleCheckOutClick = () => {
    const now = new Date();
    const [hour, minute] = checkOutTime.split(':').map(Number);
    const standardCheckOutTimeToday = new Date();
    standardCheckOutTimeToday.setHours(hour, minute, 0, 0);

    if (now < standardCheckOutTimeToday) {
        setIsCheckOutDialogOpen(true);
    } else {
        performCheckOut('Normal');
    }
  };
  
  const performCheckOut = async (reason: 'Normal' | 'Survei' | 'Sidang') => {
    if (!currentUser) return;
    setIsProcessing(true);
    setIsCheckOutDialogOpen(false);
    try {
      const record = await checkOut(currentUser.id, reason);
      setTodaysRecord(record);
      toast({ title: dict.toast.checkOutSuccessTitle, description: `${dict.toast.checkOutSuccessDesc} ${format(new Date(record.checkOutTime!), 'HH:mm')}` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.errorTitle, description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const attendanceModifiers = React.useMemo(() => {
    const modifiers: Record<string, Date[]> = {
      present: [],
      late: [],
      absent: [], // Future use
    };
    userHistory.forEach(rec => {
      if (rec.status === 'Present') modifiers.present.push(parseISO(rec.date));
      if (rec.status === 'Late') modifiers.late.push(parseISO(rec.date));
    });
    return modifiers;
  }, [userHistory]);
  
  const currentLocale = language === 'id' ? IndonesianLocale : EnglishLocale;

  if (!isClient) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">{dict.title}</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{dict.todayTitle}</CardTitle>
            <CardDescription>{format(new Date(), 'eeee, dd MMMM yyyy', { locale: currentLocale })}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : todaysRecord ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary">
                  {todaysRecord.status === 'Late' ? <Clock className="h-6 w-6 text-orange-500" /> : <CheckCircle className="h-6 w-6 text-green-500" />}
                  <div>
                    <p className="font-semibold">{dict.statusLabel}: {dict.status[todaysRecord.status.toLowerCase() as keyof typeof dict.status]}</p>
                    <p className="text-sm text-muted-foreground">{dict.checkInTimeLabel}: {format(parseISO(todaysRecord.checkInTime!), 'HH:mm:ss')}</p>
                  </div>
                </div>
                {todaysRecord.checkOutTime ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary">
                    <LogOut className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{dict.checkOutTimeLabel}: {format(parseISO(todaysRecord.checkOutTime), 'HH:mm:ss')}</p>
                      {todaysRecord.checkOutReason && todaysRecord.checkOutReason !== 'Normal' && (
                         <p className="text-sm text-muted-foreground">{dict.checkOutReasonLabel}: {todaysRecord.checkOutReason}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleCheckOutClick} disabled={isProcessing} className="w-full accent-teal">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    {dict.checkOutButton}
                  </Button>
                )}
                 {todaysRecord.location && 
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{dict.checkInLocation}: {todaysRecord.location.latitude.toFixed(4)}, {todaysRecord.location.longitude.toFixed(4)}</span>
                  </div>
                }
              </div>
            ) : (
              <Button onClick={handleCheckIn} disabled={isProcessing} className="w-full">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {dict.checkInButton}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.historyTitle}</CardTitle>
            <CardDescription>{dict.historyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <Calendar
                mode="single"
                modifiers={attendanceModifiers}
                modifiersClassNames={{
                  present: "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full",
                  late: "bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full",
                }}
                locale={currentLocale}
              />
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isCheckOutDialogOpen} onOpenChange={setIsCheckOutDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{dict.checkOutDialog.title}</DialogTitle>
                  <DialogDescription>{dict.checkOutDialog.description}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 py-4">
                  <Button onClick={() => performCheckOut('Normal')} variant="outline" disabled={isProcessing}>
                    <LogOut className="mr-2 h-4 w-4" /> {dict.checkOutDialog.normalButton}
                  </Button>
                  <Button onClick={() => performCheckOut('Survei')} variant="outline" disabled={isProcessing}>
                    <MapPin className="mr-2 h-4 w-4" /> {dict.checkOutDialog.surveyButton}
                  </Button>
                  <Button onClick={() => performCheckOut('Sidang')} variant="outline" disabled={isProcessing}>
                    <Briefcase className="mr-2 h-4 w-4" /> {dict.checkOutDialog.sidangButton}
                  </Button>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCheckOutDialogOpen(false)} disabled={isProcessing}>{dict.checkOutDialog.cancelButton}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
