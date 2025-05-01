// src/app/dashboard/tasks/page.tsx
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Trash2,
  CalendarClock,
  Loader2,
  AlertTriangle, // Added for potential loading state
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { scheduleEvent } from '@/services/google-calendar'; // Import the service
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Mock data - Replace with actual task data fetching and state management
// Simulating fetching a specific task (e.g., based on URL param or context)
const initialTask = {
  id: 2,
  title: 'Project Beta - Design Specs',
  status: 'In Progress', // Possible statuses...
  progress: 60,
  assignedDivision: 'Arsitek', // Use Architect role
  nextAction: 'Submit Design Files',
  workflowHistory: [
    { division: 'Owner', action: 'Input Data', timestamp: '2024-08-10T10:00:00Z' },
    { division: 'Admin Proyek', action: 'Upload Offer', timestamp: '2024-08-11T14:30:00Z' },
    { division: 'Owner', action: 'Approve Offer', timestamp: '2024-08-12T09:15:00Z' },
    { division: 'General Admin', action: 'Upload DP Invoice', timestamp: '2024-08-13T11:00:00Z' },
    { division: 'Owner', action: 'Approve DP Invoice', timestamp: '2024-08-14T16:45:00Z' },
    { division: 'Admin Proyek', action: 'Upload Admin Files', timestamp: '2024-08-15T10:30:00Z' },
  ],
  files: [
    { name: 'Initial_Brief.pdf', uploadedBy: 'Owner', timestamp: '2024-08-10T10:00:00Z' },
    { name: 'Offer_Proposal_v1.docx', uploadedBy: 'Admin Proyek', timestamp: '2024-08-11T14:30:00Z' },
    { name: 'DP_Invoice_PBeta.pdf', uploadedBy: 'General Admin', timestamp: '2024-08-13T11:00:00Z' },
    { name: 'Admin_Checklist.xlsx', uploadedBy: 'Admin Proyek', timestamp: '2024-08-15T10:30:00Z' },
  ],
};

