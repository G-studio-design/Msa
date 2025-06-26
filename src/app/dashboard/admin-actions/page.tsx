
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
import { Edit, Save, XCircle, Loader2, Replace, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getAllProjects,
    updateProjectTitle,
    manuallyUpdateProjectStatusAndAssignment,
    deleteProject, 
    type Project,
    type UpdateProjectParams 
} from '@/services/project-service';
import { getAllUniqueStatuses, type WorkflowStep } from '@/services/workflow-service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';


const defaultGlobalDict = getDictionary('en');

const statusWorkflowDetailsMap: Record<string, Partial<WorkflowStep>> = {
  'Pending Offer': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Dokumen Penawaran', progress: 10 },
  'Pending Approval': { assignedDivision: 'Owner', nextActionDescription: 'Setujui Dokumen Penawaran/Faktur', progress: 20 }, 
  'Pending DP Invoice': { assignedDivision: 'Akuntan', nextActionDescription: 'Buat Faktur DP', progress: 25 },
  'Pending Admin Files': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Berkas Administrasi', progress: 40 },
  'Pending Survey Details': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Input Jadwal Survei & Unggah Hasil', progress: 45},
  'Pending Architect Files': { assignedDivision: 'Arsitek', nextActionDescription: 'Unggah Berkas Arsitektur', progress: 50 },
  'Pending Structure Files': { assignedDivision: 'Struktur', nextActionDescription: 'Unggah Berkas Struktur', progress: 70 },
  'Pending MEP Files': { assignedDivision: 'MEP', nextActionDescription: 'Unggah Berkas MEP', progress: 80 },
  'Pending Scheduling': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Jadwalkan Sidang', progress: 90 },
  'Scheduled': { assignedDivision: 'Owner', nextActionDescription: 'Nyatakan Hasil Sidang', progress: 95 },
  'Pending Post-Sidang Revision': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Lakukan revisi pasca-sidang', progress: 85 },
  'Completed': { assignedDivision: '', nextActionDescription: null, progress: 100 },
  'Canceled': { assignedDivision: '', nextActionDescription: null, progress: 0 },
  'Pending Consultation Docs': { assignedDivision: 'Admin Proyek', nextActionDescription: 'Unggah Ringkasan Konsultasi', progress: 10 },
  'Pending Review': { assignedDivision: 'Owner', nextActionDescription: 'Tinjau Ringkasan Konsultasi', progress: 50 },
};


