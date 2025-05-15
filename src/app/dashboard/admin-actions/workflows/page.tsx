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
  AlertDialogTrigger, // Added AlertDialogTrigger
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, GitFork, Settings2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllWorkflows, deleteWorkflow, addWorkflow, updateWorkflow, type Workflow, type WorkflowStep } from '@/services/workflow-service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const defaultDict = getDictionary('en');

const getAddWorkflowSchema = (dictValidation: ReturnType<typeof getDictionary>['manageWorkflowsPage']['validation']) => z.object({
  name: z.string().min(3, dictValidation.nameMin),
  description: z.string().optional(),
});

// Schema untuk edit workflow (hanya nama dan deskripsi untuk saat ini)
const getEditWorkflowSchema = (dictValidation: ReturnType<typeof getDictionary>['manageWorkflowsPage']['validation']) => z.object({
  name: z.string().min(3, dictValidation.nameMin),
  description: z.string().optional(),
});


export default function ManageWorkflowsPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const { currentUser } = useAuth();

  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const [workflowsDict, setWorkflowsDict] = React.useState(defaultDict.manageWorkflowsPage);
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage);


  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = React.useState(false);
  const [isEditWorkflowDialogOpen, setIsEditWorkflowDialogOpen] = React.useState(false);
  const [editingWorkflow, setEditingWorkflow] = React.useState<Workflow | null>(null);

  const addWorkflowSchema = getAddWorkflowSchema(workflowsDict.validation);
  type AddWorkflowFormValues = z.infer<typeof addWorkflowSchema>;

  const editWorkflowSchema = getEditWorkflowSchema(workflowsDict.validation);
  type EditWorkflowFormValues = z.infer<typeof editWorkflowSchema>;

  const addWorkflowForm = useForm<AddWorkflowFormValues>({
    resolver: zodResolver(addWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    context: { dict: workflowsDict.validation }
  });

  const editWorkflowForm = useForm<EditWorkflowFormValues>({
    resolver: zodResolver(editWorkflowSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    context: { dict: workflowsDict.validation }
  });

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  React.useEffect(() => {
    const newDict = getDictionary(language);
    setDict(newDict);
    setWorkflowsDict(newDict.manageWorkflowsPage);
    setDashboardDict(newDict.dashboardPage);
  }, [language]);
  
  React.useEffect(() => {
    if (isClient && workflowsDict?.validation) {
      addWorkflowForm.trigger();
      editWorkflowForm.trigger();
    }
  }, [workflowsDict, addWorkflowForm, editWorkflowForm, isClient]);

  const canManage = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const fetchWorkflowsData = React.useCallback(async () => {
    if (!canManage || !isClient) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedWorkflows = await getAllWorkflows();
      setWorkflows(fetchedWorkflows);
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
      if (isClient && workflowsDict?.toast?.error) {
           toast({ variant: 'destructive', title: workflowsDict.toast.error, description: workflowsDict.toast.fetchError });
      } else {
           toast({ variant: 'destructive', title: "Error", description: "Could not fetch workflows." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isClient, canManage, toast, workflowsDict]);

  React.useEffect(() => {
    fetchWorkflowsData();
  }, [fetchWorkflowsData]);


  const handleOpenAddWorkflowDialog = () => {
    addWorkflowForm.reset({ name: '', description: '' });
    setIsAddWorkflowDialogOpen(true);
  };

  const onSubmitAddWorkflow = async (data: AddWorkflowFormValues) => {
    if (!canManage) return;
    setIsProcessing(true);

    try {
      // addWorkflow dari service sekarang akan menggunakan default steps structure
      const newWorkflow = await addWorkflow(data.name, data.description || '');
      setWorkflows(prev => [...prev, newWorkflow]); // Optimistic update
      // fetchWorkflowsData(); // Atau re-fetch data untuk konsistensi
      toast({ title: workflowsDict.toast.addSuccessTitle, description: workflowsDict.toast.addSuccessDesc.replace('{name}', newWorkflow.name) });
      setIsAddWorkflowDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to add workflow:", error);
      toast({ variant: 'destructive', title: workflowsDict.toast.error, description: error.message || workflowsDict.toast.addError });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    editWorkflowForm.reset({
      name: workflow.name,
      description: workflow.description,
    });
    setIsEditWorkflowDialogOpen(true);
  };

  const onSubmitEditWorkflow = async (data: EditWorkflowFormValues) => {
    if (!canManage || !editingWorkflow) return;
    setIsProcessing(true);
    try {
      const updatedData: Partial<Workflow> = {
        name: data.name,
        description: data.description || '',
      };
      const updated = await updateWorkflow(editingWorkflow.id, updatedData);
      if (updated) {
        setWorkflows(prev => prev.map(wf => wf.id === updated.id ? updated : wf));
        // fetchWorkflowsData(); // Atau re-fetch
        toast({ title: workflowsDict.toast.editSuccessTitle, description: workflowsDict.toast.editSuccessDesc.replace('{name}', updated.name) });
        setIsEditWorkflowDialogOpen(false);
        setEditingWorkflow(null);
      } else {
        throw new Error(workflowsDict.toast.editError);
      }
    } catch (error: any) {
      console.error("Failed to edit workflow:", error);
      toast({ variant: 'destructive', title: workflowsDict.toast.error, description: error.message || workflowsDict.toast.editError });
    } finally {
      setIsProcessing(false);
    }
  };


  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    if (!canManage) return;
    setIsProcessing(true);
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
      // fetchWorkflowsData(); // Atau re-fetch
      toast({ title: workflowsDict.toast.deleteSuccessTitle, description: workflowsDict.toast.deleteSuccessDesc.replace('{name}', workflowName) });
    } catch (error: any) {
      console.error("Failed to delete workflow:", error);
      toast({ variant: 'destructive', title: workflowsDict.toast.error, description: error.message || workflowsDict.toast.deleteError });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getTranslatedRoleForStep = (roleName: string): string => {
      if (!isClient || !dashboardDict?.status || !roleName) return roleName;
      const key = roleName.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
      return dashboardDict.status[key] || roleName;
  };

  if (!isClient || !currentUser || (!workflowsDict && language !== defaultDict.manageWorkflowsPage.title) ) {
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
          <Dialog open={isAddWorkflowDialogOpen} onOpenChange={setIsAddWorkflowDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-teal w-full sm:w-auto" onClick={handleOpenAddWorkflowDialog} disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> {workflowsDict.addWorkflowButton}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{workflowsDict.addDialogTitle}</DialogTitle>
                <DialogDescription>{workflowsDict.addDialogDesc}</DialogDescription>
              </DialogHeader>
              <Form {...addWorkflowForm}>
                <form onSubmit={addWorkflowForm.handleSubmit(onSubmitAddWorkflow)} className="space-y-4 py-2">
                  <FormField
                    control={addWorkflowForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{workflowsDict.formLabels.name}</FormLabel>
                        <FormControl>
                          <Input placeholder={workflowsDict.formPlaceholders.name} {...field} disabled={isProcessing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addWorkflowForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{workflowsDict.formLabels.description}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={workflowsDict.formPlaceholders.description} {...field} disabled={isProcessing} rows={3}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {workflowsDict.addDialogStepsInfo}
                  </p>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddWorkflowDialogOpen(false)} disabled={isProcessing}>
                      {workflowsDict.cancelButton}
                    </Button>
                    <Button type="submit" className="accent-teal" disabled={isProcessing}>
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {workflowsDict.addDialogSubmitButton}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                          {workflow.id === 'default_standard_workflow' ? <Settings2 className="h-4 w-4 text-primary flex-shrink-0" /> : <GitFork className="h-4 w-4 text-primary flex-shrink-0" />}
                          <span className="truncate">{workflow.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell truncate max-w-xs">{workflow.description}</TableCell>
                      <TableCell className="hidden md:table-cell">{workflow.steps.length}</TableCell>
                      <TableCell className="text-right space-x-0 sm:space-x-1 whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleEditWorkflow(workflow)} title={workflowsDict.editAction} disabled={isLoading || isProcessing}>
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" disabled={isProcessing || isLoading || workflow.id === 'default_standard_workflow'} title={workflow.id === 'default_standard_workflow' ? workflowsDict.cannotDeleteDefaultTooltip : workflowsDict.deleteAction}>
                              <Trash2 className={`h-4 w-4 ${workflow.id === 'default_standard_workflow' ? 'text-muted-foreground' : 'text-destructive'}`} />
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

      {/* Edit Workflow Dialog */}
      <Dialog open={isEditWorkflowDialogOpen} onOpenChange={(open) => { setIsEditWorkflowDialogOpen(open); if (!open) setEditingWorkflow(null);}}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingWorkflow ? workflowsDict.editDialogTitle.replace('{name}', editingWorkflow.name) : ''}</DialogTitle>
            <DialogDescription>{workflowsDict.editDialogDesc}</DialogDescription>
          </DialogHeader>
          {editingWorkflow && (
            <Form {...editWorkflowForm}>
              <form onSubmit={editWorkflowForm.handleSubmit(onSubmitEditWorkflow)} className="space-y-4 py-2 overflow-y-auto flex-grow">
                <FormField
                  control={editWorkflowForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{workflowsDict.formLabels.name}</FormLabel>
                      <FormControl>
                        <Input placeholder={workflowsDict.formPlaceholders.name} {...field} disabled={isProcessing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editWorkflowForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{workflowsDict.formLabels.description}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={workflowsDict.formPlaceholders.description} {...field} disabled={isProcessing} rows={3}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2 pt-2">
                    <h3 className="text-md font-semibold">{workflowsDict.stepsLabel} ({editingWorkflow.steps.length})</h3>
                     <p className="text-xs text-muted-foreground pb-2">
                        {workflowsDict.editStepsInfo}
                     </p>
                    <Accordion type="single" collapsible className="w-full max-h-64 overflow-y-auto border rounded-md">
                      {editingWorkflow.steps.map((step, index) => (
                        <AccordionItem value={`step-${index}`} key={`step-${index}`}>
                          <AccordionTrigger className="px-4 text-sm hover:bg-accent/50">
                            {index + 1}. {step.stepName} <span className="text-xs text-muted-foreground ml-2">(Status: {step.status}, Progress: {step.progress}%)</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-2 pb-4 text-xs bg-muted/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                <p><strong>{workflowsDict.stepAssignedDivisionLabel}:</strong> {getTranslatedRoleForStep(step.assignedDivision) || workflowsDict.noneLabel}</p>
                                <p><strong>{workflowsDict.stepNextActionLabel}:</strong> {step.nextActionDescription || workflowsDict.noneLabel}</p>
                                {step.transitions && Object.entries(step.transitions).map(([action, transition]) => (
                                    <details key={action} className="col-span-full mt-1 border-t pt-1">
                                        <summary className="cursor-pointer text-primary hover:underline text-xs">
                                            {workflowsDict.transitionActionLabel}: {action}
                                        </summary>
                                        <div className="pl-4 mt-1 space-y-0.5 text-muted-foreground">
                                            <p>Target Status: {transition.targetStatus}</p>
                                            <p>Target Division: {getTranslatedRoleForStep(transition.targetAssignedDivision) || workflowsDict.noneLabel}</p>
                                            <p>Target Progress: {transition.targetProgress}%</p>
                                            <p>Target Next Action: {transition.targetNextActionDescription || workflowsDict.noneLabel}</p>
                                            {transition.notification && (
                                                <p>Notification to {getTranslatedRoleForStep(transition.notification.division || "") || "N/A"}: "{transition.notification.message.substring(0,50)}..."</p>
                                            )}
                                        </div>
                                    </details>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                </div>
                <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-0">
                  <Button type="button" variant="outline" onClick={() => setIsEditWorkflowDialogOpen(false)} disabled={isProcessing}>
                    {workflowsDict.cancelButton}
                  </Button>
                  <Button type="submit" className="accent-teal" disabled={isProcessing || !editWorkflowForm.formState.isDirty}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {workflowsDict.editDialogSubmitButton}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

