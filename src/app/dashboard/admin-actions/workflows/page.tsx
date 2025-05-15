// src/app/dashboard/admin-actions/workflows/page.tsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, GitFork } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllWorkflows, deleteWorkflow, type Workflow } from '@/services/workflow-service';
// useRouter tidak digunakan saat ini karena fungsionalitas edit/tambah belum diimplementasikan penuh
// import { useRouter } from 'next/navigation';

const defaultDict = getDictionary('en');

export default function ManageWorkflowsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  // const router = useRouter();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const [workflowsDict, setWorkflowsDict] = React.useState(defaultDict.manageWorkflowsPage);

  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setWorkflowsDict(newDict.manageWorkflowsPage);
  }, [language]);

  const canManage = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  React.useEffect(() => {
    async function fetchWorkflows() {
      if (!canManage) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const fetchedWorkflows = await getAllWorkflows();
        setWorkflows(fetchedWorkflows);
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
        if (isClient && workflowsDict?.toast?.error) { // Pastikan workflowsDict sudah terinisialisasi
             toast({ variant: 'destructive', title: workflowsDict.toast.error, description: workflowsDict.toast.fetchError });
        } else {
             toast({ variant: 'destructive', title: "Error", description: "Could not fetch workflows." });
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (isClient) { // Hanya fetch jika sudah client-side dan dict sudah terupdate
      fetchWorkflows();
    }
  }, [isClient, canManage, toast, language, workflowsDict]); // Tambahkan language dan workflowsDict ke dependency array


  const handleAddWorkflow = () => {
    // TODO: Implement dialog/form for adding a new workflow
    if (workflowsDict?.toast?.comingSoon) {
        toast({ title: workflowsDict.toast.comingSoon, description: workflowsDict.toast.addComingSoon });
    } else {
        toast({ title: "Coming Soon", description: "Adding new workflows will be available soon." });
    }
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    // TODO: Implement dialog/form for editing a workflow
     if (workflowsDict?.toast?.comingSoon) {
        toast({ title: workflowsDict.toast.comingSoon, description: workflowsDict.toast.editComingSoon.replace('{name}', workflow.name) });
    } else {
        toast({ title: "Coming Soon", description: `Editing workflow "${workflow.name}" will be available soon.` });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    if (!canManage) return;
    setIsProcessing(true);
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
      toast({ title: workflowsDict.toast.deleteSuccessTitle, description: workflowsDict.toast.deleteSuccessDesc.replace('{name}', workflowName) });
    } catch (error: any) {
      console.error("Failed to delete workflow:", error);
      toast({ variant: 'destructive', title: workflowsDict.toast.error, description: error.message || workflowsDict.toast.deleteError });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isClient || !currentUser || (!workflowsDict && language !== defaultDict.manageWorkflowsPage.title) ) { // Tunggu workflowsDict terisi
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">{workflowsDict.accessDeniedTitle}</CardTitle></CardHeader>
          <CardContent><p>{workflowsDict.accessDeniedDesc}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl">{workflowsDict.title}</CardTitle>
            <CardDescription>{workflowsDict.description}</CardDescription>
          </div>
          <Button className="accent-teal w-full sm:w-auto" onClick={handleAddWorkflow} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> {workflowsDict.addWorkflowButton}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{workflowsDict.tableHeaderName}</TableHead>
                  <TableHead className="hidden sm:table-cell">{workflowsDict.tableHeaderDescription}</TableHead>
                  <TableHead className="hidden md:table-cell">{workflowsDict.tableHeaderSteps}</TableHead>
                  <TableHead className="text-right">{workflowsDict.tableHeaderActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={`skeleton-wf-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Skeleton className="h-8 w-8 inline-block" />
                        <Skeleton className="h-8 w-8 inline-block" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : workflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {workflowsDict.noWorkflows}
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell className="font-medium break-words">
                        <div className="flex items-center gap-2">
                          <GitFork className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="truncate">{workflow.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell truncate max-w-xs">{workflow.description}</TableCell>
                      <TableCell className="hidden md:table-cell">{workflow.steps.length}</TableCell>
                      <TableCell className="text-right space-x-0 sm:space-x-1 whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleEditWorkflow(workflow)} title={workflowsDict.editAction} disabled={isLoading}>
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isProcessing || isLoading} title={workflowsDict.deleteAction}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{workflowsDict.deleteDialogTitle}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {workflowsDict.deleteDialogDesc.replace('{name}', workflow.name)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isProcessing}>{workflowsDict.cancelButton}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                                disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {workflowsDict.deleteDialogConfirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
