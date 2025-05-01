

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
import { PlusCircle, Trash2, User, UserCog, Edit, Loader2, Eye, EyeOff, CheckCircle, ShieldAlert, Code } from 'lucide-react'; // Added Code icon for Dev Admin
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
import {
    getAllUsers,
    addUser,
    updateUserProfile,
    deleteUser,
    // activateUser, // Removed activateUser import
    type User as UserType // Import the type from service
} from '@/services/user-service';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

// Define available roles for selection (excluding Pending)
// Now includes Admin Developer
const divisions = ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur', 'Admin Developer'];

// Mock current logged-in user - Replace with actual auth context data
// In a real app, fetch this from session/token
const currentUser = {
    id: 'usr_7', // Example: Logged in as admin
    username: 'admin',
    role: 'General Admin', // Or dynamically set based on actual login
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
    // Password is not edited here by default
});

// Activate User Schema removed as activation flow is removed


export default function ManageUsersPage() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [dict, setDict] = React.useState(defaultDict);
  const [isClient, setIsClient] = React.useState(false);
  const usersDict = dict.manageUsersPage;

  const [users, setUsers] = React.useState<UserType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Loading state for initial fetch
  const [isProcessing, setIsProcessing] = React.useState(false); // General processing state for buttons
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserType | null>(null);
  const [visiblePasswords, setVisiblePasswords] = React.useState<Record<string, boolean>>({}); // State for password visibility

  // Fetch users on component mount
  React.useEffect(() => {
      async function fetchUsers() {
          setIsLoading(true);
          try {
              const fetchedUsers = await getAllUsers();
              setUsers(fetchedUsers);
          } catch (error) {
              console.error("Failed to fetch users:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
          } finally {
              setIsLoading(false);
          }
      }
      fetchUsers();
  }, [toast]); // Refetch if toast changes? Maybe remove toast dependency if not needed.

    React.useEffect(() => {
        setIsClient(true);
        setDict(getDictionary(language));
    }, [language]);

  // Initialize schemas based on current language
  const addUserSchema = getAddUserSchema(usersDict.validation);
  const editUserSchema = getEditUserSchema(usersDict.validation);

  type AddUserFormValues = z.infer<typeof addUserSchema>;
  type EditUserFormValues = z.infer<typeof editUserSchema>;

  // Check if current user has permission (Owner, GA, or Admin Developer)
  const canManageUsers = isClient && ['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role);

  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: '',
      password: '',
      role: undefined,
    },
     context: { dict: usersDict.validation },
  });

  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      role: undefined,
    },
     context: { dict: usersDict.validation },
  });


   // Effect to reset edit form when editingUser changes
   React.useEffect(() => {
      if (editingUser) {
        editUserForm.reset({
          username: editingUser.username,
          // Ensure role is one of the selectable divisions, not 'Pending'
          role: divisions.includes(editingUser.role) ? editingUser.role : undefined,
        });
      } else {
        editUserForm.reset({ username: '', role: undefined });
      }
    }, [editingUser, editUserForm]);


     // Re-validate forms if language changes
     React.useEffect(() => {
         if(isClient) {
             addUserForm.trigger();
             editUserForm.trigger();
         }
     }, [dict, addUserForm, editUserForm, isClient]);


  const handleAddUser = async (data: AddUserFormValues) => {
    if (!canManageUsers) return; // Permission check
    setIsProcessing(true);
    addUserForm.clearErrors();
    console.log('Adding user:', data.username);
    try {
        const newUser = await addUser(data); // Use service function
        setUsers([...users, newUser as UserType]); // Add to local state, ensure type compatibility if needed
        toast({ title: usersDict.toast.userAdded, description: usersDict.toast.userAddedDesc.replace('{username}', data.username) });
        addUserForm.reset();
        setIsAddUserDialogOpen(false);
    } catch (error: any) {
        console.error("Add user error:", error);
        let desc = usersDict.toast.error;
        if (error.message === 'USERNAME_EXISTS') {
            desc = usersDict.toast.usernameExists;
            addUserForm.setError('username', { type: 'manual', message: desc });
        } else {
            desc = error.message || 'Failed to add user.';
        }
        toast({ variant: 'destructive', title: usersDict.toast.error, description: desc });
    } finally {
        setIsProcessing(false);
    }
  };

    const handleEditUser = async (data: EditUserFormValues) => {
        if (!editingUser || !canManageUsers) return; // Permission check
        setIsProcessing(true);
        editUserForm.clearErrors();
        console.log(`Editing user ${editingUser.id}:`, data.username, data.role);

        // Prevent changing role of last GA if the current user is GA or Admin Dev
        if (['General Admin', 'Admin Developer'].includes(currentUser.role) && editingUser.role === 'General Admin' && data.role !== 'General Admin') {
            const gaCount = users.filter(u => u.role === 'General Admin').length;
            if (gaCount <= 1) {
                toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastAdminRole });
                setIsProcessing(false);
                return;
            }
        }

        // Prevent Admin Dev from changing their own role if they are the last one
         if (currentUser.role === 'Admin Developer' && editingUser.id === currentUser.id && data.role !== 'Admin Developer') {
             const devAdminCount = users.filter(u => u.role === 'Admin Developer').length;
             if (devAdminCount <= 1) {
                  toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastDevAdminRole });
                  setIsProcessing(false);
                  return;
             }
         }


        try {
            // Prepare data for update - ensure displayName is passed if username changes
            const updatePayload: { userId: string; username: string; role: string; displayName?: string } = {
                 userId: editingUser.id,
                 username: data.username,
                 role: data.role,
            };
             if (data.username !== editingUser.username) {
                 updatePayload.displayName = data.username; // Update displayName when username changes
             }

            await updateUserProfile(updatePayload);
             // Update local state
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, username: data.username, role: data.role, displayName: data.username } : u));
            toast({ title: usersDict.toast.userUpdated, description: usersDict.toast.userUpdatedDesc.replace('{username}', data.username) });
            setIsEditUserDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
             console.error("Edit user error:", error);
             let desc = usersDict.toast.error;
             if (error.message === 'USERNAME_EXISTS') {
                 desc = usersDict.toast.usernameExists;
                 editUserForm.setError('username', { type: 'manual', message: desc });
             } else if (error.message === 'USER_NOT_FOUND') {
                 desc = usersDict.toast.userNotFound; // Use translation
             } else {
                 desc = error.message || 'Failed to update user.';
             }
             toast({ variant: 'destructive', title: usersDict.toast.error, description: desc });
        } finally {
             setIsProcessing(false);
        }
    };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!canManageUsers) return; // Permission check
    // Find user locally first for checks
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return; // Should not happen if UI is correct

     // Prevent deleting self if GA or Admin Dev
     if (['General Admin', 'Admin Developer'].includes(currentUser.role) && currentUser.id === userId) {
       toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteSelf });
       return;
     }

    // Prevent deleting last GA if GA or Admin Dev
     if (['General Admin', 'Admin Developer'].includes(currentUser.role) && userToDelete.role === 'General Admin') {
         const gaCount = users.filter(u => u.role === 'General Admin').length;
         if (gaCount <= 1) {
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastAdmin });
             return;
         }
     }

     // Prevent deleting last Admin Dev if Admin Dev or GA
      if (['General Admin', 'Admin Developer'].includes(currentUser.role) && userToDelete.role === 'Admin Developer') {
           const devAdminCount = users.filter(u => u.role === 'Admin Developer').length;
           if (devAdminCount <= 1) {
               toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastDevAdmin });
               return;
           }
      }


    setIsProcessing(true); // Indicate processing
    console.log('Attempting to delete user:', userId, username);
    try {
        await deleteUser(userId); // Call service function
        setUsers(users.filter((user) => user.id !== userId)); // Update local state
        // Clean up password visibility state
        setVisiblePasswords(prev => {
            const newState = {...prev};
            delete newState[userId];
            return newState;
        });
        toast({ title: usersDict.toast.userDeleted, description: usersDict.toast.userDeletedDesc.replace('{username}', username) });
    } catch (error: any) {
         console.error("Delete user error:", error);
         toast({
             variant: 'destructive',
             title: usersDict.toast.error,
             description: error.message || 'Failed to delete user.',
         });
    } finally {
        setIsProcessing(false); // Stop indicating processing
    }
  };

   const onAddSubmit = (data: AddUserFormValues) => {
       handleAddUser(data); // No need for async/await check here, handled internally
   };

   const onEditSubmit = (data: EditUserFormValues) => {
       handleEditUser(data); // No need for async/await check here, handled internally
   };

   const openEditDialog = (user: UserType) => {
        // Prevent editing 'Pending' users directly in this dialog
        if (user.role === 'Pending') {
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotEditPending});
             return;
        }

         // Check permissions based on currentUser.role
         let canEditTargetUser = false;
         if (currentUser.role === 'Owner') {
             canEditTargetUser = true; // Owner can edit anyone
         } else if (currentUser.role === 'General Admin') {
             canEditTargetUser = user.role !== 'Owner'; // GA can edit anyone except Owner
         } else if (currentUser.role === 'Admin Developer') {
             // Admin Dev cannot edit Owner or GA. Can edit self unless last dev.
             canEditTargetUser = !['Owner', 'General Admin'].includes(user.role);
         }

         if (!canEditTargetUser) {
            toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: usersDict.toast.editPermissionDenied }); // Use a general denial message
             return;
         }

        setEditingUser(user);
        setIsEditUserDialogOpen(true);
    };


   const togglePasswordVisibility = (userId: string) => {
        setVisiblePasswords(prev => ({
           ...prev,
           [userId]: !prev[userId]
        }));
   };

  const getRoleIcon = (role: string) => {
      switch(role) {
          case 'Owner': return <User className="h-4 w-4 text-blue-600" />;
          case 'General Admin': return <UserCog className="h-4 w-4 text-purple-600" />;
          case 'Admin Proyek': return <UserCog className="h-4 w-4 text-orange-600" />;
          case 'Arsitek': return <User className="h-4 w-4 text-green-600" />;
          case 'Struktur': return <User className="h-4 w-4 text-yellow-600" />;
          case 'Admin Developer': return <Code className="h-4 w-4 text-red-600" />; // New icon
          case 'Pending': return <ShieldAlert className="h-4 w-4 text-yellow-500" />; // Keep for consistency if pending data exists
          default: return <User className="h-4 w-4 text-muted-foreground" />;
      }
  }

  // Render Access Denied if not Owner, General Admin, or Admin Developer
  if (isClient && !canManageUsers) {
      return (
          <div className="container mx-auto py-4">
              <Card className="border-destructive">
                   <CardHeader>
                       <CardTitle className="text-destructive">{isClient ? usersDict.accessDeniedTitle : defaultDict.manageUsersPage.accessDeniedTitle}</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <p>{isClient ? usersDict.accessDeniedDesc : defaultDict.manageUsersPage.accessDeniedDesc}</p>
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
            <CardTitle className="text-2xl">{isClient ? usersDict.title : defaultDict.manageUsersPage.title}</CardTitle>
            <CardDescription>{isClient ? usersDict.description : defaultDict.manageUsersPage.description}</CardDescription>
          </div>
          {/* Add User Dialog Trigger - only if Owner, GA, or Admin Dev */}
          {canManageUsers && (
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="accent-teal" disabled={isProcessing || isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {isClient ? usersDict.addUserButton : defaultDict.manageUsersPage.addUserButton}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
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
                            <FormLabel>{isClient ? usersDict.usernameLabel : defaultDict.manageUsersPage.usernameLabel}</FormLabel>
                            <FormControl>
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
                              <FormLabel>{isClient ? usersDict.passwordLabel : defaultDict.manageUsersPage.passwordLabel}</FormLabel>
                              <FormControl>
                                {/* SECURITY RISK: Type is password, but plain text is stored */}
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
                              <FormLabel>{isClient ? usersDict.roleLabel : defaultDict.manageUsersPage.roleLabel}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultDict.manageUsersPage.rolePlaceholder} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {divisions
                                        // Filter roles that the current user can create
                                        .filter(division => {
                                            if (currentUser.role === 'Owner') return true; // Owner can create any role
                                            if (currentUser.role === 'Admin Developer') return true; // Admin Dev can create any role (except Owner/GA?) - Revisit if needed
                                            if (currentUser.role === 'General Admin') return !['Owner', 'Admin Developer'].includes(division); // GA cannot create Owner or Admin Dev
                                            return false; // Other roles cannot create users
                                        })
                                        .map((division) => (
                                            <SelectItem key={division} value={division}>
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
                          <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)} disabled={isProcessing}>{isClient ? usersDict.cancelButton : defaultDict.manageUsersPage.cancelButton}</Button>
                          <Button type="submit" className="accent-teal" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isClient ? (isProcessing ? usersDict.addingUserButton : usersDict.addUserSubmitButton) : defaultDict.manageUsersPage.addUserSubmitButton}
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isClient ? usersDict.tableHeaderUsername : defaultDict.manageUsersPage.tableHeaderUsername}</TableHead>
                <TableHead>{isClient ? usersDict.tableHeaderPassword : defaultDict.manageUsersPage.tableHeaderPassword}</TableHead>
                <TableHead>{isClient ? usersDict.tableHeaderRole : defaultDict.manageUsersPage.tableHeaderRole}</TableHead>
                <TableHead className="text-right">{isClient ? usersDict.tableHeaderActions : defaultDict.manageUsersPage.tableHeaderActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 // Show Skeleton Loaders
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right space-x-1">
                            <Skeleton className="h-8 w-8 inline-block" />
                            <Skeleton className="h-8 w-8 inline-block" />
                        </TableCell>
                    </TableRow>
                  ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {isClient ? usersDict.noUsers : defaultDict.manageUsersPage.noUsers}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                   const isSelf = user.id === currentUser.id;
                    const isLastGeneralAdmin = user.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1;
                    const isLastAdminDeveloper = user.role === 'Admin Developer' && users.filter(u => u.role === 'Admin Developer').length <= 1;

                     // Determine if delete should be disabled
                     const disableDelete = !canManageUsers || // Cannot delete if current user lacks permission
                                            (isSelf && ['General Admin', 'Admin Developer'].includes(currentUser.role)) || // Cannot delete self if GA or Dev
                                            (isLastGeneralAdmin && ['General Admin', 'Admin Developer'].includes(currentUser.role)) || // Cannot delete last GA if GA or Dev
                                            (isLastAdminDeveloper && ['General Admin', 'Admin Developer'].includes(currentUser.role)); // Cannot delete last Dev if GA or Dev

                      // Determine if edit should be disabled based on permissions
                      let disableEdit = !canManageUsers || // Cannot edit if current user lacks permission
                                        user.role === 'Pending' || // Cannot edit pending users
                                        (currentUser.role === 'General Admin' && user.role === 'Owner') || // GA cannot edit Owner
                                        (currentUser.role === 'Admin Developer' && ['Owner', 'General Admin'].includes(user.role)); // Dev cannot edit Owner/GA


                    const isPasswordVisible = visiblePasswords[user.id] || false;
                    // Determine if the current user can view this specific user's password
                    // Owner and GA can view all passwords. Admin Dev can view passwords except for Owner/GA.
                    const canViewPassword = canManageUsers && (
                        currentUser.role === 'Owner' ||
                        currentUser.role === 'General Admin' ||
                        (currentUser.role === 'Admin Developer' && !['Owner', 'General Admin'].includes(user.role))
                    );


                    return (
                      <TableRow key={user.id} className={user.role === 'Pending' ? 'bg-yellow-100/30 dark:bg-yellow-900/30 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/50' : ''}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                         <TableCell>
                            {canViewPassword ? (
                               <div className="flex items-center gap-1">
                                 {/* SECURITY RISK: Displaying plain text password */}
                                 <span className="font-mono text-xs break-all text-foreground">
                                   {isPasswordVisible ? (user.password || (isClient ? usersDict.passwordNotSet : defaultDict.manageUsersPage.passwordNotSet)) : '••••••••'}
                                 </span>
                                   {/* Show/Hide button */}
                                   {user.password && (
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 flex-shrink-0"
                                          onClick={() => togglePasswordVisibility(user.id)}
                                          aria-label={isClient ? (isPasswordVisible ? usersDict.hidePasswordButtonLabel : usersDict.showPasswordButtonLabel) : 'Toggle Password'}
                                          disabled={isProcessing}
                                          title={isClient ? (isPasswordVisible ? usersDict.hidePasswordButtonLabel : usersDict.showPasswordButtonLabel) : 'Toggle Password'}
                                        >
                                          {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                   )}
                                   {!user.password && (
                                        <span className="text-xs text-muted-foreground italic ml-1">({isClient ? usersDict.passwordNotSet : defaultDict.manageUsersPage.passwordNotSet})</span>
                                   )}
                               </div>
                             ) : (
                                <span className="text-xs text-muted-foreground italic">{isClient ? usersDict.passwordHidden : defaultDict.manageUsersPage.passwordHidden}</span>
                             )}
                         </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {getRoleIcon(user.role)}
                                <span>{isClient ? (usersDict.roles[user.role as keyof typeof usersDict.roles] || user.role) : (defaultDict.manageUsersPage.roles[user.role as keyof typeof defaultDict.manageUsersPage.roles] || user.role)}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                           {/* Activate Button removed */}

                           {/* Edit User Button (respecting permissions) */}
                           {canManageUsers && user.role !== 'Pending' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(user)}
                                    disabled={isProcessing || disableEdit}
                                    aria-label={isClient ? usersDict.editUserButtonLabel : defaultDict.manageUsersPage.editUserButtonLabel}
                                    title={isClient ? usersDict.editUserButtonLabel : defaultDict.manageUsersPage.editUserButtonLabel}
                               >
                                   <Edit className={`h-4 w-4 ${disableEdit ? 'text-muted-foreground' : 'text-blue-500'}`} />
                               </Button>
                            )}

                           {/* Delete User Button (respecting permissions) */}
                            {canManageUsers && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isProcessing || disableDelete} aria-label={isClient ? usersDict.deleteUserButtonLabel : defaultDict.manageUsersPage.deleteUserButtonLabel} title={isClient ? usersDict.deleteUserButtonLabel : defaultDict.manageUsersPage.deleteUserButtonLabel}>
                                     <Trash2 className={`h-4 w-4 ${disableDelete ? 'text-muted-foreground' : 'text-destructive'}`} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{isClient ? usersDict.deleteDialogTitle : defaultDict.manageUsersPage.deleteDialogTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                       {isClient ? usersDict.deleteDialogDesc.replace('{username}', user.username) : defaultDict.manageUsersPage.deleteDialogDesc.replace('{username}', user.username)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isProcessing}>{isClient ? usersDict.deleteDialogCancel : defaultDict.manageUsersPage.deleteDialogCancel}</AlertDialogCancel>
                                    <AlertDialogAction
                                       className="bg-destructive hover:bg-destructive/90"
                                       onClick={() => handleDeleteUser(user.id, user.username)}
                                       disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                      {isClient ? usersDict.deleteDialogConfirm : defaultDict.manageUsersPage.deleteDialogConfirm}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                             )}
                        </TableCell>
                      </TableRow>
                    );
                }) // Ensure no whitespace here
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
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
                              <FormLabel>{isClient ? usersDict.usernameLabel : defaultDict.manageUsersPage.usernameLabel}</FormLabel>
                              <FormControl>
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
                                <FormLabel>{isClient ? usersDict.roleLabel : defaultDict.manageUsersPage.roleLabel}</FormLabel>
                                <Select
                                   onValueChange={field.onChange}
                                   value={field.value} // Use controlled value
                                   disabled={
                                       isProcessing ||
                                       // Disable if GA trying to change last GA role
                                       (currentUser.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1) ||
                                       // Disable if Admin Dev trying to change own role when they are the last Admin Dev
                                       (currentUser.role === 'Admin Developer' && editingUser?.id === currentUser.id && users.filter(u => u.role === 'Admin Developer').length <= 1)
                                    } // Disable while processing or if changing last admin's role
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultDict.manageUsersPage.rolePlaceholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {divisions
                                            .filter(division => {
                                                // Filter options based on who is editing
                                                if (currentUser.role === 'Owner') return true; // Owner can assign any role
                                                if (currentUser.role === 'Admin Developer') return true; // Admin Dev can assign any role (revisit if restrictions needed)
                                                if (currentUser.role === 'General Admin') return !['Owner', 'Admin Developer'].includes(division); // GA cannot assign Owner or Admin Dev
                                                return false; // Should not happen if button is disabled correctly
                                            })
                                            .map((division) => (
                                                <SelectItem key={division} value={division}>
                                                    {isClient ? (usersDict.roles[division as keyof typeof usersDict.roles] || division) : (defaultDict.manageUsersPage.roles[division as keyof typeof defaultDict.manageUsersPage.roles] || division)}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {/* Hint for GA last admin */}
                                {(currentUser.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1) && (
                                    <p className="text-xs text-muted-foreground">{isClient ? usersDict.cannotChangeLastAdminRoleHint : defaultDict.manageUsersPage.cannotChangeLastAdminRoleHint}</p>
                                )}
                                 {/* Hint for Admin Dev last admin */}
                                 {(currentUser.role === 'Admin Developer' && editingUser?.id === currentUser.id && users.filter(u => u.role === 'Admin Developer').length <= 1) && (
                                     <p className="text-xs text-muted-foreground">{isClient ? usersDict.cannotChangeLastDevAdminRoleHint : defaultDict.manageUsersPage.cannotChangeLastDevAdminRoleHint}</p>
                                 )}
                              </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => {setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={isProcessing}>{isClient ? usersDict.cancelButton : defaultDict.manageUsersPage.cancelButton}</Button>
                            <Button type="submit" className="accent-teal" disabled={isProcessing || !editUserForm.formState.isDirty}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isClient ? (isProcessing ? usersDict.editingUserButton : usersDict.editUserSubmitButton) : defaultDict.manageUsersPage.editUserSubmitButton}
                             </Button>
                        </DialogFooter>
                   </form>
               </Form>
          </DialogContent>
       </Dialog>

    </div>
  );
}
