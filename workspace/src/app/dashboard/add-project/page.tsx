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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { addProject, type FileEntry, type AddProjectData } from '@/services/project-service';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_WORKFLOW_ID } from '@/config/workflow-constants';

const MAX_FILES_UPLOAD = 10;

// Updated schema: workflowId is removed from form validation
const getAddProjectSchema = (dictValidation: ReturnType<typeof getDictionary>['addProjectPage']['validation']) => z.object({
  title: z.string().min(5, dictValidation.titleMin),
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
  // Workflow related states are no longer needed

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const addProjectSchema = React.useMemo(() => getAddProjectSchema(addProjectDict.validation), [addProjectDict.validation]);
  type AddProjectFormValues = z.infer<typeof addProjectSchema>;

  const form = useForm<AddProjectFormValues>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: {
      title: '',
    },
  });
  
  React.useEffect(() => {
    if (isClient && addProjectDict?.validation) {
      form.trigger();
    }
  }, [addProjectDict, form, isClient]);

  const canAddProject = React.useMemo(() => {
    if (!currentUser) return false;
    const userRole = currentUser.role.trim();
    // Allow Owner, Admin Proyek, Admin Developer to add projects
    // Other roles might view the page but won't be able to submit
    return ['Owner', 'Admin Proyek', 'Admin Developer', 'Arsitek', 'Struktur', 'MEP'].includes(userRole);
  }, [currentUser]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (filesArray.length + selectedFiles.length > MAX_FILES_UPLOAD) {
        toast({
          variant: 'destructive',
          title: addProjectDict.toast.error,
          description: (addProjectDict.filesHint || defaultDict.addProjectPage.filesHint).replace('{max}', MAX_FILES_UPLOAD.toString()),
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
    const dictToUse = isClient ? dashboardDict : defaultDashboardDict;
    if (!dictToUse?.status || !statusKey) return statusKey;
    const key = statusKey?.toLowerCase().replace(/ /g, '') as keyof typeof dictToUse.status;
    return dictToUse.status[key] || statusKey;
  }, [isClient, dashboardDict]);

  const onSubmit = async (data: AddProjectFormValues) => {
    if (!canAddProject || !currentUser) {
        return;
    }

    setIsLoading(true);
    form.clearErrors();
    
    const actualFileEntriesForService: Omit<FileEntry, 'timestamp'>[] = [];

    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', 'temp-id-for-upload'); 
        formData.append('projectTitle', data.title);
        formData.append('userId', currentUser.id);

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
            path: result.relativePath,
          });
        } catch (error: any) {
          console.error('File upload error:', file.name, error);
          toast({ variant: 'destructive', title: addProjectDict.toast.error, description: error.message || `Failed to upload ${file.name}.` });
          setIsLoading(false);
          return; 
        }
      }
    }
    
    // WorkflowId is now hardcoded to the default
    const effectiveWorkflowId = DEFAULT_WORKFLOW_ID;
    console.log('[AddProjectPage] Submitting with implicit workflowId:', effectiveWorkflowId);

    const newProjectData: AddProjectData = {
      title: data.title,
      workflowId: effectiveWorkflowId, // Use default workflow ID
      initialFiles: actualFileEntriesForService.map(f => ({...f, timestamp: new Date().toISOString()})),
      createdBy: currentUser.username,
    };

    try {
      const createdProject = await addProject(newProjectData);
      console.log('Project created successfully on server:', createdProject);
      
      const firstStepAssignedDivision = createdProject.assignedDivision;
      const translatedDivision = getTranslatedStatus(firstStepAssignedDivision) || firstStepAssignedDivision;

      // Simplified toast message, removing workflowName as it's implicit
      toast({
        title: addProjectDict.toast.success,
        description: (addProjectDict.toast.successDesc || defaultDict.addProjectPage.toast.successDesc)
          .replace('{title}', `"${createdProject.title}"`) 
          .replace(' using workflow "{workflowName}"', '') // Remove workflow name part
          .replace(' dengan alur kerja "{workflowName}"', '') // Remove Indonesian version too
          .replace('{division}', translatedDivision),
      });
      form.reset({ title: ''}); // Only reset title
      setSelectedFiles([]);
      router.push('/dashboard/projects'); 
    } catch (error: any) {
      console.error('Failed to add project:', error);
      let desc = addProjectDict.toast.error;
      if (error.message === 'WORKFLOW_INVALID') {
        desc = `The default workflow ("MSa Workflow") is invalid or missing steps. Please contact an administrator.`;
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

    if (!isClient) {
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
               <CardTitle className="text-destructive">{addProjectDict.accessDeniedTitle || defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
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
          <CardDescription>{addProjectDict.description.replace('The standard workflow will be used.', 'The MSa standard workflow will be used.')}</CardDescription>
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

              {/* WorkflowId FormField removed */}

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
                      {(addProjectDict.filesHint || defaultDict.addProjectPage.filesHint).replace('{max}', MAX_FILES_UPLOAD.toString())}
                  </p>
               </div>

                 {selectedFiles.length > 0 && (
                   <div className="space-y-2 rounded-md border p-3">
                     <Label>{(addProjectDict.selectedFilesLabel || defaultDict.addProjectPage.selectedFilesLabel)} ({selectedFiles.length}/{MAX_FILES_UPLOAD})</Label>
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
                  <Button type="submit" className="accent-teal w-full sm:w-auto" disabled={isLoading}>
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
