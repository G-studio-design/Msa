
// src/app/dashboard/admin-actions/page.tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, XCircle, Loader2, Replace } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProjects, updateProjectTitle, manuallyUpdateProjectStatusAndAssignment, type Project } from '@/services/project-service';
import { getAllUniqueStatuses, type WorkflowStep } from '@/services/workflow-service'; // Import new service

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Map status to default next step details (simplified, enhance as needed)
// This helps pre-fill some fields when status is manually changed.
// Ideally, this map would be more dynamic or derived from workflow definitions.
const statusWorkflowDetailsMap: Record<string, Partial<WorkflowStep>> = {
  'Pending Offer': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Dokumen Penawaran', progress: 10 },
  'Pending Approval': { assignedDivision: 'Owner', nextActionDescription: 'Setujui Dokumen Penawaran/Faktur', progress: 20 }, // Generic for multiple approval points
  'Pending DP Invoice': { assignedDivision: 'General Admin', nextActionDescription: 'Buat Faktur DP', progress: 25 },
  'Pending Admin Files': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Berkas Administrasi', progress: 40 },
  'Pending Architect Files': { assignedDivision: 'Arsitek', nextActionDescription: 'Unggah Berkas Arsitektur', progress: 50 },
  'Pending Structure Files': { assignedDivision: 'Struktur', nextActionDescription: 'Unggah Berkas Struktur', progress: 70 },
  'Pending MEP Files': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Berkas MEP', progress: 80 }, // Updated assignee
  'Pending Scheduling': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Jadwalkan Sidang', progress: 90 }, // Updated assignee
  'Scheduled': { assignedDivision: 'Owner', nextActionDescription: 'Nyatakan Hasil Sidang', progress: 95 },
  'Completed': { assignedDivision: '', nextActionDescription: null, progress: 100 },
  'Canceled': { assignedDivision: '', nextActionDescription: null, progress: 0 }, // Or last known progress
  // Add other statuses from your workflows if needed
  'Pending Consultation Docs': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Ringkasan Konsultasi', progress: 10 },
  'Pending Review': { assignedDivision: 'Owner', nextActionDescription: 'Tinjau Ringkasan Konsultasi', progress: 50 },
};


