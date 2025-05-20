
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
import { PlusCircle, Trash2, User, UserCog, Edit, Loader2, Eye, EyeOff, CheckCircle, ShieldAlert, Code, Wrench } from 'lucide-react';
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
} from '@/components/ui/alert-dialog'; // Removed AlertDialogTrigger
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import {
    getAllUsersForDisplay,
    addUser,
    updateUserProfile,
    deleteUser,
    type User as UserType,
    type UpdateProfileData, // Added for explicit type
} from '@/services/user-service';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// Define available roles for selection (excluding Admin Developer)
// "MEP" role is removed as its tasks are absorbed by Admin Proyek in standard workflow
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
  const { currentUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);
  
  const dict = React.useMemo(() => getDictionary(language), [language]);
  const usersDict = React.useMemo(() => dict.manageUsersPage, [dict]);


  const [users, setUsers] = React.useState<UserType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserType | null>(null);
  const [visiblePasswords, setVisiblePasswords] = React.useState<Record<string, boolean>>({});

  const fetchUsers = React.useCallback(async () => {
      setIsLoading(true);
      try {
          const fetchedUsers = await getAllUsersForDisplay();
          setUsers(fetchedUsers);
      } catch (error) {
          console.error("Failed to fetch users:", error);
          if (isClient && usersDict?.toast?.error) {
            toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.fetchError });
          }
      } finally {
          setIsLoading(false);
      }
  }, [isClient, usersDict, toast]);


  React.useEffect(() => {
      setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient && currentUser && ['Owner', 'General Admin', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role)) {
        fetchUsers();
    } else if (isClient) {
        setIsLoading(false); // Not authorized or no current user
    }
  }, [isClient, currentUser, fetchUsers]);


  const addUserSchema = React.useMemo(() => getAddUserSchema(usersDict.validation), [usersDict.validation]);
  const editUserSchema = React.useMemo(() => getEditUserSchema(usersDict.validation), [usersDict.validation]);

  type AddUserFormValues = z.infer<typeof addUserSchema>;
  type EditUserFormValues = z.infer<typeof editUserSchema>;

  const canManageUsers = React.useMemo(() => {
    if (!currentUser) return false;
    return ['Owner', 'General Admin', 'Admin Proyek'].includes(currentUser.role);
  }, [currentUser]);


  const addUserForm = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      username: '',
      password: '',
      role: undefined,
    },
  });

  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: '',
      role: undefined,
    },
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
             if (isEditUserDialogOpen) { 
                editUserForm.trigger();
             }
         }
     }, [dict, addUserForm, editUserForm, isClient, isEditUserDialogOpen]);


  const handleAddUser = async (data: AddUserFormValues) => {
    if (!canManageUsers) return;
    setIsProcessing(true);
    addUserForm.clearErrors();
    console.log('Adding user:', data.username);
    try {
        const newUser = await addUser(data);
        setUsers(prevUsers => [...prevUsers, newUser as UserType]);
        toast({ title: usersDict.toast.userAdded, description: usersDict.toast.userAddedDesc.replace('{username}', data.username) });
        addUserForm.reset();
        setIsAddUserDialogOpen(false);
    } catch (error: any) {
        console.error("Add user error:", error);
        let desc = usersDict.toast.error;
        if (error.message === 'USERNAME_EXISTS') {
            desc = usersDict.toast.usernameExists;
            addUserForm.setError('username', { type: 'manual', message: desc });
        } else if (error.message === 'INVALID_ROLE_CREATION_ATTEMPT') {
            desc = usersDict.toast.cannotCreateAdminDev;
        }
         else {
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

        if (editingUser.role === 'Admin Developer') {
            toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotEditAdminDev });
            setIsProcessing(false);
            return;
        }

        const canChangeRole = currentUser.role === 'Owner' || (currentUser.role === 'General Admin' && editingUser.role !== 'General Admin');
        const newRole = canChangeRole ? data.role : editingUser.role;

        if (currentUser.role === 'General Admin' && editingUser.role === 'General Admin' && data.role !== 'General Admin') {
            const gaCount = users.filter(u => u.role === 'General Admin').length;
            if (gaCount <= 1) {
                toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastAdminRole });
                setIsProcessing(false);
                return;
            }
        }

        try {
            const updatePayload: UpdateProfileData = {
                 userId: editingUser.id,
                 username: data.username,
                 role: newRole,
                 email: editingUser.email, 
                 whatsappNumber: editingUser.whatsappNumber, 
                 profilePictureUrl: editingUser.profilePictureUrl, 
                 displayName: data.username, 
            };

            await updateUserProfile(updatePayload);
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, username: data.username, role: newRole, displayName: data.username } : u));
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
             } else if (error.message === 'INVALID_ROLE_UPDATE_ATTEMPT') {
                 desc = usersDict.toast.cannotSetAdminDevRole;
             } else if (error.message === 'CANNOT_CHANGE_ADMIN_DEVELOPER_ROLE') {
                 desc = usersDict.toast.cannotChangeAdminDevRole;
             }
              else {
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

    if (userToDelete.role === 'Admin Developer') {
        toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteAdminDev });
        return;
    }

     if (currentUser.id === userId) { 
       toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteSelf });
       return;
     }

     if (userToDelete.role === 'General Admin') {
         const gaCount = users.filter(u => u.role === 'General Admin').length;
         if (gaCount <= 1 && currentUser.role !== 'Owner') { 
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastAdmin });
             return;
         }
     }
     if (userToDelete.role === 'Owner' && currentUser.role !== 'Owner'){
        toast({ variant: 'destructive', title: usersDict.toast.error, description: "Only an Owner can delete another Owner." });
        return;
     }


    setIsProcessing(true);
    console.log('Attempting to delete user:', userId, username);
    try {
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
        if (!currentUser) return;

        if (user.role === 'Admin Developer') {
            toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: usersDict.toast.cannotEditAdminDev });
            return;
        }

         let canActuallyEdit = false;
         if (currentUser.role === 'Owner') {
             canActuallyEdit = true;
         } else if (currentUser.role === 'General Admin' || currentUser.role === 'Admin Proyek') {
             canActuallyEdit = user.role !== 'Owner' && user.role !== 'Admin Developer' && user.role !== 'General Admin';
         }


         if (!canActuallyEdit) {
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
      const roleLower = role.toLowerCase();
      if (roleLower.includes('owner')) return <User className="h-4 w-4 text-blue-600" />;
      if (roleLower.includes('general admin') || roleLower.includes('admin/akuntan')) return <UserCog className="h-4 w-4 text-purple-600" />;
      if (roleLower.includes('admin proyek')) return <UserCog className="h-4 w-4 text-orange-600" />;
      if (roleLower.includes('arsitek')) return <User className="h-4 w-4 text-green-600" />;
      if (roleLower.includes('struktur')) return <User className="h-4 w-4 text-yellow-600" />;
      if (roleLower.includes('mep')) return <Wrench className="h-4 w-4 text-pink-600" />;
      if (roleLower.includes('developer')) return <Code className="h-4 w-4 text-gray-700" />;
      return <User className="h-4 w-4 text-muted-foreground" />;
  }
  
  const getTranslatedRole = React.useCallback((roleKey: string) => {
    if (!isClient || !usersDict?.roles) return roleKey;
    const key = roleKey.toLowerCase().replace(/\s+/g, '') as keyof typeof usersDict.roles;
    return usersDict.roles[key] || roleKey;
  }, [isClient, usersDict]);


  if (!isClient || isLoading || !usersDict?.title) { // Check usersDict.title for readiness
       return (
            <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
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
  }
  
  if (!currentUser || !['Owner', 'General Admin', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role)) {
       return (
           <div className="container mx-auto py-4 px-4 md:px-6">
              <Card className="border-destructive">
                   <CardHeader>
                       <CardTitle className="text-destructive">{usersDict.accessDeniedTitle}</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <p>{usersDict.accessDeniedDesc}</p>
                   </CardContent>
              </Card>
          </div>
       );
  }


  return (
     <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
             <CardTitle className="text-xl md:text-2xl">{usersDict.title}</CardTitle>
            <CardDescription>{usersDict.description}</CardDescription>
          </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                 <Button className="accent-teal w-full sm:w-auto" disabled={isProcessing || isLoading || !canManageUsers}>
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
                <Form {...addUserForm}>
                    <form onSubmit={addUserForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={addUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{usersDict.usernameLabel}</FormLabel>
                            <FormControl>
                              <Input placeholder={usersDict.usernamePlaceholder} {...field} autoComplete="off" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                          control={addUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{usersDict.passwordLabel}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder={usersDict.passwordPlaceholder} {...field} autoComplete="new-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <FormField
                          control={addUserForm.control}
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
                                    {divisions
                                        .filter(division => {
                                            if (!currentUser) return false;
                                            if (currentUser.role === 'Owner') return true;
                                            if (currentUser.role === 'General Admin' || currentUser.role === 'Admin Proyek') {
                                                return division !== 'Owner' && division !== 'General Admin';
                                            }
                                            return false; 
                                        })
                                        .map((division) => (
                                            <SelectItem key={division} value={division}>
                                                {getTranslatedRole(division)}
                                            </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)} disabled={isProcessing}>{usersDict.cancelButton}</Button>
                          <Button type="submit" className="accent-teal" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessing ? usersDict.addingUserButton : usersDict.addUserSubmitButton}
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{usersDict.tableHeaderUsername}</TableHead>
                     <TableHead className="hidden sm:table-cell">{usersDict.tableHeaderPassword}</TableHead>
                    <TableHead>{usersDict.tableHeaderRole}</TableHead>
                    <TableHead className="text-right">{usersDict.tableHeaderActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && !isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {usersDict.noUsers}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                       const isSelf = user.id === currentUser?.id;
                        const isTargetAdminDeveloper = user.role === 'Admin Developer'; 
                        const isTargetOwner = user.role === 'Owner';
                        const isTargetGeneralAdmin = user.role === 'General Admin';
                        
                        const disableEditBasedOnRole = 
                            isTargetAdminDeveloper ||
                            (currentUser?.role === 'General Admin' && (isTargetOwner || isTargetGeneralAdmin)) ||
                            (currentUser?.role === 'Admin Proyek' && (isTargetOwner || isTargetGeneralAdmin || user.id === currentUser.id && user.role === 'Admin Proyek'));


                        const disableDeleteBasedOnRole =
                            isTargetAdminDeveloper ||
                            isSelf ||
                            isTargetOwner || // No one can delete Owner except maybe another system process
                            (isTargetGeneralAdmin && currentUser?.role !== 'Owner') ||
                            (currentUser?.role === 'Admin Proyek' && (isTargetGeneralAdmin || user.role === 'Admin Proyek'));

                        const isPasswordVisible = visiblePasswords[user.id] || false;
                        const canViewPassword = currentUser && ['Owner', 'General Admin', 'Admin Developer'].includes(currentUser.role) && !isTargetAdminDeveloper;


                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium break-words">{user.username}</TableCell>
                             <TableCell className="hidden sm:table-cell">
                                {canViewPassword ? (
                                   <div className="flex items-center gap-1">
                                     <span className="font-mono text-xs break-all text-foreground">
                                       {isPasswordVisible ? (user.password || usersDict.passwordNotSet) : '••••••••'}
                                     </span>
                                       {user.password && (
                                           <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 flex-shrink-0"
                                              onClick={() => togglePasswordVisibility(user.id)}
                                              aria-label={isPasswordVisible ? usersDict.hidePasswordButtonLabel : usersDict.showPasswordButtonLabel}
                                              disabled={isProcessing}
                                              title={isPasswordVisible ? usersDict.hidePasswordButtonLabel : usersDict.showPasswordButtonLabel}
                                            >
                                              {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                       )}
                                       {!user.password && (
                                            <span className="text-xs text-muted-foreground italic ml-1">({usersDict.passwordNotSet})</span>
                                       )}
                                   </div>
                                 ) : (
                                    <span className="text-xs text-muted-foreground italic">{usersDict.passwordHidden}</span>
                                 )}
                             </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getRoleIcon(user.role)}
                                    <span className="whitespace-nowrap">{getTranslatedRole(user.role)}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right space-x-0 sm:space-x-1 whitespace-nowrap">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(user)}
                                        disabled={isProcessing || disableEditBasedOnRole || !canManageUsers}
                                        aria-label={usersDict.editUserButtonLabel}
                                        title={usersDict.editUserButtonLabel}
                                   >
                                       <Edit className={`h-4 w-4 ${(disableEditBasedOnRole || !canManageUsers) ? 'text-muted-foreground' : 'text-blue-500'}`} />
                                   </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" disabled={isProcessing || disableDeleteBasedOnRole || !canManageUsers} aria-label={usersDict.deleteUserButtonLabel} title={usersDict.deleteUserButtonLabel}>
                                         <Trash2 className={`h-4 w-4 ${(disableDeleteBasedOnRole || !canManageUsers) ? 'text-muted-foreground' : 'text-destructive'}`} />
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
                                        <AlertDialogCancel disabled={isProcessing}>{usersDict.deleteDialogCancel}</AlertDialogCancel>
                                        <AlertDialogAction
                                           className="bg-destructive hover:bg-destructive/90"
                                           onClick={() => handleDeleteUser(user.id, user.username)}
                                           disabled={isProcessing}>
                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                          {usersDict.deleteDialogConfirm}
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

      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>{usersDict.editUserDialogTitle.replace('{username}', editingUser?.username || '')}</DialogTitle>
                  <DialogDescription>{usersDict.editUserDialogDesc}</DialogDescription>
               </DialogHeader>
               <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{usersDict.usernameLabel}</FormLabel>
                              <FormControl>
                                <Input placeholder={usersDict.usernamePlaceholder} {...field} autoComplete="off" />
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
                                <FormLabel>{usersDict.roleLabel}</FormLabel>
                                <Select
                                   onValueChange={field.onChange}
                                   value={field.value} 
                                   disabled={
                                       isProcessing ||
                                       !currentUser || // Ensure currentUser is defined
                                       currentUser.role === 'Admin Proyek' || // Admin Proyek cannot change roles
                                       (currentUser.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1)
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={usersDict.rolePlaceholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {divisions
                                            .filter(division => {
                                                if (!currentUser || !editingUser) return false;
                                                if (currentUser.role === 'Owner') return true; // Owner can assign any non-dev role
                                                if (currentUser.role === 'General Admin') {
                                                    // GA can assign non-Owner, non-GA roles,
                                                    // unless editing a non-GA user (then can assign GA if not last one)
                                                    if (editingUser.role === 'General Admin') return division === 'General Admin';
                                                    return division !== 'Owner' && division !== 'General Admin';
                                                }
                                                // Admin Proyek cannot change roles
                                                return false; 
                                            })
                                            .map((division) => (
                                                <SelectItem key={division} value={division}>
                                                    {getTranslatedRole(division)}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {(currentUser?.role === 'General Admin' && editingUser?.role === 'General Admin' && users.filter(u => u.role === 'General Admin').length <= 1) && (
                                    <p className="text-xs text-muted-foreground">{usersDict.cannotChangeLastAdminRoleHint}</p>
                                )}
                                 {currentUser?.role === 'Admin Proyek' && (
                                    <p className="text-xs text-muted-foreground">{getTranslatedRole(currentUser.role)} cannot change user roles.</p>
                                )}
                              </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => {setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={isProcessing}>{usersDict.cancelButton}</Button>
                            <Button type="submit" className="accent-teal" disabled={isProcessing || !editUserForm.formState.isDirty}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isProcessing ? usersDict.editingUserButton : usersDict.editUserSubmitButton}
                             </Button>
                        </DialogFooter>
                   </form>
               </Form>
          </DialogContent>
       </Dialog>

    </div>
  );
}
