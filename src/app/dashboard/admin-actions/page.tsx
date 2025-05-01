
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
import { Label } from '@/components/ui/label'; // Keep Label if needed elsewhere, but Input has implicit label linking
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllTasks, updateTaskTitle, type Task } from '@/services/task-service'; // Import task service

// Mock data removed - will fetch from service
// const initialTasks = [...];

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

export default function AdminActionsPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
  const [adminDict, setAdminDict] = React.useState(defaultDict.adminActionsPage); // Specific dictionary section
  const [dashboardDict, setDashboardDict] = React.useState(defaultDict.dashboardPage); // For status translation

  const [tasks, setTasks] = React.useState<Task[]>([]); // State to hold fetched tasks
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(true); // Loading state
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null); // Use string ID
  const [newTitle, setNewTitle] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false); // Saving state

   React.useEffect(() => {
        setIsClient(true);
        // Fetch tasks when component mounts and user is loaded
        const fetchTasks = async () => {
             if (currentUser && ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role)) {
                 setIsLoadingTasks(true);
                 try {
                     const fetchedTasks = await getAllTasks();
                     setTasks(fetchedTasks);
                 } catch (error) {
                     console.error("Failed to fetch tasks for admin actions:", error);
                     toast({ variant: 'destructive', title: 'Error', description: 'Could not load task data.' });
                 } finally {
                     setIsLoadingTasks(false);
                 }
             } else {
                setIsLoadingTasks(false); // No need to load if no permission
             }
        };
        fetchTasks();
   }, [currentUser, toast]); // Re-run if user changes

   React.useEffect(() => {
        const newDict = getDictionary(language); // Update dictionary when language changes
        setDict(newDict);
        setAdminDict(newDict.adminActionsPage);
        setDashboardDict(newDict.dashboardPage);
   }, [language]);

  const handleEditClick = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setNewTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setNewTitle('');
  };

  const handleSaveTitle = async (taskId: string) => { // Make async
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.titleEmpty });
      return;
    }

    setIsSaving(true); // Start saving indicator
    console.log(`Saving new title for task ${taskId}: ${newTitle}`);

    try {
        await updateTaskTitle(taskId, newTitle); // Use service function
        // Update local state optimistically or re-fetch
        setTasks(
            tasks.map((task) =>
            task.id === taskId ? { ...task, title: newTitle } : task
            )
        );
        toast({ title: adminDict.toast.titleUpdated, description: adminDict.toast.titleUpdatedDesc.replace('{id}', taskId) });
        handleCancelEdit(); // Exit editing mode
    } catch (error: any) {
        console.error("Failed to update task title:", error);
        toast({ variant: 'destructive', title: adminDict.toast.error, description: error.message || 'Failed to save title.' });
    } finally {
        setIsSaving(false); // Stop saving indicator
    }
  };

   // Helper function to get translated status
   const getTranslatedStatus = (status: string): string => {
        if (!isClient) return '...'; // Return placeholder on server
        const statusKey = status.toLowerCase().replace(/ /g,'') as keyof typeof dashboardDict.status;
        return dashboardDict.status[statusKey] || status; // Fallback to original
    }

  // Basic permission check using user role from context
   const canEdit = currentUser && ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role);

   // Loading state for the page
    if (!isClient || !currentUser || isLoadingTasks) {
       return (
           <div className="container mx-auto py-4 space-y-6">
               <Card>
                  <CardHeader>
                    <Skeleton className="h-7 w-3/5 mb-2" />
                    <Skeleton className="h-4 w-4/5" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full" /> {/* Skeleton for table */}
                  </CardContent>
               </Card>
           </div>
       );
    }

   // Access Denied state
   if (!canEdit) {
       return (
            <div className="container mx-auto py-4">
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

  // Render the main content if loading is complete and user has permission
  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isClient ? adminDict.title : defaultDict.adminActionsPage.title}</CardTitle>
          <CardDescription>
           {isClient ? adminDict.description : defaultDict.adminActionsPage.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isClient ? adminDict.tableHeaderId : defaultDict.adminActionsPage.tableHeaderId}</TableHead>
                <TableHead>{isClient ? adminDict.tableHeaderTitle : defaultDict.adminActionsPage.tableHeaderTitle}</TableHead>
                <TableHead>{isClient ? adminDict.tableHeaderStatus : defaultDict.adminActionsPage.tableHeaderStatus}</TableHead>
                <TableHead className="text-right">{isClient ? adminDict.tableHeaderActions : defaultDict.adminActionsPage.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {isClient ? adminDict.noTasks : defaultDict.adminActionsPage.noTasks}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-xs font-mono">{task.id}</TableCell> {/* Display full ID */}
                    <TableCell className="font-medium">
                      {editingTaskId === task.id ? (
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="h-8"
                          disabled={isSaving} // Disable input while saving
                        />
                      ) : (
                        task.title
                      )}
                    </TableCell>
                    <TableCell>{getTranslatedStatus(task.status)}</TableCell> {/* Use translated status */}
                    <TableCell className="text-right space-x-2">
                      {editingTaskId === task.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(task.id)} disabled={isSaving}>
                             {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSaving}>
                             <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(task.id, task.title)} disabled={isSaving}>
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
