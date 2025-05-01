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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, User, UserCog } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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


// Mock user data - Replace with actual user data fetching and state management
const initialUsers = [
  { id: 'usr_1', username: 'owner_john', role: 'Owner' },
  { id: 'usr_2', username: 'genadmin_sara', role: 'General Admin' },
  { id: 'usr_3', username: 'projadmin_mike', role: 'Admin Proyek' },
  { id: 'usr_4', username: 'arch_emily', role: 'Arsitek' },
  { id: 'usr_5', username: 'struct_dave', role: 'Struktur' },
  { id: 'usr_6', username: 'owner_jane', role: 'Owner' },
];

const divisions = ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur'];

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(divisions as [string, ...string[]], { required_error: 'Role is required' }), // Ensure role is one of the defined divisions
});

type UserFormValues = z.infer<typeof userSchema>;

export default function ManageUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState(initialUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);

  // TODO: Check if current user is General Admin, otherwise redirect or show error

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password: '',
      role: undefined,
    },
  });

  const handleAddUser = (data: UserFormValues) => {
    console.log('Adding user:', data);
    // Simulate API call to add user
    return new Promise<boolean>(resolve => setTimeout(() => {
        // Check for duplicate username (simple check)
        if (users.some(u => u.username === data.username)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Username already exists.' });
            resolve(false); // Indicate failure
            return;
        }

      const newUser = {
        id: `usr_${Date.now()}`, // Simple unique ID generation
        username: data.username,
        role: data.role,
      };
      // TODO: Implement actual API call to add user
      setUsers([...users, newUser]);
      toast({ title: 'User Added', description: `User ${data.username} created successfully.` });
      form.reset(); // Reset form after successful submission
      resolve(true); // Indicate success
    }, 1000));

  };

  const handleDeleteUser = (userId: string) => {
    console.log('Deleting user:', userId);
    // Simulate API call to delete user
    new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      // TODO: Implement actual API call to delete user
      setUsers(users.filter((user) => user.id !== userId));
      toast({ title: 'User Deleted', description: `User with ID ${userId} removed.` });
    });
  };

    const onSubmit = async (data: UserFormValues) => {
      const success = await handleAddUser(data);
      if (success) {
        setIsAddUserDialogOpen(false); // Close dialog only on success
      }
   };

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'Owner': return <User className="h-4 w-4 text-blue-600" />;
          case 'General Admin': return <UserCog className="h-4 w-4 text-purple-600" />;
          case 'Admin Proyek': return <UserCog className="h-4 w-4 text-orange-600" />;
          case 'Arsitek': return <User className="h-4 w-4 text-green-600" />;
          case 'Struktur': return <User className="h-4 w-4 text-yellow-600" />;
          default: return <User className="h-4 w-4 text-muted-foreground" />;
      }
  }


  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Manage Users</CardTitle>
            <CardDescription>Add or remove user accounts for all divisions.</CardDescription>
          </div>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-teal">
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Enter the details for the new user account.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., john_doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter secure password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role / Division</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a division" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {divisions.map((division) => (
                                    <SelectItem key={division} value={division}>
                                      {division}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <DialogFooter>
                         <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>
                         <Button type="submit" className="accent-teal" disabled={form.formState.isSubmitting}>
                           {form.formState.isSubmitting ? 'Adding...' : 'Add User'}
                         </Button>
                     </DialogFooter>
                  </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role / Division</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <span>{user.role}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       {/* Prevent deleting the currently logged-in admin? */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" disabled={user.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1}> {/* Example: Prevent deleting last GA */}
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                             <AlertDialogDescription>
                               Are you sure you want to delete user "{user.username}"? This action cannot be undone.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteUser(user.id)}>
                               Delete User
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
        </CardContent>
      </Card>
    </div>
  );
}
