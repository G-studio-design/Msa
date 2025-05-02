
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
  AlertTriangle,
  ListFilter,
  ArrowRight, // Added for linking
  Clock, // Import Clock icon
} from 'lucide-react';
import Link from 'next/link'; // Added Link
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
import { getAllTasks, updateTask, type Task, type WorkflowHistoryEntry, type FileEntry } from '@/services/task-service'; // Import service and types
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Import Dropdown for filtering
import { cn } from '@/lib/utils'; // Import cn utility
import { notifyUsersByRole } from '@/services/notification-service'; // Import notification service

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define possible statuses for filtering
const taskStatuses = [
    'Pending Input', 'Pending Offer', 'Pending Approval', 'Pending DP Invoice',
    'Pending Admin Files', 'Pending Architect Files', 'Pending Structure Files',
    'Pending Final Check', 'Pending Scheduling', 'Scheduled', 'In Progress',
    'Completed', 'Canceled'
];

export default function TasksPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [dict, setDict] = React.useState(() => getDictionary(language)); // Initialize dict directly
  const [tasksDict, setTasksDict] = React.useState(() => dict.tasksPage); // Specific dictionary section
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage); // For status translation

  const [allTasks, setAllTasks] = React.useState<Task[]>([]); // State to hold ALL fetched tasks
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(true); // State for loading task data
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null); // State for viewing a specific task detail (if implemented)

  const [description, setDescription] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');
  const [scheduleLocation, setScheduleLocation] = React.useState('');

  // State for filtering
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]); // Array of statuses to show

  React.useEffect(() => {
    setIsClient(true);
    // Fetch all tasks when component mounts and user is available
    const fetchTasks = async () => {
      if (currentUser) {
        setIsLoadingTasks(true);
        try {
          const fetchedTasks = await getAllTasks();
          setAllTasks(fetchedTasks);
          console.log("Fetched tasks:", fetchedTasks.length);
        } catch (error) {
          console.error("Failed to fetch tasks:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load task data.' });
        } finally {
          setIsLoadingTasks(false);
        }
      } else {
          setIsLoadingTasks(false); // Don't load if no user
      }
    };
    fetchTasks();
  }, [currentUser, toast]);

  React.useEffect(() => {
      const newDict = getDictionary(language); // Update dictionary when language changes
      setDict(newDict);
      setTasksDict(newDict.tasksPage);
      setDashboardDict(newDict.dashboardPage);
  }, [language]);


  // Helper function to format dates client-side
  const formatTimestamp = (timestamp: string): string => {
    if (!isClient) return '...'; // Avoid rendering incorrect date on server
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    try {
      return new Date(timestamp).toLocaleString(locale, {
        year: 'numeric', month: 'short', day: 'numeric', // Use short month
        hour: 'numeric', minute: 'numeric',
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

  // Determine if the current user (from context) can perform the action on the SELECTED task
  // This checks if the currentUser's role matches the task's assignedDivision OR if the task is awaiting their input (Pending Offer for Admin Proyek)
  const canPerformSelectedTaskAction = React.useMemo(() => {
    if (!currentUser || !selectedTask) return false;
    // Directly assigned role can act
    if (currentUser.role === selectedTask.assignedDivision) return true;
    // Specific exception: Admin Proyek can act on 'Pending Offer' even if not assigned (because Owner is assigned technically)
    if (currentUser.role === 'Admin Proyek' && selectedTask.status === 'Pending Offer') return true;
    return false;
  }, [currentUser, selectedTask]);


  // Helper to get translated status
    const getTranslatedStatus = (statusKey: string): string => {
        // Check if dashboardDict and dashboardDict.status are available
        if (!isClient || !dashboardDict || !dashboardDict.status) return statusKey; // Return original key if dict not ready
        const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[key] || statusKey; // Fallback to original key if not found
    }

      // Helper function to get status icon and color using translated status (similar to dashboard)
  const getStatusBadge = (status: string) => {
    if (!isClient || !status) return <Skeleton className="h-5 w-20" />; // Skeleton during hydration mismatch check or if status is missing

    // Ensure dashboardDict and dashboardDict.status are available
    if (!isClient || !dashboardDict || !dashboardDict.status) {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{status}</Badge>; // Fallback badge
    }

    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status; // Fallback to original

    // Define badge variants based on status
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";
    let Icon = Clock;

     switch (status.toLowerCase()) {
        case 'completed':
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600';
            Icon = CheckCircle;
            break;
        case 'inprogress':
        case 'sedang berjalan': // Add Indonesian translation
            variant = 'secondary';
            className = 'bg-blue-500 text-white hover:bg-blue-600';
            Icon = Clock;
            break;
        case 'pendingapproval':
        case 'menunggu persetujuan': // Add Indonesian translation
            variant = 'outline';
            className = 'border-yellow-500 text-yellow-600';
            Icon = AlertTriangle;
            break;
        case 'delayed':
        case 'tertunda': // Add Indonesian translation
             variant = 'destructive'; // Use destructive for delay color, but style it orange
             className = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'; // Custom orange style
             Icon = Clock;
             break;
        case 'canceled':
        case 'dibatalkan': // Add Indonesian translation
             variant = 'destructive';
             Icon = XCircle;
             break;
        case 'pending':
        case 'pendinginput':
        case 'menunggu input': // Add Indonesian translation
        case 'pendingoffer': // Make this stand out slightly?
        case 'menunggu penawaran': // Add Indonesian translation
            variant = 'outline'; // Example: Use outline for pending offer
            className = 'border-blue-500 text-blue-600'; // Example: blue outline
            Icon = Clock;
            break;
        case 'pendingdpinvoice':
        case 'menunggu faktur dp': // Add Indonesian translation
        case 'pendingadminfiles':
        case 'menunggu file admin': // Add Indonesian translation
        case 'pendingarchitectfiles':
        case 'menunggu file arsitek': // Add Indonesian translation
        case 'pendingstructurefiles':
        case 'menunggu file struktur': // Add Indonesian translation
        case 'pendingfinalcheck':
        case 'menunggu pemeriksaan akhir': // Add Indonesian translation
        case 'pendingscheduling':
        case 'menunggu penjadwalan': // Add Indonesian translation
            variant = 'secondary';
            Icon = Clock;
            break;
        case 'scheduled':
        case 'terjadwal': // Add Indonesian translation
            variant = 'secondary';
            className = 'bg-purple-500 text-white hover:bg-purple-600';
            Icon = Clock;
            break;
        default:
            variant = 'secondary'; // Default fallback
            Icon = Clock;
    }

    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  };


  const handleProgressSubmit = async () => {
    if (!currentUser || !selectedTask || !canPerformSelectedTaskAction) {
      toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied, description: tasksDict.toast.notYourTurn });
      return;
    }

    // Admins Proyek MUST upload at least one offer file when in 'Pending Offer' status.
    if (currentUser.role === 'Admin Proyek' && selectedTask.status === 'Pending Offer' && uploadedFiles.length === 0) {
        toast({ variant: 'destructive', title: tasksDict.toast.missingInput, description: tasksDict.toast.provideOfferFile });
        return;
    }

    // General validation: Require description or files for most steps (except scheduling or Owner/GA override)
    if (!description && uploadedFiles.length === 0 && selectedTask.status !== 'Pending Scheduling' && !['Owner', 'General Admin'].includes(currentUser.role) && !(currentUser.role === 'Admin Proyek' && selectedTask.status === 'Pending Offer')) {
       toast({ variant: 'destructive', title: tasksDict.toast.missingInput, description: tasksDict.toast.provideDescOrFile });
       return;
     }

    setIsSubmitting(true);
    console.log('Submitting Progress for task:', selectedTask.id, { description, files: uploadedFiles.map(f => f.name) });

    // Simulate API call
    // TODO: Implement actual file upload logic here, get URLs/references
    // const uploadedFileEntries = await Promise.all(uploadedFiles.map(file => uploadFile(file)));
    await new Promise(resolve => setTimeout(resolve, 1500));

    let nextStatus = selectedTask.status;
    let nextDivision = selectedTask.assignedDivision;
    let newProgress = selectedTask.progress;
    let nextActionDescription = selectedTask.nextAction;
    const historyEntry: WorkflowHistoryEntry = { division: currentUser.role, action: `Submitted Progress`, timestamp: new Date().toISOString() };
    const newFiles: FileEntry[] = uploadedFiles.map(file => ({
        name: file.name,
        uploadedBy: currentUser.username, // Use username for better tracking
        timestamp: new Date().toISOString(),
        // url: 'simulated_url_after_upload' // Add URL after actual upload
    }));


    // Workflow logic based on current user's role and task status
    // Use currentUser.role for the switch, as they are the one performing the action
    switch (currentUser.role) {
        case 'Owner':
             // Handle owner approvals in handleDecision
            break;

        case 'Admin Proyek':
             // --- Specific logic for Admin Proyek submitting Offer ---
             if (selectedTask.status === 'Pending Offer') {
                nextStatus = 'Pending Approval'; // Move to Owner for approval
                nextDivision = 'Owner'; // Assign to Owner
                newProgress = 20; // Set progress after offer upload
                nextActionDescription = 'Approve Offer Document'; // Owner needs to approve
                historyEntry.action = 'Uploaded Offer Document'; // Specific history action
                console.log(`Admin Proyek submitted offer for task ${selectedTask.id}. Moving to Pending Approval, assigned to Owner.`);
             }
              else if (selectedTask.status === 'Pending Admin Files') {
                nextStatus = 'Pending Architect Files';
                nextDivision = 'Arsitek';
                newProgress = 50;
                nextActionDescription = 'Upload Architect Files';
                historyEntry.action = 'Uploaded Admin Files';
              }
              else if (selectedTask.status === 'Pending Final Check') {
                 nextStatus = 'Pending Scheduling';
                 nextDivision = 'General Admin';
                 newProgress = 90;
                 nextActionDescription = 'Schedule Sidang';
                 historyEntry.action = 'Completed Final Check';
              }
            break;

        case 'General Admin':
            if (selectedTask.status === 'Pending DP Invoice') {
                nextStatus = 'Pending Approval';
                nextDivision = 'Owner';
                newProgress = 30;
                nextActionDescription = 'Approve DP Invoice';
                historyEntry.action = 'Uploaded DP Invoice';
            } else if (selectedTask.status === 'Pending Scheduling') {
                // This case is handled by the schedule button directly
            }
            break;
        case 'Arsitek':
            if (selectedTask.status === 'Pending Architect Files') {
              nextStatus = 'Pending Structure Files';
              nextDivision = 'Struktur';
              newProgress = 70;
              nextActionDescription = 'Upload Structure Files';
              historyEntry.action = 'Uploaded Architect Files';
            }
            break;
        case 'Struktur':
             if (selectedTask.status === 'Pending Structure Files') {
               nextStatus = 'Pending Final Check';
               nextDivision = 'Admin Proyek';
               newProgress = 80;
               nextActionDescription = 'Perform Final Check';
               historyEntry.action = 'Uploaded Structure Files';
             }
             break;
        default:
            historyEntry.action = `Submitted Progress for ${selectedTask.status}`; // Generic action
    }


    // Prepare updated task data
    const updatedTaskData: Task = {
        ...selectedTask,
        status: nextStatus,
        assignedDivision: nextDivision,
        progress: newProgress,
        nextAction: nextActionDescription,
        workflowHistory: [...selectedTask.workflowHistory, historyEntry],
        files: [...selectedTask.files, ...newFiles], // Append new files
      };


     try {
        // --- Actual API Call ---
        await updateTask(updatedTaskData);
        // --- End API Call ---

        // Update local state AFTER successful update
        setAllTasks(prev => prev.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
        if (selectedTask?.id === updatedTaskData.id) {
             setSelectedTask(updatedTaskData); // Update selected task view if it was the one updated
         }

        setDescription('');
        setUploadedFiles([]);
        setIsSubmitting(false);
        // Use a specific toast message if it was the offer submission
        if (currentUser.role === 'Admin Proyek' && selectedTask.status === 'Pending Offer' && nextStatus === 'Pending Approval') {
            toast({ title: tasksDict.toast.offerSubmitted, description: tasksDict.toast.notifiedNextStep.replace('{division}', nextDivision) });
             // Notify Owners only when Offer is submitted by Admin Proyek
             await notifyUsersByRole('Owner', `Task "${selectedTask.title}" is awaiting your approval for the offer document.`, selectedTask.id);
        } else {
            toast({ title: tasksDict.toast.progressSubmitted, description: tasksDict.toast.notifiedNextStep.replace('{division}', nextDivision) });
             // General notification for other steps (if division changed) is handled within updateTask service
        }

      } catch (error) {
         console.error("Error updating task:", error);
         toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to submit progress.' });
         setIsSubmitting(false);
      }

  };

  const handleDecision = (decision: 'continue' | 'cancel') => {
     if (currentUser?.role !== 'Owner' || !selectedTask) { // Check currentUser exists and task selected
       toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied, description: tasksDict.toast.onlyOwnerDecision });
       return;
     }
     setIsSubmitting(true);
     console.log(`Owner decision for task ${selectedTask.id}: ${decision}`);
     // Simulate API call
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => { // Make async
       let nextStatus = selectedTask.status;
       let nextDivision = selectedTask.assignedDivision;
       let newProgress = selectedTask.progress;
       let nextActionDescription = selectedTask.nextAction;
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: '', timestamp: new Date().toISOString() }; // Use non-null assertion


       if (decision === 'cancel') {
         nextStatus = 'Canceled';
         nextDivision = ''; // No one assigned
         newProgress = selectedTask.progress; // Keep progress as is? Or set to 0/100?
         nextActionDescription = '';
          historyEntry.action = 'Canceled Progress';
         toast({ variant: 'destructive', title: tasksDict.toast.progressCanceled });
       } else {
         // Logic for continuing based on the current approval step
         if (selectedTask.status === 'Pending Approval') {
            // Check progress to differentiate between Offer Approval and DP Invoice Approval
            if (selectedTask.progress === 20) { // After Offer Upload (Progress 20)
                 nextStatus = 'Pending DP Invoice'; // Move to DP Invoice stage
                 nextDivision = 'General Admin'; // Assign to GA
                 newProgress = 25; // Progress slightly after approval
                 nextActionDescription = 'Generate DP Invoice';
                  historyEntry.action = 'Approved Offer'; // Specific history action
                 toast({ title: tasksDict.toast.offerApproved, description: tasksDict.toast.offerApprovedDesc });
            } else if (selectedTask.progress === 30) { // After DP Invoice Upload (Progress 30)
                 nextStatus = 'Pending Admin Files'; // Move to Admin Files stage
                 nextDivision = 'Admin Proyek'; // Assign to Admin Proyek
                 newProgress = 40; // Progress slightly after approval
                 nextActionDescription = 'Upload Admin Files';
                  historyEntry.action = 'Approved DP Invoice'; // Specific history action
                 toast({ title: tasksDict.toast.dpApproved, description: tasksDict.toast.dpApprovedDesc });
            }
         } else if (selectedTask.status === 'Scheduled') { // After Sidang outcome
             nextStatus = 'Completed'; // Assuming success for now
             nextDivision = '';
             newProgress = 100;
             nextActionDescription = '';
             historyEntry.action = 'Marked as Completed';
             toast({ title: tasksDict.toast.progressCompleted });
         }
       }

       const updatedTaskData: Task = {
            ...selectedTask,
            status: nextStatus,
            assignedDivision: nextDivision,
            progress: newProgress,
            nextAction: nextActionDescription,
            workflowHistory: [...selectedTask.workflowHistory, historyEntry],
       };

        try {
            await updateTask(updatedTaskData);
             setAllTasks(prev => prev.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
             if (selectedTask?.id === updatedTaskData.id) {
                setSelectedTask(updatedTaskData);
            }
             setIsSubmitting(false);
        } catch (error) {
            console.error("Error updating task after decision:", error);
            toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to process decision.' });
            setIsSubmitting(false);
        }

     });
  };

  const handleScheduleSubmit = () => {
     if (!currentUser || !['Owner', 'General Admin'].includes(currentUser.role) || !selectedTask) { // Check currentUser and selectedTask
       toast({ variant: 'destructive', title: tasksDict.toast.permissionDenied });
       return;
     }
     if (!scheduleDate || !scheduleTime || !scheduleLocation) {
         toast({ variant: 'destructive', title: tasksDict.toast.missingScheduleInfo, description: tasksDict.toast.provideDateTimeLoc });
         return;
     }

     setIsSubmitting(true);
     const sidangDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
     console.log(`Scheduling Sidang for task ${selectedTask.id}:`, { dateTime: sidangDateTime, location: scheduleLocation });

     // TODO: API Call to save schedule to DB
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => { // Make async
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: `Scheduled Sidang for ${sidangDateTime.toISOString()}`, timestamp: new Date().toISOString() }; // Use non-null assertion

        const updatedTaskData: Task = {
             ...selectedTask,
             status: 'Scheduled',
             assignedDivision: 'Owner', // Owner handles outcome after sidang
             nextAction: 'Declare Sidang Outcome (Success/Fail)',
             workflowHistory: [...selectedTask.workflowHistory, historyEntry],
           };

        try {
            await updateTask(updatedTaskData);
            setAllTasks(prev => prev.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
            if (selectedTask?.id === updatedTaskData.id) {
                setSelectedTask(updatedTaskData);
            }

            setScheduleDate('');
            setScheduleTime('');
            setScheduleLocation('');
            setIsSubmitting(false);
            toast({ title: tasksDict.toast.sidangScheduled, description: tasksDict.toast.sidangScheduledDesc });
        } catch (error) {
            console.error("Error updating task after scheduling:", error);
            toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to save schedule.' });
            setIsSubmitting(false);
        }
     });
  };

    const handleAddToCalendar = async () => {
      if (!selectedTask || selectedTask.status !== 'Scheduled') {
        toast({ variant: 'destructive', title: tasksDict.toast.cannotAddCalendarYet, description: tasksDict.toast.mustScheduleFirst });
        return;
      }
        const schedulingEntry = selectedTask.workflowHistory.find(entry => entry.action.startsWith('Scheduled Sidang for '));
        if (!schedulingEntry) {
             toast({ variant: 'destructive', title: tasksDict.toast.errorFindingSchedule, description: tasksDict.couldNotFindSchedule });
             return;
        }

         const isoString = schedulingEntry.action.replace('Scheduled Sidang for ', '');
         const scheduledDateTime = new Date(isoString);

         // Find location from the scheduling history or a relevant file/field if stored differently
         // Placeholder: Assume location is stored in a task field or derived somehow
         const location = scheduleLocation || "Meeting Room 1"; // Use state or fetch if needed

         const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

      const eventDetails = {
          title: `Sidang: ${selectedTask.title}`,
          location: location,
          startTime: scheduledDateTime.toISOString(),
          endTime: endTime.toISOString(),
          description: `Sidang discussion for project: ${selectedTask.title}`,
      };

      try {
        setIsSubmitting(true);
        const eventId = await scheduleEvent(eventDetails);
        toast({ title: tasksDict.toast.addedToCalendar, description: tasksDict.toast.eventId.replace('{id}', eventId) });
      } catch (error) {
        console.error("Error scheduling event:", error);
        toast({ variant: 'destructive', title: tasksDict.toast.calendarError, description: tasksDict.couldNotAddEvent });
      } finally {
        setIsSubmitting(false);
      }
    };

   // Filter tasks based on user role and selected status filters
    const filteredTasks = React.useMemo(() => {
        if (!currentUser || !isClient || isLoadingTasks) return [];

        let roleFilteredTasks = allTasks;
         // Owner, General Admin, Admin Developer see all tasks
         // Admin Proyek sees ALL tasks
         if (currentUser.role === 'Admin Proyek') {
              roleFilteredTasks = allTasks;
         }
         // Other specific roles (Arsitek, Struktur) see tasks where they are assigned or next action applies
         else if (!['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role)) {
             roleFilteredTasks = allTasks.filter(task =>
                 task.assignedDivision === currentUser.role ||
                 (task.nextAction && task.nextAction.toLowerCase().includes(currentUser.role.toLowerCase()))
             );
         }
         // Owner, GA, DevAdmin see all tasks (default behavior if not Admin Proyek or other specific role)


         // Apply status filters if any are selected
         if (statusFilter.length > 0) {
             return roleFilteredTasks.filter(task => statusFilter.includes(task.status));
         }

         return roleFilteredTasks; // Return role-filtered (or all) if no status filter applied
    }, [currentUser, allTasks, isClient, isLoadingTasks, statusFilter]);

    // Toggle status filter
    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status) // Remove if exists
                : [...prev, status] // Add if not exists
        );
    };


  // Define which actions are available based on status and current user role for the SELECTED task
   // Define which actions are available based on status and current user role for the SELECTED task
   const showUploadSection = React.useMemo(() => {
        if (!selectedTask || !currentUser) return false;
        // Check if the user can perform the action based on role and task status
        if (!canPerformSelectedTaskAction) return false;

        // Allow upload if not in a final/pending state (unless it's Pending Offer for Admin Proyek)
        return (
            (currentUser.role === 'Admin Proyek' && selectedTask.status === 'Pending Offer') ||
            !['Pending Approval', 'Pending Scheduling', 'Scheduled', 'Completed', 'Canceled'].includes(selectedTask.status)
        );
   }, [selectedTask, currentUser, canPerformSelectedTaskAction]);

   const showOwnerDecisionSection = selectedTask && selectedTask.status === 'Pending Approval' && currentUser?.role === 'Owner';
   const showSchedulingSection = selectedTask && selectedTask.status === 'Pending Scheduling' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role);
   const showCalendarButton = selectedTask && selectedTask.status === 'Scheduled' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role);
   const showSidangOutcomeSection = selectedTask && selectedTask.status === 'Scheduled' && currentUser?.role === 'Owner';

   // Loading state for the whole page if task data or user data isn't ready
    if (!isClient || !currentUser || isLoadingTasks) {
        return (
            <div className="container mx-auto py-4 space-y-6">
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-7 w-3/5 mb-2" />
                         <Skeleton className="h-4 w-4/5" />
                     </CardHeader>
                     <CardContent>
                         <div className="flex justify-end mb-4">
                            <Skeleton className="h-10 w-32" /> {/* Skeleton for filter button */}
                         </div>
                         <div className="space-y-4">
                             {[...Array(3)].map((_, i) => (
                                <Card key={`task-skel-${i}`} className="opacity-50">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                         <div>
                                             <Skeleton className="h-5 w-3/5 mb-1" />
                                             <Skeleton className="h-3 w-4/5" />
                                         </div>
                                         <Skeleton className="h-5 w-20 rounded-full" />
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-2 w-full mb-1" />
                                        <Skeleton className="h-3 w-1/4" />
                                     </CardContent>
                                </Card>
                            ))}
                         </div>
                     </CardContent>
                 </Card>
                 {/* Placeholder for selected task details */}
                 <Card className="mt-6 opacity-50">
                     <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                     <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                 </Card>
            </div>
        );
    }

  // --- Render Task List View ---
  const renderTaskList = () => {
    // Ensure tasksDict is available before rendering
    if (!tasksDict || !isClient) {
        return (
            <div className="container mx-auto py-4 space-y-6">
                <Card><CardHeader><Skeleton className="h-7 w-3/5 mb-2" /></CardHeader></Card>
            </div>
        ); // Or some other loading state
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">
                {tasksDict.taskListTitle || 'Task List'}
              </CardTitle>
              <CardDescription>
                {tasksDict.taskListDescription || 'View and manage ongoing tasks.'}
              </CardDescription>
            </div>
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ListFilter className="mr-2 h-4 w-4" />
                  {tasksDict.filterButton || 'Filter by Status'}
                  {statusFilter.length > 0 && ` (${statusFilter.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{tasksDict.filterStatusLabel || 'Filter Statuses'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {taskStatuses.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={() => handleStatusFilterChange(status)}
                  >
                    {getTranslatedStatus(status)}
                  </DropdownMenuCheckboxItem>
                ))}
                {/* Option to clear filters */}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter.length === 0}
                  onCheckedChange={() => setStatusFilter([])}
                  className="text-muted-foreground"
                >
                  {tasksDict.filterClear || 'Show All'}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {tasksDict.noTasksFound || 'No tasks match the current filters.'}
              </p>
            ) : (
              filteredTasks.map((taskItem) => (
                <Card
                  key={taskItem.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTask(taskItem)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg">{taskItem.title}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {tasksDict.assignedLabel}: {taskItem.assignedDivision || tasksDict.none} {taskItem.nextAction ? `| ${tasksDict.nextActionLabel}: ${taskItem.nextAction}` : ''}
                      </CardDescription>
                    </div>
                    {getStatusBadge(taskItem.status)}
                  </CardHeader>
                  <CardContent>
                    {taskItem.status !== 'Canceled' && taskItem.status !== 'Completed' && (
                      <>
                        <Progress value={taskItem.progress} className="w-full h-2 mb-1" />
                        <span className="text-xs text-muted-foreground">
                          {dashboardDict?.progress?.replace('{progress}', taskItem.progress.toString()) ?? `${taskItem.progress}%`}
                        </span>
                      </>
                    )}
                    {(taskItem.status === 'Canceled' || taskItem.status === 'Completed') && (
                      <p className={`text-sm font-medium ${taskItem.status === 'Canceled' ? 'text-destructive' : 'text-green-600'}`}>
                        {getTranslatedStatus(taskItem.status)}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground justify-end">
                    <span className="flex items-center gap-1">
                      {tasksDict.viewDetails || 'View Details'} <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // --- Render Selected Task Detail View ---
  const renderSelectedTaskDetail = (task: Task) => {
      // Ensure tasksDict is available
       if (!tasksDict || !isClient) {
           return <Skeleton className="h-64 w-full" />; // Or some loading state
       }

       return (
           <>
               <Button variant="outline" onClick={() => setSelectedTask(null)} className="mb-4">
                   &larr; {tasksDict.backToList || 'Back to List'}
               </Button>
               <Card>
                   <CardHeader>
                     <div className="flex justify-between items-start">
                        <div>
                          {/* TODO: Allow editing title for Owner, GA, PA */}
                           <CardTitle className="text-2xl">{task.title}</CardTitle>
                           <CardDescription>
                               {tasksDict.statusLabel}: {getStatusBadge(task.status)} | {tasksDict.nextActionLabel}: {task.nextAction || tasksDict.none} | {tasksDict.assignedLabel}: {task.assignedDivision || tasksDict.none}
                           </CardDescription>
                         </div>
                           <div className="text-right">
                               <div className="text-sm font-medium">{tasksDict.progressLabel}</div>
                               <Progress value={task.progress} className="w-32 h-2 mt-1" />
                               <span className="text-xs text-muted-foreground">
                                   {dashboardDict?.progress?.replace('{progress}', task.progress.toString()) ?? `${task.progress}%`}
                               </span>
                           </div>
                     </div>
                   </CardHeader>

                   {/* Action Section */}
                   <CardContent>
                     {/* Conditionally render upload section based on role and status */}
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
                             <div className="space-y-2 rounded-md border p-3">
                               <Label>{tasksDict.selectedFilesLabel}</Label>
                               <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                 {uploadedFiles.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between group">
                                        <span className="truncate max-w-xs text-muted-foreground group-hover:text-foreground">
                                          {file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                                        </span>
                                       <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button" // Prevent form submission
                                            onClick={() => removeFile(index)}
                                            disabled={isSubmitting}
                                            className="opacity-50 group-hover:opacity-100"
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                       </Button>
                                    </li>
                                 ))}
                               </ul>
                             </div>
                           )}
                            {/* Disable button logic refined */}
                            <Button
                                onClick={handleProgressSubmit}
                                disabled={
                                    isSubmitting ||
                                    // Specific check for Admin Proyek submitting Offer
                                    (currentUser?.role === 'Admin Proyek' && task.status === 'Pending Offer' && uploadedFiles.length === 0) ||
                                    // General check for other steps (excluding scheduling and Owner/GA override)
                                    (
                                        !['Pending Scheduling', 'Completed', 'Canceled'].includes(task.status) && // Exclude scheduling/final states
                                        !['Owner', 'General Admin'].includes(currentUser!.role) && // Don't enforce for Owner/GA
                                        !(currentUser?.role === 'Admin Proyek' && task.status === 'Pending Offer') && // Already handled above
                                        !description && uploadedFiles.length === 0 // Require desc or file otherwise
                                    )
                                }
                            >
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
                   <Card className="mt-6">
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
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>{tasksDict.workflowHistoryTitle}</CardTitle>
                      <CardDescription>{tasksDict.workflowHistoryDesc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                        {task.workflowHistory.map((entry, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${index === task.workflowHistory.length - 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`}></div>
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
                </>
       );
  }


  return (
    <div className="container mx-auto py-4 space-y-6">
      {selectedTask ? renderSelectedTaskDetail(selectedTask) : renderTaskList()}
    </div>
  );
}

    

