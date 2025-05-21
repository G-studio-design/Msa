// src/app/dashboard/add-project/page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { addProject, type FileEntry, type AddProjectData } from '@/services/project-service';
import { getAllWorkflows, type Workflow } from '@/services/workflow-service';
import { DEFAULT_WORKFLOW_ID } from '@/config/workflow-constants';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_FILES_UPLOAD = 10;

const getAddProjectSchema = (dictValidation: ReturnType<typeof getDictionary>['addProjectPage']['validation']) => z.object({
  title: z.string().min(5, dictValidation.titleMin),
  workflowId: z.string({ required_error: dictValidation.workflowRequired }),
});

const defaultDict = getDictionary('en');
const defaultDashboardDict = defaultDict.dashboardPage;

export default function AddProjectPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  
  const addProjectDict = React.useMemo(() => getDictionary(language).addProjectPage, [language]);
  const dashboardDict = React.useMemo(() => getDictionary(language).dashboardPage, [language]);


  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [fetchedWorkflows, setFetchedWorkflows] = React.useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = React.useState(true);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchWorkflows = React.useCallback(async () => {
    setIsLoadingWorkflows(true);
    try {
      const wfs = await getAllWorkflows();
      setFetchedWorkflows(wfs);
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
      toast({
        variant: 'destructive',
        title: addProjectDict.toast.error,
        description: addProjectDict.toast.fetchWorkflowsError,
      });
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, [toast, addProjectDict]);

  React.useEffect(() => {
    if (isClient && currentUser && (currentUser.role === 'Owner' || currentUser.role === 'Admin/Akuntan' || currentUser.role === 'Admin Proyek' || currentUser.role === 'Admin Developer')) {
      fetchWorkflows();
    }
  }, [isClient, currentUser, fetchWorkflows]);

  const addProjectSchema = React.useMemo(() => getAddProjectSchema(addProjectDict.validation), [addProjectDict.validation]);
  type AddProjectFormValues = z.infer<typeof addProjectSchema>;

  const form = useForm<AddProjectFormValues>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: {
      title: '',
      workflowId: fetchedWorkflows.length > 0 ? (fetchedWorkflows.find(wf => wf.id === DEFAULT_WORKFLOW_ID)?.id || fetchedWorkflows[0].id) : undefined,
    },
  });
  
  React.useEffect(() => {
    if (isClient && addProjectDict?.validation) {
      form.trigger();
      // Set default workflowId once workflows are fetched
      if (fetchedWorkflows.length > 0 && !form.getValues('workflowId')) {
        form.setValue('workflowId', fetchedWorkflows.find(wf => wf.id === DEFAULT_WORKFLOW_ID)?.id || fetchedWorkflows[0].id);
      }
    }
  }, [addProjectDict, form, isClient, fetchedWorkflows]);


  const canAddProject = React.useMemo(() => currentUser && ['Owner', 'Admin/Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role), [currentUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (filesArray.length + selectedFiles.length > MAX_FILES_UPLOAD) {
        toast({
          variant: 'destructive',
          title: addProjectDict.toast.error,
          description: addProjectDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString()),
        });
        return;
      }
      setSelectedFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const getTranslatedStatus = React.useCallback((statusKey: string) => {
    if (!isClient || !dashboardDict?.status || !statusKey) return statusKey;
    const key = statusKey?.toLowerCase().replace(/ /g, '') as keyof typeof dashboardDict.status;
    return dashboardDict.status[key] || statusKey;
  }, [isClient, dashboardDict]);


  const onSubmit = async (data: AddProjectFormValues) => {
    if (!canAddProject || !currentUser) return;

    setIsLoading(true);
    form.clearErrors();
    
    const uploadedFileEntries: Omit<FileEntry, 'timestamp' | 'path'>[] = [];
    const actualFileEntriesForService: FileEntry[] = [];

    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        // projectId and projectTitle are not known yet, but the API can handle it or we can pass a temporary one
        // For now, the API route is designed to create folders based on future projectId and title
        // It's better to let the service handle folder creation after project ID is known.
        // The API upload-file route has been modified to accept this.
        formData.append('projectId', 'temp-id-for-upload'); 
        formData.append('projectTitle', data.title);


        try {
          const response = await fetch('/api/upload-file', { method: 'POST', body: formData });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to upload ${file.name}` }));
            throw new Error(errorData.message || `Failed to upload ${file.name}`);
          }
          const result = await response.json();
          actualFileEntriesForService.push({
            name: result.originalName,
            uploadedBy: currentUser.username,
            path: result.relativePath, // This path is relative to PROJECT_FILES_BASE_DIR
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          console.error('File upload error:', file.name, error);
          toast({ variant: 'destructive', title: addProjectDict.toast.error, description: error.message || `Failed to upload ${file.name}.` });
          setIsLoading(false);
          return; // Stop if any file fails to upload
        }
      }
    }
    
    const effectiveWorkflowId = data.workflowId || DEFAULT_WORKFLOW_ID;
    console.log('[AddProjectPage] Submitting with workflowId:', effectiveWorkflowId);

    const newProjectData: AddProjectData = {
      title: data.title,
      workflowId: effectiveWorkflowId,
      initialFiles: actualFileEntriesForService,
      createdBy: currentUser.username,
    };

    try {
      const createdProject = await addProject(newProjectData);
      console.log('Project created successfully on server:', createdProject);

      const workflowUsed = fetchedWorkflows.find(wf => wf.id === createdProject.workflowId);
      const workflowName = workflowUsed 
        ? workflowUsed.name 
        : (createdProject.workflowId === DEFAULT_WORKFLOW_ID 
            ? (addProjectDict.toast.defaultWorkflowName || 'Standard Workflow') 
            : (addProjectDict.toast.unknownWorkflow || 'Selected Workflow'));
            
      const firstStepAssignedDivision = createdProject.assignedDivision;
      const translatedDivision = getTranslatedStatus(firstStepAssignedDivision) || firstStepAssignedDivision;

      toast({
        title: addProjectDict.toast.success,
        description: addProjectDict.toast.successDesc
          .replace('"{title}"', createdProject.title) 
          .replace('"{workflowName}"', workflowName)
          .replace('"{division}"', translatedDivision),
      });
      form.reset();
      setSelectedFiles([]);
      router.push('/dashboard/projects'); // Redirect to projects list on success
    } catch (error: any) {
      console.error('Failed to add project:', error);
      let desc = addProjectDict.toast.error;
      if (error.message === 'WORKFLOW_INVALID') {
        desc = "Invalid workflow selected or workflow definition is missing steps. Please contact an administrator.";
      } else {
        desc = error.message || 'An unexpected error occurred while creating the project.';
      }
      toast({
        variant: 'destructive',
        title: addProjectDict.toast.error,
        description: desc,
      });
    } finally {
      setIsLoading(false);
    }
  };

    if (!isClient || isLoadingWorkflows || (!canAddProject && currentUser) ) {
        return (
              <div className="container mx-auto py-4 px-4 md:px-6">
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-7 w-1/3 mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                     </CardHeader>
                     <CardContent>
                         <div className="space-y-4">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-20 w-full" /> 
                             <Skeleton className="h-10 w-32" />
                         </div>
                     </CardContent>
                 </Card>
             </div>
        );
    }

    if (!canAddProject) {
       return (
          <div className="container mx-auto py-4 px-4 md:px-6">
           <Card className="border-destructive">
             <CardHeader>
               <CardTitle className="text-destructive">{addProjectDict.accessDenied || defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
             </CardHeader>
             <CardContent>
               <p>{addProjectDict.accessDenied || defaultDict.manageUsersPage.accessDeniedDesc}</p>
             </CardContent>
           </Card>
         </div>
       );
    }


  return (
     <div className="container mx-auto py-4 px-4 md:px-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
           <CardTitle className="text-xl md:text-2xl">{addProjectDict.title}</CardTitle>
          <CardDescription>{addProjectDict.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{addProjectDict.titleLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={addProjectDict.titlePlaceholder} {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workflowId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{addProjectDict.workflowLabel}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoading || isLoadingWorkflows || fetchedWorkflows.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingWorkflows ? "Loading workflows..." : (fetchedWorkflows.length === 0 ? "No workflows available" : addProjectDict.workflowPlaceholder)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fetchedWorkflows.map(wf => (
                          <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                 <Label htmlFor="project-files">{addProjectDict.filesLabel}</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                      <Input
                         id="project-files"
                         type="file"
                         multiple
                         onChange={handleFileChange}
                         disabled={isLoading || selectedFiles.length >= MAX_FILES_UPLOAD}
                         className="flex-grow"
                       />
                       <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                 </div>
                  <p className="text-xs text-muted-foreground">
                      {addProjectDict.filesHint.replace('{max}', MAX_FILES_UPLOAD.toString())}
                  </p>
               </div>

                 {selectedFiles.length > 0 && (
                   <div className="space-y-2 rounded-md border p-3">
                     <Label>{addProjectDict.selectedFilesLabel || defaultDict.projectsPage.selectedFilesLabel} ({selectedFiles.length}/{MAX_FILES_UPLOAD})</Label>
                     <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                       {selectedFiles.map((file, index) => (
                         <li key={index} className="flex items-center justify-between group">
                            <span className="truncate max-w-[calc(100%-4rem)] sm:max-w-xs text-muted-foreground group-hover:text-foreground">
                            {file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                           </span>
                           <Button
                               variant="ghost"
                               size="sm"
                               type="button"
                               onClick={() => removeFile(index)}
                               disabled={isLoading}
                               className="opacity-50 group-hover:opacity-100 flex-shrink-0"
                            >
                               <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}


               <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading} className="w-full sm:w-auto">
                    {addProjectDict.cancelButton || defaultDict.manageUsersPage.cancelButton}
                 </Button>
                  <Button type="submit" className="accent-teal w-full sm:w-auto" disabled={isLoading || isLoadingWorkflows}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? addProjectDict.creatingButton : addProjectDict.createButton}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

