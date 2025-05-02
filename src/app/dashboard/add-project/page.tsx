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
import { addProject, type AddProjectData } from '@/services/project-service'; // Renamed import
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for the form
const getAddProjectSchema = (dict: ReturnType<typeof getDictionary>['addProjectPage']['validation']) => z.object({
  title: z.string().min(5, dict.titleMin),
  // Files are handled separately, not directly in the zod schema for validation here
});

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function AddProjectPage() { // Renamed component
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const addProjectDict = dict.addProjectPage; // Renamed dictionary section
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    setDict(getDictionary(language));
  }, [language]);

  const addProjectSchema = getAddProjectSchema(addProjectDict.validation); // Renamed schema
  type AddProjectFormValues = z.infer<typeof addProjectSchema>; // Renamed type

  const form = useForm<AddProjectFormValues>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: {
      title: '',
    },
    context: { dict: addProjectDict.validation },
  });

   React.useEffect(() => {
       if (isClient) {
           form.trigger();
       }
   }, [dict, form, isClient]);


  // Role check
  const canAddProject = currentUser && ['Owner', 'General Admin'].includes(currentUser.role); // Renamed variable

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        // Basic validation (e.g., file type, size) can be added here
        setSelectedFiles(Array.from(event.target.files));
    }
  };

   const removeFile = (index: number) => {
     setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
   };

  const onSubmit = async (data: AddProjectFormValues) => {
    if (!canAddProject || !currentUser) return; // Should not happen if UI is correct

    setIsLoading(true);
    form.clearErrors();
    console.log('Adding new project:', data.title, 'by', currentUser.username); // Updated log message
    console.log('Selected files:', selectedFiles.map(f => f.name));

    // Prepare file data for the service
    // In a real app, you'd upload the file *here* and get URLs/references before calling addProject
    // For now, just prepare the structure expected by AddProjectData
     const initialFilesData = selectedFiles.map(file => ({
         name: file.name,
         // In a real app, store URL or identifier after upload
         uploadedBy: currentUser.username, // Or currentUser.id
     }));

    const newProjectData: AddProjectData = { // Renamed type
      title: data.title,
      initialFiles: initialFilesData,
      createdBy: currentUser.username, // Track who created the project
    };

    try {
      // --- TODO: Implement actual file upload logic here ---
      // Example:
      // const uploadedFileReferences = await Promise.all(
      //   selectedFiles.map(file => uploadFileToStorage(file)) // Assume this returns { name: string, url: string }
      // );
      // newProjectData.initialFiles = uploadedFileReferences.map(ref => ({ name: ref.name, url: ref.url, uploadedBy: currentUser.username }));
      // --- End File Upload Logic ---

      console.log('Calling addProject service with:', newProjectData); // Updated log message
      const createdProject = await addProject(newProjectData); // Renamed service call
      console.log('Project created successfully:', createdProject); // Updated log message

      toast({ title: addProjectDict.toast.success, description: addProjectDict.toast.successDesc.replace('{title}', data.title) });
      router.push('/dashboard'); // Redirect back to dashboard on success
    } catch (error: any) {
      console.error('Failed to add project:', error); // Updated log message
      toast({
        variant: 'destructive',
        title: addProjectDict.toast.error,
        description: error.message || 'An unexpected error occurred while creating the project.', // Updated error message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state or Access Denied
    if (!isClient || !currentUser) {
        return (
             <div className="container mx-auto py-4">
                 <Card>
                     <CardHeader>
                         <Skeleton className="h-7 w-1/3 mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                     </CardHeader>
                     <CardContent>
                         <div className="space-y-4">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-20 w-full" /> {/* Placeholder for file list */}
                             <Skeleton className="h-10 w-32" />
                         </div>
                     </CardContent>
                 </Card>
             </div>
        );
    }

    if (!canAddProject) { // Renamed variable
       return (
         <div className="container mx-auto py-4">
           <Card className="border-destructive">
             <CardHeader>
               <CardTitle className="text-destructive">{isClient ? dict.manageUsersPage.accessDeniedTitle : defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
             </CardHeader>
             <CardContent>
               <p>{isClient ? addProjectDict.accessDenied : defaultDict.addProjectPage.accessDenied}</p>
             </CardContent>
           </Card>
         </div>
       );
    }


  return (
    <div className="container mx-auto py-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{isClient ? addProjectDict.title : defaultDict.addProjectPage.title}</CardTitle>
          <CardDescription>{isClient ? addProjectDict.description : defaultDict.addProjectPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? addProjectDict.titleLabel : defaultDict.addProjectPage.titleLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={isClient ? addProjectDict.titlePlaceholder : defaultDict.addProjectPage.titlePlaceholder} {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                 <Label htmlFor="project-files">{isClient ? addProjectDict.filesLabel : defaultDict.addProjectPage.filesLabel}</Label> {/* Updated htmlFor and label */}
                 <div className="flex items-center gap-2">
                      <Input
                         id="project-files" // Updated id
                         type="file"
                         multiple // Allow multiple files
                         onChange={handleFileChange}
                         disabled={isLoading}
                         className="flex-grow"
                       />
                       <Upload className="h-5 w-5 text-muted-foreground" />
                 </div>
                  <p className="text-xs text-muted-foreground">
                      {isClient ? addProjectDict.filesHint : defaultDict.addProjectPage.filesHint}
                  </p>
               </div>

                {/* Display selected files */}
                 {selectedFiles.length > 0 && (
                   <div className="space-y-2 rounded-md border p-3">
                     <Label>{isClient ? dict.projectsPage.selectedFilesLabel : defaultDict.projectsPage.selectedFilesLabel}</Label> {/* Updated dict key */}
                     <ul className="list-disc list-inside text-sm space-y-1 max-h-32 overflow-y-auto">
                       {selectedFiles.map((file, index) => (
                         <li key={index} className="flex items-center justify-between group">
                           <span className="truncate max-w-xs text-muted-foreground group-hover:text-foreground">
                            {file.name} <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                           </span>
                           <Button
                               variant="ghost"
                               size="sm"
                               type="button" // Prevent form submission
                               onClick={() => removeFile(index)}
                               disabled={isLoading}
                               className="opacity-50 group-hover:opacity-100"
                            >
                               <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}


              <div className="flex justify-end gap-2">
                 <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    {isClient ? dict.manageUsersPage.cancelButton : defaultDict.manageUsersPage.cancelButton}
                 </Button>
                 <Button type="submit" className="accent-teal" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isClient ? (isLoading ? addProjectDict.creatingButton : addProjectDict.createButton) : defaultDict.addProjectPage.createButton}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
