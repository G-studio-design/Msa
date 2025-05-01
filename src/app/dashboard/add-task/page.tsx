// src/app/dashboard/add-task/page.tsx
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
import { addTask, type AddTaskData } from '@/services/task-service'; // Import task service
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for the form
const getAddTaskSchema = (dict: ReturnType<typeof getDictionary>['addTaskPage']['validation']) => z.object({
  title: z.string().min(5, dict.titleMin),
  // Files are handled separately, not directly in the zod schema for validation here
});

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function AddTaskPage() {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);
  const [dict, setDict] = React.useState(defaultDict);
  const addTaskDict = dict.addTaskPage; // Specific dictionary section
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    setDict(getDictionary(language));
  }, [language]);

  const addTaskSchema = getAddTaskSchema(addTaskDict.validation);
  type AddTaskFormValues = z.infer<typeof addTaskSchema>;

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(addTaskSchema),
    defaultValues: {
      title: '',
    },
    context: { dict: addTaskDict.validation },
  });

   React.useEffect(() => {
       if (isClient) {
           form.trigger();
       }
   }, [dict, form, isClient]);


  // Role check
  const canAddTask = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        // Basic validation (e.g., file type, size) can be added here
        setSelectedFiles(Array.from(event.target.files));
    }
  };

   const removeFile = (index: number) => {
     setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
   };

  const onSubmit = async (data: AddTaskFormValues) => {
    if (!canAddTask || !currentUser) return; // Should not happen if UI is correct

    setIsLoading(true);
    form.clearErrors();
    console.log('Adding new task:', data.title, 'by', currentUser.username);
    console.log('Selected files:', selectedFiles.map(f => f.name));

    // Simulate file upload and prepare data for service
     const uploadedFileNames = selectedFiles.map(file => ({
         name: file.name,
         // In a real app, you'd upload the file here and get a URL or identifier
         // For now, just store the name and who uploaded it initially
         uploadedBy: currentUser.username, // Or currentUser.id
         timestamp: new Date().toISOString(),
     }));


    const newTaskData: AddTaskData = {
      title: data.title,
      initialFiles: uploadedFileNames,
      createdBy: currentUser.username, // Track who created the task
    };

    try {
      // TODO: Implement file upload logic here before calling addTask
      // e.g., upload files to storage, get URLs/references

      await addTask(newTaskData);
      toast({ title: addTaskDict.toast.success, description: addTaskDict.toast.successDesc.replace('{title}', data.title) });
      router.push('/dashboard'); // Redirect back to dashboard on success
    } catch (error: any) {
      console.error('Failed to add task:', error);
      toast({
        variant: 'destructive',
        title: addTaskDict.toast.error,
        description: error.message || 'An unexpected error occurred.',
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

    if (!canAddTask) {
       return (
         <div className="container mx-auto py-4">
           <Card className="border-destructive">
             <CardHeader>
               <CardTitle className="text-destructive">{isClient ? dict.manageUsersPage.accessDeniedTitle : defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
             </CardHeader>
             <CardContent>
               <p>{isClient ? addTaskDict.accessDenied : defaultDict.addTaskPage.accessDenied}</p>
             </CardContent>
           </Card>
         </div>
       );
    }


  return (
    <div className="container mx-auto py-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{isClient ? addTaskDict.title : defaultDict.addTaskPage.title}</CardTitle>
          <CardDescription>{isClient ? addTaskDict.description : defaultDict.addTaskPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isClient ? addTaskDict.titleLabel : defaultDict.addTaskPage.titleLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={isClient ? addTaskDict.titlePlaceholder : defaultDict.addTaskPage.titlePlaceholder} {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                 <Label htmlFor="task-files">{isClient ? addTaskDict.filesLabel : defaultDict.addTaskPage.filesLabel}</Label>
                 <div className="flex items-center gap-2">
                      <Input
                         id="task-files"
                         type="file"
                         multiple // Allow multiple files
                         onChange={handleFileChange}
                         disabled={isLoading}
                         className="flex-grow"
                       />
                       <Upload className="h-5 w-5 text-muted-foreground" />
                 </div>
                  <p className="text-xs text-muted-foreground">
                      {isClient ? addTaskDict.filesHint : defaultDict.addTaskPage.filesHint}
                  </p>
               </div>

                {/* Display selected files */}
                 {selectedFiles.length > 0 && (
                   <div className="space-y-2 rounded-md border p-3">
                     <Label>{isClient ? dict.tasksPage.selectedFilesLabel : defaultDict.tasksPage.selectedFilesLabel}</Label>
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
                    {isClient ? (isLoading ? addTaskDict.creatingButton : addTaskDict.createButton) : defaultDict.addTaskPage.createButton}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
