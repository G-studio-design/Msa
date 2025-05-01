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
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper

// Mock data - Replace with actual data fetching based on user role and permissions
const initialTasks = [
  { id: 1, title: "Project Alpha - Phase 1", status: "Completed" },
  { id: 2, title: "Project Beta - Design Specs", status: "In Progress" },
  { id: 3, title: "Project Gamma - Offer Prep", status: "Pending Approval" },
  { id: 4, title: "Project Delta - Structure Plan", status: "Delayed" },
  { id: 5, title: "Project Epsilon - Canceled", status: "Canceled" },
  { id: 6, title: "Project Zeta - Admin Setup", status: "Pending" },
];

// Mock user - Replace with actual user data from auth context
const currentUser = {
  role: 'General Admin', // Should be Owner, General Admin, or Admin Proyek
};

export default function AdminActionsPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const dict = getDictionary(language); // Get dictionary for the current language
  const adminDict = dict.adminActionsPage; // Specific dictionary section
  const dashboardDict = dict.dashboardPage; // For status translation

  const [tasks, setTasks] = React.useState(initialTasks);
  const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null);
  const [newTitle, setNewTitle] = React.useState('');

  // TODO: Check if current user has the required role (Owner, GA, PA), otherwise redirect or show error

  const handleEditClick = (taskId: number, currentTitle: string) => {
    setEditingTaskId(taskId);
    setNewTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setNewTitle('');
  };

  const handleSaveTitle = (taskId: number) => {
    if (!newTitle.trim()) {
      toast({ variant: 'destructive', title: adminDict.toast.error, description: adminDict.toast.titleEmpty });
      return;
    }

    console.log(`Saving new title for task ${taskId}: ${newTitle}`);
    // Simulate API call to update task title
    new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      // TODO: Implement actual API call to update task title
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, title: newTitle } : task
        )
      );
      toast({ title: adminDict.toast.titleUpdated, description: adminDict.toast.titleUpdatedDesc.replace('{id}', taskId.toString()) });
      handleCancelEdit(); // Exit editing mode
    });
  };

   // Helper function to get translated status
   const getTranslatedStatus = (status: string): string => {
        const statusKey = status.toLowerCase().replace(' ','') as keyof typeof dashboardDict.status;
        return dashboardDict.status[statusKey] || status; // Fallback to original
    }

  // Basic permission check
   const canEdit = ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role);

   if (!canEdit) {
       return (
            <div className="container mx-auto py-4">
                <Card className="border-destructive">
                     <CardHeader>
                         <CardTitle className="text-destructive">{adminDict.accessDeniedTitle}</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p>{adminDict.accessDeniedDesc}</p>
                     </CardContent>
                </Card>
            </div>
       );
   }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{adminDict.title}</CardTitle>
          <CardDescription>
           {adminDict.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{adminDict.tableHeaderId}</TableHead>
                <TableHead>{adminDict.tableHeaderTitle}</TableHead>
                <TableHead>{adminDict.tableHeaderStatus}</TableHead>
                <TableHead className="text-right">{adminDict.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {adminDict.noTasks}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell className="font-medium">
                      {editingTaskId === task.id ? (
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        task.title
                      )}
                    </TableCell>
                     <TableCell>{getTranslatedStatus(task.status)}</TableCell> {/* Use translated status */}
                    <TableCell className="text-right space-x-2">
                      {editingTaskId === task.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(task.id)}>
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                             <XCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(task.id, task.title)}>
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
