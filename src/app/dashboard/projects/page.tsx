// src/app/dashboard/projects/page.tsx
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
  ArrowLeft, // Import ArrowLeft icon
  Download, // Import Download icon
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
import { getAllProjects, updateProject, type Project, type WorkflowHistoryEntry, type FileEntry } from '@/services/project-service';
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
import { useSearchParams, useRouter } from 'next/navigation'; // Import navigation hooks

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define possible statuses for filtering
const projectStatuses = [
    'Pending Input', 'Pending Offer', 'Pending Approval', 'Pending DP Invoice',
    'Pending Admin Files', 'Pending Architect Files', 'Pending Structure Files',
    'Pending Final Check', 'Pending Scheduling', 'Scheduled', 'In Progress',
    'Completed', 'Canceled'
];

export default function ProjectsPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const searchParams = useSearchParams(); // Hook to read URL search parameters
  const router = useRouter(); // Hook for navigation
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [dict, setDict] = React.useState(() => getDictionary(language)); // Initialize dict directly
  const [projectsDict, setProjectsDict] = React.useState(() => dict.projectsPage);
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage); // For status translation

  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const [description, setDescription] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false); // General submission loading state
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');
  const [scheduleLocation, setScheduleLocation] = React.useState('');
  const [isAddingToCalendar, setIsAddingToCalendar] = React.useState(false); // Specific state for calendar action

  // State for filtering
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]); // Array of statuses to show

  // Effect to select project based on URL parameter
  React.useEffect(() => {
      if (isClient && allProjects.length > 0 && !isLoadingProjects) {
          const projectIdFromUrl = searchParams.get('projectId');
          if (projectIdFromUrl) {
              const projectToSelect = allProjects.find(p => p.id === projectIdFromUrl);
              if (projectToSelect) {
                  setSelectedProject(projectToSelect);
                  // Optional: Clear the URL parameter after selecting
                  // router.replace('/dashboard/projects', { scroll: false });
              } else {
                  console.warn(`Project with ID "${projectIdFromUrl}" from URL not found.`);
                  toast({ variant: 'destructive', title: 'Error', description: 'Project specified in URL not found.' });
                  // Clear the invalid parameter
                  router.replace('/dashboard/projects', { scroll: false });
              }
          }
      }
  }, [searchParams, allProjects, isClient, isLoadingProjects, router, toast]); // Add dependencies


  React.useEffect(() => {
    setIsClient(true);
    // Fetch all projects when component mounts and user is available
    const fetchProjects = async () => {
      if (currentUser) {
        setIsLoadingProjects(true);
        try {
          const fetchedProjects = await getAllProjects();
          setAllProjects(fetchedProjects);
          console.log("Fetched projects:", fetchedProjects.length);
        } catch (error) {
          console.error("Failed to fetch projects:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data.' });
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
      const newDict = getDictionary(language); // Update dictionary when language changes
      setDict(newDict);
      setProjectsDict(newDict.projectsPage);
      setDashboardDict(newDict.dashboardPage);
  }, [language]);


  // Helper function to format dates client-side
  const formatTimestamp = React.useCallback((timestamp: string): string => {
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
  }, [isClient, language]); // Memoize timestamp formatting

   const formatDateOnly = React.useCallback((timestamp: string): string => {
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
   }, [isClient, language]); // Memoize date only formatting


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setUploadedFiles(Array.from(event.target.files));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  // Determine if the current user (from context) can perform the action on the SELECTED project - MEMOIZED
  const canPerformSelectedProjectAction = React.useMemo(() => {
    if (!currentUser || !selectedProject) return false;

     // Owner and GA can generally perform most actions (except submitting for specific divisions unless overridden)
     if (['Owner', 'General Admin'].includes(currentUser.role)) {
       // Check if they are specifically blocked from submitting for another division (e.g., Architect files)
       // For now, assume they can act on most steps, except maybe specific division uploads?
       // If the project is assigned to them, they can definitely act.
       if (currentUser.role === selectedProject.assignedDivision) return true;
       // Allow GA/Owner to schedule/approve even if not directly assigned at that step
       if (selectedProject.status === 'Pending Scheduling' || selectedProject.status === 'Pending Approval') return true;
       // Allow GA/Owner to declare sidang outcome if assigned to Owner
       if (selectedProject.status === 'Scheduled' && selectedProject.assignedDivision === 'Owner') return true;

       // Let's generally allow GA/Owner to submit progress unless it's explicitly assigned to a technical role?
       // This needs refinement based on exact permissions. For now, let's allow them if the step isn't highly specialized.
       if (!['Arsitek', 'Struktur'].includes(selectedProject.assignedDivision)) {
            return true;
        }

     }

    // Directly assigned role can act
    if (currentUser.role === selectedProject.assignedDivision) return true;

    // Specific exception: Admin Proyek can act on 'Pending Offer' even if not assigned (Owner might be technically assigned)
    if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer') return true;


    return false; // Default to false if no condition met
  }, [currentUser, selectedProject]);

  // Helper to get translated status - MEMOIZED
    const getTranslatedStatus = React.useCallback((statusKey: string): string => {
        // Check if dashboardDict and dashboardDict.status are available
        if (!isClient || !dashboardDict || !dashboardDict.status) return statusKey; // Return original key if dict not ready
        const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[key] || statusKey; // Fallback to original key if not found
    }, [isClient, dashboardDict]); // Memoize status translation

      // Helper function to get status icon and color using translated status (similar to dashboard) - MEMOIZED
  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !status) return <Skeleton className="h-5 w-20" />; // Skeleton during hydration mismatch check or if status is missing

    // Ensure dashboardDict and dashboardDict.status are available
    if (!dashboardDict || !dashboardDict.status) {
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
            className = 'bg-green-500 hover:bg-green-600 text-white'; // Added text-white
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
  }, [isClient, dashboardDict]); // Memoize badge generation


  const handleProgressSubmit = async () => {
    if (!currentUser || !selectedProject || !canPerformSelectedProjectAction) {
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.notYourTurn });
      return;
    }

    // Admins Proyek MUST upload at least one offer file when in 'Pending Offer' status.
    if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && uploadedFiles.length === 0) {
        toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideOfferFile });
        return;
    }

    // General validation: Require description or files for most steps (except scheduling or Owner/GA override)
    if (!description && uploadedFiles.length === 0 && selectedProject.status !== 'Pending Scheduling' && !['Owner', 'General Admin'].includes(currentUser.role) && !(currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer')) {
       toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideDescOrFile });
       return;
     }

    setIsSubmitting(true);
    console.log('Submitting Progress for project:', selectedProject.id, { description, files: uploadedFiles.map(f => f.name) });

    // Simulate API call
    // TODO: Implement actual file upload logic here, get URLs/references
    // const uploadedFileEntries = await Promise.all(uploadedFiles.map(file => uploadFile(file)));
    await new Promise(resolve => setTimeout(resolve, 1500));

    let nextStatus = selectedProject.status;
    let nextDivision = selectedProject.assignedDivision;
    let newProgress = selectedProject.progress;
    let nextActionDescription = selectedProject.nextAction;
    const historyEntry: WorkflowHistoryEntry = { division: currentUser.role, action: `Submitted Progress`, timestamp: new Date().toISOString() };
    const newFiles: FileEntry[] = uploadedFiles.map(file => ({
        name: file.name,
        uploadedBy: currentUser.username, // Use username for better tracking
        timestamp: new Date().toISOString(),
        // url: 'simulated_url_after_upload' // Add URL after actual upload
    }));


    // Workflow logic based on current user's role and project status
    // Use currentUser.role for the switch, as they are the one performing the action
    switch (currentUser.role) {
        case 'Owner':
             // Handle owner approvals in handleDecision
            break;

        case 'Admin Proyek':
             // --- Specific logic for Admin Proyek submitting Offer ---
             if (selectedProject.status === 'Pending Offer') {
                nextStatus = 'Pending Approval'; // Move to Owner for approval
                nextDivision = 'Owner'; // Assign to Owner
                newProgress = 20; // Set progress after offer upload
                nextActionDescription = 'Approve Offer Document'; // Owner needs to approve
                historyEntry.action = 'Uploaded Offer Document'; // Specific history action
                console.log(`Admin Proyek submitted offer for project ${selectedProject.id}. Moving to Pending Approval, assigned to Owner.`);
             }
              else if (selectedProject.status === 'Pending Admin Files') {
                nextStatus = 'Pending Architect Files';
                nextDivision = 'Arsitek';
                newProgress = 50;
                nextActionDescription = 'Upload Architect Files';
                historyEntry.action = 'Uploaded Admin Files';
              }
              else if (selectedProject.status === 'Pending Final Check') {
                 nextStatus = 'Pending Scheduling';
                 nextDivision = 'General Admin';
                 newProgress = 90;
                 nextActionDescription = 'Schedule Sidang';
                 historyEntry.action = 'Completed Final Check';
              }
            break;

        case 'General Admin':
            if (selectedProject.status === 'Pending DP Invoice') {
                nextStatus = 'Pending Approval';
                nextDivision = 'Owner';
                newProgress = 30;
                nextActionDescription = 'Approve DP Invoice';
                historyEntry.action = 'Uploaded DP Invoice';
            } else if (selectedProject.status === 'Pending Scheduling') {
                // This case is handled by the schedule button directly
            }
            break;
        case 'Arsitek':
            if (selectedProject.status === 'Pending Architect Files') {
              nextStatus = 'Pending Structure Files';
              nextDivision = 'Struktur';
              newProgress = 70;
              nextActionDescription = 'Upload Structure Files';
              historyEntry.action = 'Uploaded Architect Files';
            }
            break;
        case 'Struktur':
             if (selectedProject.status === 'Pending Structure Files') {
               nextStatus = 'Pending Final Check';
               nextDivision = 'Admin Proyek';
               newProgress = 80;
               nextActionDescription = 'Perform Final Check';
               historyEntry.action = 'Uploaded Structure Files';
             }
             break;
        default:
            historyEntry.action = `Submitted Progress for ${selectedProject.status}`; // Generic action
    }


    // Prepare updated project data
    const updatedProjectData: Project = {
        ...selectedProject,
        status: nextStatus,
        assignedDivision: nextDivision,
        progress: newProgress,
        nextAction: nextActionDescription,
        workflowHistory: [...selectedProject.workflowHistory, historyEntry],
        files: [...selectedProject.files, ...newFiles], // Append new files
      };


     try {
        // --- Actual API Call ---
        await updateProject(updatedProjectData);
        // --- End API Call ---

        // Update local state AFTER successful update
        setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
        if (selectedProject?.id === updatedProjectData.id) {
             setSelectedProject(updatedProjectData);
         }

        setDescription('');
        setUploadedFiles([]);
        setIsSubmitting(false);
        // Use a specific toast message if it was the offer submission
        if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && nextStatus === 'Pending Approval') {
            toast({ title: projectsDict.toast.offerSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', nextDivision) });
        } else {
            toast({ title: projectsDict.toast.progressSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', nextDivision) });
             // General notification for other steps (if division changed) is handled within updateProject service
        }

      } catch (error) {
         console.error("Error updating project:", error);
         toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to submit progress.' });
         setIsSubmitting(false);
      }

  };

  const handleDecision = (decision: 'continue' | 'cancel') => {
     if (currentUser?.role !== 'Owner' || !selectedProject) { // Check currentUser exists and project selected
       toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.onlyOwnerDecision });
       return;
     }
     setIsSubmitting(true);
     console.log(`Owner decision for project ${selectedProject.id}: ${decision}`);
     // Simulate API call
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => { // Make async
       let nextStatus = selectedProject.status;
       let nextDivision = selectedProject.assignedDivision;
       let newProgress = selectedProject.progress;
       let nextActionDescription = selectedProject.nextAction;
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: '', timestamp: new Date().toISOString() }; // Use non-null assertion


       if (decision === 'cancel') {
         nextStatus = 'Canceled';
         nextDivision = ''; // No one assigned
         newProgress = selectedProject.progress; // Keep progress as is? Or set to 0/100?
         nextActionDescription = '';
          historyEntry.action = 'Canceled Progress';
         toast({ variant: 'destructive', title: projectsDict.toast.progressCanceled });
       } else {
         // Logic for continuing based on the current approval step
         if (selectedProject.status === 'Pending Approval') {
            // Check progress to differentiate between Offer Approval and DP Invoice Approval
            if (selectedProject.progress === 20) { // After Offer Upload (Progress 20)
                 nextStatus = 'Pending DP Invoice'; // Move to DP Invoice stage
                 nextDivision = 'General Admin'; // Assign to GA
                 newProgress = 25; // Progress slightly after approval
                 nextActionDescription = 'Generate DP Invoice';
                  historyEntry.action = 'Approved Offer'; // Specific history action
                 toast({ title: projectsDict.toast.offerApproved, description: projectsDict.toast.offerApprovedDesc });
            } else if (selectedProject.progress === 30) { // After DP Invoice Upload (Progress 30)
                 nextStatus = 'Pending Admin Files'; // Move to Admin Files stage
                 nextDivision = 'Admin Proyek'; // Assign to Admin Proyek
                 newProgress = 40; // Progress slightly after approval
                 nextActionDescription = 'Upload Admin Files';
                  historyEntry.action = 'Approved DP Invoice'; // Specific history action
                 toast({ title: projectsDict.toast.dpApproved, description: projectsDict.toast.dpApprovedDesc });
            }
         } else if (selectedProject.status === 'Scheduled') { // After Sidang outcome
             nextStatus = 'Completed'; // Assuming success for now
             nextDivision = '';
             newProgress = 100;
             nextActionDescription = '';
             historyEntry.action = 'Marked as Completed';
             toast({ title: projectsDict.toast.progressCompleted });
         }
       }

       const updatedProjectData: Project = {
            ...selectedProject,
            status: nextStatus,
            assignedDivision: nextDivision,
            progress: newProgress,
            nextAction: nextActionDescription,
            workflowHistory: [...selectedProject.workflowHistory, historyEntry],
       };

        try {
            await updateProject(updatedProjectData);
             setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
             if (selectedProject?.id === updatedProjectData.id) {
                setSelectedProject(updatedProjectData);
            }
             setIsSubmitting(false);
        } catch (error) {
            console.error("Error updating project after decision:", error);
            toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to process decision.' });
            setIsSubmitting(false);
        }

     });
  };

  const handleScheduleSubmit = () => {
     if (!currentUser || !['Owner', 'General Admin'].includes(currentUser.role) || !selectedProject) { // Check currentUser and selectedProject
       toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied });
       return;
     }
     if (!scheduleDate || !scheduleTime || !scheduleLocation) {
         toast({ variant: 'destructive', title: projectsDict.toast.missingScheduleInfo, description: projectsDict.toast.provideDateTimeLoc });
         return;
     }

     setIsSubmitting(true);
     const sidangDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
     console.log(`Scheduling Sidang for project ${selectedProject.id}:`, { dateTime: sidangDateTime, location: scheduleLocation });

     // TODO: API Call to save schedule to DB (already part of updateProject)
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => { // Make async
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: `Scheduled Sidang for ${sidangDateTime.toISOString()}`, timestamp: new Date().toISOString() }; // Use non-null assertion

        const updatedProjectData: Project = {
             ...selectedProject,
             status: 'Scheduled',
             assignedDivision: 'Owner', // Owner handles outcome after sidang
             nextAction: 'Declare Sidang Outcome (Success/Fail)',
             workflowHistory: [...selectedProject.workflowHistory, historyEntry],
           };

        try {
            await updateProject(updatedProjectData);
            setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
            if (selectedProject?.id === updatedProjectData.id) {
                setSelectedProject(updatedProjectData);
            }

            setScheduleDate('');
            setScheduleTime('');
            setScheduleLocation('');
            setIsSubmitting(false);
            toast({ title: projectsDict.toast.sidangScheduled, description: projectsDict.toast.sidangScheduledDesc });
            // Call Google Calendar Service AFTER successfully updating the project
            handleAddToCalendar(sidangDateTime, scheduleLocation); // Pass date and location

        } catch (error) {
            console.error("Error updating project after scheduling:", error);
            toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to save schedule.' });
            setIsSubmitting(false);
        }
     });
  };

    const handleAddToCalendar = async (scheduledDateTime: Date, location: string) => {
      if (!selectedProject || selectedProject.status !== 'Scheduled' || !scheduledDateTime) {
        toast({ variant: 'destructive', title: projectsDict.toast.cannotAddCalendarYet, description: projectsDict.toast.mustScheduleFirst });
        return;
      }
        // Scheduling entry check can be removed if date is passed directly

        // const schedulingEntry = selectedProject.workflowHistory.find(entry => entry.action.startsWith('Scheduled Sidang for '));
        // if (!schedulingEntry) {
        //      toast({ variant: 'destructive', title: projectsDict.toast.errorFindingSchedule, description: projectsDict.couldNotFindSchedule });
        //      return;
        // }
        // const isoString = schedulingEntry.action.replace('Scheduled Sidang for ', '');
        // const scheduledDateTime = new Date(isoString);

        // Location is now passed as an argument
        const eventLocation = location || "Meeting Room 1"; // Use passed location or default

        const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

      const eventDetails = {
          title: `Sidang: ${selectedProject.title}`,
          location: eventLocation,
          startTime: scheduledDateTime.toISOString(),
          endTime: endTime.toISOString(),
          description: `Sidang discussion for project: ${selectedProject.title}`,
      };

      try {
        setIsAddingToCalendar(true); // Use separate loading state
        const eventId = await scheduleEvent(eventDetails); // Call the service
        toast({ title: projectsDict.toast.addedToCalendar, description: projectsDict.toast.eventId.replace('{id}', eventId) });
      } catch (error) {
        console.error("Error scheduling event:", error);
        toast({ variant: 'destructive', title: projectsDict.toast.calendarError, description: projectsDict.couldNotAddEvent });
      } finally {
        setIsAddingToCalendar(false); // Stop calendar-specific loading
      }
    };

   // Filter projects based on user role and selected status filters - MEMOIZED
    const filteredProjects = React.useMemo(() => {
        if (!currentUser || !isClient || isLoadingProjects) return [];

        let roleFilteredProjects = allProjects;
         // Owner, General Admin, Admin Developer see all projects
         // Admin Proyek sees ALL projects
         if (currentUser.role === 'Admin Proyek') {
              roleFilteredProjects = allProjects;
         }
         // Other specific roles (Arsitek, Struktur) see projects where they are assigned or next action applies
         else if (!['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role)) {
             roleFilteredProjects = allProjects.filter(project =>
                 project.assignedDivision === currentUser.role ||
                 (project.nextAction && project.nextAction.toLowerCase().includes(currentUser.role.toLowerCase()))
             );
         }
         // Owner, GA, DevAdmin see all projects (default behavior if not Admin Proyek or other specific role)


         // Apply status filters if any are selected
         if (statusFilter.length > 0) {
             return roleFilteredProjects.filter(project => statusFilter.includes(project.status));
         }

         return roleFilteredProjects; // Return role-filtered (or all) if no status filter applied
    }, [currentUser, allProjects, isClient, isLoadingProjects, statusFilter]);

    // Toggle status filter
    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status) // Remove if exists
                : [...prev, status] // Add if not exists
        );
    };


  // Define which actions are available based on status and current user role for the SELECTED project - MEMOIZED
   const showUploadSection = React.useMemo(() => {
        if (!selectedProject || !currentUser) return false;
        // Check if the user can perform the action based on role and project status
        if (!canPerformSelectedProjectAction) return false;

        // Allow upload if not in a final/pending state (unless it's Pending Offer for Admin Proyek)
        return (
            (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer') || // Allow Admin Proyek to upload offer
            (
                selectedProject.assignedDivision === currentUser.role && // Allow user to act if assigned
                !['Pending Approval', 'Pending Scheduling', 'Scheduled', 'Completed', 'Canceled'] // AND not in these final/waiting states
                 .includes(selectedProject.status)
            ) ||
             // Allow Owner/GA to submit progress in certain non-technical stages if assigned
             (['Owner', 'General Admin'].includes(currentUser.role) &&
                selectedProject.assignedDivision === currentUser.role &&
                !['Pending Architect Files', 'Pending Structure Files'].includes(selectedProject.status)) // Example: Don't let them upload technical files directly

        );
   }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showOwnerDecisionSection = React.useMemo(() => selectedProject && selectedProject.status === 'Pending Approval' && currentUser?.role === 'Owner', [selectedProject, currentUser]);
   const showSchedulingSection = React.useMemo(() => selectedProject && selectedProject.status === 'Pending Scheduling' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [selectedProject, currentUser]);
   const showCalendarButton = React.useMemo(() => selectedProject && selectedProject.status === 'Scheduled' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [selectedProject, currentUser]);
   const showSidangOutcomeSection = React.useMemo(() => selectedProject && selectedProject.status === 'Scheduled' && currentUser?.role === 'Owner', [selectedProject, currentUser]);
    const canDownloadFiles = React.useMemo(() => currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [currentUser]);


   // Simulated file download function
   const handleDownloadFile = (file: FileEntry) => {
        console.log(`Simulating download for file: ${file.name}`);
        // In a real app, this would fetch the file from storage (e.g., using file.url)
        // and trigger a download prompt.
        const fileContent = `This is a simulated download for ${file.name}. Uploaded by ${file.uploadedBy} on ${new Date(file.timestamp).toLocaleDateString()}.`;
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name; // Use the original file name
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: projectsDict.toast.downloadStarted, description: `Downloading ${file.name}...` });
    };


   // Loading state for the whole page if project data or user data isn't ready
    if (!isClient || !currentUser || isLoadingProjects) {
        return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
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
                                <Card key={`project-skel-${i}`} className="opacity-50">
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
                 {/* Placeholder for selected project details */}
                 <Card className="mt-6 opacity-50">
                     <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                     <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                 </Card>
            </div>
        );
    }

  // --- Render Project List View ---
  const renderProjectList = () => {
    // Ensure projectsDict is available before rendering
    if (!projectsDict || !isClient) {
        return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
                <Card><CardHeader><Skeleton className="h-7 w-3/5 mb-2" /></CardHeader></Card>
            </div>
        ); // Or some other loading state
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"> {/* Flex column on mobile */}
            <div>
              <CardTitle className="text-xl md:text-2xl"> {/* Adjusted font size */}
                {projectsDict.projectListTitle || 'Project List'}
              </CardTitle>
              <CardDescription>
                {projectsDict.projectListDescription || 'View and manage ongoing projects.'}
              </CardDescription>
            </div>
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="w-full sm:w-auto"> {/* Full width on mobile */}
                  <ListFilter className="mr-2 h-4 w-4" />
                   <span className="truncate">{projectsDict.filterButton || 'Filter by Status'}</span> {/* Allow text truncation */}
                  {statusFilter.length > 0 && ` (${statusFilter.length})`}
                </Button>
              </DropdownMenuTrigger>
               <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{projectsDict.filterStatusLabel || 'Filter Statuses'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projectStatuses.map((status) => (
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
                  {projectsDict.filterClear || 'Show All'}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {projectsDict.noProjectsFound || 'No projects match the current filters.'}
              </p>
            ) : (
              filteredProjects.map((projectItem) => (
                <Card
                  key={projectItem.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedProject(projectItem)}
                >
                  <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6"> {/* Adjusted padding */}
                    <div className="flex-1 min-w-0"> {/* Allow title to take space and wrap */}
                      <CardTitle className="text-base sm:text-lg">{projectItem.title}</CardTitle> {/* Responsive font size */}
                      <CardDescription className="text-xs text-muted-foreground mt-1 truncate"> {/* Truncate description */}
                        {projectsDict.assignedLabel}: {getTranslatedStatus(projectItem.assignedDivision) || projectsDict.none} {projectItem.nextAction ? `| ${projectsDict.nextActionLabel}: ${projectItem.nextAction}` : ''}
                      </CardDescription>
                    </div>
                     <div className="flex-shrink-0 mt-2 sm:mt-0"> {/* Prevent badge shrinking */}
                        {getStatusBadge(projectItem.status)}
                     </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                     {projectItem.status !== 'Canceled' && projectItem.status !== 'Completed' && (
                       <div className="flex items-center gap-2">
                          <Progress value={projectItem.progress} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {projectItem.progress}%
                          </span>
                       </div>
                     )}
                    {(projectItem.status === 'Canceled' || projectItem.status === 'Completed') && (
                      <p className={`text-sm font-medium ${projectItem.status === 'Canceled' ? 'text-destructive' : 'text-green-600'}`}>
                        {getTranslatedStatus(projectItem.status)}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground justify-end p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                    <span className="flex items-center gap-1">
                      {projectsDict.viewDetails || 'View Details'} <ArrowRight className="h-3 w-3" />
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

  // --- Render Selected Project Detail View ---
  const renderSelectedProjectDetail = (project: Project) => {
      // Ensure projectsDict is available
       if (!projectsDict || !isClient) {
           return <Skeleton className="h-64 w-full" />; // Or some loading state
       }

       return (
           <>
               <Button variant="outline" onClick={() => setSelectedProject(null)} className="mb-4 w-full sm:w-auto"> {/* Full width on mobile */}
                   <ArrowLeft className="mr-2 h-4 w-4" /> {/* Use ArrowLeft icon */}
                   {projectsDict.backToList || 'Back to List'}
               </Button>
               <Card>
                   <CardHeader className="p-4 sm:p-6"> {/* Adjusted padding */}
                     <div className="flex flex-col md:flex-row justify-between items-start gap-4"> {/* Stack on mobile */}
                        <div className="flex-1 min-w-0"> {/* Allow title to grow and wrap */}
                          {/* TODO: Allow editing title for Owner, GA, PA */}
                           <CardTitle className="text-xl md:text-2xl">{project.title}</CardTitle> {/* Responsive title */}
                           <CardDescription className="mt-1 text-xs sm:text-sm"> {/* Add margin, adjust size */}
                               {projectsDict.statusLabel}: {getStatusBadge(project.status)} | {projectsDict.nextActionLabel}: {project.nextAction || projectsDict.none} | {projectsDict.assignedLabel}: {getTranslatedStatus(project.assignedDivision) || projectsDict.none}
                           </CardDescription>
                         </div>
                           <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0"> {/* Align right on medium+ */}
                               <div className="text-sm font-medium">{projectsDict.progressLabel}</div>
                               <div className="flex items-center gap-2 mt-1">
                                    <Progress value={project.progress} className="w-full md:w-32 h-2" /> {/* Full width on mobile */}
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {project.progress}%
                                    </span>
                                </div>
                           </div>
                     </div>
                   </CardHeader>

                   {/* Action Section */}
                   <CardContent className="p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                     {/* Conditionally render upload section based on role and status */}
                      {showUploadSection && (
                         <div className="space-y-4 border-t pt-4 mt-4"> {/* Added margin top */}
                           <h3 className="text-lg font-semibold">{projectsDict.uploadProgressTitle.replace('{role}', currentUser!.role)}</h3> {/* Non-null assertion */}
                           <div className="grid w-full items-center gap-1.5">
                             <Label htmlFor="description">{projectsDict.descriptionLabel}</Label>
                             <Textarea
                               id="description"
                               placeholder={projectsDict.descriptionPlaceholder.replace('{division}', project.assignedDivision)}
                               value={description}
                               onChange={(e) => setDescription(e.target.value)}
                               disabled={isSubmitting}
                             />
                           </div>
                           <div className="grid w-full items-center gap-1.5">
                             <Label htmlFor="picture">{projectsDict.attachFilesLabel}</Label>
                             <Input id="picture" type="file" multiple onChange={handleFileChange} disabled={isSubmitting} />
                           </div>
                           {uploadedFiles.length > 0 && (
                             <div className="space-y-2 rounded-md border p-3">
                               <Label>{projectsDict.selectedFilesLabel}</Label>
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
                                    (currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer' && uploadedFiles.length === 0) ||
                                    // General check for other steps (excluding scheduling and Owner/GA override)
                                    (
                                        !['Pending Scheduling', 'Completed', 'Canceled'].includes(project.status) && // Exclude scheduling/final states
                                        !['Owner', 'General Admin'].includes(currentUser!.role) && // Don't enforce for Owner/GA
                                        !(currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer') && // Already handled above
                                        !description && uploadedFiles.length === 0 // Require desc or file otherwise
                                    )
                                }
                                className="w-full sm:w-auto" // Full width on mobile
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitting ? projectsDict.submittingButton : projectsDict.submitButton}
                            </Button>
                         </div>
                       )}


                      {showOwnerDecisionSection && (
                        <div className="space-y-4 border-t pt-4 mt-4"> {/* Added margin top */}
                          <h3 className="text-lg font-semibold">{projectsDict.ownerActionTitle}</h3>
                          <p className="text-sm text-muted-foreground">{projectsDict.ownerActionDesc}</p>
                           <div className="flex flex-col sm:flex-row gap-2 sm:gap-4"> {/* Stack on mobile */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" disabled={isSubmitting} className="w-full sm:w-auto"> {/* Full width on mobile */}
                                    <XCircle className="mr-2 h-4 w-4" /> {projectsDict.cancelProgressButton}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{projectsDict.cancelDialogTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                     {projectsDict.cancelDialogDesc}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isSubmitting}>{projectsDict.cancelDialogCancel}</AlertDialogCancel>
                                    <AlertDialogAction
                                       className="bg-destructive hover:bg-destructive/90"
                                       onClick={() => handleDecision('cancel')}
                                       disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {projectsDict.cancelDialogConfirm}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="accent-teal w-full sm:w-auto"> {/* Full width on mobile */}
                                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                 {projectsDict.continueProgressButton}
                              </Button>
                            </div>
                        </div>
                      )}

                       {showSchedulingSection && (
                            <div className="space-y-4 border-t pt-4 mt-4"> {/* Added margin top */}
                              <h3 className="text-lg font-semibold">{projectsDict.scheduleSidangTitle.replace('{role}', currentUser!.role)}</h3> {/* Non-null assertion */}
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="space-y-1.5">
                                    <Label htmlFor="scheduleDate">{projectsDict.dateLabel}</Label>
                                    <Input id="scheduleDate" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={isSubmitting} />
                                 </div>
                                  <div className="space-y-1.5">
                                     <Label htmlFor="scheduleTime">{projectsDict.timeLabel}</Label>
                                     <Input id="scheduleTime" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} disabled={isSubmitting} />
                                  </div>
                                  <div className="space-y-1.5">
                                     <Label htmlFor="scheduleLocation">{projectsDict.locationLabel}</Label>
                                     <Input id="scheduleLocation" placeholder={projectsDict.locationPlaceholder} value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} disabled={isSubmitting} />
                                  </div>
                               </div>
                               <Button onClick={handleScheduleSubmit} disabled={isSubmitting || !scheduleDate || !scheduleTime || !scheduleLocation} className="w-full sm:w-auto"> {/* Full width on mobile */}
                                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                                {isSubmitting ? projectsDict.schedulingButton : projectsDict.confirmScheduleButton}
                              </Button>
                            </div>
                          )}

                        {/* Add to Calendar button only shown after scheduling */}
                        {showCalendarButton && (
                           <div className="border-t pt-4 mt-4"> {/* Added margin top */}
                               <Button
                                   onClick={() => {
                                        // Find the scheduled date/time from history or state
                                        const schedulingEntry = project.workflowHistory.find(entry => entry.action.startsWith('Scheduled Sidang for '));
                                        if (schedulingEntry) {
                                            const isoString = schedulingEntry.action.replace('Scheduled Sidang for ', '');
                                            const scheduledDateTime = new Date(isoString);
                                            // Need location. If not stored directly, might need to extract from history/files or assume default
                                            const location = "Meeting Room 1"; // Placeholder
                                            handleAddToCalendar(scheduledDateTime, location);
                                        } else {
                                             toast({ variant: 'destructive', title: projectsDict.toast.errorFindingSchedule, description: projectsDict.couldNotFindSchedule });
                                        }
                                    }}
                                    disabled={isAddingToCalendar} // Use separate loading state
                                    variant="outline"
                                    className="w-full sm:w-auto" // Full width on mobile
                                >
                                   {isAddingToCalendar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                                      // Using SVG for Google Calendar icon as lucide doesn't have it directly
                                      <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.5-11.5L11 14.01l-2.5-2.51L7 13l4 4 6.5-6.5L16.5 8.5z"></path></svg>
                                   }
                                  {isAddingToCalendar ? projectsDict.addingCalendarButton : projectsDict.addCalendarButton}
                               </Button>
                           </div>
                        )}


                      {showSidangOutcomeSection && (
                           <div className="space-y-4 border-t pt-4 mt-4"> {/* Added margin top */}
                             <h3 className="text-lg font-semibold">{projectsDict.sidangOutcomeTitle}</h3>
                              <p className="text-sm text-muted-foreground">{projectsDict.sidangOutcomeDesc}</p>
                               <div className="flex flex-col sm:flex-row gap-2 sm:gap-4"> {/* Stack on mobile */}
                                 {/* For simplicity, using the same 'continue' logic for success */}
                                 <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"> {/* Full width on mobile */}
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    {projectsDict.markSuccessButton}
                                 </Button>
                                   <Button variant="destructive" onClick={() => { /* Implement fail logic */ toast({title: projectsDict.toast.failNotImplemented})}} disabled={isSubmitting} className="w-full sm:w-auto"> {/* Full width on mobile */}
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    {projectsDict.markFailButton}
                                  </Button>
                              </div>
                           </div>
                        )}


                      {project.status === 'Completed' && (
                         <div className="border-t pt-4 mt-4 text-center"> {/* Added margin top */}
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                            <p className="font-semibold text-lg text-green-600">{projectsDict.completedMessage}</p>
                         </div>
                      )}
                       {project.status === 'Canceled' && (
                          <div className="border-t pt-4 mt-4 text-center"> {/* Added margin top */}
                             <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                             <p className="font-semibold text-lg text-destructive">{projectsDict.canceledMessage}</p>
                          </div>
                       )}

                   </CardContent>
                 </Card>

                  {/* File List Card */}
                   <Card className="mt-6">
                       <CardHeader className="p-4 sm:p-6"> {/* Adjusted padding */}
                         <CardTitle>{projectsDict.uploadedFilesTitle}</CardTitle>
                         <CardDescription>{projectsDict.uploadedFilesDesc}</CardDescription>
                       </CardHeader>
                       <CardContent className="p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                         {project.files.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{projectsDict.noFiles}</p>
                         ) : (
                           <ul className="space-y-2">
                              {project.files.map((file, index) => (
                               <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-md hover:bg-secondary/50 gap-2 sm:gap-4"> {/* Stack on mobile, add gap */}
                                  <div className="flex items-center gap-2 flex-grow min-w-0"> {/* Allow file name to grow */}
                                      <FileText className="h-5 w-5 text-primary flex-shrink-0" /> {/* Ensure icon doesn't shrink */}
                                      <span className="text-sm font-medium break-all">{file.name}</span> {/* Allow file name break */}
                                  </div>
                                  <div className="flex flex-shrink-0 items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0"> {/* Flex container for date and button */}
                                       <span className="text-xs text-muted-foreground text-left sm:text-right flex-grow"> {/* Allow date to take space */}
                                          {projectsDict.uploadedByOn.replace('{user}', file.uploadedBy).replace('{date}', formatDateOnly(file.timestamp))}
                                       </span>
                                       {canDownloadFiles && (
                                           <Button
                                               variant="ghost"
                                               size="icon"
                                               onClick={() => handleDownloadFile(file)}
                                               title={projectsDict.downloadFileTooltip} // Add tooltip
                                               className="h-7 w-7 flex-shrink-0" // Smaller icon button
                                            >
                                               <Download className="h-4 w-4 text-primary" />
                                           </Button>
                                       )}
                                  </div>
                               </li>
                              ))}
                           </ul>
                         )}
                       </CardContent>
                   </Card>


                  {/* Workflow History Card */}
                  <Card className="mt-6">
                    <CardHeader className="p-4 sm:p-6"> {/* Adjusted padding */}
                      <CardTitle>{projectsDict.workflowHistoryTitle}</CardTitle>
                      <CardDescription>{projectsDict.workflowHistoryDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0"> {/* Adjusted padding */}
                        <ul className="space-y-3">
                        {project.workflowHistory.map((entry, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${index === project.workflowHistory.length - 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`}></div>
                                <div>
                                    <p className="text-sm font-medium">
                                        {projectsDict.historyActionBy.replace('{action}', entry.action).replace('{division}', getTranslatedStatus(entry.division))}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p> {/* Use memoized helper */}
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
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
      {selectedProject ? renderSelectedProjectDetail(selectedProject) : renderProjectList()}
    </div>
  );
}