type WorkflowHistoryEntry = typeof initialTask.workflowHistory[0];
type FileEntry = typeof initialTask.files[0];

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function TasksPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [dict, setDict] = React.useState(() => getDictionary(language)); // Initialize dict directly
  const tasksDict = dict.tasksPage; // Specific dictionary section

  const [task, setTask] = React.useState(initialTask); // In a real app, fetch this based on ID or context
  const [isLoadingTask, setIsLoadingTask] = React.useState(false); // State for loading task data (if fetched)
  const [description, setDescription] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');
  const [scheduleLocation, setScheduleLocation] = React.useState('');

   React.useEffect(() => {
      setIsClient(true); // Component has mounted client-side
      // TODO: If fetching task data:
      // setIsLoadingTask(true);
      // fetchTaskData(taskId).then(data => { setTask(data); setIsLoadingTask(false); });
   }, []);

   React.useEffect(() => {
        setDict(getDictionary(language)); // Update dictionary when language changes
   }, [language]);

   // Helper function to format dates client-side
   const formatTimestamp = (timestamp: string): string => {
       if (!isClient) return '...'; // Avoid rendering incorrect date on server
       const locale = language === 'id' ? 'id-ID' : 'en-US';
       try {
           return new Date(timestamp).toLocaleString(locale, {
               year: 'numeric', month: 'numeric', day: 'numeric',
               hour: 'numeric', minute: 'numeric', second: 'numeric',
           });
       } catch (e) {
            console.error("Error formatting timestamp:", timestamp, e);
            return "Invalid Date"; // Fallback for invalid dates
       }
   };

   const formatDateOnly = (timestamp: string): string => {
      if (!isClient) return '...'; // Avoid rendering incorrect date on server
      const locale = language === 'id' ? 'id-ID' : 'en-US';
      try {
            return new Date(timestamp).toLocaleDateString(locale, {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch (e) {
            console.error("Error formatting date:", timestamp, e);
            return "Invalid Date"; // Fallback for invalid dates
        }
   }


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadedFiles(Array.from(event.target.files));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  // Determine if the current user (from context) can perform the action
  const canPerformAction = currentUser?.role === task.assignedDivision;

  // Helper to get translated status
    const getTranslatedStatus = (statusKey: string): string => {
        const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dict.dashboardPage.status;
        return dict.dashboardPage.status[key] || statusKey; // Fallback to original key if not found
    }

  const handleProgressSubmit = async () => {
    if (!currentUser || !canPerformAction) { // Check currentUser exists
      toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied, description: tasksDict.toast.notYourTurn });
      return;
    }
    if (!description && uploadedFiles.length === 0 && task.status !== 'Pending Scheduling' && !['Owner', 'General Admin'].includes(currentUser.role)) {
       toast({ variant: 'destructive', title: tasksDict.toast.missingInput, description: tasksDict.toast.provideDescOrFile });
       return;
     }

    setIsSubmitting(true);
    console.log('Submitting Progress:', { description, files: uploadedFiles.map(f => f.name) });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // TODO: Implement actual API call to update task status, progress, files, and trigger notifications
    let nextStatus = task.status;
    let nextDivision = task.assignedDivision;
    let newProgress = task.progress;
    let nextActionDescription = '';
    const historyEntry = { division: currentUser.role, action: `Uploaded ${currentUser.role} Files`, timestamp: new Date().toISOString() };
    const newFiles = uploadedFiles.map(file => ({ name: file.name, uploadedBy: currentUser.role, timestamp: new Date().toISOString() }));

    // Simplified workflow logic - replace with actual state machine based on role/action
    switch (task.assignedDivision) {
        case 'Owner':
            if (task.status === 'Pending Input') { /*...*/ }
            break;
        case 'Admin Proyek':
             if (task.status === 'Pending Offer') { /*...*/ }
             else if (task.status === 'Pending Admin Files') {
                nextStatus = 'Pending Architect Files';
                nextDivision = 'Arsitek'; // Corrected Role
                newProgress = 50;
                nextActionDescription = 'Upload Architect Files';
                historyEntry.action = 'Uploaded Admin Files';
              }
              else if (task.status === 'Pending Final Check') { /*...*/ }
            break;
        case 'General Admin':
            if (task.status === 'Pending DP Invoice') { /*...*/ }
            break;
        case 'Arsitek': // Corrected Role
            if (task.status === 'Pending Architect Files') {
              nextStatus = 'Pending Structure Files';
              nextDivision = 'Struktur'; // Corrected Role
              newProgress = 70;
              nextActionDescription = 'Upload Structure Files';
              historyEntry.action = 'Uploaded Architect Files';
            }
            break;
        case 'Struktur': // Corrected Role
             if (task.status === 'Pending Structure Files') {
               nextStatus = 'Pending Final Check';
               nextDivision = 'Admin Proyek';
               newProgress = 80;
               nextActionDescription = 'Perform Final Check';
               historyEntry.action = 'Uploaded Structure Files';
             }
             break;
    }

    // Update state (replace with actual data mutation)
     setTask(prev => ({
        ...prev,
        status: nextStatus,
        assignedDivision: nextDivision,
        progress: newProgress,
        nextAction: nextActionDescription,
        workflowHistory: [...prev.workflowHistory, historyEntry],
        files: [...prev.files, ...newFiles],
      }));


    setDescription('');
    setUploadedFiles([]);
    setIsSubmitting(false);
    toast({ title: tasksDict.toast.progressSubmitted, description: tasksDict.toast.notifiedNextStep.replace('{division}', nextDivision) });
  };

  const handleDecision = (decision: 'continue' | 'cancel') => {
     if (currentUser?.role !== 'Owner') { // Check currentUser exists
       toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied, description: tasksDict.toast.onlyOwnerDecision });
       return;
     }
     setIsSubmitting(true);
     console.log(`Owner decision: ${decision}`);
     // Simulate API call
     new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
       let nextStatus = task.status;
       let nextDivision = task.assignedDivision;
       let newProgress = task.progress;
       let nextActionDescription = task.nextAction;
        const historyEntry = { division: currentUser!.role, action: '', timestamp: new Date().toISOString() }; // Use non-null assertion


       if (decision === 'cancel') {
         nextStatus = 'Canceled';
         nextDivision = ''; // No one assigned
         nextActionDescription = '';
          historyEntry.action = 'Canceled Progress';
         toast({ variant: 'destructive', title: tasksDict.toast.progressCanceled });
       } else {
         // Logic for continuing based on the current approval step
         if (task.status === 'Pending Approval') {
            if (task.progress === 20) { // After Offer
                 nextStatus = 'Pending DP Invoice';
                 nextDivision = 'General Admin';
                 newProgress = 25; // Progress slightly after approval
                 nextActionDescription = 'Generate DP Invoice';
                  historyEntry.action = 'Approved Offer';
                 toast({ title: tasksDict.toast.offerApproved, description: tasksDict.toast.offerApprovedDesc });
            } else if (task.progress === 30) { // After DP Invoice
                 nextStatus = 'Pending Admin Files';
                 nextDivision = 'Admin Proyek';
                 newProgress = 40; // Progress slightly after approval
                 nextActionDescription = 'Upload Admin Files';
                  historyEntry.action = 'Approved DP Invoice';
                 toast({ title: tasksDict.toast.dpApproved, description: tasksDict.toast.dpApprovedDesc });
            }
         } else if (task.status === 'Scheduled') { // After Sidang outcome
             nextStatus = 'Completed'; // Assuming success for now
             nextDivision = '';
             newProgress = 100;
             nextActionDescription = '';
             historyEntry.action = 'Marked as Completed';
             toast({ title: tasksDict.toast.progressCompleted });
         }
       }


       setTask(prev => ({
         ...prev,
         status: nextStatus,
         assignedDivision: nextDivision,
         progress: newProgress,
         nextAction: nextActionDescription,
          workflowHistory: [...prev.workflowHistory, historyEntry],
       }));
       setIsSubmitting(false);
     });
  };

  const handleScheduleSubmit = () => {
     if (!currentUser || !['Owner', 'General Admin'].includes(currentUser.role)) { // Check currentUser exists
       toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied });
       return;
     }
     if (!scheduleDate || !scheduleTime || !scheduleLocation) {
         toast({ variant: 'destructive', title: tasksDict.toast.missingScheduleInfo, description: tasksDict.toast.provideDateTimeLoc });
         return;
     }

     setIsSubmitting(true);
     const sidangDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
     console.log('Scheduling Sidang:', { dateTime: sidangDateTime, location: scheduleLocation });

     // TODO: API Call to save schedule to DB
     new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
        const historyEntry = { division: currentUser!.role, action: `Scheduled Sidang for ${sidangDateTime.toISOString()}`, timestamp: new Date().toISOString() }; // Use non-null assertion
        setTask(prev => ({
             ...prev,
             status: 'Scheduled',
             assignedDivision: 'Owner', // Owner handles outcome after sidang
             nextAction: 'Declare Sidang Outcome (Success/Fail)',
             workflowHistory: [...prev.workflowHistory, historyEntry],
           }));

        setIsSubmitting(false);
        setScheduleDate('');
        setScheduleTime('');
        setScheduleLocation('');
        toast({ title: tasksDict.toast.sidangScheduled, description: tasksDict.toast.sidangScheduledDesc });
     });
  };

    const handleAddToCalendar = async () => {
      if (task.status !== 'Scheduled') {
        toast({ variant: 'destructive', title: tasksDict.toast.cannotAddCalendarYet, description: tasksDict.toast.mustScheduleFirst });
        return;
      }
        const schedulingEntry = task.workflowHistory.find(entry => entry.action.startsWith('Scheduled Sidang for '));
        if (!schedulingEntry) {
             toast({ variant: 'destructive', title: tasksDict.toast.errorFindingSchedule, description: tasksDict.toast.couldNotFindSchedule });
             return;
        }

         const isoString = schedulingEntry.action.replace('Scheduled Sidang for ', '');
         const scheduledDateTime = new Date(isoString);

         const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);

      const eventDetails = {
          title: `Sidang: ${task.title}`,
          location: scheduleLocation || "Meeting Room 1",
          startTime: scheduledDateTime.toISOString(),
          endTime: endTime.toISOString(),
          description: `Sidang discussion for project: ${task.title}`,
      };

      try {
        setIsSubmitting(true);
        const eventId = await scheduleEvent(eventDetails);
        toast({ title: tasksDict.toast.addedToCalendar, description: tasksDict.toast.eventId.replace('{id}', eventId) });
      } catch (error) {
        console.error("Error scheduling event:", error);
        toast({ variant: 'destructive', title: tasksDict.toast.calendarError, description: tasksDict.toast.couldNotAddEvent });
      } finally {
        setIsSubmitting(false);
      }
    };

  // Define which actions are available based on status and current user role
  const showUploadSection = canPerformAction &&
     !['Pending Approval', 'Pending Scheduling', 'Scheduled', 'Completed', 'Canceled'].includes(task.status);
   const showOwnerDecisionSection = task.status === 'Pending Approval' && currentUser?.role === 'Owner';
   const showSchedulingSection = task.status === 'Pending Scheduling' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role);
   const showCalendarButton = task.status === 'Scheduled' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role);
   const showSidangOutcomeSection = task.status === 'Scheduled' && currentUser?.role === 'Owner';

   const translatedTaskStatus = isClient ? getTranslatedStatus(task.status) : '...'; // Translate status

   // Loading state for the whole page if task data or user data isn't ready
    if (!isClient || !currentUser || isLoadingTask) {
        return (
            <div className="container mx-auto py-4 space-y-6">
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-7 w-3/5 mb-2" />
                         <Skeleton className="h-4 w-4/5" />
                     </CardHeader>
                     <CardContent>
                         <Skeleton className="h-10 w-full" />
                     </CardContent>
                 </Card>
                  <Card>
                       <CardHeader>
                            <Skeleton className="h-6 w-1/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                       </CardHeader>
                       <CardContent>
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                  </Card>
                   <Card>
                        <CardHeader>
                             <Skeleton className="h-6 w-1/4 mb-2" />
                             <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-20 w-full" />
                         </CardContent>
                   </Card>
            </div>
        );
    }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
             <div>
               {/* TODO: Allow editing title for Owner, GA, PA */}
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <CardDescription>
                    {tasksDict.statusLabel}: <Badge variant={
                        task.status === 'Completed' ? 'default' :
                        task.status === 'Canceled' ? 'destructive' : 'secondary'
                      }>{translatedTaskStatus}</Badge> | {tasksDict.nextActionLabel}: {task.nextAction || tasksDict.none} | {tasksDict.assignedLabel}: {task.assignedDivision || tasksDict.none}
                </CardDescription>
              </div>
                <div className="text-right">
                    <div className="text-sm font-medium">{tasksDict.progressLabel}</div>
                    <Progress value={task.progress} className="w-32 h-2 mt-1" />
                    <span className="text-xs text-muted-foreground">{dict.dashboardPage.progress.replace('{progress}', task.progress.toString())}</span>
                </div>
          </div>
        </CardHeader>

        {/* Action Section */}
        <CardContent>
          {showUploadSection && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">{tasksDict.uploadProgressTitle.replace('{role}', currentUser!.role)}</h3> {/* Non-null assertion */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="description">{tasksDict.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  placeholder={tasksDict.descriptionPlaceholder.replace('{division}', task.assignedDivision)}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="picture">{tasksDict.attachFilesLabel}</Label>
                <Input id="picture" type="file" multiple onChange={handleFileChange} disabled={isSubmitting} />
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>{tasksDict.selectedFilesLabel}</Label>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <span className="truncate max-w-xs">{file.name}</span>
                         <Button variant="ghost" size="sm" onClick={() => removeFile(index)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={handleProgressSubmit} disabled={isSubmitting || (!description && uploadedFiles.length === 0)}>
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                 {isSubmitting ? tasksDict.submittingButton : tasksDict.submitButton}
              </Button>
            </div>
          )}

           {showOwnerDecisionSection && (
             <div className="space-y-4 border-t pt-4">
               <h3 className="text-lg font-semibold">{tasksDict.ownerActionTitle}</h3>
               <p className="text-sm text-muted-foreground">{tasksDict.ownerActionDesc}</p>
                <div className="flex gap-4">
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button variant="outline" disabled={isSubmitting}>
                         <XCircle className="mr-2 h-4 w-4" /> {tasksDict.cancelProgressButton}
                       </Button>
                     </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle>{tasksDict.cancelDialogTitle}</AlertDialogTitle>
                         <AlertDialogDescription>
                          {tasksDict.cancelDialogDesc}
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel disabled={isSubmitting}>{tasksDict.cancelDialogCancel}</AlertDialogCancel>
                         <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDecision('cancel')}
                            disabled={isSubmitting}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             {tasksDict.cancelDialogConfirm}
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                   <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="accent-teal">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      {tasksDict.continueProgressButton}
                   </Button>
                 </div>
             </div>
           )}

            {showSchedulingSection && (
                 <div className="space-y-4 border-t pt-4">
                   <h3 className="text-lg font-semibold">{tasksDict.scheduleSidangTitle.replace('{role}', currentUser!.role)}</h3> {/* Non-null assertion */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                         <Label htmlFor="scheduleDate">{tasksDict.dateLabel}</Label>
                         <Input id="scheduleDate" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={isSubmitting} />
                      </div>
                       <div className="space-y-1.5">
                          <Label htmlFor="scheduleTime">{tasksDict.timeLabel}</Label>
                          <Input id="scheduleTime" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} disabled={isSubmitting} />
                       </div>
                       <div className="space-y-1.5">
                          <Label htmlFor="scheduleLocation">{tasksDict.locationLabel}</Label>
                          <Input id="scheduleLocation" placeholder={tasksDict.locationPlaceholder} value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} disabled={isSubmitting} />
                       </div>
                    </div>
                   <Button onClick={handleScheduleSubmit} disabled={isSubmitting || !scheduleDate || !scheduleTime || !scheduleLocation}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                     {isSubmitting ? tasksDict.schedulingButton : tasksDict.confirmScheduleButton}
                   </Button>
                 </div>
               )}

            {showCalendarButton && (
                <div className="border-t pt-4 mt-4">
                   <Button onClick={handleAddToCalendar} disabled={isSubmitting} variant="outline">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                           <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="12" y1="14" x2="12" y2="18"></line><line x1="10" y1="16" x2="14" y2="16"></line></svg>
                        }
                       {isSubmitting ? tasksDict.addingCalendarButton : tasksDict.addCalendarButton}
                    </Button>
                </div>
            )}


           {showSidangOutcomeSection && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">{tasksDict.sidangOutcomeTitle}</h3>
                   <p className="text-sm text-muted-foreground">{tasksDict.sidangOutcomeDesc}</p>
                   <div className="flex gap-4">
                      {/* For simplicity, using the same 'continue' logic for success */}
                      <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                         {tasksDict.markSuccessButton}
                      </Button>
                       <Button variant="destructive" onClick={() => { /* Implement fail logic */ toast({title: tasksDict.toast.failNotImplemented})}} disabled={isSubmitting}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                         {tasksDict.markFailButton}
                       </Button>
                   </div>
                </div>
             )}


           {task.status === 'Completed' && (
              <div className="border-t pt-4 text-center">
                 <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                 <p className="font-semibold text-lg text-green-600">{tasksDict.completedMessage}</p>
              </div>
           )}
            {task.status === 'Canceled' && (
               <div className="border-t pt-4 text-center">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="font-semibold text-lg text-destructive">{tasksDict.canceledMessage}</p>
               </div>
            )}

        </CardContent>
      </Card>

      {/* File List Card */}
       <Card>
           <CardHeader>
             <CardTitle>{tasksDict.uploadedFilesTitle}</CardTitle>
             <CardDescription>{tasksDict.uploadedFilesDesc}</CardDescription>
           </CardHeader>
           <CardContent>
             {task.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tasksDict.noFiles}</p>
             ) : (
               <ul className="space-y-2">
                  {task.files.map((file, index) => (
                   <li key={index} className="flex items-center justify-between p-2 border rounded-md hover:bg-secondary/50">
                      <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">{file.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                         {tasksDict.uploadedByOn.replace('{user}', file.uploadedBy).replace('{date}', formatDateOnly(file.timestamp))}
                      </div>
                   </li>
                  ))}
               </ul>
             )}
           </CardContent>
       </Card>


      {/* Workflow History Card */}
      <Card>
        <CardHeader>
          <CardTitle>{tasksDict.workflowHistoryTitle}</CardTitle>
          <CardDescription>{tasksDict.workflowHistoryDesc}</CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="space-y-3">
            {task.workflowHistory.map((entry, index) => (
                <li key={index} className="flex items-start gap-3">
                    <div className={`mt-1 h-3 w-3 rounded-full ${index === task.workflowHistory.length - 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`}></div>
                    <div>
                        <p className="text-sm font-medium">
                            {tasksDict.historyActionBy.replace('{action}', entry.action).replace('{division}', entry.division)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p> {/* Use helper function */}
                    </div>
                </li>
            ))}
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
