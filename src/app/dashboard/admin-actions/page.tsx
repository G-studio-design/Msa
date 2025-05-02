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
import { getAllProjects, updateProjectTitle, type Project } from '@/services/project-service'; // Renamed import

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

  const [projects, setProjects] = React.useState<Project[]>([]); // Renamed state variable
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(true); // Renamed loading state
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null); // Renamed state variable
  const [newTitle, setNewTitle] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false); // Saving state

   React.useEffect(() => {
        setIsClient(true);
        // Fetch projects when component mounts and user is loaded
        const fetchProjects = async () => { // Renamed function
             if (currentUser && ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role)) {
                 setIsLoadingProjects(true); // Renamed loading state
                 try {
                     const fetchedProjects = await getAllProjects(); // Renamed service call
                     setProjects(fetchedProjects); // Renamed state setter
                 } catch (error) {
                     console.error("Failed to fetch projects for admin actions:", error); // Updated log message
                     toast({ variant: 'destructive', title: 'Error', description: 'Could not load project data.' }); // Updated toast message
                 } finally {
                     setIsLoadingProjects(false); // Renamed loading state
                 }
             } else {
                setIsLoadingProjects(false); // Renamed loading state
             }
        };
        fetchProjects(); // Renamed function call
   }, [currentUser, toast]); // Re-run if user changes

   React.useEffect(() => {
        const newDict = getDictionary(language); // Update dictionary when language changes
        setDict(newDict);
        setAdminDict(newDict.adminActionsPage);
        setDashboardDict(newDict.dashboardPage);
   }, [language]);

  const handleEditClick = (projectId: string, currentTitle: string) => { // Renamed parameter
    setEditingProjectId(projectId); // Renamed state setter
    setNewTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null); // Renamed state setter
    setNewTitle('');
  };

  const handleSaveTitle = async (projectId: string) => { // Renamed parameter, make async
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.titleEmpty });
      return;
    }

    setIsSaving(true); // Start saving indicator
    console.log(`Saving new title for project ${projectId}: ${newTitle}`); // Updated log message

    try {
        await updateProjectTitle(projectId, newTitle); // Renamed service function
        // Update local state optimistically or re-fetch
        setProjects( // Renamed state setter
            projects.map((project) => // Renamed variable
            project.id === projectId ? { ...project, title: newTitle } : project
            )
        );
        toast({ title: adminDict.toast.titleUpdated, description: adminDict.toast.titleUpdatedDesc.replace('{id}', projectId) });
        handleCancelEdit(); // Exit editing mode
    } catch (error: any) {
        console.error("Failed to update project title:", error); // Updated log message
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
    if (!isClient || !currentUser || isLoadingProjects) { // Renamed loading state
       return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
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
             <div className="container mx-auto py-4 px-4 md:px-6"> {/* Added responsive padding */}
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
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
      <Card>
        <CardHeader>
           <CardTitle className="text-xl md:text-2xl">{isClient ? adminDict.title : defaultDict.adminActionsPage.title}</CardTitle> {/* Adjusted font size */}
          <CardDescription>
           {isClient ? adminDict.description : defaultDict.adminActionsPage.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto"> {/* Make table scrollable horizontally on small screens */}
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-[150px] sm:w-[200px]">{isClient ? adminDict.tableHeaderId : defaultDict.adminActionsPage.tableHeaderId}</TableHead> {/* Fixed width for ID */}
                    <TableHead>{isClient ? adminDict.tableHeaderTitle : defaultDict.adminActionsPage.tableHeaderTitle}</TableHead>
                     <TableHead className="w-[120px] sm:w-[150px]">{isClient ? adminDict.tableHeaderStatus : defaultDict.adminActionsPage.tableHeaderStatus}</TableHead> {/* Fixed width for Status */}
                     <TableHead className="text-right w-[100px] sm:w-[120px]">{isClient ? adminDict.tableHeaderActions : defaultDict.adminActionsPage.tableHeaderActions}</TableHead> {/* Fixed width for Actions */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? ( // Renamed state variable
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8"> {/* Added more padding */}
                        {isClient ? adminDict.noProjects : defaultDict.adminActionsPage.noProjects} {/* Updated dict key */}
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                         <TableCell className="text-xs font-mono break-all">{project.id}</TableCell>{/* Allow ID to break */}
                        <TableCell className="font-medium">
                          {editingProjectId === project.id ? ( // Renamed state variable
                            <Input
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              className="h-8 min-w-[150px]" // Ensure input has min width
                              disabled={isSaving} // Disable input while saving
                            />
                          ) : (
                             <span className="break-words">{project.title}</span> // Allow title to wrap
                          )}
                        </TableCell>
                         <TableCell>{getTranslatedStatus(project.status)}</TableCell>{/* Use translated status */}
                        <TableCell className="text-right space-x-1 whitespace-nowrap"> {/* Prevent actions wrapping */}
                          {editingProjectId === project.id ? ( // Renamed state variable
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(project.id)} disabled={isSaving}>
                                 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-600" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSaving}>
                                 <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(project.id, project.title)} disabled={isSaving}>
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
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
    </div>
  );
}
