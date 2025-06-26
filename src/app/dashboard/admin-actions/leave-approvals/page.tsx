
// src/app/dashboard/admin-actions/leave-approvals/page.tsx
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Inbox, MessageSquareText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest, type LeaveRequest } from '@/services/leave-request-service';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale, enUS as EnglishLocale } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const defaultDict = getDictionary('en');

export default function LeaveApprovalsPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const [leaveApprovalsDict, setLeaveApprovalsDict] = React.useState(defaultDict.leaveApprovalsPage);
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage);


  const [pendingRequests, setPendingRequests] = React.useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState<string | false>(false); // Store request ID being processed

  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [requestToReject, setRequestToReject] = React.useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    const newDictData = getDictionary(language);
    setDict(newDictData);
    setLeaveApprovalsDict(newDictData.leaveApprovalsPage);
    setDashboardDict(newDictData.dashboardPage);
  }, [language]);

  const currentLocale = language === 'id' ? IndonesianLocale : EnglishLocale;

  const fetchPendingRequests = React.useCallback(async () => {
    if (currentUser && currentUser.role === 'Owner') {
      setIsLoading(true);
      try {
        const allRequests = await getAllLeaveRequests();
        setPendingRequests(allRequests.filter(req => req.status === 'Pending'));
      } catch (error) {
        console.error("Failed to fetch leave requests:", error);
        toast({ variant: 'destructive', title: leaveApprovalsDict.toast.errorTitle, description: leaveApprovalsDict.toast.fetchError });
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, toast, leaveApprovalsDict]);

  React.useEffect(() => {
    if (isClient) {
      fetchPendingRequests();
    }
  }, [isClient, fetchPendingRequests]);

  const handleApprove = async (requestId: string) => {
    if (!currentUser || currentUser.role !== 'Owner') return;
    setIsProcessing(requestId);
    try {
      await approveLeaveRequest(requestId, currentUser.id, currentUser.username);
      toast({ title: leaveApprovalsDict.toast.approvedSuccessTitle, description: leaveApprovalsDict.toast.approvedSuccessDesc });
      fetchPendingRequests(); // Refresh list
    } catch (error: any) {
      console.error("Error approving leave request:", error);
      toast({ variant: 'destructive', title: leaveApprovalsDict.toast.errorTitle, description: error.message || leaveApprovalsDict.toast.actionFailed });
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setRequestToReject(request);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!currentUser || currentUser.role !== 'Owner' || !requestToReject || !rejectionReason.trim()) {
      toast({ variant: 'destructive', title: leaveApprovalsDict.toast.errorTitle, description: leaveApprovalsDict.toast.reasonRequired });
      return;
    }
    setIsProcessing(requestToReject.id);
    try {
      await rejectLeaveRequest(requestToReject.id, currentUser.id, currentUser.username, rejectionReason);
      toast({ title: leaveApprovalsDict.toast.rejectedSuccessTitle, description: leaveApprovalsDict.toast.rejectedSuccessDesc });
      fetchPendingRequests(); // Refresh list
      setIsRejectDialogOpen(false);
      setRequestToReject(null);
    } catch (error: any) {
      console.error("Error rejecting leave request:", error);
      toast({ variant: 'destructive', title: leaveApprovalsDict.toast.errorTitle, description: error.message || leaveApprovalsDict.toast.actionFailed });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    if (!isClient) return "...";
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'PP', { locale: currentLocale });
    }
    return `${format(start, 'PP', { locale: currentLocale })} - ${format(end, 'PP', { locale: currentLocale })}`;
  };
  
  const getTranslatedLeaveType = (leaveType: string): string => {
    if (!isClient || !dict?.leaveRequestPage?.leaveTypes) return leaveType;
    const leaveTypesDict = dict.leaveRequestPage.leaveTypes;
    const key = leaveType.toLowerCase().replace(/ /g, '').replace(/[^a-z0-9]/gi, '') as keyof typeof leaveTypesDict;
    return leaveTypesDict[key] || leaveType;
  };


  if (!isClient || !currentUser) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (currentUser.role !== 'Owner') {
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

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">{leaveApprovalsDict.title}</CardTitle>
          <CardDescription>{leaveApprovalsDict.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
              <Inbox className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{leaveApprovalsDict.noPendingRequests}</p>
              <p className="text-sm">{leaveApprovalsDict.allCaughtUp}</p>
            </div>
          ) : (
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <Table>
                <TableCaption>{leaveApprovalsDict.tableCaption}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{leaveApprovalsDict.tableHeaders.employee}</TableHead>
                    <TableHead>{leaveApprovalsDict.tableHeaders.leaveType}</TableHead>
                    <TableHead>{leaveApprovalsDict.tableHeaders.dates}</TableHead>
                    <TableHead>{leaveApprovalsDict.tableHeaders.reason}</TableHead>
                    <TableHead className="text-right">{leaveApprovalsDict.tableHeaders.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.displayName || req.username}</TableCell>
                      <TableCell>
                         <Badge variant="outline">{getTranslatedLeaveType(req.leaveType)}</Badge>
                      </TableCell>
                      <TableCell>{formatDateRange(req.startDate, req.endDate)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground hover:text-primary">
                                   <MessageSquareText className="mr-1 h-3.5 w-3.5"/> {leaveApprovalsDict.viewReason}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{leaveApprovalsDict.reasonDialogTitle.replace('{employee}', req.displayName || req.username)}</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 text-sm text-foreground whitespace-pre-wrap">
                                    {req.reason}
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => (document.querySelector('[data-radix-dialog-default-open="true"] [aria-label="Close"]') as HTMLElement)?.click()}>
                                        {leaveApprovalsDict.closeButton}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRejectDialog(req)}
                            disabled={isProcessing === req.id}
                            className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            {isProcessing === req.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> {leaveApprovalsDict.rejectButton}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            disabled={isProcessing === req.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isProcessing === req.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> {leaveApprovalsDict.approveButton}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{leaveApprovalsDict.rejectDialog.title.replace('{employee}', requestToReject?.displayName || requestToReject?.username || '')}</DialogTitle>
            <DialogDescription>{leaveApprovalsDict.rejectDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="rejectionReason">{leaveApprovalsDict.rejectDialog.reasonLabel}</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={leaveApprovalsDict.rejectDialog.reasonPlaceholder}
                rows={3}
                disabled={!!isProcessing}
              />
               {rejectionReason.trim().length === 0 && <p className="text-xs text-destructive">{leaveApprovalsDict.toast.reasonRequired}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={!!isProcessing}>
              {leaveApprovalsDict.cancelButton}
            </Button>
            <Button
              type="button"
              onClick={handleReject}
              disabled={!!isProcessing || !rejectionReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {leaveApprovalsDict.rejectDialog.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
