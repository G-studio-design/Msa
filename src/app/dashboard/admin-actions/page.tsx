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
import { Edit, Save } from 'lucide-react';

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
      toast({ variant: 'destructive', title: 'Error', description: 'Title cannot be empty.' });
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
      toast({ title: 'Title Updated', description: `Task ${taskId} title changed successfully.` });
      handleCancelEdit(); // Exit editing mode
    });
  };

  // Basic permission check
   const canEdit = ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role);

   if (!canEdit) {
       return (
            <div className="container mx-auto py-4">
                <Card className="border-destructive">
                     <CardHeader>
                         <CardTitle className="text-destructive">Access Denied</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <p>You do not have permission to access this page.</p>
                     </CardContent>
                </Card>
            </div>
       );
   }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Admin Actions - Modify Task Titles</CardTitle>
          <CardDescription>
            Users with appropriate permissions (Owner, General Admin, Admin Proyek) can modify task titles here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task ID</TableHead>
                <TableHead>Current Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No tasks found.
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
                     <TableCell>{task.status}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {editingTaskId === task.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSaveTitle(task.id)}>
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                             <XCircle className="h-4 w-4 text-muted-foreground" /> {/* Using XCircle from page.tsx import */}
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

// Need to import XCircle if not already available globally or pass down props
import { XCircle } from 'lucide-react';
