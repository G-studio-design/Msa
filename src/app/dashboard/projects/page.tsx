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
  Replace,
  Briefcase,
  MapPin,
  Plane,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getAllProjects,
    updateProject,
    reviseProject,
    getProjectById as fetchProjectByIdInternal,
    type Project,
    type WorkflowHistoryEntry,
    type FileEntry,
    type UpdateProjectParams,
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
import { notifyUsersByRole } from '@/services/notification-service';


const defaultGlobalDict = getDictionary('en');

const projectStatuses = [
    'Pending Offer', 'Pending Approval', 'Pending DP Invoice',
    'Pending Admin Files', 'Pending Survey Details', 'Pending Architect Files', 'Pending Structure Files', 'Pending MEP Files',
    'Pending Scheduling', 'Scheduled', 'Pending Post-Sidang Revision',
    'In Progress', 'Completed', 'Canceled', 'Pending Consultation Docs', 'Pending Review'
];

const MAX_FILES_UPLOAD = 10;

export default function ProjectsPage() {
  // Define types for checklist items and the overall checklist status
  interface ChecklistItem {
      name: string;
      uploaded: boolean;
      filePath?: string; // Optional: store path if needed
  }
  interface ParallelUploadChecklist {
      Arsitek?: ChecklistItem[];
      Struktur?: ChecklistItem[];
      MEP?: ChecklistItem[];
  }
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  const dict = React.useMemo(() => getDictionary(language), [language]);
  const projectsDict = React.useMemo(() => dict.projectsPage, [dict]);
  const dashboardDict = React.useMemo(() => dict.dashboardPage, [dict]);


  const [allProjects, setAllProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const [description, setDescription] = React.useState('');
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');
  const [scheduleLocation, setScheduleLocation] = React.useState('');

  const [surveyDate, setSurveyDate] = React.useState('');
  const [surveyTime, setSurveyTime] = React.useState('');
  const [surveyDescription, setSurveyDescription] = React.useState('');

  const [isAddingToCalendar, setIsAddingToCalendar] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [revisionNote, setRevisionNote] = React.useState('');
  const [isRevising, setIsRevising] = React.useState(false);

  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [displayedProjects, setDisplayedProjects] = React.useState<Project[]>([]);

  const [isInitialImageUploadDialogOpen, setIsInitialImageUploadDialogOpen] = React.useState(false);
  const [initialImageFiles, setInitialImageFiles] = React.useState<File[]>([]);
  const [initialImageDescription, setInitialImageDescription] = React.useState('');
  const [isSubmittingInitialImages, setIsSubmittingInitialImages] = React.useState(false);

  const [parallelUploadChecklistStatus, setParallelUploadChecklistStatus] = React.useState<ParallelUploadChecklist | null>(null);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

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
    if(isClient && currentUser) {
        fetchProjects();
    }
  }, [isClient, currentUser, fetchProjects]);

  React.useEffect(() => {
      if (isClient && allProjects.length > 0 && !isLoadingProjects) {
          const projectIdFromUrl = searchParams.get('projectId');
          if (projectIdFromUrl) {
              const projectToSelect = allProjects.find(p => p.id === projectIdFromUrl);
              if (projectToSelect) {
                  setSelectedProject(projectToSelect);
                  setDescription('');
                  setUploadedFiles([]);
                  setScheduleDate(projectToSelect.scheduleDetails?.date || '');
                  setScheduleTime(projectToSelect.scheduleDetails?.time || '');
                  setScheduleLocation(projectToSelect.scheduleDetails?.location || '');
                  setSurveyDate(projectToSelect.surveyDetails?.date || '');
                  setSurveyTime(projectToSelect.surveyDetails?.time || '');
                  setSurveyDescription(projectToSelect.surveyDetails?.description || '');
                  setRevisionNote('');
                  setInitialImageFiles([]);
                  setInitialImageDescription('');
              } else {
                  console.warn(`Project with ID "${projectIdFromUrl}" from URL not found.`);
                  if(isClient && projectsDict?.toast?.error && projectsDict?.toast?.projectNotFound) {
                    toast({ variant: 'destructive', title: projectsDict.toast.error, description: projectsDict.toast.projectNotFound });
                  }
                  router.replace('/dashboard/projects', { scroll: false });
              }
          } else {
              setSelectedProject(null);
          }
      }
  }, [searchParams, allProjects, isClient, isLoadingProjects, router, toast, projectsDict]);

  // Effect to initialize the parallel upload checklist status
    React.useEffect(() => {
        if (isClient && selectedProject && selectedProject.status === 'Pending Parallel Design Uploads' && currentUser) {
            const requiredChecklists: ParallelUploadChecklist = {
                Arsitek: [{ name: 'Gambar', uploaded: false }, { name: 'Daftar Simak', uploaded: false }, { name: 'SpekTek', uploaded: false }, { name: 'RAP', uploaded: false }],
                Struktur: [{ name: 'Gambar', uploaded: false }, { name: 'Analisa Laporan', uploaded: false }, { name: 'Hammer Test', uploaded: false }, { name: 'SpekTek', uploaded: false }, { name: 'Daftar SImak', uploaded: false }],
                MEP: [{ name: 'Gambar', uploaded: false }, { name: 'Daftar Simak', uploaded: false }, { name: 'SpekTek', uploaded: false }, { name: 'RAP', uploaded: false }, { name: 'Laporan', uploaded: false }],
            };

            const currentStatus: ParallelUploadChecklist = {};

            (['Arsitek', 'Struktur', 'MEP'] as (keyof ParallelUploadChecklist)[]).forEach(division => {
                const checklistItems = requiredChecklists[division];
                if (checklistItems) {
                    currentStatus[division] = checklistItems.map(item => {
                        const uploadedFile = selectedProject.files?.find(file => {
                            // Simple case-insensitive match ignoring spaces and extensions
                            const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/\s/g, '').toLowerCase();
                            const itemNameClean = item.name.replace(/\s/g, '').toLowerCase();
                            return fileNameWithoutExt === itemNameClean && file.uploadedBy === division;
                        });
                        return {
                            ...item,
                            uploaded: !!uploadedFile,
                            filePath: uploadedFile ? uploadedFile.path : undefined,
                        };
                    });
                }
            });
            setParallelUploadChecklistStatus(currentStatus);
        } else { setParallelUploadChecklistStatus(null); } // Reset when not in parallel upload status
    }, [isClient, selectedProject, currentUser]); // Depend on selectedProject and currentUser

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
      if (!isClient || !projectsDict?.notApplicable) return "...";
      if (!timestamp) return projectsDict?.notApplicable || "N/A";
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
  
  const handleInitialImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        const filesArray = Array.from(event.target.files);
        if (filesArray.length + initialImageFiles.length > MAX_FILES_UPLOAD) {
            toast({
                variant: 'destructive',
                title: projectsDict.toast.error,
                description: projectsDict.toast.maxFilesExceeded.replace('{max}', MAX_FILES_UPLOAD.toString()),
            });
            return;
        }
        setInitialImageFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };

  const removeInitialImageFile = (index: number) => {
    setInitialImageFiles(initialImageFiles.filter((_, i) => i !== index));
  };

  const getTranslatedStatus = React.useCallback((statusKey: string): string => {
        if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
        const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[key] || statusKey;
    }, [isClient, dashboardDict]);

  const getStatusBadge = React.useCallback((status: string) => {
    if (!isClient || !status || !dashboardDict?.status) return <Skeleton className="h-5 w-20" />;
    const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
    const translatedStatus = dashboardDict.status[statusKey] || status;
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "py-1 px-2 text-xs";
    let Icon = Clock;
     switch (statusKey) {
        case 'completed': case 'selesai': variant = 'default'; className = `${className} bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700 dark:text-primary-foreground`; Icon = CheckCircle; break;
        case 'inprogress': case 'sedangberjalan': variant = 'secondary'; className = `${className} bg-blue-500 text-white dark:bg-blue-600 dark:text-primary-foreground hover:bg-blue-600 dark:hover:bg-blue-700`; Icon = Clock; break;
        case 'pendingapproval': case 'menunggupersetujuan': variant = 'outline'; className = `${className} border-yellow-500 text-yellow-600 dark:border-yellow-400 dark:text-yellow-500`; Icon = AlertTriangle; break;
        case 'pendingpostsidangrevision': case 'menunggurevisipascSidang': variant = 'outline'; className = `${className} border-orange-400 text-orange-500 dark:border-orange-300 dark:text-orange-400`; Icon = RefreshCw; break;
        case 'delayed': case 'tertunda': variant = 'destructive'; className = `${className} bg-orange-500 text-white dark:bg-orange-600 dark:text-primary-foreground hover:bg-orange-600 dark:hover:bg-orange-700 border-orange-500 dark:border-orange-600`; Icon = Clock; break;
        case 'canceled': case 'dibatalkan': variant = 'destructive'; Icon = XCircle; break;
        case 'pending': case 'pendinginitialinput': case 'menungguinputawal': case 'pendingoffer': case 'menunggupenawaran': variant = 'outline'; className = `${className} border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-500`; Icon = Clock; break;
        case 'pendingdpinvoice': case 'menunggufakturdp': case 'pendingadminfiles': case 'menungguberkasadministrasi': case 'pendingsurveydetails': case 'menunggudetailsurvei': case 'pendingarchitectfiles': case 'menungguberkasarsitektur': case 'pendingstructurefiles':  case 'menungguberkasstruktur': case 'pendingmepfiles': case 'menungguberkasmep': case 'pendingfinalcheck': case 'menunggupemeriksaanakhir': case 'pendingscheduling': case 'menunggupenjadwalan': case 'pendingconsultationdocs':  case 'menungudokkonsultasi': case 'pendingreview':  case 'menunggutinjauan': variant = 'secondary'; Icon = Clock; break;
        case 'scheduled': case 'terjadwal': variant = 'secondary'; className = `${className} bg-purple-500 text-white dark:bg-purple-600 dark:text-primary-foreground hover:bg-purple-600 dark:hover:bg-purple-700`; Icon = CalendarClock; break;
        default: variant = 'secondary'; Icon = Clock;
    }
    return <Badge variant={variant} className={className}><Icon className="mr-1 h-3 w-3" />{translatedStatus}</Badge>;
  }, [isClient, dashboardDict]);

  const handleProgressSubmit = React.useCallback(async (actionTaken: string = 'submitted', filesToSubmit?: File[], descriptionForSubmit?: string) => {
    if (!currentUser || !selectedProject) {
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.notYourTurn });
      return;
    }

    const currentFiles = filesToSubmit || uploadedFiles;
    const currentDescription = descriptionForSubmit || description;

    const isDecisionOrTerminalAction = ['approved', 'rejected', 'canceled', 'completed', 'revise_offer', 'revise_after_sidang', 'canceled_after_sidang', 'revision_completed_and_finish'].includes(actionTaken);
    const isSchedulingAction = actionTaken === 'scheduled';
    const isSurveyAction = selectedProject.status === 'Pending Survey Details' && actionTaken === 'submitted';
    const isArchitectInitialImageUpload = actionTaken === 'architect_uploaded_initial_images_for_struktur';
    
    setIsSubmitting(true);
    if (isArchitectInitialImageUpload) setIsSubmittingInitialImages(true);

    try {
        if (!isDecisionOrTerminalAction && !isSchedulingAction && !isSurveyAction && !isArchitectInitialImageUpload && !currentDescription && currentFiles.length === 0 ) {
          toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideDescOrFile });
          setIsSubmitting(false);
          if (isArchitectInitialImageUpload) setIsSubmittingInitialImages(false);
          return;
        }
        if (currentUser.role === 'Admin Proyek' && selectedProject.status === 'Pending Offer' && currentFiles.length === 0 && actionTaken === 'submitted') {
            toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: projectsDict.toast.provideOfferFile });
            setIsSubmitting(false);
            if (isArchitectInitialImageUpload) setIsSubmittingInitialImages(false);
            return;
        }

        const uploadedFileEntries: Omit<FileEntry, 'timestamp'>[] = [];
        if (currentFiles.length > 0) {
            for (const file of currentFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', selectedProject.id);
                formData.append('projectTitle', selectedProject.title);

                try {
                    const response = await fetch('/api/upload-file', { method: 'POST', body: formData });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ message: 'File upload failed with status ' + response.status }));
                        throw new Error(errorData.message || `Failed to upload ${file.name}`);
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
                    if (isArchitectInitialImageUpload) setIsSubmittingInitialImages(false);
                    return;
                }
            }
        }

        const updatedProjectData: UpdateProjectParams = {
            projectId: selectedProject.id,
            updaterRole: currentUser.role,
            updaterUsername: currentUser.username,
            actionTaken: actionTaken,
            files: uploadedFileEntries.length > 0 ? uploadedFileEntries : undefined,
            note: currentDescription || undefined,
            scheduleDetails: selectedProject.status === 'Pending Scheduling' && actionTaken === 'scheduled' ? {
                date: scheduleDate,
                time: scheduleTime,
                location: scheduleLocation
            } : undefined,
             surveyDetails: selectedProject.status === 'Pending Survey Details' && actionTaken === 'submitted' ? {
                date: surveyDate,
                time: surveyTime,
                description: surveyDescription
            } : undefined,
        };

        const newlyUpdatedProjectResult = await updateProject(updatedProjectData);
        const newlyUpdatedProject = await fetchProjectByIdInternal(selectedProject.id); // Re-fetch project details
        
        if (newlyUpdatedProject) {
            setAllProjects(prev => prev.map(p => p.id === newlyUpdatedProject.id ? newlyUpdatedProject : p));
            setSelectedProject(newlyUpdatedProject); 
        }
        
        if (newlyUpdatedProjectResult) {
            if (actionTaken === 'revise_offer') {
                toast({ title: projectsDict.toast.revisionRequested, description: projectsDict.toast.projectSentForRevision.replace('{projectName}', newlyUpdatedProjectResult?.title || '').replace('{division}', getTranslatedStatus(newlyUpdatedProjectResult?.assignedDivision || ''))});
            } else if (actionTaken === 'completed') {
                 toast({ title: projectsDict.toast.sidangOutcomeSuccessTitle, description: projectsDict.toast.sidangOutcomeSuccessDesc.replace('{title}', newlyUpdatedProjectResult?.title || '') });
            } else if (actionTaken === 'canceled_after_sidang') {
                 toast({ title: projectsDict.toast.sidangOutcomeCanceledTitle, description: projectsDict.toast.sidangOutcomeCanceledDesc.replace('{title}', newlyUpdatedProjectResult?.title || '') });
            } else if (actionTaken === 'revise_after_sidang') {
                 toast({ title: projectsDict.toast.sidangOutcomeRevisionTitle, description: projectsDict.toast.sidangOutcomeRevisionDesc.replace('{title}', newlyUpdatedProjectResult?.title || '').replace('{division}', getTranslatedStatus(newlyUpdatedProjectResult?.assignedDivision || ''))});
            } else if (actionTaken === 'architect_uploaded_initial_images_for_struktur') {
                toast({ title: projectsDict.toast.initialImagesUploadedTitle, description: projectsDict.toast.initialImagesUploadedDesc.replace('{projectName}', newlyUpdatedProjectResult?.title || '').replace('{actorUsername}', currentUser.username) });
            } else if (actionTaken === 'revision_completed_and_finish') {
                 toast({ title: projectsDict.toast.revisionCompletedTitle, description: projectsDict.toast.revisionCompletedDesc.replace('{title}', newlyUpdatedProjectResult?.title || '') });
            } else if (newlyUpdatedProjectResult?.status === 'Completed') {
                toast({ title: projectsDict.toast.projectMarkedCompleted, description: projectsDict.toast.projectCompletedSuccessfully.replace('{title}', newlyUpdatedProjectResult?.title || '') });
            } else if (newlyUpdatedProjectResult?.status === 'Canceled') {
                toast({ title: projectsDict.toast.projectMarkedCanceled, description: projectsDict.toast.projectCanceledSuccessfully.replace('{title}', newlyUpdatedProjectResult?.title || '') });
            } else if (actionTaken === 'scheduled') {
                toast({ title: projectsDict.toast.sidangScheduled, description: projectsDict.toast.sidangScheduledDesc });
            } else if (newlyUpdatedProjectResult?.assignedDivision) {
                toast({ title: projectsDict.toast.progressSubmitted, description: projectsDict.toast.notifiedNextStep.replace('{division}', getTranslatedStatus(newlyUpdatedProjectResult?.assignedDivision || '')) });
            } else {
                 toast({ title: projectsDict.toast.progressSubmitted, description: `Proyek "${newlyUpdatedProjectResult?.title || ''}" telah diperbarui.` });
            }
        }  else { 
             toast({
                variant: 'default',
                title: projectsDict.toast.actionDidNotChangeStatusTitle,
                description: projectsDict.toast.actionDidNotChangeStatusDesc
             });
        }


        if (actionTaken === 'submitted' || !['approved', 'rejected', 'canceled', 'completed', 'revise_after_sidang', 'canceled_after_sidang', 'scheduled', 'architect_uploaded_initial_images_for_struktur', 'revise_offer'].includes(actionTaken)) {
            setDescription('');
            setUploadedFiles([]);
        }
        if (actionTaken.includes('revise')) { 
            setRevisionNote('');
        }
        if (isArchitectInitialImageUpload) {
            setInitialImageFiles([]);
            setInitialImageDescription('');
            setIsInitialImageUploadDialogOpen(false);
        }

      } catch (error: any) {
         console.error("Error updating project:", error);
         toast({ variant: 'destructive', title: projectsDict.toast.updateError, description: error.message || projectsDict.toast.failedToSubmitProgress });
      } finally {
         setIsSubmitting(false);
         if (isArchitectInitialImageUpload) setIsSubmittingInitialImages(false);
      }
  }, [currentUser, selectedProject, uploadedFiles, description, scheduleDate, scheduleTime, scheduleLocation, surveyDate, surveyTime, surveyDescription, projectsDict, toast, getTranslatedStatus, initialImageFiles, initialImageDescription, router, fetchProjectByIdInternal]);

  const handleDecision = React.useCallback((decision: 'approved' | 'rejected' | 'completed' | 'revise_offer' | 'revise_after_sidang' | 'canceled_after_sidang' | 'revision_completed_and_finish') => {
    if (!currentUser || !selectedProject ) {
      toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.onlyOwnerDecision });
      return;
    }
    const isOwnerAction = ['approved', 'rejected', 'completed', 'revise_offer', 'revise_after_sidang', 'canceled_after_sidang'].includes(decision);
    if (isOwnerAction && currentUser.role !== 'Owner') {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.onlyOwnerDecision });
        return;
    }
    const isPostSidangAdminAction = decision === 'revision_completed_and_finish';
    if (isPostSidangAdminAction && currentUser.role !== 'Admin Proyek') {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: "Only Admin Proyek can complete post-sidang revisions." });
        return;
    }

    handleProgressSubmit(decision);
  }, [currentUser, selectedProject, projectsDict, toast, handleProgressSubmit]);

  const handleScheduleSubmit = React.useCallback(() => {
    if (!currentUser || !selectedProject) {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.schedulingPermissionDenied });
        return;
    }
    const canSchedule = selectedProject.status === 'Pending Scheduling' &&
                        ( (currentUser.role === 'Admin Proyek' && selectedProject.assignedDivision === currentUser.role) ||
                          currentUser.role === 'Owner' );

     if (!canSchedule) {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.schedulingPermissionDenied });
        return;
     }

     if (!scheduleDate || !scheduleTime || !scheduleLocation.trim()) {
         toast({ variant: 'destructive', title: projectsDict.toast.missingScheduleInfo, description: projectsDict.toast.provideDateTimeLoc });
         return;
     }
     handleProgressSubmit('scheduled');
  }, [currentUser, selectedProject, scheduleDate, scheduleTime, scheduleLocation, projectsDict, toast, handleProgressSubmit]);

   const handleSurveySubmit = React.useCallback(async () => {
        if (!currentUser || !selectedProject ) { 
            toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.notYourTurn });
            return;
        }
        const canSubmitSurvey = selectedProject.status === 'Pending Survey Details' &&
                            (
                                (currentUser.role === 'Admin Proyek' && selectedProject.assignedDivision === currentUser.role) ||
                                currentUser.role === 'Owner' ||
                                currentUser.role === 'Arsitek'
                            );

        if (!canSubmitSurvey) {
            toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: "You do not have permission to submit survey details for this project at this stage." });
            return;
        }

        if (!surveyDate || !surveyTime || !surveyDescription.trim()) {
            toast({ variant: 'destructive', title: projectsDict.toast.missingInput, description: "Please provide survey date, time, and description." });
            return;
        }
        await handleProgressSubmit('submitted');
    }, [currentUser, selectedProject, surveyDate, surveyTime, surveyDescription, projectsDict, toast, handleProgressSubmit]);

    const handleAddToCalendar = React.useCallback(async () => {
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
      const endTime = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);

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

        let errorDetails = projectsDict.toast.couldNotAddEvent;
        let responseText = "";
        if (!response.ok) {
            try {
                responseText = await response.text();
                if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                    const errorPayload = JSON.parse(responseText);
                    errorDetails = errorPayload?.details || errorPayload?.error || errorDetails;
                } else {
                    errorDetails = responseText || errorDetails;
                }
            } catch (e) {
                console.error("Server returned non-JSON error response for calendar event or failed to parse JSON:", response.status, responseText, e);
                 errorDetails = responseText.substring(0,100) || `Server: ${response.status}`;
            }
            throw new Error(errorDetails);
        }
        const result = await response.json();
        toast({ title: projectsDict.toast.addedToCalendar, description: projectsDict.toast.eventId.replace('{id}', result.eventId || 'N/A') });
      } catch (error: any) {
        console.error("Error scheduling event:", error);
        const descriptionText = (error && typeof error.message === 'string' && error.message.trim() !== "")
                            ? error.message
                            : projectsDict.toast.couldNotAddEvent;
        toast({
            variant: 'destructive',
            title: projectsDict.toast.calendarError,
            description: descriptionText
        });
      } finally {
        setIsAddingToCalendar(false);
      }
    }, [selectedProject, currentUser, projectsDict, toast]);

    const roleFilteredProjects = React.useMemo(() => {
        if (!currentUser || !isClient || isLoadingProjects) return [];
        const userRoleCleaned = currentUser.role.trim().toLowerCase();
        if (['owner', 'akuntan', 'admin proyek', 'admin developer'].includes(userRoleCleaned)) {
            return allProjects;
        }
        if (['struktur', 'mep'].includes(userRoleCleaned)) {
            return allProjects.filter(project =>
                (project.assignedDivision?.trim().toLowerCase() === userRoleCleaned) ||
                (project.status === 'Pending Architect Files' &&
                 project.workflowHistory.some(entry => entry.action.toLowerCase().includes('uploaded initial reference images for struktur & mep')))
            );
        }
        return allProjects.filter(project =>
            project.assignedDivision?.trim().toLowerCase() === userRoleCleaned
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

   const canDownloadFiles = React.useMemo(() => currentUser && ['Owner', 'Akuntan', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP', 'Admin Developer'].includes(currentUser.role.trim()), [currentUser]);

   const handleDownloadFile = React.useCallback(async (file: FileEntry) => {
        if (!isClient) return;
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/download-file?filePath=${encodeURIComponent(file.path)}`);
            if (!response.ok) {
                let errorDetails = `Failed to download ${file.name}. Status: ${response.status}`;
                let responseText = "";
                try {
                    responseText = await response.text();
                    if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
                        const errorData = JSON.parse(responseText);
                        errorDetails = errorData.message || errorData.error || errorDetails;
                    } else {
                        errorDetails = responseText.substring(0,200) || errorDetails;
                    }
                } catch (e) {
                     console.warn("Could not parse error response for file download, or response text was empty. Raw response text (if available):", responseText);
                     errorDetails = responseText || `Failed to download ${file.name}. Status: ${response.status}`;
                }
                throw new Error(errorDetails);
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
    }, [isClient, toast, projectsDict]);

    const handleReviseSubmit = React.useCallback(async () => {
      if (!currentUser || !selectedProject) {
        toast({ variant: 'destructive', title: projectsDict.toast.permissionDenied, description: projectsDict.toast.revisionPermissionDenied });
        return;
      }
      
      let actionForRevision = 'revise'; 
      if (currentUser.role === 'Owner' && selectedProject.status === 'Pending Approval' && selectedProject.progress === 20) {
        actionForRevision = 'revise_offer';
      }

      if (!revisionNote.trim() && actionForRevision !== 'revise_offer') {
        toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: projectsDict.toast.revisionNoteRequired });
        return;
      }

      setIsRevising(true);

      try {
        const revisedProjectResult = await reviseProject(selectedProject.id, currentUser.username, currentUser.role, revisionNote, actionForRevision);
        const updatedProject = await fetchProjectByIdInternal(selectedProject.id); 
        if (updatedProject) {
            setAllProjects(prev => prev.map(p => (p.id === updatedProject.id ? updatedProject : p)));
            setSelectedProject(updatedProject); 
        }
        
        if (revisedProjectResult) {
          setRevisionNote('');
          toast({ title: projectsDict.toast.revisionSuccess, description: projectsDict.toast.revisionSuccessDesc.replace('{division}', getTranslatedStatus(revisedProjectResult.assignedDivision)) });
        } else { 
            toast({
                variant: 'default',
                title: projectsDict.toast.revisionNotApplicableShort,
                description: projectsDict.toast.revisionNotApplicable
            });
        }
      } catch (error: any) {
        console.error("Error revising project:", error);
        let desc = projectsDict.toast.failedToRevise;
        if (error.message === 'WORKFLOW_NOT_FOUND') {
          desc = "Workflow definition not found for this project. Cannot process revision.";
        } else if (error.message === 'PROJECT_NOT_FOUND') {
          desc = "Project not found for revision.";
        } else if (error.message === 'REVISION_NOT_SUPPORTED_FOR_CURRENT_STEP') {
          desc = projectsDict.toast.revisionNotApplicable;
        } else {
          desc = error.message || desc;
        }
        toast({ variant: 'destructive', title: projectsDict.toast.revisionError, description: desc });
      } finally {
        setIsRevising(false);
      }
    }, [currentUser, selectedProject, revisionNote, projectsDict, toast, getTranslatedStatus, router, fetchProjectByIdInternal]);

    const canPerformSelectedProjectAction = React.useMemo(() => {
      if (!currentUser || !selectedProject) return false;
      if (currentUser.role === 'Admin Developer') return true;
      if (currentUser.role === 'Owner') {
          return selectedProject.assignedDivision === 'Owner' // Can always act if assigned as Owner
                 || ['Pending Approval', 'Scheduled', 'Pending Scheduling', 'Pending Survey Details'].includes(selectedProject.status) // Specific Owner-related steps
                 || (selectedProject.status === 'Pending Parallel Design Uploads' && ['Arsitek', 'Struktur', 'MEP'].includes(currentUser.role)); // Owner can also act on parallel uploads if assigned
      }
      // Arsitek can also act on 'Pending Survey Details'
      if (currentUser.role === 'Arsitek' && selectedProject.status === 'Pending Survey Details') {
        return true;
      }
      const currentUserRoleCleaned = currentUser.role.trim();
      const assignedDivisionCleaned = selectedProject.assignedDivision?.trim();
      return currentUserRoleCleaned === assignedDivisionCleaned;
    }, [currentUser, selectedProject]); // Removed canPerformSelectedProjectAction from its own dependency array

     // Special check for Parallel Uploads: Allow Arsitek/Struktur/MEP even if assigned_division is 'Admin Proyek' in MSa workflow
     const canPerformParallelUpload = React.useMemo(() => selectedProject && selectedProject.status === 'Pending Parallel Design Uploads' && ['Arsitek', 'Struktur', 'MEP'].includes(currentUser?.role || ''), [selectedProject, currentUser]);


    const showUploadSection = React.useMemo(() => {
        if (!selectedProject || !currentUser || !canPerformSelectedProjectAction) return false;
        const statusesExpectingUpload = [
            'Pending Offer', 'Pending DP Invoice', 'Pending Admin Files',
            'Pending Architect Files', 'Pending Structure Files', 
            'Pending MEP Files',
            'Pending Consultation Docs', 'Pending Post-Sidang Revision',
            'Pending Parallel Design Uploads' // Added the new status here
        ];
        return statusesExpectingUpload.includes(selectedProject.status) || canPerformParallelUpload;
   }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showArchitectInitialImageUploadSection = React.useMemo(() => {
    return selectedProject &&
           currentUser &&
           selectedProject.status === 'Pending Architect Files' &&
           currentUser.role === 'Arsitek' &&
           canPerformSelectedProjectAction;
    }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showOwnerDecisionSection = React.useMemo(() => {
    if (!selectedProject || !currentUser || !canPerformSelectedProjectAction) return false;
    return selectedProject.status === 'Pending Approval' && currentUser.role === 'Owner' && 
           (selectedProject.progress === 20 || selectedProject.progress === 30); 
   },[selectedProject, currentUser, canPerformSelectedProjectAction]);

   const showSchedulingSection = React.useMemo(() => {
        if (!selectedProject || !currentUser) return false;
        return selectedProject.status === 'Pending Scheduling' &&
               (
                  (currentUser.role === 'Admin Proyek' && canPerformSelectedProjectAction) || // Admin Proyek yang ditugaskan
                  currentUser.role === 'Owner'
               );
    },[selectedProject, currentUser, canPerformSelectedProjectAction]);

    const showSurveyDetailsInputSection = React.useMemo(() => {
        if (!selectedProject || !currentUser) return false;
        const userRoleCleaned = currentUser.role.trim().toLowerCase();
        return selectedProject.status === 'Pending Survey Details' &&
               (
                   userRoleCleaned === 'admin proyek' ||
                   userRoleCleaned === 'owner' ||
                   userRoleCleaned === 'arsitek'
               );
    }, [selectedProject, currentUser]);


   const showCalendarButton = React.useMemo(() =>
        selectedProject &&
        selectedProject.status === 'Scheduled' &&
        currentUser &&
        (currentUser.role === 'Owner' || currentUser.role === 'Admin Proyek'),
    [selectedProject, currentUser]);

    const canReviseSelectedProject = React.useMemo(() => {
        if (!currentUser || !selectedProject) return false;
        const allowedRoles = ['Owner', 'Akuntan', 'Admin Developer', 'Admin Proyek'];
        const nonRevisableStatuses = ['Completed', 'Canceled'];
        
        if (currentUser.role === 'Owner' && selectedProject.status === 'Pending Approval' && selectedProject.progress === 20) {
            return true; 
        }
        
        return allowedRoles.includes(currentUser.role.trim()) && !nonRevisableStatuses.includes(selectedProject.status);
    }, [currentUser, selectedProject]);


    const showSidangOutcomeSection = React.useMemo(() => {
        if (!selectedProject || !currentUser || !canPerformSelectedProjectAction) return false;
        return selectedProject.status === 'Scheduled' &&
               currentUser.role === 'Owner';
    }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

    const showPostSidangRevisionSection = React.useMemo(() => {
        return selectedProject &&
               currentUser &&
               selectedProject.status === 'Pending Post-Sidang Revision' &&
               currentUser.role === 'Admin Proyek' &&
               canPerformSelectedProjectAction;
    }, [selectedProject, currentUser, canPerformSelectedProjectAction]);

    const handleNotifyDivisionForRevision = React.useCallback(async (targetDivision: 'Arsitek' | 'Struktur') => {
        if (!selectedProject || !currentUser) return;
        setIsSubmitting(true); 
        try {
            const message = projectsDict.toast.revisionNotificationSentDesc
                .replace('{division}', getTranslatedStatus(targetDivision))
                .replace('{projectName}', selectedProject.title)
                .replace('{actorUsername}', currentUser.username); 

            await notifyUsersByRole(targetDivision, message, selectedProject.id);
            toast({ title: projectsDict.toast.revisionNotificationSentTitle, description: message });
        } catch (error:any) {
            console.error(`Error notifying ${targetDivision} for revision:`, error);
            toast({ variant: 'destructive', title: projectsDict.toast.error, description: error.message || `Failed to notify ${targetDivision}.`});
        } finally {
            setIsSubmitting(false);
        }

    }, [selectedProject, currentUser, projectsDict, toast, getTranslatedStatus]);


    if (!isClient || !currentUser || (isLoadingProjects && !selectedProject && !searchParams.get('projectId'))) {
        return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
                 <Card className="shadow-md animate-pulse">
                     <CardHeader className="p-4 sm:p-6"><Skeleton className="h-7 w-3/5 mb-2" /><Skeleton className="h-4 w-4/5" /></CardHeader>
                     <CardContent className="p-4 sm:p-6 pt-0">
                         <div className="flex justify-end mb-4"><Skeleton className="h-10 w-32" /></div>
                         <div className="space-y-4">{[...Array(3)].map((_, i) => (<Card key={`project-skel-${i}`} className="opacity-50 border-muted/50"><CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6"><div><Skeleton className="h-5 w-3/5 mb-1" /><Skeleton className="h-3 w-4/5" /></div><div className="flex-shrink-0 mt-2 sm:mt-0"><Skeleton className="h-5 w-20 rounded-full" /></div></CardHeader><CardContent className="p-4 sm:p-6 pt-0"><div className="flex items-center gap-2"><Skeleton className="flex-1 h-2" /><Skeleton className="h-3 w-1/4" /></div></CardContent></Card>))}</div>
                     </CardContent>
                 </Card>
            </div>
        );
    }

  const renderProjectList = () => {
    if (!isClient || !projectsDict?.projectListTitle) {
        return (<div className="container mx-auto py-4 px-4 md:px-6 space-y-6"><Card><CardHeader className="p-4 sm:p-6"><Skeleton className="h-7 w-3/5 mb-2" /></CardHeader></Card></div>);
    }
    return (
      <Card className="shadow-md">
        <CardHeader className="p-4 sm:p-6">
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
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            {isLoadingProjects && displayedProjects.length === 0 ? (
                [...Array(3)].map((_, i) => (
                    <Card key={`project-list-skel-${i}`} className="opacity-50 border-muted/50 animate-pulse">
                        <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6">
                            <div className="flex-1 min-w-0"><Skeleton className="h-5 w-3/5 mb-1" /><Skeleton className="h-3 w-4/5" /></div>
                            <div className="flex-shrink-0 mt-2 sm:mt-0"><Skeleton className="h-5 w-20 rounded-full" /></div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0"><div className="flex items-center gap-2"><Skeleton className="flex-1 h-2" /><Skeleton className="h-3 w-1/4" /></div></CardContent>
                    </Card>
                ))
            ) : displayedProjects.length === 0 ? (<p className="text-muted-foreground text-center py-4">{searchTerm ? projectsDict.noSearchResults : projectsDict.noProjectsFound}</p>) : (
              displayedProjects.map((projectItem) => (
                <Card key={projectItem.id} className="hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 cursor-pointer" onClick={() => {setSelectedProject(projectItem); router.push(`/dashboard/projects?projectId=${projectItem.id}`, { scroll: false }); }}>
                  <CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6">
                    <div className="flex-1 min-w-0"><CardTitle className="text-base sm:text-lg">{projectItem.title}</CardTitle><CardDescription className="text-xs text-muted-foreground mt-1 truncate">{projectsDict.assignedLabel}: {getTranslatedStatus(projectItem.assignedDivision) || projectsDict.none} {projectItem.nextAction ? `| ${projectsDict.nextActionLabel}: ${projectItem.nextAction}` : ''}</CardDescription></div>
                     <div className="flex-shrink-0 mt-2 sm:mt-0">{getStatusBadge(projectItem.status)}</div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                     {projectItem.status !== 'Canceled' && projectItem.status !== 'Completed' && (<div className="flex items-center gap-2"><Progress value={projectItem.progress} className="w-full h-2" /><span className="text-xs text-muted-foreground font-medium">{projectItem.progress}%</span></div>)}
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
       if (!isClient || !projectsDict?.backToList || !project) return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
                <Button variant="outline" onClick={() => {setSelectedProject(null); router.push('/dashboard/projects', { scroll: false });}} className="mb-4 w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" />{isClient ? projectsDict.backToList : defaultGlobalDict.projectsPage.backToList}</Button>
                <Card className="shadow-md animate-pulse">
                    <CardHeader className="p-4 sm:p-6"> <Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-4 w-full" /></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0"><Skeleton className="h-64 w-full" /></CardContent>
                </Card>
            </div>
       );

       return (
           <>
                <Button variant="outline" onClick={() => {setSelectedProject(null); router.push('/dashboard/projects', { scroll: false });}} className="mb-4 w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" />{projectsDict.backToList}</Button>
                
                 <Card className="shadow-md mb-6">
                   <CardHeader className="p-4 sm:p-6">
                     <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1 min-w-0"><CardTitle className="text-xl md:text-2xl">{project.title}</CardTitle><CardDescription className="mt-1 text-xs sm:text-sm">{projectsDict.statusLabel}: {getStatusBadge(project.status)} | {projectsDict.nextActionLabel}: {project.nextAction || projectsDict.none} | {projectsDict.assignedLabel}: {getTranslatedStatus(project.assignedDivision) || projectsDict.none}</CardDescription></div>
                           <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0">
                               <div className="text-sm font-medium">{projectsDict.progressLabel}</div>
                               <div className="flex items-center gap-2 mt-1"><Progress value={project.progress} className="w-full md:w-32 h-2" /><span className="text-xs text-muted-foreground font-medium">{project.progress}%</span></div>
                           </div>
                     </div>
                   </CardHeader>
                </Card>

                 <Card className="mb-6 shadow-md">
                    <CardHeader className="p-4 sm:p-6"><CardTitle>{projectsDict.workflowHistoryTitle}</CardTitle><CardDescription>{projectsDict.workflowHistoryDesc}</CardDescription></CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <ul className="space-y-3">
                        {(project.workflowHistory || []).map((entry, index) => (
                            <li key={`${entry.timestamp}-${index}-${entry.action.replace(/\s/g, '_')}`} className="flex items-start gap-3">
                                <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${index === project.workflowHistory.length - 1 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/50'}`}></div>
                                <div>
                                    <p className="text-sm font-medium">{entry.action}</p>
                                    <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
                                    {entry.note && <p className="text-xs text-muted-foreground italic mt-1 whitespace-pre-wrap">{projectsDict.revisionNotePrefix} {entry.note}</p>}
                                </div>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                  </Card>

                  <Card className="mb-6 shadow-md">
                       <CardHeader className="p-4 sm:p-6"><CardTitle>{projectsDict.uploadedFilesTitle}</CardTitle><CardDescription>{projectsDict.uploadedFilesDesc}</CardDescription></CardHeader>
                       <CardContent className="p-4 sm:p-6 pt-0">
                         {(project.files || []).length === 0 ? (<p className="text-sm text-muted-foreground">{projectsDict.noFiles}</p>) : (
                           <ul className="space-y-2">
                              {(project.files || []).map((file, index) => (
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
                  
                  {/* Moved Architect's Initial Image Upload Section */}
                  {showArchitectInitialImageUploadSection && (
                    <Card className="mb-6 shadow-md">
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle>{projectsDict.architectUploadInitialImagesTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <Dialog open={isInitialImageUploadDialogOpen} onOpenChange={setIsInitialImageUploadDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Upload className="mr-2 h-4 w-4" /> {projectsDict.architectUploadInitialImagesButton}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{projectsDict.architectUploadInitialImagesDialogTitle}</DialogTitle>
                                        <DialogDescription>{projectsDict.architectUploadInitialImagesDialogDesc}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="initial-image-description">{projectsDict.descriptionLabel} ({projectsDict.optionalNoteLabel})</Label>
                                            <Textarea id="initial-image-description" placeholder={projectsDict.revisionFilesDescriptionPlaceholder} value={initialImageDescription} onChange={(e) => setInitialImageDescription(e.target.value)} disabled={isSubmittingInitialImages}/>
                                        </div>
                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="initial-image-files">{projectsDict.attachFilesLabel}</Label>
                                            <Input id="initial-image-files" type="file" multiple onChange={handleInitialImageFileChange} disabled={isSubmittingInitialImages || initialImageFiles.length >= MAX_FILES_UPLOAD}/>
                                            <p className="text-xs text-muted-foreground">{projectsDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString())}</p>
                                        </div>
                                        {initialImageFiles.length > 0 && (
                                            <div className="space-y-2 rounded-md border p-3">
                                                <Label>{projectsDict.selectedFilesLabel} ({initialImageFiles.length}/{MAX_FILES_UPLOAD})</Label>
                                                <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                                {initialImageFiles.map((file, index) => ( <li key={`initial-img-${index}`} className="flex items-center justify-between group"><span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">{file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span></span><Button variant="ghost" size="sm" type="button" onClick={() => removeInitialImageFile(index)} disabled={isSubmittingInitialImages} className="opacity-50 group-hover:opacity-100 flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button></li>))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsInitialImageUploadDialogOpen(false)} disabled={isSubmittingInitialImages}>{projectsDict.cancelButton}</Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleProgressSubmit('architect_uploaded_initial_images_for_struktur', initialImageFiles, initialImageDescription)}
                                            disabled={isSubmittingInitialImages || initialImageFiles.length === 0}
                                            className="accent-teal"
                                        >
                                            {isSubmittingInitialImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            {isSubmittingInitialImages ? projectsDict.submittingButton : projectsDict.submitButton}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                  )}

                <Card className="shadow-md">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle>{projectsDict.currentProjectActionsTitle || "Current Project Actions"}</CardTitle>
                        <CardDescription>{project.nextAction || projectsDict.none}</CardDescription>
                    </CardHeader>
                   <CardContent className="p-4 sm:p-6 pt-0">
                    {/* DEBUG INFO START - REMOVE FOR PRODUCTION */}
                    {/* 
                        <div className="my-4 p-3 border border-dashed border-yellow-500 bg-yellow-50 rounded-md text-xs">
                            <p className="font-bold text-yellow-700">DEBUG INFO:</p>
                            <p>Current User Role: <span className="font-mono">{currentUser?.role}</span></p>
                            <p>Selected Project Status: <span className="font-mono">{selectedProject?.status}</span></p>
                            <p>showSurveyDetailsInputSection: <span className="font-mono">{showSurveyDetailsInputSection.toString()}</span></p>
                            <p>showSchedulingSection: <span className="font-mono">{showSchedulingSection.toString()}</span></p>
                            <p>canPerformSelectedProjectAction: <span className="font-mono">{canPerformSelectedProjectAction.toString()}</span></p>
                        </div>
                    */}
                      {/* DEBUG INFO END */}

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
                                    (currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer' && uploadedFiles.length === 0 ) ||
                                    (!description && uploadedFiles.length === 0 && !['Pending Scheduling', 'Pending Approval', 'Completed', 'Canceled', 'Pending Survey Details'].includes(project.status) && !(currentUser?.role === 'Admin Proyek' && project.status === 'Pending Offer') )
                                }
                                className="w-full sm:w-auto accent-teal">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSubmitting ? projectsDict.submittingButton : projectsDict.submitButton}
                            </Button>
                         </div>
                       )}
                        {showSurveyDetailsInputSection && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                                <h3 className="text-lg font-semibold">{projectsDict.nextActionDescriptions.inputSurveyDetails}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="surveyDate">{projectsDict.dateLabel}</Label><Input id="surveyDate" type="date" value={surveyDate} onChange={e => setSurveyDate(e.target.value)} disabled={isSubmitting} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="surveyTime">{projectsDict.timeLabel}</Label><Input id="surveyTime" type="time" value={surveyTime} onChange={e => setSurveyTime(e.target.value)} disabled={isSubmitting} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="surveyDescription">{projectsDict.descriptionLabel}</Label><Textarea id="surveyDescription" placeholder={projectsDict.surveyDescriptionPlaceholder} value={surveyDescription} onChange={e => setSurveyDescription(e.target.value)} disabled={isSubmitting}/></div>
                                 <div className="grid w-full items-center gap-1.5">
                                     <Label htmlFor="survey-files">{projectsDict.attachFilesLabel} ({projectsDict.optionalReportLabel})</Label>
                                     <div className="flex flex-col sm:flex-row items-center gap-2">
                                         <Input id="survey-files" type="file" multiple onChange={handleFileChange} disabled={isSubmitting || uploadedFiles.length >= MAX_FILES_UPLOAD} className="flex-grow"/>
                                         <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                     </div>
                                 </div>
                                  {uploadedFiles.length > 0 && (
                                     <div className="space-y-2 rounded-md border p-3">
                                         <Label>{projectsDict.selectedFilesLabel} ({uploadedFiles.length}/{MAX_FILES_UPLOAD})</Label>
                                         <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                             {uploadedFiles.map((file, index) => ( <li key={index} className="flex items-center justify-between group"><span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">{file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span></span><Button variant="ghost" size="sm" type="button" onClick={() => removeFile(index)} disabled={isSubmitting} className="opacity-50 group-hover:opacity-100 flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button></li>))}
                                         </ul>
                                     </div>
                                  )}
                                <Button onClick={handleSurveySubmit} disabled={isSubmitting || !surveyDate || !surveyTime || !surveyDescription.trim()} className="w-full sm:w-auto accent-teal">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {isSubmitting ? projectsDict.submittingButton : projectsDict.submitButton}
                                </Button>
                            </div>
                        )}

                      {showOwnerDecisionSection && (
                        <div className="space-y-4 border-t pt-4 mt-4">
                           <h3 className="text-lg font-semibold">{projectsDict.ownerActionTitle}</h3>
                           <p className="text-sm text-muted-foreground">{projectsDict.ownerActionDesc}</p>
                           <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                              <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={isSubmitting} className="w-full sm:w-auto"><XCircle className="mr-2 h-4 w-4" /> {projectsDict.cancelProjectButton}</Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{projectsDict.cancelDialogTitle}</AlertDialogTitle><AlertDialogDescription>{projectsDict.cancelDialogDesc.replace('{projectName}', project.title)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>{projectsDict.cancelButton}</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDecision('rejected')} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{projectsDict.confirmCancelButton}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                              </AlertDialog>
                              <Button onClick={() => handleDecision('approved')} disabled={isSubmitting} className="accent-teal w-full sm:w-auto">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{projectsDict.approveButton}</Button>
                            </div>
                        </div>
                      )}
                       {showSchedulingSection && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                              <h3 className="text-lg font-semibold">{projectsDict.scheduleSidangTitle.replace('{role}', getTranslatedStatus(currentUser!.role))}</h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-1.5"><Label htmlFor="scheduleDate">{projectsDict.dateLabel}</Label><Input id="scheduleDate" type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={isSubmitting} /></div>
                                  <div className="space-y-1.5"><Label htmlFor="scheduleTime">{projectsDict.timeLabel}</Label><Input id="scheduleTime" type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} disabled={isSubmitting} /></div>
                               </div>
                                <div className="space-y-1.5"><Label htmlFor="scheduleLocation">{projectsDict.locationLabel}</Label><Input id="scheduleLocation" placeholder={projectsDict.locationPlaceholder} value={scheduleLocation} onChange={e => setScheduleLocation(e.target.value)} disabled={isSubmitting} /></div>
                               <Button onClick={handleScheduleSubmit} disabled={isSubmitting || !scheduleDate || !scheduleTime || !scheduleLocation.trim()} className="w-full sm:w-auto accent-teal">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}{isSubmitting ? projectsDict.schedulingButton : projectsDict.confirmScheduleButton}</Button>
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
                      {showPostSidangRevisionSection && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                                <h3 className="text-lg font-semibold">{projectsDict.postSidangRevisionActionsSectionTitle}</h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Button variant="outline" onClick={() => handleNotifyDivisionForRevision('Arsitek')} disabled={isSubmitting}>
                                        <Briefcase className="mr-2 h-4 w-4" /> {projectsDict.notifyArchitectForRevisionButton}
                                    </Button>
                                    <Button variant="outline" onClick={() => handleNotifyDivisionForRevision('Struktur')} disabled={isSubmitting}>
                                        <Replace className="mr-2 h-4 w-4" /> {projectsDict.notifyStructureForRevisionButton}
                                    </Button>
                                </div>
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="revision-description">{projectsDict.revisionFilesDescriptionLabel}</Label>
                                    <Textarea id="revision-description" placeholder={projectsDict.revisionFilesDescriptionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting}/>
                                </div>
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="revision-files">{projectsDict.attachRevisionFilesLabel}</Label>
                                     <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <Input id="revision-files" type="file" multiple onChange={handleFileChange} disabled={isSubmitting || uploadedFiles.length >= MAX_FILES_UPLOAD} className="flex-grow"/>
                                        <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{projectsDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString())}</p>
                                </div>
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-2 rounded-md border p-3">
                                    <Label>{projectsDict.selectedFilesLabel} ({uploadedFiles.length}/{MAX_FILES_UPLOAD})</Label>
                                    <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                                        {uploadedFiles.map((file, index) => ( <li key={`revfile-${index}`} className="flex items-center justify-between group"><span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">{file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span></span><Button variant="ghost" size="sm" type="button" onClick={() => removeFile(index)} disabled={isSubmitting} className="opacity-50 group-hover:opacity-100 flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive" /></Button></li>))}
                                    </ul>
                                    </div>
                                )}
                                <Button onClick={() => handleDecision('revision_completed_and_finish')} disabled={isSubmitting} className="accent-teal w-full sm:w-auto">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    {projectsDict.markRevisionCompletedAndFinishButton}
                                </Button>
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
                                       <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 w-full sm:w-auto" disabled={isRevising || (!revisionNote.trim() && !(currentUser?.role === 'Owner' && selectedProject?.status === 'Pending Approval' && selectedProject?.progress === 20))}>
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
                </>
       );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      {selectedProject ? renderSelectedProjectDetail(selectedProject) : renderProjectList()}
    </div>
  );
}

