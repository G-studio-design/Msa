// src/app/dashboard/attendance/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, LogOut, CheckCircle, Clock, XCircle, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { checkIn, checkOut, getTodaysAttendance, getAttendanceForUser, type AttendanceRecord } from '@/services/attendance-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { isAttendanceFeatureEnabled } from '@/services/settings-service';

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

  React.useEffect(() => {
    setIsClient(true);
    const newDictData = getDictionary(language);
    setDict(newDictData.attendancePage);
  }, [language]);

  const fetchData = React.useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const [today, history] = await Promise.all([
          getTodaysAttendance(currentUser.id),
          getAttendanceForUser(currentUser.id)
        ]);
        setTodaysRecord(today);
        setUserHistory(history);
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
      // Basic geolocation for web
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
      }, async (error) => {
        console.warn("Geolocation failed, checking in without location:", error.message);
        // Fallback if user denies location or it fails
        const record = await checkIn({ userId: currentUser.id, username: currentUser.username, displayName: currentUser.displayName || currentUser.username });
        setTodaysRecord(record);
        toast({ title: dict.toast.checkInSuccessTitle, description: `${dict.toast.checkInSuccessDesc} ${format(new Date(record.checkInTime!), 'HH:mm')}` });
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: dict.toast.errorTitle, description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      const record = await checkOut(currentUser.id);
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
                    <p className="font-semibold">{dict.checkOutTimeLabel}: {format(parseISO(todaysRecord.checkOutTime), 'HH:mm:ss')}</p>
                  </div>
                ) : (
                  <Button onClick={handleCheckOut} disabled={isProcessing} className="w-full accent-teal">
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
    </div>
  );
}
