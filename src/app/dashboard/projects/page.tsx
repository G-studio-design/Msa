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
  ArrowRight,
  Clock,
  ArrowLeft,
  Download,
  FolderOpen,
  RefreshCw, 
  Search,
} from 'lucide-react';
import Link from 'next/link';
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
import { scheduleEvent } from '@/services/google-calendar';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, updateProject, reviseProject, getProjectById as fetchProjectById, type Project, type WorkflowHistoryEntry, type FileEntry } from '@/services/project-service'; // Renamed getProjectById to avoid conflict
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

const defaultDict = getDictionary('en');

const projectStatuses = [
    'Pending Input', 'Pending Offer', 'Pending Approval', 'Pending DP Invoice',
    'Pending Admin Files', 'Pending Architect Files', 'Pending Structure Files',
    'Pending Final Check', 'Pending Scheduling', 'Scheduled', 'In Progress',
    'Completed', 'Canceled'
];

const MAX_FILES_UPLOAD = 10; // Konstanta untuk batas maksimal file

export default function ProjectsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(() => getDictionary(language));
  const [projectsDict, setProjectsDict] = React.useState(() => dict.projectsPage);
  const [dashboardDict, setDashboardDict] = React.useState(() => dict.dashboardPage);

  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const [description, setDescription] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');
  const [scheduleLocation, setScheduleLocation] = React.useState('');
  const [isAddingToCalendar, setIsAddingToCalendar] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [revisionNote, setRevisionNote] = React.useState(''); 
  const [isRevising, setIsRevising] = React.useState(false); 

  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [displayedProjects, setDisplayedProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
      if (isClient && allProjects.length > 0 && !isLoadingProjects) {
          const projectIdFromUrl = searchParams.get('projectId');
          if (projectIdFromUrl) {
              const projectToSelect = allProjects.find(p => p.id === projectIdFromUrl);
              if (projectToSelect) {
                  setSelectedProject(projectToSelect);
              } else {
                  console.warn(`Project with ID "${projectIdFromUrl}" from URL not found.`);
                  toast({ variant: 'destructive', title: projectsDict.toast.error, description: projectsDict.toast.projectNotFound });
                  router.replace('/dashboard/projects', { scroll: false });
              }
          }
      }
  }, [searchParams, allProjects, isClient, isLoadingProjects, router, toast, projectsDict]);


  React.useEffect(() => {
    setIsClient(true);
    const fetchProjects = async () => {
      if (currentUser) {
        setIsLoadingProjects(true);
        try {
          const fetchedProjects = await getAllProjects();
          setAllProjects(fetchedProjects);
        } catch (error) {
          console.error("Failed to fetch projects:", error);
          toast({ variant: 'destructive', title: projectsDict.toast.error, description: projectsDict.toast.couldNotLoadProjects });
        } finally {
          setIsLoadingProjects(false);
        }
      } else {
          setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [currentUser, toast, projectsDict]);

  React.useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict);
      setProjectsDict(newDict.projectsPage);
      setDashboardDict(newDict.dashboardPage);
  }, [language]);


  const formatTimestamp = React.useCallback((timestamp: string): string => {
    if (!isClient) return '...';
    const locale = language === 'id' ? 'id-ID' : 'en-US';
    try {
      return new Date(timestamp).toLocaleString(locale, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return projectsDict.invalidDate || "Invalid Date";
    }
  }, [isClient, language, projectsDict]);

   const formatDateOnly = React.useCallback((timestamp: string | undefined | null): string => {
      if (!isClient || !timestamp) return projectsDict.notApplicable || "N/A";
      const locale = language === 'id' ? 'id-ID' : 'en-US';
      try {
            return new Date(timestamp).toLocaleDateString(locale, {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch (e) {
            console.error("Error formatting date:", timestamp, e);
            return projectsDict.invalidDate || "Invalid Date";
        }
   }, [isClient, language, projectsDict]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (filesArray.length + uploadedFiles.length > MAX_FILES_UPLOAD) {
        toast({
          variant: 'destructive',
          title: projectsDict.toast.error,
          description: projectsDict.toast.maxFilesExceeded.replace('{max}', MAX_FILES_UPLOAD.toString()),
        });
        return;
      }
      setUploadedFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const canPerformSelectedProjectAction = React.useMemo(() => {
    if (!currentUser || !selectedProject) return false;
     if (['Owner', 'General Admin'].includes(currentUser.role)) {
       if (currentUser.role === selectedProject.assignedDivision) return true;
       if (selectedProject.status === 'Pending Scheduling' || selectedProject.status === 'Pending Approval') return true;
       if (selectedProject.status === 'Scheduled' && selectedProject.assignedDivision === 'Owner') return true;
       if (!['Arsitek', 'Struktur'].includes(selectedProject.assignedDivision)) {
            return true;
        }
     }
    if (currentUser.role === selectedProject.assignedDivision) return true;
    if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer') return true;
    return false;
  }, [currentUser, selectedProject]);

  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
        if (!isClient || !dashboardDict || !dashboardDict.status || !statusKey) return statusKey;
        const key = statusKey.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[key] || statusKey;
    }, [isClient, dashboardDict]);

  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !status) return <Skeleton className="h-5 w-20" />;
    if (!dashboardDict || !dashboardDict.status) {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />{status}</Badge>;
    }
    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status;
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";
    let Icon = Clock;
     switch (status.toLowerCase()) {
        case 'completed': variant = 'default'; className = 'bg-green-500 hover:bg-green-600 text-white'; Icon = CheckCircle; break;
        case 'inprogress': case 'sedang berjalan': variant = 'secondary'; className = 'bg-blue-500 text-white hover:bg-blue-600'; Icon = Clock; break;
        case 'pendingapproval': case 'menunggu persetujuan': variant = 'outline'; className = 'border-yellow-500 text-yellow-600'; Icon = AlertTriangle; break;
        case 'delayed': case 'tertunda': variant = 'destructive'; className = 'bg-orange-500 text-white hover:bg-orange-600 border-orange-500'; Icon = Clock; break;
        case 'canceled': case 'dibatalkan': variant = 'destructive'; Icon = XCircle; break;
        case 'pending': case 'pendinginput': case 'menunggu input': case 'pendingoffer': case 'menunggu penawaran': variant = 'outline'; className = 'border-blue-500 text-blue-600'; Icon = Clock; break;
        case 'pendingdpinvoice': case 'menunggu faktur dp': case 'pendingadminfiles': case 'menunggu file admin': case 'pendingarchitectfiles': case 'menunggu file arsitek': case 'pendingstructurefiles': case 'menunggu file struktur': case 'pendingfinalcheck': case 'menunggu pemeriksaan akhir': case 'pendingscheduling': case 'menunggu penjadwalan': variant = 'secondary'; Icon = Clock; break;
        case 'scheduled': case 'terjadwal': variant = 'secondary'; className = 'bg-purple-500 text-white hover:bg-purple-600'; Icon = Clock; break;
        default: variant = 'secondary'; Icon = Clock;
    }
    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict]);


  const handleProgressSubmit = async () => {
    if (!currentUser || !selectedProject || !canPerformSelectedProjectAction) {
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.notYourTurn });
      return;
    }
    if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && uploadedFiles.length === 0) {
        toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideOfferFile });
        return;
    }
    if (!description && uploadedFiles.length === 0 && selectedProject.status !== 'Pending Scheduling' && !['Owner', 'General Admin'].includes(currentUser.role) && !(currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer')) {
       toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideDescOrFile });
       return;
     }

    setIsSubmitting(true);
    let nextStatus = selectedProject.status;
    let nextDivision = selectedProject.assignedDivision;
    let newProgress = selectedProject.progress;
    let nextActionDescription = selectedProject.nextAction;
    const historyEntry: WorkflowHistoryEntry = { division: currentUser.role, action: `Submitted Progress`, timestamp: new Date().toISOString(), note: description || undefined };
    const newFiles: Omit<FileEntry, 'path'>[] = uploadedFiles.map(file => ({
        name: file.name,
        uploadedBy: currentUser.username,
        timestamp: new Date().toISOString(),
    }));

    switch (currentUser.role) {
        case 'Admin Proyek':
             if (selectedProject.status === 'Pending Offer') { nextStatus = 'Pending Approval'; nextDivision = 'Owner'; newProgress = 20; nextActionDescription = projectsDict.workflowActions.approveOffer; historyEntry.action = projectsDict.workflowActions.uploadedOffer; }
              else if (selectedProject.status === 'Pending Admin Files') { nextStatus = 'Pending Architect Files'; nextDivision = 'Arsitek'; newProgress = 50; nextActionDescription = projectsDict.workflowActions.uploadArchitectFiles; historyEntry.action = projectsDict.workflowActions.uploadedAdminFiles; }
              else if (selectedProject.status === 'Pending Final Check') { nextStatus = 'Pending Scheduling'; nextDivision = 'General Admin'; newProgress = 90; nextActionDescription = projectsDict.workflowActions.scheduleSidang; historyEntry.action = projectsDict.workflowActions.completedFinalCheck; }
            break;
        case 'General Admin':
            if (selectedProject.status === 'Pending DP Invoice') { nextStatus = 'Pending Approval'; nextDivision = 'Owner'; newProgress = 30; nextActionDescription = projectsDict.workflowActions.approveDPInvoice; historyEntry.action = projectsDict.workflowActions.uploadedDPInvoice;}
            break;
        case 'Arsitek':
            if (selectedProject.status === 'Pending Architect Files') { nextStatus = 'Pending Structure Files'; nextDivision = 'Struktur'; newProgress = 70; nextActionDescription = projectsDict.workflowActions.uploadStructureFiles; historyEntry.action = projectsDict.workflowActions.uploadedArchitectFiles;}
            break;
        case 'Struktur':
             if (selectedProject.status === 'Pending Structure Files') { nextStatus = 'Pending Final Check'; nextDivision = 'Admin Proyek'; newProgress = 80; nextActionDescription = projectsDict.workflowActions.performFinalCheck; historyEntry.action = projectsDict.workflowActions.uploadedStructureFiles;}
             break;
        default: historyEntry.action = `${projectsDict.workflowActions.submittedProgressFor} ${getTranslatedStatus(selectedProject.status)}`;
    }

    const updatedProjectData: Project = {
        ...selectedProject,
        status: nextStatus,
        assignedDivision: nextDivision,
        progress: newProgress,
        nextAction: nextActionDescription,
        workflowHistory: [...selectedProject.workflowHistory, historyEntry],
        files: [...selectedProject.files, ...(newFiles as any)], 
      };

     try {
        await updateProject(updatedProjectData);
        const newlyUpdatedProject = await fetchProjectById(updatedProjectData.id); // Use renamed import

        if (newlyUpdatedProject) {
            setAllProjects(prev => prev.map(p => p.id === newlyUpdatedProject.id ? newlyUpdatedProject : p));
             if (selectedProject?.id === newlyUpdatedProject.id) setSelectedProject(newlyUpdatedProject);
        } else {
            setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
             if (selectedProject?.id === updatedProjectData.id) setSelectedProject(updatedProjectData);
        }
        setDescription('');
        setUploadedFiles([]);
        if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && nextStatus === 'Pending Approval') {
            toast({ title: projectsDict.toast.offerSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', getTranslatedStatus(nextDivision)) });
        } else {
            toast({ title: projectsDict.toast.progressSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', getTranslatedStatus(nextDivision)) });
        }
      } catch (error) {
         console.error("Error updating project:", error);
         toast({ variant: 'destructive', title: projectsDict.toast.updateError, description: projectsDict.toast.failedToSubmitProgress });
      } finally {
         setIsSubmitting(false);
      }
  };

  const handleDecision = (decision: 'continue' | 'cancel') => {
     if (currentUser?.role !== 'Owner' || !selectedProject) {
       toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.onlyOwnerDecision });
       return;
     }
     setIsSubmitting(true);
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => {
       let nextStatus = selectedProject.status;
       let nextDivision = selectedProject.assignedDivision;
       let newProgress = selectedProject.progress;
       let nextActionDescription = selectedProject.nextAction;
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: '', timestamp: new Date().toISOString() };

       if (decision === 'cancel') {
         nextStatus = 'Canceled'; nextDivision = ''; newProgress = selectedProject.progress; nextActionDescription = ''; historyEntry.action = projectsDict.workflowActions.canceledProject;
         toast({ variant: 'destructive', title: projectsDict.toast.projectCanceled });
       } else {
         if (selectedProject.status === 'Pending Approval') {
            if (selectedProject.progress === 20) { nextStatus = 'Pending DP Invoice'; nextDivision = 'General Admin'; newProgress = 25; nextActionDescription = projectsDict.workflowActions.generateDPInvoice; historyEntry.action = projectsDict.workflowActions.approvedOffer; toast({ title: projectsDict.toast.offerApproved, description: projectsDict.toast.offerApprovedDesc.replace('{division}', getTranslatedStatus(nextDivision)) });}
            else if (selectedProject.progress === 30) { nextStatus = 'Pending Admin Files'; nextDivision = 'Admin Proyek'; newProgress = 40; nextActionDescription = projectsDict.workflowActions.uploadAdminFiles; historyEntry.action = projectsDict.workflowActions.approvedDPInvoice; toast({ title: projectsDict.toast.dpApproved, description: projectsDict.toast.dpApprovedDesc.replace('{division}', getTranslatedStatus(nextDivision)) });}
         } else if (selectedProject.status === 'Scheduled') { nextStatus = 'Completed'; nextDivision = ''; newProgress = 100; nextActionDescription = ''; historyEntry.action = projectsDict.workflowActions.markedAsCompleted; toast({ title: projectsDict.toast.progressCompleted });}
       }
       const updatedProjectData: Project = { ...selectedProject, status: nextStatus, assignedDivision: nextDivision, progress: newProgress, nextAction: nextActionDescription, workflowHistory: [...selectedProject.workflowHistory, historyEntry]};
        try {
            await updateProject(updatedProjectData);
             setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
             if (selectedProject?.id === updatedProjectData.id) setSelectedProject(updatedProjectData);
        } catch (error) {
            console.error("Error updating project after decision:", error);
            toast({ variant: 'destructive', title: projectsDict.toast.updateError, description: projectsDict.toast.failedToProcessDecision });
        } finally {
             setIsSubmitting(false);
        }
     });
  };

  const handleScheduleSubmit = () => {
     if (!currentUser || !['Owner', 'General Admin'].includes(currentUser.role) || !selectedProject) {
       toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.schedulingPermissionDenied });
       return;
     }
     if (!scheduleDate || !scheduleTime || !scheduleLocation) {
         toast({ variant: 'destructive', title: projectsDict.toast.missingScheduleInfo, description: projectsDict.toast.provideDateTimeLoc });
         return;
     }
     setIsSubmitting(true);
     const sidangDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
     new Promise(resolve => setTimeout(resolve, 1000)).then(async () => {
        const historyEntry: WorkflowHistoryEntry = { division: currentUser!.role, action: `${projectsDict.workflowActions.scheduledSidangFor} ${sidangDateTime.toISOString()}`, timestamp: new Date().toISOString() };
        const updatedProjectData: Project = { ...selectedProject, status: 'Scheduled', assignedDivision: 'Owner', nextAction: projectsDict.workflowActions.declareSidangOutcome, workflowHistory: [...selectedProject.workflowHistory, historyEntry]};
        try {
            await updateProject(updatedProjectData);
            setAllProjects(prev => prev.map(p => p.id === updatedProjectData.id ? updatedProjectData : p));
            if (selectedProject?.id === updatedProjectData.id) setSelectedProject(updatedProjectData);
            setScheduleDate(''); setScheduleTime(''); setScheduleLocation('');
            toast({ title: projectsDict.toast.sidangScheduled, description: projectsDict.toast.sidangScheduledDesc });
            handleAddToCalendar(sidangDateTime, scheduleLocation);
        } catch (error) {
            console.error("Error updating project after scheduling:", error);
            toast({ variant: 'destructive', title: projectsDict.toast.updateError, description: projectsDict.toast.failedToSaveSchedule });
        } finally {
            setIsSubmitting(false);
        }
     });
  };

    const handleAddToCalendar = async (scheduledDateTime: Date, location: string) => {
      if (!selectedProject || selectedProject.status !== 'Scheduled' || !scheduledDateTime) {
        toast({ variant: 'destructive', title: projectsDict.toast.cannotAddCalendarYet, description: projectsDict.toast.mustScheduleFirst });
        return;
      }
        const eventLocation = location || projectsDict.defaultMeetingLocation;
        const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
      const eventDetails = { title: `${projectsDict.sidangEventTitlePrefix}: ${selectedProject.title}`, location: eventLocation, startTime: scheduledDateTime.toISOString(), endTime: endTime.toISOString(), description: `${projectsDict.sidangEventDescPrefix}: ${selectedProject.title}`};
      try {
        setIsAddingToCalendar(true);
        const eventId = await scheduleEvent(eventDetails);
        toast({ title: projectsDict.toast.addedToCalendar, description: projectsDict.toast.eventId.replace('{id}', eventId) });
      } catch (error) {
        console.error("Error scheduling event:", error);
        toast({ variant: 'destructive', title: projectsDict.toast.calendarError, description: projectsDict.toast.couldNotAddEvent });
      } finally {
        setIsAddingToCalendar(false);
      }
    };

    const roleFilteredProjects = React.useMemo(() => {
        if (!currentUser || !isClient || isLoadingProjects) return [];
        let projectsToFilter = allProjects;
         if (currentUser.role === 'Admin Proyek') {
            projectsToFilter = allProjects; 
         }
         else if (!['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role)) {
            projectsToFilter = allProjects.filter(project =>
                 project.assignedDivision === currentUser.role ||
                 (project.nextAction && project.nextAction.toLowerCase().includes(currentUser.role.toLowerCase()))
             );
         }
         return projectsToFilter;
    }, [currentUser, allProjects, isClient, isLoadingProjects]);

    React.useEffect(() => {
        let currentProjects = roleFilteredProjects;
        if (statusFilter.length > 0) {
            currentProjects = currentProjects.filter(project => statusFilter.includes(project.status));
        }
        if (searchTerm.trim() !== '') {
            currentProjects = currentProjects.filter(project =>
                project.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        setDisplayedProjects(currentProjects);
    }, [searchTerm, statusFilter, roleFilteredProjects]);


    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };

   const showUploadSection = React.useMemo(() => {
        if (!selectedProject || !currentUser) return false;
        if (!canPerformSelectedProjectAction) return false;
        return ( (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer') ||
            ( selectedProject.assignedDivision === currentUser.role && !['Pending Approval', 'Pending Scheduling', 'Scheduled', 'Completed', 'Canceled'].includes(selectedProject.status)) ||
             (['Owner', 'General Admin'].includes(currentUser.role) && selectedProject.assignedDivision === currentUser.role && !['Pending Architect Files', 'Pending Structure Files'].includes(selectedProject.status))
        );
   }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showOwnerDecisionSection = React.useMemo(() => selectedProject && selectedProject.status === 'Pending Approval' && currentUser?.role === 'Owner', [selectedProject, currentUser]);
   const showSchedulingSection = React.useMemo(() => selectedProject && selectedProject.status === 'Pending Scheduling' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [selectedProject, currentUser]);
   const showCalendarButton = React.useMemo(() => selectedProject && selectedProject.status === 'Scheduled' && currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [selectedProject, currentUser]);
   const showSidangOutcomeSection = React.useMemo(() => selectedProject && selectedProject.status === 'Scheduled' && currentUser?.role === 'Owner', [selectedProject, currentUser]);
    const canDownloadFiles = React.useMemo(() => currentUser && ['Owner', 'General Admin'].includes(currentUser.role), [currentUser]);

   const handleDownloadFile = (file: FileEntry) => {
        if (!isClient) return;
        console.log(`Simulating download for file: ${file.name} from relative path: ${file.path}`);
        setIsDownloading(true);
        
        const fileContent = `Simulated content for ${file.name}.\nOriginal relative path in project folder: ${file.path}.\nUploaded by ${file.uploadedBy} on ${formatDateOnly(file.timestamp)}.`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: projectsDict.toast.downloadStarted, description: projectsDict.toast.simulatedDownload.replace('{filename}', a.download) });
        setIsDownloading(false);
    };

   const handleReviseSubmit = async () => {
       if (!currentUser || !selectedProject || !['Owner', 'General Admin'].includes(currentUser.role)) {
           toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.revisionPermissionDenied });
           return;
       }
       if (!revisionNote.trim()) {
           toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: projectsDict.toast.revisionNoteRequired });
           return;
       }
       setIsRevising(true);
       try {
           const revised = await reviseProject(selectedProject.id, currentUser.role, revisionNote);
           setAllProjects(prev => prev.map(p => (p.id === revised.id ? revised : p)));
           setSelectedProject(revised);
           setRevisionNote('');
           toast({ title: projectsDict.toast.revisionSuccess, description: projectsDict.toast.revisionSuccessDesc.replace('{division}', getTranslatedStatus(revised.assignedDivision)) });
       } catch (error: any) {
           console.error("Error revising project:", error);
           toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: error.message || projectsDict.toast.failedToRevise });
       } finally {
           setIsRevising(false);
       }
   };

   const canReviseSelectedProject = React.useMemo(() => {
       if (!currentUser || !selectedProject) return false;
       if (!['Owner', 'General Admin'].includes(currentUser.role)) return false;
       const revisableStatuses = [
           'Pending Approval', 'Pending DP Invoice', 'Pending Admin Files',
           'Pending Architect Files', 'Pending Structure Files', 'Pending Final Check',
           'Pending Scheduling', 'Scheduled'
       ];
       return revisableStatuses.includes(selectedProject.status);
   }, [currentUser, selectedProject]);


    if (!isClient || !currentUser || isLoadingProjects) {
        return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
                 <Card>
                     <CardHeader><Skeleton className="h-7 w-3/5 mb-2" /><Skeleton className="h-4 w-4/5" /></CardHeader>
                     <CardContent>
                         <div className="flex justify-end mb-4"><Skeleton className="h-10 w-32" /></div>
                         <div className="space-y-4">{[...Array(3)].map((_, i) => (<Card key={`project-skel-${i}`} className="opacity-50"><CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2"><div><Skeleton className="h-5 w-3/5 mb-1" /><Skeleton className="h-3 w-4/5" /></div><Skeleton className="h-5 w-20 rounded-full" /></CardHeader><CardContent><Skeleton className="h-2 w-full mb-1" /><Skeleton className="h-3 w-1/4" /></CardContent></Card>))}</div>
                     </CardContent>
                 </Card>
                 <Card className="mt-6 opacity-50"><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        );
    }

  const renderProjectList = () => {
    if (!projectsDict || !isClient) {
        return (<div className="container mx-auto py-4 px-4 md:px-6 space-y-6"><Card><CardHeader><Skeleton className="h-7 w-3/5 mb-2" /></CardHeader></Card></div>);
    }
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl md:text-2xl">{projectsDict.projectListTitle}</CardTitle>
              <CardDescription>{projectsDict.projectListDescription}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={projectsDict.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-full sm:w-[200px] md:w-[250px]"
                    />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><ListFilter className="mr-2 h-4 w-4" /><span className="truncate">{projectsDict.filterButton}</span>{statusFilter.length > 0 && ` (${statusFilter.length})`}</Button></DropdownMenuTrigger>
                   <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>{projectsDict.filterStatusLabel}</DropdownMenuLabel><DropdownMenuSeparator />
                    {projectStatuses.map((status) => (<DropdownMenuCheckboxItem key={status} checked={statusFilter.includes(status)} onCheckedChange={() => handleStatusFilterChange(status)}>{getTranslatedStatus(status)}</DropdownMenuCheckboxItem>))}
                    <DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={statusFilter.length === 0} onCheckedChange={() => setStatusFilter([])} className="text-muted-foreground">{projectsDict.filterClear}</DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayedProjects.length === 0 ? (<p className="text-muted-foreground text-center py-4">{searchTerm ? projectsDict.noSearchResults : projectsDict.noProjectsFound}</p>) : (
              displayedProjects.map((projectItem) => (
                <Card key={projectItem.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProject(projectItem)}>
                  <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6">
                    <div className="flex-1 min-w-0"><CardTitle className="text-base sm:text-lg">{projectItem.title}</CardTitle><CardDescription className="text-xs text-muted-foreground mt-1 truncate">{projectsDict.assignedLabel}: {getTranslatedStatus(projectItem.assignedDivision) || projectsDict.none} {projectItem.nextAction ? `| ${projectsDict.nextActionLabel}: ${projectItem.nextAction}` : ''}</CardDescription></div>
                     <div className="flex-shrink-0 mt-2 sm:mt-0">{getStatusBadge(projectItem.status)}</div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                     {projectItem.status !== 'Canceled' && projectItem.status !== 'Completed' && (<div className="flex items-center gap-2"><Progress value={projectItem.progress} className="flex-1 h-2" /><span className="text-xs text-muted-foreground font-medium">{projectItem.progress}%</span></div>)}
                    {(projectItem.status === 'Canceled' || projectItem.status === 'Completed') && (<p className={`text-sm font-medium ${projectItem.status === 'Canceled' ? 'text-destructive' : 'text-green-600'}`}>{getTranslatedStatus(projectItem.status)}</p>)}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground justify-end p-4 sm:p-6 pt-0"><span className="flex items-center gap-1">{projectsDict.viewDetails} <ArrowRight className="h-3 w-3" /></span></CardFooter>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSelectedProjectDetail = (project: Project) => {
       if (!projectsDict || !isClient) return <Skeleton className="h-64 w-full" />;
       return (
           <>
               <Button variant="outline" onClick={() => setSelectedProject(null)} className="mb-4 w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" />{projectsDict.backToList}</Button>
               <Card>
                   <CardHeader className="p-4 sm:p-6">
                     <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 min-w-0"><CardTitle className="text-xl md:text-2xl">{project.title}</CardTitle><CardDescription className="mt-1 text-xs sm:text-sm">{projectsDict.statusLabel}: {getStatusBadge(project.status)} | {projectsDict.nextActionLabel}: {project.nextAction || projectsDict.none} | {projectsDict.assignedLabel}: {getTranslatedStatus(project.assignedDivision) || projectsDict.none}</CardDescription></div>
                           <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0">
                               <div className="text-sm font-medium">{projectsDict.progressLabel}</div>
                               <div className="flex items-center gap-2 mt-1"><Progress value={project.progress} className="w-full md:w-32 h-2" /><span className="text-xs text-muted-foreground font-medium">{project.progress}%</span></div>
                           </div>
                     </div>
                   </CardHeader>
                   <CardContent className="p-4 sm:p-6 pt-0">
                      {showUploadSection && (
                         <div className="space-y-4 border-t pt-4 mt-4">
                           <h3 className="text-lg font-semibold">{projectsDict.uploadProgressTitle.replace('{role}', getTranslatedStatus(currentUser!.role))}</h3>
                           <div className="grid w-full items-center gap-1.5"><Label htmlFor="description">{projectsDict.descriptionLabel}</Label><Textarea id="description" placeholder={projectsDict.descriptionPlaceholder.replace('{division}', getTranslatedStatus(project.assignedDivision))} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting}/></div>
                           <div className="grid w-full items-center gap-1.5">
                             <Label htmlFor="project-files">{projectsDict.attachFilesLabel}</Label>
                             <div className="flex flex-col sm:flex-row items-center gap-2">
                               <Input id="project-files" type="file" multiple onChange={handleFileChange} disabled={isSubmitting} className="flex-grow"/>
                               <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                             </div>
                             <p className="text-xs text-muted-foreground">{projectsDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString())}</p>
                           </div>
                           {uploadedFiles.length > 0 && (
                             <div className="space-y-2 rounded-md border p-3">
                               <Label>{projectsDict.selectedFilesLabel}</Label>
                               <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                 {uploadedFiles.map((file, index) => ( <li key={index} className="flex items-center justify-between group"><span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">{file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span></span><Button variant="ghost" size="sm" type="button" onClick={() => removeFile(index)} disabled={isSubmitting} className="opacity-50 group-hover:opacity-100 flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button></li>))}
                               </ul>
                             </div>
                           )}
                            <Button onClick={handleProgressSubmit} disabled={isSubmitting || (currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer' && uploadedFiles.length === 0) || (!['Pending Scheduling', 'Completed', 'Canceled'].includes(project.status) && !['Owner', 'General Admin'].includes(currentUser!.role) && !(currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer') && !description && uploadedFiles.length === 0)} className="w-full sm:w-auto">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitting ? projectsDict.submittingButton : projectsDict.submitButton}
                            </Button>
                         </div>
                       )}
                      {showOwnerDecisionSection && (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="text-lg font-semibold">{projectsDict.ownerActionTitle}</h3><p className="text-sm text-muted-foreground">{projectsDict.ownerActionDesc}</p>
                           <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={isSubmitting} className="w-full sm:w-auto"><XCircle className="mr-2 h-4 w-4" /> {projectsDict.cancelProgressButton}</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{projectsDict.cancelDialogTitle}</AlertDialogTitle><AlertDialogDescription>{projectsDict.cancelDialogDesc}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>{projectsDict.cancelDialogCancel}</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDecision('cancel')} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{projectsDict.cancelDialogConfirm}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                              <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="accent-teal w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{projectsDict.continueProgressButton}</Button>
                            </div>
                        </div>
                      )}
                       {showSchedulingSection && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                              <h3 className="text-lg font-semibold">{projectsDict.scheduleSidangTitle.replace('{role}', getTranslatedStatus(currentUser!.role))}</h3>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div className="space-y-1.5"><Label htmlFor="scheduleDate">{projectsDict.dateLabel}</Label><Input id="scheduleDate" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={isSubmitting} /></div>
                                  <div className="space-y-1.5"><Label htmlFor="scheduleTime">{projectsDict.timeLabel}</Label><Input id="scheduleTime" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} disabled={isSubmitting} /></div>
                                  <div className="space-y-1.5"><Label htmlFor="scheduleLocation">{projectsDict.locationLabel}</Label><Input id="scheduleLocation" placeholder={projectsDict.locationPlaceholder} value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} disabled={isSubmitting} /></div>
                               </div>
                               <Button onClick={handleScheduleSubmit} disabled={isSubmitting || !scheduleDate || !scheduleTime || !scheduleLocation} className="w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}{isSubmitting ? projectsDict.schedulingButton : projectsDict.confirmScheduleButton}</Button>
                            </div>
                          )}
                        {showCalendarButton && (
                           <div className="border-t pt-4 mt-4">
                               <Button onClick={() => { const schedulingEntry = project.workflowHistory.find(entry => entry.action.startsWith(projectsDict.workflowActions.scheduledSidangFor)); if (schedulingEntry) { const isoString = schedulingEntry.action.replace(projectsDict.workflowActions.scheduledSidangFor + ' ', ''); const scheduledDateTime = new Date(isoString); const location = projectsDict.defaultMeetingLocation; handleAddToCalendar(scheduledDateTime, location); } else { toast({ variant: 'destructive', title: projectsDict.toast.errorFindingSchedule, description: projectsDict.toast.couldNotFindSchedule });}}} disabled={isAddingToCalendar} variant="outline" className="w-full sm:w-auto">
                                   {isAddingToCalendar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.5-11.5L11 14.01l-2.5-2.51L7 13l4 4 6.5-6.5L16.5 8.5z"></path></svg>}
                                  {isAddingToCalendar ? projectsDict.addingCalendarButton : projectsDict.addCalendarButton}
                               </Button>
                           </div>
                        )}
                      {showSidangOutcomeSection && (
                           <div className="space-y-4 border-t pt-4 mt-4">
                             <h3 className="text-lg font-semibold">{projectsDict.sidangOutcomeTitle}</h3><p className="text-sm text-muted-foreground">{projectsDict.sidangOutcomeDesc}</p>
                               <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                 <Button onClick={() => handleDecision('continue')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{projectsDict.markSuccessButton}</Button>
                                   <Button variant="destructive" onClick={() => { toast({title: projectsDict.toast.failNotImplemented, description: projectsDict.toast.failNotImplementedDesc })}} disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}{projectsDict.markFailButton}</Button>
                              </div>
                           </div>
                        )}
                      {canReviseSelectedProject && (
                           <div className="space-y-4 border-t pt-4 mt-4">
                               <h3 className="text-lg font-semibold">{projectsDict.reviseProjectTitle}</h3>
                               <div className="grid w-full items-center gap-1.5">
                                   <Label htmlFor="revisionNote">{projectsDict.revisionNoteLabel}</Label>
                                   <Textarea id="revisionNote" placeholder={projectsDict.revisionNotePlaceholder} value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} disabled={isRevising} />
                               </div>
                               <AlertDialog>
                                   <AlertDialogTrigger asChild>
                                       <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto" disabled={isRevising || !revisionNote.trim()}>
                                           <RefreshCw className="mr-2 h-4 w-4" />
                                           {isRevising ? projectsDict.revisingButton : projectsDict.reviseButton}
                                       </Button>
                                   </AlertDialogTrigger>
                                   <AlertDialogContent>
                                       <AlertDialogHeader>
                                           <AlertDialogTitle>{projectsDict.confirmRevisionTitle}</AlertDialogTitle>
                                           <AlertDialogDescription>{projectsDict.confirmRevisionDesc}</AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                           <AlertDialogCancel disabled={isRevising}>{projectsDict.cancelButton}</AlertDialogCancel>
                                           <AlertDialogAction onClick={handleReviseSubmit} disabled={isRevising} className="bg-orange-500 hover:bg-orange-600">
                                               {isRevising && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                               {projectsDict.confirmRevisionButton}
                                           </AlertDialogAction>
                                       </AlertDialogFooter>
                                   </AlertDialogContent>
                               </AlertDialog>
                           </div>
                        )}

                      {project.status === 'Completed' && ( <div className="border-t pt-4 mt-4 text-center"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" /><p className="font-semibold text-lg text-green-600">{projectsDict.completedMessage}</p></div>)}
                       {project.status === 'Canceled' && ( <div className="border-t pt-4 mt-4 text-center"><XCircle className="h-12 w-12 text-destructive mx-auto mb-2" /><p className="font-semibold text-lg text-destructive">{projectsDict.canceledMessage}</p></div>)}
                   </CardContent>
                 </Card>
                   <Card className="mt-6">
                       <CardHeader className="p-4 sm:p-6"><CardTitle>{projectsDict.uploadedFilesTitle}</CardTitle><CardDescription>{projectsDict.uploadedFilesDesc}</CardDescription></CardHeader>
                       <CardContent className="p-4 sm:p-6 pt-0">
                         {project.files.length === 0 ? (<p className="text-sm text-muted-foreground">{projectsDict.noFiles}</p>) : (
                           <ul className="space-y-2">
                              {project.files.map((file, index) => (
                               <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-md hover:bg-secondary/50 gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2 flex-grow min-w-0"><FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium break-all">{file.name}</span>
                                        {file.path && (<p className="text-xs text-muted-foreground/70 flex items-center gap-1 truncate"><FolderOpen className="h-3 w-3 flex-shrink-0" />{file.path}</p>)}
                                      </div>
                                  </div>
                                  <div className="flex flex-shrink-0 items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                       <span className="text-xs text-muted-foreground text-left sm:text-right flex-grow">{projectsDict.uploadedByOn.replace('{user}', file.uploadedBy).replace('{date}', formatDateOnly(file.timestamp))}</span>
                                       {canDownloadFiles && (<Button variant="ghost" size="icon" onClick={() => handleDownloadFile(file)} disabled={isDownloading} title={projectsDict.downloadFileTooltip} className="h-7 w-7 flex-shrink-0">{isDownloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4 text-primary" />}</Button>)}
                                  </div>
                               </li>
                              ))}
                           </ul>
                         )}
                       </CardContent>
                   </Card>
                  <Card className="mt-6">
                    <CardHeader className="p-4 sm:p-6"><CardTitle>{projectsDict.workflowHistoryTitle}</CardTitle><CardDescription>{projectsDict.workflowHistoryDesc}</CardDescription></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <ul className="space-y-3">
                        {project.workflowHistory.map((entry, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${index === project.workflowHistory.length - 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`}></div>
                                <div>
                                    <p className="text-sm font-medium">{projectsDict.historyActionBy.replace('{action}', entry.action).replace('{division}', getTranslatedStatus(entry.division))}</p>
                                    <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
                                    {entry.note && <p className="text-xs text-muted-foreground italic mt-1">{projectsDict.revisionNotePrefix} {entry.note}</p>}
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
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      {selectedProject ? renderSelectedProjectDetail(selectedProject) : renderProjectList()}
    </div>
  );
}

