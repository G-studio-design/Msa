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
import { useLanguage } from '@/context/LanguageContext'; // Import language context
import { getDictionary } from '@/lib/translations'; // Import translation helper


// Mock user data - Replace with actual user data fetching and state management
const initialUsers = [
  { id: 'usr_1', username: 'owner_john', role: 'Owner' },
  { id: 'usr_2', username: 'genadmin_sara', role: 'General Admin' },
  { id: 'usr_3', username: 'projadmin_mike', role: 'Admin Proyek' },
  { id: 'usr_4', username: 'arch_emily', role: 'Arsitek' },
  { id: 'usr_5', username: 'struct_dave', role: 'Struktur' },
  { id: 'usr_6', username: 'owner_jane', role: 'Owner' },
  { id: 'usr_7', username: 'admin', role: 'General Admin' }, // Added user: i wayan govina
];

const divisions = ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur'];

// Define schema using a function to access translations
const getUserSchema = (dictValidation: ReturnType<typeof getDictionary>['manageUsersPage']['validation']) => z.object({
    username: z.string().min(3, dictValidation.usernameMin),
    password: z.string().min(6, dictValidation.passwordMin),
    role: z.enum(divisions as [string, ...string[]], { required_error: dictValidation.roleRequired }),
});


export default function ManageUsersPage() {
  const { toast } = useToast();
  const { language } = useLanguage(); // Get current language
  const dict = getDictionary(language); // Get dictionary for the current language
  const usersDict = dict.manageUsersPage; // Specific dictionary section

  const [users, setUsers] = React.useState(initialUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);

  // Initialize schema based on current language
  const userSchema = getUserSchema(usersDict.validation);
  type UserFormValues = z.infer<typeof userSchema>;


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
            toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.usernameExists });
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
      toast({ title: usersDict.toast.userAdded, description: usersDict.toast.userAddedDesc.replace('{username}', data.username) });
      form.reset(); // Reset form after successful submission
      resolve(true); // Indicate success
    }, 1000));

  };

  const handleDeleteUser = (userId: string) => {
    console.log('Deleting user:', userId);
    // Simulate API call to delete user
    new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      // TODO: Implement actual API call to delete user
      const deletedUser = users.find(user => user.id === userId);
      setUsers(users.filter((user) => user.id !== userId));
       if (deletedUser) {
          toast({ title: usersDict.toast.userDeleted, description: usersDict.toast.userDeletedDesc.replace('{id}', deletedUser.username) }); // Show username instead of ID
       }
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
            <CardTitle className="text-2xl">{usersDict.title}</CardTitle>
            <CardDescription>{usersDict.description}</CardDescription>
          </div>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-teal">
                <PlusCircle className="mr-2 h-4 w-4" /> {usersDict.addUserButton}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{usersDict.addUserDialogTitle}</DialogTitle>
                <DialogDescription>
                 {usersDict.addUserDialogDesc}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{usersDict.usernameLabel}</FormLabel>
                          <FormControl>
                            <Input placeholder={usersDict.usernamePlaceholder} {...field} />
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
                            <FormLabel>{usersDict.passwordLabel}</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder={usersDict.passwordPlaceholder} {...field} />
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
                            <FormLabel>{usersDict.roleLabel}</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={usersDict.rolePlaceholder} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {divisions.map((division) => (
                                    <SelectItem key={division} value={division}>
                                      {/* Consider translating division names if needed */}
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
                         <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>{usersDict.cancelButton}</Button>
                         <Button type="submit" className="accent-teal" disabled={form.formState.isSubmitting}>
                           {form.formState.isSubmitting ? usersDict.addingUserButton : usersDict.addUserSubmitButton}
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
                <TableHead>{usersDict.tableHeaderUsername}</TableHead>
                <TableHead>{usersDict.tableHeaderRole}</TableHead>
                <TableHead className="text-right">{usersDict.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                   {usersDict.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                             {/* Consider translating role names if needed */}
                            <span>{user.role}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                       {/* Prevent deleting the currently logged-in admin? */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           {/* Prevent deleting user 'admin' or the last General Admin */}
                           <Button variant="ghost" size="icon" disabled={user.username === 'admin' || (user.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1)}>
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>{usersDict.deleteDialogTitle}</AlertDialogTitle>
                             <AlertDialogDescription>
                                {usersDict.deleteDialogDesc.replace('{username}', user.username)}
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>{usersDict.deleteDialogCancel}</AlertDialogCancel>
                             <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeleteUser(user.id)}>
                               {usersDict.deleteDialogConfirm}
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
