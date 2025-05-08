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
import { PlusCircle, Trash2, User, UserCog, Edit, Loader2, Eye, EyeOff, CheckCircle, ShieldAlert, Code } from 'lucide-react';
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
    type User as UserType
} from '@/services/user-service';
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
import { Skeleton } from '@/components/ui/skeleton';

// Define available roles for selection (excluding Pending and Admin Developer)
const divisions = ['Owner', 'General Admin', 'Admin Proyek', 'Arsitek', 'Struktur'];

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
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [dict, setDict] = React.useState(defaultDict);
  const [isClient, setIsClient] = React.useState(false);
  const usersDict = dict.manageUsersPage;

  const [users, setUsers] = React.useState<UserType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserType | null>(null);
  const [visiblePasswords, setVisiblePasswords] = React.useState<Record<string, boolean>>({});

  // Fetch users on component mount
  React.useEffect(() => {
      async function fetchUsers() {
          setIsLoading(true);
          try {
              // TODO: Secure this endpoint - ideally only callable by authorized roles
              const fetchedUsers = await getAllUsers(); // getAllUsers now filters out Admin Dev
              setUsers(fetchedUsers);
          } catch (error) {
              console.error("Failed to fetch users:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
          } finally {
              setIsLoading(false);
          }
      }
      // Only fetch if the current user has permission (Owner or General Admin)
      if (currentUser && ['Owner', 'General Admin'].includes(currentUser.role)) {
          fetchUsers();
      } else {
          setIsLoading(false); // Don't show loading if no permission
      }
  }, [toast, currentUser]); // Re-fetch if currentUser changes (e.g., on login/logout)

    React.useEffect(() => {
        setIsClient(true);
        setDict(getDictionary(language));
    }, [language]);

  // Initialize schemas based on current language
  const addUserSchema = getAddUserSchema(usersDict.validation);
  const editUserSchema = getEditUserSchema(usersDict.validation);

  type AddUserFormValues = z.infer<typeof addUserSchema>;
  type EditUserFormValues = z.infer<typeof editUserSchema>;

  // Check if current user has permission (Owner or General Admin)
  const canManageUsers = currentUser && ['Owner', 'General Admin'].includes(currentUser.role);

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


   React.useEffect(() => {
      if (editingUser) {
        editUserForm.reset({
          username: editingUser.username,
          role: divisions.includes(editingUser.role) ? editingUser.role : undefined,
        });
      } else {
        editUserForm.reset({ username: '', role: undefined });
      }
    }, [editingUser, editUserForm]);


     React.useEffect(() => {
         if(isClient) {
             addUserForm.trigger();
             editUserForm.trigger();
         }
     }, [dict, addUserForm, editUserForm, isClient]);


  const handleAddUser = async (data: AddUserFormValues) => {
    if (!canManageUsers) return;
    setIsProcessing(true);
    addUserForm.clearErrors();
    console.log('Adding user:', data.username);
    try {
        // TODO: Secure this function call - ensure only authorized roles can execute it server-side
        // addUser service function already prevents adding 'Admin Developer' role
        const newUser = await addUser(data);
        setUsers([...users, newUser as UserType]);
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
        if (!editingUser || !canManageUsers || !currentUser) return;
        setIsProcessing(true);
        editUserForm.clearErrors();
        console.log(`Editing user ${editingUser.id}:`, data.username, data.role);

        // Prevent changing role of last GA if the current user is GA
        if (currentUser.role === 'General Admin' && editingUser.role === 'General Admin' && data.role !== 'General Admin') {
            const gaCount = users.filter(u => u.role === 'General Admin').length;
            if (gaCount <= 1) {
                toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastAdminRole });
                setIsProcessing(false);
                return;
            }
        }

         // Removed Admin Developer checks

        try {
            const updatePayload: { userId: string; username: string; role: string; displayName?: string } = {
                 userId: editingUser.id,
                 username: data.username,
                 role: data.role, // updateUserProfile already prevents setting role to 'Admin Developer'
            };
             if (data.username !== editingUser.username) {
                 updatePayload.displayName = data.username;
             }

             // TODO: Secure this function call - ensure only authorized roles can execute it server-side
            await updateUserProfile(updatePayload);
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
                 desc = usersDict.toast.userNotFound;
             } else {
                 desc = error.message || 'Failed to update user.';
             }
             toast({ variant: 'destructive', title: usersDict.toast.error, description: desc });
        } finally {
             setIsProcessing(false);
        }
    };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!canManageUsers || !currentUser) return;
    const userToDelete = users.find(user => user.id === userId);
    if (!userToDelete) return;

     // Prevent GA from deleting self
     if (currentUser.role === 'General Admin' && currentUser.id === userId) {
       toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteSelf });
       return;
     }

     // Prevent deleting last GA if current user is GA
     if (currentUser.role === 'General Admin' && userToDelete.role === 'General Admin') {
         const gaCount = users.filter(u => u.role === 'General Admin').length;
         if (gaCount <= 1) {
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastAdmin });
             return;
         }
     }

      // Removed Admin Developer checks

    setIsProcessing(true);
    console.log('Attempting to delete user:', userId, username);
    try {
         // TODO: Secure this function call - ensure only authorized roles can execute it server-side
         // deleteUser service function already prevents deleting 'Admin Developer'
        await deleteUser(userId);
        setUsers(users.filter((user) => user.id !== userId));
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
        setIsProcessing(false);
    }
  };

   const onAddSubmit = (data: AddUserFormValues) => {
       handleAddUser(data);
   };

   const onEditSubmit = (data: EditUserFormValues) => {
       handleEditUser(data);
   };

   const openEditDialog = (user: UserType) => {
        if (!currentUser) return; // Ensure currentUser is available

         let canEditTargetUser = false;
         if (currentUser.role === 'Owner') {
             canEditTargetUser = true; // Owner can edit anyone
         } else if (currentUser.role === 'General Admin') {
             canEditTargetUser = user.role !== 'Owner'; // GA cannot edit Owner
         }

         if (!canEditTargetUser) {
            toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: usersDict.toast.editPermissionDenied });
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
          // Removed Admin Developer case
          default: return <User className="h-4 w-4 text-muted-foreground" />;
      }
  }

  // Render Access Denied if not Owner or General Admin
  if (!isClient || !canManageUsers) {
      // Show loading skeleton or access denied message
       if (!isClient || isLoading) { // Still loading or hasn't determined user role yet
           return (
                <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
                   <Card>
                       <CardHeader>
                           <Skeleton className="h-7 w-1/3 mb-2" />
                           <Skeleton className="h-4 w-2/3" />
                       </CardHeader>
                       <CardContent>
                           <Skeleton className="h-40 w-full" />
                       </CardContent>
                   </Card>
               </div>
           );
       } else { // User loaded, but doesn't have permission
            return (
               <div className="container mx-auto py-4 px-4 md:px-6"> {/* Added responsive padding */}
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
  }

  // Render the main content if user has permission
  return (
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6"> {/* Added responsive padding */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"> {/* Flex column on mobile */}
          <div>
             <CardTitle className="text-xl md:text-2xl">{isClient ? usersDict.title : defaultDict.manageUsersPage.title}</CardTitle> {/* Adjusted font size */}
            <CardDescription>{isClient ? usersDict.description : defaultDict.manageUsersPage.description}</CardDescription>
          </div>
          {/* Add User Dialog Trigger */}
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                 <Button className="accent-teal w-full sm:w-auto" disabled={isProcessing || isLoading}> {/* Full width on mobile */}
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
                                        // Filter roles that the current user (must exist here) can create
                                        .filter(division => {
                                            if (currentUser?.role === 'Owner') return true;
                                            if (currentUser?.role === 'General Admin') return division !== 'Owner'; // GA cannot create Owner
                                            return false;
                                        })
                                        .map((division) => (
                                            <SelectItem key={division} value={division}>
                                                {(usersDict.roles as any)[division] || division}
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
                            {isProcessing ? (isClient ? usersDict.addingUserButton : 'Adding...') : (isClient ? usersDict.addUserSubmitButton : defaultDict.manageUsersPage.addUserSubmitButton)}
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto"> {/* Make table scrollable horizontally */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isClient ? usersDict.tableHeaderUsername : defaultDict.manageUsersPage.tableHeaderUsername}</TableHead>
                     <TableHead className="hidden sm:table-cell">{isClient ? usersDict.tableHeaderPassword : defaultDict.manageUsersPage.tableHeaderPassword}</TableHead> {/* Hide password column on small screens */}
                    <TableHead>{isClient ? usersDict.tableHeaderRole : defaultDict.manageUsersPage.tableHeaderRole}</TableHead>
                    <TableHead className="text-right">{isClient ? usersDict.tableHeaderActions : defaultDict.manageUsersPage.tableHeaderActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                             <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell> {/* Hide skeleton cell */}
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell className="text-right space-x-1">
                                <Skeleton className="h-8 w-8 inline-block" />
                                <Skeleton className="h-8 w-8 inline-block" />
                            </TableCell>
                        </TableRow>
                      ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8"> {/* Added more padding */}
                        {isClient ? usersDict.noUsers : defaultDict.manageUsersPage.noUsers}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                       const isSelf = user.id === currentUser?.id; // Check against context user ID
                        const isLastGeneralAdmin = user.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1;
                        // Removed isLastAdminDeveloper check

                         const disableDelete = !canManageUsers ||
                                                (isSelf && currentUser?.role === 'General Admin') || // GA cannot delete self
                                                (isLastGeneralAdmin && currentUser?.role === 'General Admin'); // GA cannot delete last GA
                                                // Removed Admin Developer delete checks

                          let disableEdit = !canManageUsers ||
                                            (currentUser?.role === 'General Admin' && user.role === 'Owner'); // GA cannot edit Owner


                        const isPasswordVisible = visiblePasswords[user.id] || false;
                        const canViewPassword = canManageUsers && (
                            currentUser?.role === 'Owner' ||
                            currentUser?.role === 'General Admin'
                        ); // Only Owner and GA can view passwords


                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium break-words">{user.username}</TableCell> {/* Allow username to wrap */}
                             <TableCell className="hidden sm:table-cell"> {/* Hide password cell on small screens */}
                                {canViewPassword ? (
                                   <div className="flex items-center gap-1">
                                     <span className="font-mono text-xs break-all text-foreground">
                                       {isPasswordVisible ? (user.password || (isClient ? usersDict.passwordNotSet : defaultDict.manageUsersPage.passwordNotSet)) : '••••••••'}
                                     </span>
                                       {user.password && (
                                           <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 flex-shrink-0"
                                              onClick={() => togglePasswordVisibility(user.id)}
                                              aria-label={isPasswordVisible ? (isClient ? usersDict.hidePasswordButtonLabel : 'Hide') : (isClient ? usersDict.showPasswordButtonLabel : 'Show')}
                                              disabled={isProcessing}
                                              title={isPasswordVisible ? (isClient ? usersDict.hidePasswordButtonLabel : 'Hide') : (isClient ? usersDict.showPasswordButtonLabel : 'Show')}
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
                                    <span className="whitespace-nowrap">{(usersDict.roles as any)[user.role] || user.role}</span> {/* Prevent role wrap */}
                                </div>
                            </TableCell>
                            <TableCell className="text-right space-x-0 sm:space-x-1 whitespace-nowrap"> {/* Adjust spacing and prevent wrap */}
                               {/* Edit User Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(user)}
                                        disabled={isProcessing || disableEdit}
                                        aria-label={isClient ? usersDict.editUserButtonLabel : 'Edit User'}
                                        title={isClient ? usersDict.editUserButtonLabel : 'Edit User'}
                                   >
                                       <Edit className={`h-4 w-4 ${disableEdit ? 'text-muted-foreground' : 'text-blue-500'}`} />
                                   </Button>

                               {/* Delete User Button */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" disabled={isProcessing || disableDelete} aria-label={isClient ? usersDict.deleteUserButtonLabel : 'Delete User'} title={isClient ? usersDict.deleteUserButtonLabel : 'Delete User'}>
                                         <Trash2 className={`h-4 w-4 ${disableDelete ? 'text-muted-foreground' : 'text-destructive'}`} />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{isClient ? usersDict.deleteDialogTitle : defaultDict.manageUsersPage.deleteDialogTitle}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           {(isClient ? usersDict.deleteDialogDesc : defaultDict.manageUsersPage.deleteDialogDesc).replace('{username}', user.username)}
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
                            </TableCell>
                          </TableRow>
                        );
                    })
                  )}
                </TableBody>
              </Table>
           </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>{(isClient ? usersDict.editUserDialogTitle : defaultDict.manageUsersPage.editUserDialogTitle).replace('{username}', editingUser?.username || '')}</DialogTitle>
                  <DialogDescription>{isClient ? usersDict.editUserDialogDesc : defaultDict.manageUsersPage.editUserDialogDesc}</DialogDescription>
               </DialogHeader>
               <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
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
                        <FormField
                            control={editUserForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isClient ? usersDict.roleLabel : defaultDict.manageUsersPage.roleLabel}</FormLabel>
                                <Select
                                   onValueChange={field.onChange}
                                   value={field.value}
                                   disabled={
                                       isProcessing ||
                                       // Prevent GA from changing role of last GA
                                       (currentUser?.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1)
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultDict.manageUsersPage.rolePlaceholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {divisions
                                            .filter(division => {
                                                if (currentUser?.role === 'Owner') return true;
                                                if (currentUser?.role === 'General Admin') return division !== 'Owner'; // GA cannot assign Owner role
                                                return false;
                                            })
                                            .map((division) => (
                                                <SelectItem key={division} value={division}>
                                                    {(usersDict.roles as any)[division] || division}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {(currentUser?.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1) && (
                                    <p className="text-xs text-muted-foreground">{isClient ? usersDict.cannotChangeLastAdminRoleHint : defaultDict.manageUsersPage.cannotChangeLastAdminRoleHint}</p>
                                )}
                                 {/* Removed Admin Developer Hint */}
                              </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => {setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={isProcessing}>{isClient ? usersDict.cancelButton : defaultDict.manageUsersPage.cancelButton}</Button>
                            <Button type="submit" className="accent-teal" disabled={isProcessing || !editUserForm.formState.isDirty}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isProcessing ? (isClient ? usersDict.editingUserButton : 'Saving...') : (isClient ? usersDict.editUserSubmitButton : defaultDict.manageUsersPage.editUserSubmitButton)}
                             </Button>
                        </DialogFooter>
                   </form>
               </Form>
          </DialogContent>
       </Dialog>

    </div>
  );
}
