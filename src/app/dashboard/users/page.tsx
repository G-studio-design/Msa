// src/app/dashboard/users/page.tsx
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, User, UserCog, Edit, Loader2 } from 'lucide-react'; // Added Edit, Loader2
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
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';

// Mock user data - Replace with actual user data fetching and state management
interface UserType {
    id: string;
    username: string;
    role: string;
}
const initialUsers: UserType[] = [
  { id: 'usr_1', username: 'owner_john', role: 'Owner' },
  { id: 'usr_2', username: 'genadmin_sara', role: 'General Admin' },
  { id: 'usr_3', username: 'projadmin_mike', role: 'Admin Proyek' },
  { id: 'usr_4', username: 'arch_emily', role: 'Arsitek' },
  { id: 'usr_5', username: 'struct_dave', role: 'Struktur' },
  { id: 'usr_6', username: 'owner_jane', role: 'Owner' },
  { id: 'usr_7', username: 'admin', role: 'General Admin' },
];

const divisions = ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur'];

// Mock current logged-in user - Replace with actual auth context data
const currentUser = {
    id: 'usr_2', // Example: Logged in as genadmin_sara
    username: 'genadmin_sara',
    role: 'General Admin',
};

// Default dictionary for server render / pre-hydration
const defaultDict = getDictionary('en');

// Define Zod schemas using functions to access translations
const getAddUserSchema = (dictValidation: ReturnType<typeof getDictionary>['manageUsersPage']['validation']) => z.object({
    username: z.string().min(3, dictValidation.usernameMin),
    password: z.string().min(6, dictValidation.passwordMin),
    role: z.enum(divisions as [string, ...string[]], { required_error: dictValidation.roleRequired }),
});

const getEditUserSchema = (dictValidation: ReturnType<typeof getDictionary>['manageUsersPage']['validation']) => z.object({
    username: z.string().min(3, dictValidation.usernameMin),
    role: z.enum(divisions as [string, ...string[]], { required_error: dictValidation.roleRequired }),
});

