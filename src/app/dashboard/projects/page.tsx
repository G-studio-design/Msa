
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
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    getAllProjects, 
    updateProject, 
    reviseProject, 
    getProjectById as fetchProjectByIdInternal, // Renamed to avoid conflict 
    type Project, 
    type WorkflowHistoryEntry, 
    type FileEntry,
    type UpdateProjectParams 
} from '@/services/project-service';
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
    'Pending Offer', 'Pending Approval', 'Pending DP Invoice',
    'Pending Admin Files', 'Pending Architect Files', 'Pending Structure Files',
    'Pending MEP Files', 'Pending Final Check', 'Pending Scheduling', 'Scheduled', 
    'In Progress', 'Completed', 'Canceled', 'Pending Consultation Docs', 'Pending Review'
];

const MAX_FILES_UPLOAD = 10;

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

  const fetchProjects = React.useCallback(async () => {
    if (currentUser) {
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await getAllProjects();
        setAllProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        if (isClient && projectsDict?.toast?.error) {
            toast({ variant: 'destructive', title: projectsDict.toast.error, description: projectsDict.toast.couldNotLoadProjects });
        }
      } finally {
        setIsLoadingProjects(false);
      }
    } else {
        setIsLoadingProjects(false);
    }
  }, [currentUser, projectsDict, toast, isClient]);


  React.useEffect(() => {
    setIsClient(true);
    fetchProjects();
  }, [fetchProjects]);


  React.useEffect(() => {
      const newDict = getDictionary(language);
      setDict(newDict);
      setProjectsDict(newDict.projectsPage);
      setDashboardDict(newDict.dashboardPage);
  }, [language]);

  React.useEffect(() => {
      if (isClient && allProjects.length > 0 && !isLoadingProjects) {
          const projectIdFromUrl = searchParams.get('projectId');
          if (projectIdFromUrl) {
              const projectToSelect = allProjects.find(p => p.id === projectIdFromUrl);
              if (projectToSelect) {
                  setSelectedProject(projectToSelect);
                  // Clear states when a new project is selected from URL
                  setDescription('');
                  setUploadedFiles([]);
                  setScheduleDate('');
                  setScheduleTime('');
                  setScheduleLocation('');
                  setRevisionNote('');
              } else {
                  console.warn(`Project with ID "${projectIdFromUrl}" from URL not found.`);
                  toast({ variant: 'destructive', title: projectsDict.toast.error, description: projectsDict.toast.projectNotFound });
                  router.replace('/dashboard/projects', { scroll: false });
              }
          } else {
              setSelectedProject(null); // Clear selected project if no projectId in URL
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allProjects, isClient, isLoadingProjects, router, toast]); // projectsDict dependency was removed to avoid loop, it's set with dict


  const formatTimestamp = React.useCallback((timestamp: string): string => {
    if (!isClient || !projectsDict?.invalidDate) return '...';
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
      if (!isClient || !timestamp || !projectsDict?.notApplicable) return projectsDict?.notApplicable || "N/A";
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
    return currentUser.role === selectedProject.assignedDivision;
  }, [currentUser, selectedProject]);

  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
        if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
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
        case 'pendingdpinvoice': case 'menunggu faktur dp': case 'pendingadminfiles': case 'menunggu berkas administrasi': case 'pendingarchitectfiles': case 'menunggu berkas arsitektur': case 'pendingstructurefiles': case 'menunggu berkas struktur': case 'pendingmepfiles': case 'menunggu berkas mep': case 'pendingfinalcheck': case 'menunggu pemeriksaan akhir': case 'pendingscheduling': case 'menunggu penjadwalan': case 'pendingconsultationdocs': case 'menunggu dok. konsultasi': case 'pendingreview': case 'menunggu tinjauan': variant = 'secondary'; Icon = Clock; break;
        case 'scheduled': case 'terjadwal': variant = 'secondary'; className = 'bg-purple-500 text-white hover:bg-purple-600'; Icon = Clock; break;
        default: variant = 'secondary'; Icon = Clock;
    }
    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict]);


  const handleProgressSubmit = async (actionTaken: string = 'submitted') => {
    if (!currentUser || !selectedProject) {
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.notYourTurn });
      return;
    }

    if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && uploadedFiles.length === 0) {
        toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideOfferFile });
        return;
    }
    
    const isSpecialCaseForSubmission = 
        selectedProject.status === 'Pending Scheduling' || 
        selectedProject.status === 'Pending Approval' || 
        ['Completed', 'Canceled'].includes(selectedProject.status);

    if (!isSpecialCaseForSubmission && !description && uploadedFiles.length === 0 && actionTaken === 'submitted') {
       toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideDescOrFile });
       return;
     }

    setIsSubmitting(true);
    
    const uploadedFileEntries: Omit<FileEntry, 'timestamp'>[] = [];
    if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', selectedProject.id);
            formData.append('projectTitle', selectedProject.title);

            try {
                const response = await fetch('/api/upload-file', { method: 'POST', body: formData });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'File upload failed with status ' + response.status }));
                    throw new Error(errorData.message || `File upload failed for ${file.name}`);
                }
                const result = await response.json();
                uploadedFileEntries.push({
                    name: result.originalName,
                    uploadedBy: currentUser.username,
                    path: result.relativePath,
                });
            } catch (error: any) {
                console.error("Error uploading file:", file.name, error);
                toast({ variant: 'destructive', title: projectsDict.toast.uploadError, description: error.message || `Failed to upload ${file.name}.` });
                setIsSubmitting(false);
                return;
            }
        }
    }

    try {
        const updatedProjectData: UpdateProjectParams = {
            projectId: selectedProject.id,
            updaterRole: currentUser.role,
            updaterUsername: currentUser.username,
            actionTaken: actionTaken,
            files: uploadedFileEntries.length > 0 ? uploadedFileEntries : undefined,
            note: description || undefined, // Ensure note is undefined if empty
            scheduleDetails: selectedProject.status === 'Pending Scheduling' && actionTaken === 'scheduled' ? {
                date: scheduleDate,
                time: scheduleTime,
                location: scheduleLocation
            } : undefined
        };

        const newlyUpdatedProject = await updateProject(updatedProjectData); 

        if (newlyUpdatedProject) {
            setAllProjects(prev => prev.map(p => p.id === newlyUpdatedProject.id ? newlyUpdatedProject : p));
            if (selectedProject?.id === newlyUpdatedProject.id) setSelectedProject(newlyUpdatedProject);
        }
        
        setDescription('');
        setUploadedFiles([]);
        setScheduleDate('');
        setScheduleTime('');
        setScheduleLocation('');

        toast({ title: projectsDict.toast.progressSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', getTranslatedStatus(newlyUpdatedProject?.assignedDivision || '')) });
        
      } catch (error: any) {
         console.error("Error updating project:", error);
         toast({ variant: 'destructive', title: projectsDict.toast.updateError, description: error.message || projectsDict.toast.failedToSubmitProgress });
      } finally {
         setIsSubmitting(false);
      }
  };


  const handleDecision = (decision: 'approved' | 'rejected' | 'canceled' | 'completed' | 'revise_after_sidang' | 'canceled_after_sidang') => {
    if (!currentUser || !selectedProject || currentUser.role !== 'Owner') { 
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.onlyOwnerDecision });
      return;
    }
    
    let noteForHistory = description || revisionNote; // Prioritize revisionNote if available
    
    handleProgressSubmit(decision); 
    setRevisionNote(''); 
  };

  const handleScheduleSubmit = () => {
     if (!currentUser || !selectedProject ) {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.schedulingPermissionDenied });
        return;
     }
     const canSchedule = (
        selectedProject.status === 'Pending Scheduling' &&
        (
            (currentUser.role === 'Admin Proyek' && selectedProject.assignedDivision === 'Admin Proyek') ||
            currentUser.role === 'Owner'
        )
     );


     if (!canSchedule) {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.schedulingPermissionDenied });
        return;
     }

     if (!scheduleDate || !scheduleTime || !scheduleLocation) {
         toast({ variant: 'destructive', title: projectsDict.toast.missingScheduleInfo, description: projectsDict.toast.provideDateTimeLoc });
         return;
     }
     handleProgressSubmit('scheduled');
  };

    const handleAddToCalendar = async () => {
      if (!selectedProject || selectedProject.status !== 'Scheduled' || !currentUser) {
        toast({ variant: 'destructive', title: projectsDict.toast.cannotAddCalendarYet, description: projectsDict.toast.mustScheduleFirst });
        return;
      }

      if (!currentUser.id) {
        toast({ variant: 'destructive', title: projectsDict.toast.calendarError, description: "User ID is missing." });
        return;
      }
      
      if (!selectedProject.scheduleDetails || !selectedProject.scheduleDetails.date || !selectedProject.scheduleDetails.time) {
        toast({ variant: 'destructive', title: projectsDict.toast.errorFindingSchedule, description: projectsDict.toast.couldNotFindSchedule });
        return;
      }
      
      const scheduledDateTime = new Date(`${selectedProject.scheduleDetails.date}T${selectedProject.scheduleDetails.time}`);
      const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

      const eventDetails = { 
        title: `${projectsDict.sidangEventTitlePrefix}: ${selectedProject.title}`, 
        location: selectedProject.scheduleDetails.location, 
        startTime: scheduledDateTime.toISOString(), 
        endTime: endTime.toISOString(), 
        description: `${projectsDict.sidangEventDescPrefix}: ${selectedProject.title}`
      };

      try {
        setIsAddingToCalendar(true);
        const response = await fetch('/api/calendar/create-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, eventDetails }),
        });

        if (!response.ok) {
            let errorPayload: any;
            let responseText = "";
            try {
                responseText = await response.text();
                errorPayload = JSON.parse(responseText);
            } catch (e) {
                console.error("Server returned non-JSON error response for calendar event:", response.status, responseText);
                throw new Error(projectsDict.toast.couldNotAddEvent + ` (Server: ${response.status} - ${responseText.substring(0,100)})`);
            }
            const detailMessage = errorPayload?.details || errorPayload?.error || projectsDict.toast.couldNotAddEvent;
            throw new Error(detailMessage);
        }
        const result = await response.json();
        toast({ title: projectsDict.toast.addedToCalendar, description: projectsDict.toast.eventId.replace('{id}', result.eventId || 'N/A') });
      } catch (error: any) {
        console.error("Error scheduling event:", error);
        const description = (error && typeof error.message === 'string' && error.message.trim() !== "")
                            ? error.message
                            : projectsDict.toast.couldNotAddEvent;
        toast({ 
            variant: 'destructive', 
            title: projectsDict.toast.calendarError, 
            description
        });
      } finally {
        setIsAddingToCalendar(false);
      }
    };

    const roleFilteredProjects = React.useMemo(() => {
        if (!currentUser || !isClient || isLoadingProjects) return [];
        if (['Owner', 'General Admin', 'Admin Developer', 'Admin Proyek'].includes(currentUser.role)) {
            return allProjects;
        }
        return allProjects.filter(project =>
            project.assignedDivision === currentUser.role ||
            (project.nextAction && project.nextAction.toLowerCase().includes(currentUser.role.toLowerCase()))
        );
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
        if (!selectedProject || !currentUser || !canPerformSelectedProjectAction) return false;
        const statusesExpectingUpload = [
            'Pending Offer', 'Pending DP Invoice', 'Pending Admin Files',
            'Pending Architect Files', 'Pending Structure Files', 'Pending MEP Files',
            'Pending Consultation Docs', 'Pending Final Check' // Admin Proyek can upload for final check
        ];
         if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Final Check') {
            return true;
        }
        return statusesExpectingUpload.includes(selectedProject.status);
   }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showOwnerDecisionSection = React.useMemo(() => 
        selectedProject && 
        selectedProject.status === 'Pending Approval' && 
        currentUser?.role === 'Owner' &&
        canPerformSelectedProjectAction,
    [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showSchedulingSection = React.useMemo(() => {
    if (!selectedProject || !currentUser) return false;
    return selectedProject.status === 'Pending Scheduling' &&
           (
             (currentUser.role === 'Admin Proyek' && selectedProject.assignedDivision === 'Admin Proyek') ||
             currentUser.role === 'Owner'
           );
    },[selectedProject, currentUser]);
    
   const showCalendarButton = React.useMemo(() => 
        selectedProject && 
        selectedProject.status === 'Scheduled' && 
        currentUser && 
        (currentUser.role === 'Owner' || currentUser.role === 'Admin Proyek'),
    [selectedProject, currentUser]);

   const showSidangOutcomeSection = React.useMemo(() => 
        selectedProject && 
        selectedProject.status === 'Scheduled' && 
        currentUser?.role === 'Owner' &&
        canPerformSelectedProjectAction, 
    [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const canDownloadFiles = React.useMemo(() => currentUser && ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer'].includes(currentUser.role), [currentUser]);

   const handleDownloadFile = async (file: FileEntry) => {
        if (!isClient) return;
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/download-file?filePath=${encodeURIComponent(file.path)}`);
            if (!response.ok) {
                let errorData = { message: `Failed to download ${file.name}. Status: ${response.status}` };
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.warn("Could not parse error response as JSON for file download.");
                }
                throw new Error(errorData.message || `Failed to download ${file.name}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name; 
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({ title: projectsDict.toast.downloadStarted, description: `${projectsDict.toast.downloadSuccessDesc.replace('{filename}', file.name)}`});
        } catch (error: any) {
            console.error("Error downloading file:", error);
            toast({ variant: 'destructive', title: projectsDict.toast.error, description: error.message || projectsDict.toast.downloadErrorDesc });
        } finally {
            setIsDownloading(false);
        }
    };

   const handleReviseSubmit = async () => {
       if (!currentUser || !selectedProject || !['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role)) {
           toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.revisionPermissionDenied });
           return;
       }
       if (!revisionNote.trim()) {
           toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: projectsDict.toast.revisionNoteRequired });
           return;
       }
       setIsRevising(true);
       try {
           const revised = await reviseProject(selectedProject.id, currentUser.username, currentUser.role, revisionNote); 
           if(revised) {
            setAllProjects(prev => prev.map(p => (p.id === revised.id ? revised : p)));
            setSelectedProject(revised);
            setRevisionNote('');
            toast({ title: projectsDict.toast.revisionSuccess, description: projectsDict.toast.revisionSuccessDesc.replace('{division}', getTranslatedStatus(revised.assignedDivision)) });
           } else {
            // This case means reviseProject returned null, indicating revision is not applicable
            toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: projectsDict.toast.revisionNotApplicable });
           }
       } catch (error: any) {
           console.error("Error revising project:", error);
           let desc = projectsDict.toast.failedToRevise;
            if (error.message === 'REVISION_NOT_SUPPORTED_FOR_CURRENT_STEP') { // This error now comes from client-side check if reviseProject returns null
                desc = projectsDict.toast.revisionNotApplicable || 'Revision is not applicable for the current project step.';
            } else if (error.message === 'PROJECT_NOT_FOUND' || error.message === 'WORKFLOW_NOT_FOUND') {
                desc = error.message; // Keep specific server errors
            } else {
                desc = error.message || desc;
            }
           toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: desc });
       } finally {
           setIsRevising(false);
       }
   };

   const canReviseSelectedProject = React.useMemo(() => {
       if (!currentUser || !selectedProject) return false;
       if (!['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role)) return false;
       
       if (['Completed', 'Canceled'].includes(selectedProject.status)) return false;
       
       // Check if the current workflow step allows for a 'revise' transition
       // This logic would ideally be in workflow-service.ts or pre-checked
       // For now, we assume if the user role is allowed, they can attempt.
       // The backend (reviseProject) will ultimately determine if it's possible.
       return true; 
   }, [currentUser, selectedProject]);


    if (!isClient || !currentUser || (isLoadingProjects && !selectedProject)) { 
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
                <Card key={projectItem.id} className="hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 cursor-pointer" onClick={() => {setSelectedProject(projectItem); router.push(`/dashboard/projects?projectId=${projectItem.id}`, { scroll: false }); }}>
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
               <Button variant="outline" onClick={() => {setSelectedProject(null); router.push('/dashboard/projects', { scroll: false });}} className="mb-4 w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" />{projectsDict.backToList}</Button>
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
                               <Input id="project-files" type="file" multiple onChange={handleFileChange} disabled={isSubmitting || uploadedFiles.length >= MAX_FILES_UPLOAD} className="flex-grow"/>
                               <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                             </div>
                             <p className="text-xs text-muted-foreground">{projectsDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString())}</p>
                           </div>
                           {uploadedFiles.length > 0 && (
                             <div className="space-y-2 rounded-md border p-3">
                               <Label>{projectsDict.selectedFilesLabel} ({uploadedFiles.length}/{MAX_FILES_UPLOAD})</Label>
                               <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                 {uploadedFiles.map((file, index) => ( <li key={index} className="flex items-center justify-between group"><span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">{file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span></span><Button variant="ghost" size="sm" type="button" onClick={() => removeFile(index)} disabled={isSubmitting} className="opacity-50 group-hover:opacity-100 flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button></li>))}
                               </ul>
                             </div>
                           )}
                            <Button onClick={()=> handleProgressSubmit('submitted')} 
                                disabled={
                                    isSubmitting ||
                                    (currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer' && uploadedFiles.length === 0) ||
                                    (!description && uploadedFiles.length === 0 && !['Pending Scheduling', 'Pending Approval', 'Completed', 'Canceled'].includes(project.status) && !(currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer') )
                                } 
                                className="w-full sm:w-auto accent-teal">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitting ? projectsDict.submittingButton : projectsDict.submitButton}
                            </Button>
                         </div>
                       )}
                      {showOwnerDecisionSection && (
                        <div className="space-y-4 border-t pt-4 mt-4">
                          <h3 className="text-lg font-semibold">{projectsDict.ownerActionTitle}</h3><p className="text-sm text-muted-foreground">{projectsDict.ownerActionDesc}</p>
                           <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={isSubmitting} className="w-full sm:w-auto"><XCircle className="mr-2 h-4 w-4" /> {projectsDict.rejectButton}</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{projectsDict.cancelDialogTitle}</AlertDialogTitle><AlertDialogDescription>{projectsDict.cancelDialogDesc.replace('{projectName}', project.title)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>{projectsDict.cancelButton}</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDecision('rejected')} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{projectsDict.confirmRejectButton || "Confirm Rejection"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                              <Button onClick={() => handleDecision('approved')} disabled={isSubmitting} className="accent-teal w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{projectsDict.approveButton}</Button>
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
                               <Button onClick={handleScheduleSubmit} disabled={isSubmitting || !scheduleDate || !scheduleTime || !scheduleLocation} className="w-full sm:w-auto accent-teal">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}{isSubmitting ? projectsDict.schedulingButton : projectsDict.confirmScheduleButton}</Button>
                            </div>
                          )}
                        {showCalendarButton && (
                           <div className="border-t pt-4 mt-4">
                               <Button onClick={handleAddToCalendar} disabled={isAddingToCalendar} variant="outline" className="w-full sm:w-auto">
                                   {isAddingToCalendar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.5-11.5L11 14.01l-2.5-2.51L7 13l4 4 6.5-6.5L16.5 8.5z"></path></svg>}
                                  {isAddingToCalendar ? projectsDict.addingCalendarButton : projectsDict.addCalendarButton}
                               </Button>
                           </div>
                        )}
                      {showSidangOutcomeSection && (
                           <div className="space-y-4 border-t pt-4 mt-4">
                             <h3 className="text-lg font-semibold">{projectsDict.sidangOutcomeTitle}</h3><p className="text-sm text-muted-foreground">{projectsDict.sidangOutcomeDesc}</p>
                               <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                                 <Button onClick={() => handleDecision('completed')} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{projectsDict.markSuccessButton}</Button>
                                 <Button variant="outline" onClick={() => handleDecision('revise_after_sidang')} disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{projectsDict.markRevisionNeededButton || "Request Post-Sidang Revision"}</Button>
                                 <Button variant="destructive" onClick={() => handleDecision('canceled_after_sidang')} disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}{projectsDict.markFailButton}</Button>
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
                               <li key={`${file.path}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border rounded-md hover:bg-secondary/50 gap-2 sm:gap-4">
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
                            <li key={`${entry.timestamp}-${index}`} className="flex items-start gap-3">
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