export default function AdminActionsPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); 
  const { currentUser } = useAuth(); 
  const [isClient, setIsClient] = React.useState(false); 
  const [dict, setDict] = React.useState(defaultDict); 
  const [adminDict, setAdminDict] = React.useState(defaultDict.adminActionsPage); 
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage); 

  const [projects, setProjects] = React.useState<Project[]>([]); 
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true); 
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null); 
  const [newTitle, setNewTitle] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false); 

  // State for manual status change dialog
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = React.useState(false);
  const [projectForStatusChange, setProjectForStatusChange] = React.useState<Project | null>(null);
  const [newStatus, setNewStatus] = React.useState<string>('');
  const [newAssignedDivision, setNewAssignedDivision] = React.useState<string>('');
  const [newNextAction, setNewNextAction] = React.useState<string>('');
  const [newProgress, setNewProgress] = React.useState<number | string>(''); // Can be string from input
  const [reasonNote, setReasonNote] = React.useState('');
  const [availableStatuses, setAvailableStatuses] = React.useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = React.useState<string[]>(['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP']); // Hardcoded for now

   React.useEffect(() => {
        setIsClient(true);
        const fetchProjectsAndStatuses = async () => { 
             if (currentUser && ['Owner', 'General Admin', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role)) {
                 setIsLoadingProjects(true); 
                 try {
                     const [fetchedProjects, statuses] = await Promise.all([
                        getAllProjects(),
                        getAllUniqueStatuses() // Fetch all unique statuses from workflows
                     ]);
                     setProjects(fetchedProjects); 
                     setAvailableStatuses(statuses);
                 } catch (error) {
                     console.error("Failed to fetch projects or statuses for admin actions:", error); 
                     toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.fetchError }); 
                 } finally {
                     setIsLoadingProjects(false); 
                 }
             } else {
                setIsLoadingProjects(false); 
             }
        };
        fetchProjectsAndStatuses(); 
   }, [currentUser, toast, adminDict]);

   React.useEffect(() => {
        const newDict = getDictionary(language); 
        setDict(newDict);
        setAdminDict(newDict.adminActionsPage);
        setDashboardDict(newDict.dashboardPage);
   }, [language]);

  const handleEditClick = (projectId: string, currentTitle: string) => { 
    setEditingProjectId(projectId); 
    setNewTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null); 
    setNewTitle('');
  };

  const handleSaveTitle = async (projectId: string) => { 
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.titleEmpty });
      return;
    }

    setIsSaving(true); 
    console.log(`Saving new title for project ${projectId}: ${newTitle}`); 

    try {
        await updateProjectTitle(projectId, newTitle); 
        setProjects( 
            projects.map((project) => 
            project.id === projectId ? { ...project, title: newTitle } : project
            )
        );
        toast({ title: adminDict.toast.titleUpdated, description: adminDict.toast.titleUpdatedDesc.replace('{id}', projectId) });
        handleCancelEdit(); 
    } catch (error: any) {
        console.error("Failed to update project title:", error); 
        toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || 'Failed to save title.' });
    } finally {
        setIsSaving(false); 
    }
  };

  // Functions for manual status change
  const openStatusChangeDialog = (project: Project) => {
    setProjectForStatusChange(project);
    setNewStatus(project.status);
    setNewAssignedDivision(project.assignedDivision);
    setNewNextAction(project.nextAction || '');
    setNewProgress(project.progress);
    setReasonNote('');
    setIsStatusChangeDialogOpen(true);
  };

  React.useEffect(() => {
    if (newStatus && projectForStatusChange) {
        const defaults = statusWorkflowDetailsMap[newStatus];
        if (defaults) {
            if (newAssignedDivision === projectForStatusChange.assignedDivision || !availableDivisions.includes(newAssignedDivision)) {
                setNewAssignedDivision(defaults.assignedDivision || '');
            }
            if (newNextAction === (projectForStatusChange.nextAction || '') || newNextAction === '') {
                 setNewNextAction(defaults.nextActionDescription || '');
            }
            if (newProgress === projectForStatusChange.progress || newProgress === '') {
                 setNewProgress(defaults.progress !== undefined ? defaults.progress : '');
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newStatus, projectForStatusChange, availableDivisions]);


  const handleManualStatusUpdate = async () => {
    if (!projectForStatusChange || !newStatus || !reasonNote.trim() || !currentUser) {
        toast({ variant: 'destructive', title: adminDict.toast.statusChangeError, description: adminDict.toast.statusChangeNoteRequired });
        return;
    }
    setIsSaving(true);
    try {
        await manuallyUpdateProjectStatusAndAssignment({
            projectId: projectForStatusChange.id,
            newStatus,
            newAssignedDivision,
            newNextAction: newNextAction || null,
            newProgress: typeof newProgress === 'string' ? parseInt(newProgress, 10) : newProgress,
            adminUsername: currentUser.username,
            reasonNote
        });
        // Re-fetch projects to get the updated list
        const fetchedProjects = await getAllProjects();
        setProjects(fetchedProjects);
        toast({ title: adminDict.toast.statusChangeSuccess, description: adminDict.toast.statusChangeSuccessDesc.replace('{title}', projectForStatusChange.title).replace('{status}', getTranslatedStatus(newStatus) || newStatus).replace('{division}', getTranslatedStatus(newAssignedDivision) || newAssignedDivision ) });
        setIsStatusChangeDialogOpen(false);
    } catch (error: any) {
        console.error("Failed to manually update project status:", error);
        toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || adminDict.toast.failedToUpdateStatus });
    } finally {
        setIsSaving(false);
    }
  };


   const getTranslatedStatus = (status: string): string => {
        if (!isClient) return '...'; 
        const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[statusKey] || status; 
    }

   const canPerformAdminActions = currentUser && ['Owner', 'General Admin', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role);

    if (!isClient || !currentUser || isLoadingProjects) { 
       return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> 
               <Card>
                  <CardHeader>
                    <Skeleton className="h-7 w-3/5 mb-2" />
                    <Skeleton className="h-4 w-4/5" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" /> 
                  </CardContent>
               </Card>
           </div>
       );
    }

   if (!canPerformAdminActions) {
       return (
             <div className="container mx-auto py-4 px-4 md:px-6"> 
                <Card className="border-destructive">
                     <CardHeader>
                         <CardTitle className="text-destructive">{isClient ? adminDict.accessDeniedTitle : defaultDict.adminActionsPage.accessDeniedTitle}</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p>{isClient ? adminDict.accessDeniedDesc : defaultDict.adminActionsPage.accessDeniedDesc}</p>
                     </CardContent>
                </Card>
            </div>
       );
   }

  return (
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> 
      <Card>
        <CardHeader>
           <CardTitle className="text-xl md:text-2xl">{isClient ? adminDict.title : defaultDict.adminActionsPage.title}</CardTitle> 
          <CardDescription>
           {isClient ? adminDict.description : defaultDict.adminActionsPage.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto"> 
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-[150px] sm:w-[200px]">{isClient ? adminDict.tableHeaderId : defaultDict.adminActionsPage.tableHeaderId}</TableHead> 
                    <TableHead>{isClient ? adminDict.tableHeaderTitle : defaultDict.adminActionsPage.tableHeaderTitle}</TableHead>
                     <TableHead className="w-[120px] sm:w-[150px]">{isClient ? adminDict.tableHeaderStatus : defaultDict.adminActionsPage.tableHeaderStatus}</TableHead> 
                     <TableHead className="text-right w-[150px] sm:w-[180px]">{isClient ? adminDict.tableHeaderActions : defaultDict.adminActionsPage.tableHeaderActions}</TableHead> 
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? ( 
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8"> 
                        {isClient ? adminDict.noProjects : defaultDict.adminActionsPage.noProjects} 
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                         <TableCell className="text-xs font-mono break-all">{project.id}</TableCell>
                        <TableCell className="font-medium">
                          {editingProjectId === project.id ? ( 
                            <Input
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              className="h-8 min-w-[150px]" 
                              disabled={isSaving} 
                            />
                          ) : (
                             <span className="break-words">{project.title}</span> 
                          )}
                        </TableCell>
                         <TableCell>{getTranslatedStatus(project.status)}</TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap"> 
                          {editingProjectId === project.id ? ( 
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(project.id)} disabled={isSaving}>
                                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSaving}>
                                 <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(project.id, project.title)} disabled={isSaving} title={adminDict.editTitleActionTooltip || "Edit Title"}>
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openStatusChangeDialog(project)} disabled={isSaving} title={adminDict.changeStatusActionTooltip || "Change Status"}>
                                <Replace className="h-4 w-4 text-orange-500" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
           </div>
        </CardContent>
      </Card>

       {/* Dialog for Manual Status Change */}
       <Dialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{adminDict.changeStatusDialogTitle.replace('{title}', projectForStatusChange?.title || '')}</DialogTitle>
                    <DialogDescription>{adminDict.changeStatusDialogDesc}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="currentStatus" className="text-right">{adminDict.currentStatusLabel}</Label>
                        <Input id="currentStatus" value={getTranslatedStatus(projectForStatusChange?.status || '')} disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newStatus" className="text-right">{adminDict.newStatusLabel}</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={adminDict.newStatusPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableStatuses.map(status => (
                                    <SelectItem key={status} value={status}>{getTranslatedStatus(status)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newAssignedDivision" className="text-right">{adminDict.newAssignedDivisionLabel}</Label>
                         <Select value={newAssignedDivision} onValueChange={setNewAssignedDivision}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder={adminDict.newAssignedDivisionPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDivisions.map(division => (
                                    <SelectItem key={division} value={division}>{getTranslatedStatus(division)}</SelectItem>
                                ))}
                                <SelectItem value="">{adminDict.noneAssignedLabel || '(None)'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newNextAction" className="text-right">{adminDict.newNextActionLabel}</Label>
                        <Input id="newNextAction" value={newNextAction} onChange={(e) => setNewNextAction(e.target.value)} className="col-span-3" placeholder={adminDict.newNextActionPlaceholder}/>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newProgress" className="text-right">{adminDict.newProgressLabel}</Label>
                        <Input id="newProgress" type="number" value={newProgress} onChange={(e) => setNewProgress(parseInt(e.target.value,10) || '')} className="col-span-3" min="0" max="100"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reasonNote" className="text-right">{adminDict.reasonNoteLabel}</Label>
                        <Textarea id="reasonNote" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className="col-span-3" placeholder={adminDict.reasonNotePlaceholder}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsStatusChangeDialogOpen(false)} disabled={isSaving}>{adminDict.cancelButton}</Button>
                    <Button type="button" onClick={handleManualStatusUpdate} disabled={isSaving || !reasonNote.trim()} className="accent-teal">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? adminDict.savingChangesButton : adminDict.saveChangesButton}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