export default function ManageUsersPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [dict, setDict] = React.useState(defaultDict); // Initialize with default dict
  const [isClient, setIsClient] = React.useState(false); // State to track client-side mount
  const usersDict = dict.manageUsersPage;

  const [users, setUsers] = React.useState<UserType[]>(initialUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserType | null>(null);

    React.useEffect(() => {
        setIsClient(true); // Component has mounted client-side
        setDict(getDictionary(language)); // Update dictionary based on context language
    }, [language]); // Re-run if language changes

  // Initialize schemas based on current language
  const addUserSchema = getAddUserSchema(usersDict.validation);
  const editUserSchema = getEditUserSchema(usersDict.validation);
  type AddUserFormValues = z.infer<typeof addUserSchema>;
  type EditUserFormValues = z.infer<typeof editUserSchema>;

  // Check if current user has permission (Owner or General Admin)
  const canManageUsers = ['Owner', 'General Admin'].includes(currentUser.role);

  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: '',
      password: '',
      role: undefined,
    },
     context: { dict }, // Pass dict context if needed (for dynamic error messages)
  });

  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      role: undefined,
    },
     context: { dict }, // Pass dict context if needed (for dynamic error messages)
  });

   // Effect to reset edit form when editingUser changes
   React.useEffect(() => {
      if (editingUser) {
        editUserForm.reset({
          username: editingUser.username,
          role: editingUser.role,
        });
      } else {
        editUserForm.reset({ username: '', role: undefined });
      }
    }, [editingUser, editUserForm]);

     // Re-validate forms if language changes
     React.useEffect(() => {
         addUserForm.trigger();
         editUserForm.trigger();
     }, [dict, addUserForm, editUserForm]);


  const handleAddUser = (data: AddUserFormValues) => {
    console.log('Adding user:', data);
    // Simulate API call to add user
    return new Promise<boolean>(resolve => setTimeout(() => {
        // Check for duplicate username (simple check)
        if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
            toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.usernameExists });
            resolve(false);
            return;
        }
      // TODO: Implement actual API call to add user with hashed password
      const newUser: UserType = {
        id: `usr_${Date.now()}`,
        username: data.username,
        role: data.role,
      };
      setUsers([...users, newUser]);
      toast({ title: usersDict.toast.userAdded, description: usersDict.toast.userAddedDesc.replace('{username}', data.username) });
      addUserForm.reset();
      resolve(true);
    }, 1000));
  };

    const handleEditUser = (data: EditUserFormValues) => {
        if (!editingUser) return Promise.resolve(false);
        console.log(`Editing user ${editingUser.id}:`, data);

        // Simulate API call to update user
        return new Promise<boolean>(resolve => setTimeout(() => {
            // Check for duplicate username (excluding the current user being edited)
            if (users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === data.username.toLowerCase())) {
                 toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.usernameExists });
                 resolve(false);
                 return;
             }

             // Cannot change the role of the last General Admin if the current user is also GA
             if (currentUser.role === 'General Admin' && editingUser.role === 'General Admin' && data.role !== 'General Admin') {
                 const gaCount = users.filter(u => u.role === 'General Admin').length;
                 if (gaCount <= 1) {
                     toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastAdminRole });
                     resolve(false);
                     return;
                 }
             }
            // TODO: Implement actual API call to update user (username, role)
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, username: data.username, role: data.role } : u));
            toast({ title: usersDict.toast.userUpdated, description: usersDict.toast.userUpdatedDesc.replace('{username}', data.username) });
             editUserForm.reset(); // Reset form is handled by closing the dialog
            resolve(true); // Indicate success
        }, 1000));
    };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return;

     // Prevent deleting self if General Admin
     if (currentUser.role === 'General Admin' && currentUser.id === userId) {
       toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteSelf });
       return;
     }

    // Prevent deleting the last General Admin if the current user is also GA
     if (currentUser.role === 'General Admin' && userToDelete.role === 'General Admin') {
         const gaCount = users.filter(u => u.role === 'General Admin').length;
         if (gaCount <= 1) {
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastAdmin });
             return;
         }
     }

    console.log('Deleting user:', userId);
    // Simulate API call to delete user
    new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      // TODO: Implement actual API call to delete user
      setUsers(users.filter((user) => user.id !== userId));
      toast({ title: usersDict.toast.userDeleted, description: usersDict.toast.userDeletedDesc.replace('{username}', userToDelete.username) });
    });
  };

   const onAddSubmit = async (data: AddUserFormValues) => {
      const success = await handleAddUser(data);
      if (success) {
        setIsAddUserDialogOpen(false);
      }
   };

   const onEditSubmit = async (data: EditUserFormValues) => {
        const success = await handleEditUser(data);
        if (success) {
            setIsEditUserDialogOpen(false);
            setEditingUser(null);
        }
    };

   const openEditDialog = (user: UserType) => {
        setEditingUser(user);
        setIsEditUserDialogOpen(true);
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

  // Render Access Denied if not Owner or General Admin
  if (!canManageUsers) {
      return (
          <div className="container mx-auto py-4">
              <Card className="border-destructive">
                   <CardHeader>
                       <CardTitle className="text-destructive">{isClient ? dict.adminActionsPage.accessDeniedTitle : defaultDict.adminActionsPage.accessDeniedTitle}</CardTitle> {/* Reusing adminActionsPage translation */}
                   </CardHeader>
                   <CardContent>
                       <p>{isClient ? dict.adminActionsPage.accessDeniedDesc : defaultDict.adminActionsPage.accessDeniedDesc}</p> {/* Reusing adminActionsPage translation */}
                   </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="container mx-auto py-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
             {/* Render title only on client to avoid mismatch */}
            <CardTitle className="text-2xl">{isClient ? usersDict.title : defaultDict.manageUsersPage.title}</CardTitle>
            <CardDescription>{isClient ? usersDict.description : defaultDict.manageUsersPage.description}</CardDescription>
          </div>
          {/* Add User Dialog Trigger */}
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-teal">
                <PlusCircle className="mr-2 h-4 w-4" /> {isClient ? usersDict.addUserButton : defaultDict.manageUsersPage.addUserButton}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                 {/* Render dialog text only on client */}
                <DialogTitle>{isClient ? usersDict.addUserDialogTitle : defaultDict.manageUsersPage.addUserDialogTitle}</DialogTitle>
                <DialogDescription>
                 {isClient ? usersDict.addUserDialogDesc : defaultDict.manageUsersPage.addUserDialogDesc}
                </DialogDescription>
              </DialogHeader>
              <Form {...addUserForm}>
                  <form onSubmit={addUserForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                    {/* Username Field */}
                    <FormField
                      control={addUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                           {/* Render label only on client */}
                          <FormLabel>{isClient ? usersDict.usernameLabel : defaultDict.manageUsersPage.usernameLabel}</FormLabel>
                          <FormControl>
                             {/* Render placeholder only on client */}
                            <Input placeholder={isClient ? usersDict.usernamePlaceholder : defaultDict.manageUsersPage.usernamePlaceholder} {...field} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Password Field */}
                    <FormField
                        control={addUserForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                             {/* Render label only on client */}
                            <FormLabel>{isClient ? usersDict.passwordLabel : defaultDict.manageUsersPage.passwordLabel}</FormLabel>
                            <FormControl>
                               {/* Render placeholder only on client */}
                              <Input type="password" placeholder={isClient ? usersDict.passwordPlaceholder : defaultDict.manageUsersPage.passwordPlaceholder} {...field} autoComplete="new-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    {/* Role Field */}
                    <FormField
                        control={addUserForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                             {/* Render label only on client */}
                            <FormLabel>{isClient ? usersDict.roleLabel : defaultDict.manageUsersPage.roleLabel}</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                     {/* Render placeholder only on client */}
                                    <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultDict.manageUsersPage.rolePlaceholder} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {divisions.map((division) => (
                                    <SelectItem key={division} value={division}>
                                       {/* Render role names only on client */}
                                      {isClient ? (usersDict.roles[division as keyof typeof usersDict.roles] || division) : (defaultDict.manageUsersPage.roles[division as keyof typeof defaultDict.manageUsersPage.roles] || division)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <DialogFooter>
                         {/* Render button text only on client */}
                         <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)} disabled={addUserForm.formState.isSubmitting}>{isClient ? usersDict.cancelButton : defaultDict.manageUsersPage.cancelButton}</Button>
                         <Button type="submit" className="accent-teal" disabled={addUserForm.formState.isSubmitting}>
                           {addUserForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {/* Render button text only on client */}
                           {isClient ? (addUserForm.formState.isSubmitting ? usersDict.addingUserButton : usersDict.addUserSubmitButton) : defaultDict.manageUsersPage.addUserSubmitButton}
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
                 {/* Render header text only on client */}
                <TableHead>{isClient ? usersDict.tableHeaderUsername : defaultDict.manageUsersPage.tableHeaderUsername}</TableHead>
                <TableHead>{isClient ? usersDict.tableHeaderRole : defaultDict.manageUsersPage.tableHeaderRole}</TableHead>
                <TableHead className="text-right">{isClient ? usersDict.tableHeaderActions : defaultDict.manageUsersPage.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {/* Render no users text only on client */}
                    {isClient ? usersDict.noUsers : defaultDict.manageUsersPage.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                   const isSelf = user.id === currentUser.id;
                    const isLastGeneralAdmin = user.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1;
                    // Disable delete for self (if GA), and for the last GA (if current user is GA)
                    const disableDelete = (isSelf && currentUser.role === 'General Admin') || (isLastGeneralAdmin && currentUser.role === 'General Admin');
                    // Disable edit for self (if GA), and for the last GA (if current user is GA - cannot change role)
                    const disableEdit = isSelf && currentUser.role === 'General Admin'; // Can't edit own role/username if GA


                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {getRoleIcon(user.role)}
                                 {/* Render role name only on client */}
                                <span>{isClient ? (usersDict.roles[user.role as keyof typeof usersDict.roles] || user.role) : (defaultDict.manageUsersPage.roles[user.role as keyof typeof defaultDict.manageUsersPage.roles] || user.role)}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           {/* Edit User Button */}
                           <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                disabled={disableEdit}
                                 // Render aria-label only on client
                                aria-label={isClient ? usersDict.editUserButtonLabel : defaultDict.manageUsersPage.editUserButtonLabel}
                           >
                               <Edit className="h-4 w-4 text-blue-500" />
                           </Button>

                           {/* Delete User Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                               {/* Render aria-label only on client */}
                              <Button variant="ghost" size="icon" disabled={disableDelete} aria-label={isClient ? usersDict.deleteUserButtonLabel : defaultDict.manageUsersPage.deleteUserButtonLabel}>
                                 <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                 {/* Render dialog text only on client */}
                                <AlertDialogTitle>{isClient ? usersDict.deleteDialogTitle : defaultDict.manageUsersPage.deleteDialogTitle}</AlertDialogTitle>
                                <AlertDialogDescription>
                                   {isClient ? usersDict.deleteDialogDesc.replace('{username}', user.username) : defaultDict.manageUsersPage.deleteDialogDesc.replace('{username}', user.username)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                 {/* Render button text only on client */}
                                <AlertDialogCancel>{isClient ? usersDict.deleteDialogCancel : defaultDict.manageUsersPage.deleteDialogCancel}</AlertDialogCancel>
                                <AlertDialogAction
                                   className="bg-destructive hover:bg-destructive/90"
                                   onClick={() => handleDeleteUser(user.id)}>
                                   {/* Render button text only on client */}
                                  {isClient ? usersDict.deleteDialogConfirm : defaultDict.manageUsersPage.deleteDialogConfirm}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                   {/* Render dialog text only on client */}
                  <DialogTitle>{isClient ? usersDict.editUserDialogTitle.replace('{username}', editingUser?.username || '') : defaultDict.manageUsersPage.editUserDialogTitle.replace('{username}', editingUser?.username || '')}</DialogTitle>
                  <DialogDescription>{isClient ? usersDict.editUserDialogDesc : defaultDict.manageUsersPage.editUserDialogDesc}</DialogDescription>
               </DialogHeader>
               <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                         {/* Username Field */}
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                               {/* Render label only on client */}
                              <FormLabel>{isClient ? usersDict.usernameLabel : defaultDict.manageUsersPage.usernameLabel}</FormLabel>
                              <FormControl>
                                 {/* Render placeholder only on client */}
                                <Input placeholder={isClient ? usersDict.usernamePlaceholder : defaultDict.manageUsersPage.usernamePlaceholder} {...field} autoComplete="off" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Role Field */}
                        <FormField
                            control={editUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                 {/* Render label only on client */}
                                <FormLabel>{isClient ? usersDict.roleLabel : defaultDict.manageUsersPage.roleLabel}</FormLabel>
                                <Select
                                   onValueChange={field.onChange}
                                   defaultValue={field.value}
                                   // Disable changing role of the last GA if current user is GA
                                   disabled={(currentUser.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                             {/* Render placeholder only on client */}
                                            <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultDict.manageUsersPage.rolePlaceholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {divisions.map((division) => (
                                            <SelectItem key={division} value={division}>
                                                {/* Render role names only on client */}
                                                {isClient ? (usersDict.roles[division as keyof typeof usersDict.roles] || division) : (defaultDict.manageUsersPage.roles[division as keyof typeof defaultDict.manageUsersPage.roles] || division)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {/* Add a hint if the role is disabled */}
                                {(currentUser.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1) && (
                                     /* Render hint only on client */
                                    <p className="text-xs text-muted-foreground">{isClient ? usersDict.cannotChangeLastAdminRoleHint : defaultDict.manageUsersPage.cannotChangeLastAdminRoleHint}</p>
                                )}
                              </FormItem>
                            )}
                        />
                         {/* Optional: Add password change fields here if needed */}
                        <DialogFooter>
                            {/* Render button text only on client */}
                            <Button type="button" variant="outline" onClick={() => {setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={editUserForm.formState.isSubmitting}>{isClient ? usersDict.cancelButton : defaultDict.manageUsersPage.cancelButton}</Button>
                             {/* Render button text only on client */}
                            <Button type="submit" className="accent-teal" disabled={editUserForm.formState.isSubmitting || !editUserForm.formState.isDirty}>
                                {editUserForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isClient ? (editUserForm.formState.isSubmitting ? usersDict.editingUserButton : usersDict.editUserSubmitButton) : defaultDict.manageUsersPage.editUserSubmitButton}
                             </Button>
                        </DialogFooter>
                   </form>
               </Form>
          </DialogContent>
       </Dialog>

    </div>
  );
}