export default function AdminActionsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  const dict = React.useMemo(() => getDictionary(language), [language]);
  const adminDict = React.useMemo(() => dict.adminActionsPage, [dict]);
  const dashboardDict = React.useMemo(() => dict.dashboardPage, [dict]);
  const manageUsersDict = React.useMemo(() => dict.manageUsersPage, [dict]);


  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = React.useState(false);
  const [projectForStatusChange, setProjectForStatusChange] = React.useState<Project | null>(null);
  const [newStatus, setNewStatus] = React.useState<string>('');
  const [newAssignedDivision, setNewAssignedDivision] = React.useState<string>('');
  const [newNextAction, setNewNextAction] = React.useState<string>('');
  const [newProgress, setNewProgress] = React.useState<number | string>('');
  const [reasonNote, setReasonNote] = React.useState('');
  const [availableStatuses, setAvailableStatuses] = React.useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = React.useState<string[]>(['Owner', 'Akuntan', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP']); 

  const [isDeleting, setIsDeleting] = React.useState(false);


   const fetchProjectsAndStatuses = React.useCallback(async () => {
        if (currentUser && ['Owner', 'Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim())) {
            setIsLoadingProjects(true);
            try {
                const [fetchedProjects, statuses] = await Promise.all([
                   getAllProjects(),
                   getAllUniqueStatuses()
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
   }, [currentUser, toast, adminDict]);

   React.useEffect(() => {
       setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient && currentUser) {
      fetchProjectsAndStatuses();
    }
  }, [isClient, currentUser, fetchProjectsAndStatuses]);


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
        fetchProjectsAndStatuses(); 
        toast({ title: adminDict.toast.titleUpdated, description: adminDict.toast.titleUpdatedDesc.replace('{id}', projectId) });
        handleCancelEdit();
    } catch (error: any) {
        console.error("Failed to update project title:", error);
        toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || 'Failed to save title.' });
    } finally {
        setIsSaving(false);
    }
  };

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
  }, [newStatus, projectForStatusChange]);


  const handleManualStatusUpdate = async () => {
    if (!projectForStatusChange || !newStatus || !reasonNote.trim() || !currentUser) {
        toast({ variant: 'destructive', title: adminDict.toast.statusChangeError, description: adminDict.toast.statusChangeNoteRequired });
        return;
    }
    setIsSaving(true);
    const finalAssignedDivision = newAssignedDivision === "_NONE_" ? "" : newAssignedDivision;
    try {
        await manuallyUpdateProjectStatusAndAssignment({
            projectId: projectForStatusChange.id,
            newStatus,
            newAssignedDivision: finalAssignedDivision,
            newNextAction: newNextAction || null,
            newProgress: typeof newProgress === 'string' ? parseInt(newProgress, 10) : newProgress,
            adminUsername: currentUser.username,
            reasonNote
        });
        fetchProjectsAndStatuses(); 
        toast({ title: adminDict.toast.statusChangeSuccess, description: adminDict.toast.statusChangeSuccessDesc.replace('{title}', projectForStatusChange.title).replace('{status}', getTranslatedStatus(newStatus) || newStatus).replace('{division}', getTranslatedRole(finalAssignedDivision) || finalAssignedDivision ) });
        setIsStatusChangeDialogOpen(false);
    } catch (error: any) {
        console.error("Failed to manually update project status:", error);
        toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || adminDict.toast.failedToUpdateStatus });
    } finally {
        setIsSaving(false);
    }
  };


   const getTranslatedStatus = React.useCallback((statusKey: string): string => {
        if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
        const key = statusKey?.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[key] || statusKey;
    }, [isClient, dashboardDict]);

   const getTranslatedRole = React.useCallback((roleKey: string) => {
    if (!isClient || !manageUsersDict?.roles || !roleKey) {
      const fallbackDict = defaultGlobalDict.manageUsersPage.roles as Record<string, string>;
      const key = roleKey?.trim().replace(/\s+/g, '').toLowerCase() || "";
      return fallbackDict[key] || roleKey;
    }
    const normalizedKey = roleKey?.trim().replace(/\s+/g, '').toLowerCase() as keyof typeof manageUsersDict.roles;
    return manageUsersDict.roles[normalizedKey] || roleKey;
  }, [isClient, manageUsersDict, defaultGlobalDict]);


   const canPerformAdminActions = currentUser && ['Owner', 'Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim());

    if (!isClient || !currentUser || (isLoadingProjects && projects.length === 0)) {
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
                         <CardTitle className="text-destructive">{isClient ? adminDict.accessDeniedTitle : defaultGlobalDict.adminActionsPage.accessDeniedTitle}</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p>{isClient ? adminDict.accessDeniedDesc : defaultGlobalDict.adminActionsPage.accessDeniedDesc}</p>
                     </CardContent>
                </Card>
            </div>
       );
   }

   const handleDeleteProject = async (projectId: string, projectTitle: string) => {
       if (!currentUser || !['Owner', 'Akuntan', 'Admin Developer'].includes(currentUser.role.trim())) {
           toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.deletePermissionDenied || "You do not have permission to delete projects." });
           return;
       }
       setIsDeleting(true);
       try {
           await deleteProject(projectId, currentUser.username);
           fetchProjectsAndStatuses(); 
           toast({ title: adminDict.toast.projectDeletedTitle || "Project Deleted", description: (adminDict.toast.projectDeletedDesc || "Project \"{title}\" has been deleted.").replace('{title}', projectTitle) });
       } catch (error: any) {
           console.error("Error deleting project:", error);
           toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || adminDict.toast.deleteError || "Failed to delete project." });
       } finally {
           setIsDeleting(false);
       }
   };

  return (
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader>
           <CardTitle className="text-xl md:text-2xl">{isClient ? adminDict.title : defaultGlobalDict.adminActionsPage.title}</CardTitle>
          <CardDescription>
           {isClient ? adminDict.description : defaultGlobalDict.adminActionsPage.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full rounded-md border">
           <Table>
            <TableHeader>
              <TableRow>
                  <TableHead className="w-[150px] sm:w-[200px]">{isClient ? adminDict.tableHeaderId : defaultGlobalDict.adminActionsPage.tableHeaderId}</TableHead>
                <TableHead>{isClient ? adminDict.tableHeaderTitle : defaultGlobalDict.adminActionsPage.tableHeaderTitle}</TableHead>
                  <TableHead className="w-[120px] sm:w-[150px]">{isClient ? adminDict.tableHeaderStatus : defaultGlobalDict.adminActionsPage.tableHeaderStatus}</TableHead>
                  <TableHead className="text-right w-auto">{isClient ? adminDict.tableHeaderActions : defaultGlobalDict.adminActionsPage.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 && !isLoadingProjects ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {isClient ? adminDict.noProjects : defaultGlobalDict.adminActionsPage.noProjects}
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
                    <TableCell className="text-right">
                      <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-0 sm:gap-1">
                        {editingProjectId === project.id ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(project.id)} disabled={isSaving} title={isClient ? adminDict.saveTitleActionTooltip : "Save Title"}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSaving} title={isClient ? adminDict.cancelEditActionTooltip : "Cancel Edit"}>
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(project.id, project.title)} disabled={isSaving || isDeleting} title={isClient ? adminDict.editTitleActionTooltip : "Edit Title"}>
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openStatusChangeDialog(project)} disabled={isSaving || isDeleting} title={isClient ? adminDict.changeStatusActionTooltip : "Change Status"}>
                              <Replace className="h-4 w-4 text-orange-500" />
                            </Button>
                              { (currentUser && ['Owner', 'Akuntan', 'Admin Developer'].includes(currentUser.role.trim())) && (
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" disabled={isSaving || isDeleting} title={isClient ? adminDict.deleteProjectActionTooltip : "Delete Project"}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>{isClient ? adminDict.deleteProjectDialogTitle : "Confirm Project Deletion"}</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  {(isClient ? adminDict.deleteProjectDialogDesc : "Are you sure you want to delete project \"{title}\"? This will also delete all associated files and cannot be undone.").replace('{title}', project.title)}
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel disabled={isDeleting}>{isClient ? adminDict.cancelButton : "Cancel"}</AlertDialogCancel>
                                              <AlertDialogAction
                                                  className="bg-destructive hover:bg-destructive/90"
                                                  onClick={() => handleDeleteProject(project.id, project.title)}
                                                  disabled={isDeleting}
                                              >
                                                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                  {isClient ? adminDict.deleteProjectConfirmButton : "Yes, Delete Project"}
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

       <Dialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{(isClient ? adminDict.changeStatusDialogTitle : "Change Project Status for: {title}").replace('{title}', projectForStatusChange?.title || '')}</DialogTitle>
                    <DialogDescription>{isClient ? adminDict.changeStatusDialogDesc : "Manually update status. Use cautiously."}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="currentStatus" className="text-left sm:text-right">{isClient ? adminDict.currentStatusLabel : "Current Status"}</Label>
                        <Input id="currentStatus" value={getTranslatedStatus(projectForStatusChange?.status || '')} disabled className="sm:col-span-3" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="newStatus" className="text-left sm:text-right">{isClient ? adminDict.newStatusLabel : "New Status"}</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="sm:col-span-3">
                                <SelectValue placeholder={isClient ? adminDict.newStatusPlaceholder : "Select status"} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableStatuses.map(status => (
                                    <SelectItem key={status} value={status}>{getTranslatedStatus(status)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="newAssignedDivision" className="text-left sm:text-right">{isClient ? adminDict.newAssignedDivisionLabel : "New Division"}</Label>
                         <Select value={newAssignedDivision} onValueChange={setNewAssignedDivision}>
                            <SelectTrigger className="sm:col-span-3">
                                <SelectValue placeholder={isClient ? adminDict.newAssignedDivisionPlaceholder : "Select division"} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDivisions.map(division => (
                                    <SelectItem key={division} value={division}>{getTranslatedRole(division)}</SelectItem>
                                ))}
                                <SelectItem value="_NONE_">{isClient ? adminDict.noneAssignedLabel : '(None)'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="newNextAction" className="text-left sm:text-right">{isClient ? adminDict.newNextActionLabel : "New Next Action"}</Label>
                        <Input id="newNextAction" value={newNextAction} onChange={(e) => setNewNextAction(e.target.value)} className="sm:col-span-3" placeholder={isClient ? adminDict.newNextActionPlaceholder : "Describe next step"}/>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="newProgress" className="text-left sm:text-right">{isClient ? adminDict.newProgressLabel : "New Progress"}</Label>
                        <Input id="newProgress" type="number" value={newProgress} onChange={(e) => setNewProgress(parseInt(e.target.value,10) || '')} className="sm:col-span-3" min="0" max="100"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="reasonNote" className="text-left sm:text-right">{isClient ? adminDict.reasonNoteLabel : "Reason/Note"}</Label>
                        <Textarea id="reasonNote" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className="sm:col-span-3" placeholder={isClient ? adminDict.reasonNotePlaceholder : "Explain the change"}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsStatusChangeDialogOpen(false)} disabled={isSaving}>{isClient ? adminDict.cancelButton : "Cancel"}</Button>
                    <Button type="button" onClick={handleManualStatusUpdate} disabled={isSaving || !reasonNote.trim()} className="accent-teal">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? (isClient ? adminDict.savingChangesButton : "Saving...") : (isClient ? adminDict.saveChangesButton : "Save Changes")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
