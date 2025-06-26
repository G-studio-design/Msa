
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
  AlertDialogTrigger, 
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { getDictionary } from '@/lib/translations';
import {
    getAllUsersForDisplay,
    addUser,
    updateUserProfile,
    deleteUser,
    type User as UserType,
    type UpdateProfileData,
} from '@/services/user-service';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Define available roles for selection (internal role names)
const divisions = ['Owner', 'Akuntan', 'Admin Proyek', 'Arsitek', 'Struktur', 'MEP'];

const defaultGlobalDict = getDictionary('en');

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
      if (!isClient || !currentUser) {
          setIsLoading(false);
          return;
      }
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
  }, [isClient, currentUser, usersDict, toast]);


  React.useEffect(() => {
      setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient && currentUser && ['Owner', 'Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim())) {
        fetchUsers();
    } else if (isClient) {
        setIsLoading(false); 
    }
  }, [isClient, currentUser, fetchUsers]);


  const addUserSchema = React.useMemo(() => getAddUserSchema(usersDict.validation), [usersDict.validation]);
  const editUserSchema = React.useMemo(() => getEditUserSchema(usersDict.validation), [usersDict.validation]);

  type AddUserFormValues = z.infer<typeof addUserSchema>;
  type EditUserFormValues = z.infer<typeof editUserSchema>;

  const canManageUsers = React.useMemo(() => {
    if (!currentUser) return false;
    return ['Owner', 'Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim());
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
        const userRoleToSet = divisions.includes(editingUser.role) ? editingUser.role as typeof divisions[number] : undefined;
        editUserForm.reset({
          username: editingUser.username,
          role: userRoleToSet,
        });
      } else {
        editUserForm.reset({ username: '', role: undefined });
      }
    }, [editingUser, editUserForm]);


     React.useEffect(() => {
         if(isClient && usersDict?.validation) { 
             addUserForm.trigger();
             if (isEditUserDialogOpen && editUserForm) { 
                editUserForm.trigger();
             }
         }
     }, [usersDict, addUserForm, editUserForm, isClient, isEditUserDialogOpen]);


  const handleAddUser = async (data: AddUserFormValues) => {
    if (!canManageUsers || !currentUser) return;
    
    if (data.role === 'Admin Developer' && currentUser.role !== 'Admin Developer') {
        toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotCreateAdminDev });
        return;
    }

    setIsProcessing(true);
    addUserForm.clearErrors();
    console.log('[ManageUsersPage] Adding user:', data.username, 'Role:', data.role);
    try {
        const newUser = await addUser(data);
        setUsers(prevUsers => [...prevUsers, newUser as UserType]);
        toast({ title: usersDict.toast.userAdded, description: usersDict.toast.userAddedDesc.replace('{username}', data.username) });
        addUserForm.reset();
        setIsAddUserDialogOpen(false);
    } catch (error: any) {
        console.error("[ManageUsersPage] Add user error:", error);
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
        console.log(`[ManageUsersPage] Editing user ${editingUser.id}:`, data.username, data.role);

        if (editingUser.role === 'Admin Developer' && currentUser.role !== 'Admin Developer') {
            toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotEditAdminDev });
            setIsProcessing(false);
            return;
        }

        let canChangeRole = false;
        let newRole = editingUser.role; 

        if (currentUser.role === 'Owner' || currentUser.role === 'Admin Developer') {
            canChangeRole = true;
        } else if (currentUser.role === 'Akuntan') {
            if (editingUser.role !== 'Owner' && editingUser.role !== 'Admin Developer') {
                if (editingUser.role === 'Akuntan') {
                     if (data.role !== 'Akuntan') {
                         const accountantCount = users.filter(u => u.role === 'Akuntan').length;
                         if (accountantCount <= 1) {
                             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotChangeLastAdminRole });
                             setIsProcessing(false);
                             return;
                         }
                     }
                     canChangeRole = true;
                } else {
                    canChangeRole = true;
                }
            }
        } else if (currentUser.role === 'Admin Proyek') {
            if (!['Owner', 'Akuntan', 'Admin Developer'].includes(editingUser.role) &&
                !['Owner', 'Akuntan', 'Admin Developer'].includes(data.role) ) {
                canChangeRole = true;
            }
        }

        if (canChangeRole) {
            newRole = data.role;
        } else if (data.role !== editingUser.role) { 
            toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: usersDict.toast.editPermissionDenied });
            setIsProcessing(false);
            return;
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
            fetchUsers(); 
            toast({ title: usersDict.toast.userUpdated, description: usersDict.toast.userUpdatedDesc.replace('{username}', data.username) });
            setIsEditUserDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
             console.error("[ManageUsersPage] Edit user error:", error);
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

     if (userToDelete.role === 'Akuntan') {
         const accountantCount = users.filter(u => u.role === 'Akuntan').length;
         if (accountantCount <= 1 && currentUser.role !== 'Owner' && currentUser.role !== 'Admin Developer') { 
             toast({ variant: 'destructive', title: usersDict.toast.error, description: usersDict.toast.cannotDeleteLastAdmin });
             return;
         }
     }
     if (userToDelete.role === 'Owner' && currentUser.role !== 'Admin Developer' && currentUser.role !== 'Owner'){ 
        toast({ variant: 'destructive', title: usersDict.toast.error, description: "Only an Owner or Developer can delete another Owner." });
        return;
     }
     if (currentUser.role === 'Admin Proyek' && (userToDelete.role === 'Owner' || userToDelete.role === 'Akuntan')) {
        toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: "Admin Proyek cannot delete Owner or Accountant accounts." });
        return;
    }


    setIsProcessing(true);
    console.log('[ManageUsersPage] Attempting to delete user:', userId, username);
    try {
        await deleteUser(userId);
        fetchUsers(); 
        setVisiblePasswords(prev => {
            const newState = {...prev};
            delete newState[userId];
            return newState;
        });
        toast({ title: usersDict.toast.userDeleted, description: usersDict.toast.userDeletedDesc.replace('{username}', username) });
    } catch (error: any) {
         console.error("[ManageUsersPage] Delete user error:", error);
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

        if (user.role === 'Admin Developer' && currentUser.role !== 'Admin Developer') {
            toast({ variant: 'destructive', title: usersDict.toast.permissionDenied, description: usersDict.toast.cannotEditAdminDev });
            return;
        }

         let canActuallyEdit = false;
         if (currentUser.role === 'Owner' || currentUser.role === 'Admin Developer') {
             canActuallyEdit = true;
         } else if (currentUser.role === 'Akuntan') {
             canActuallyEdit = user.role !== 'Owner' && user.role !== 'Admin Developer';
         } else if (currentUser.role === 'Admin Proyek') {
             canActuallyEdit = !['Owner', 'Akuntan', 'Admin Developer'].includes(user.role);
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
      const roleLower = role.toLowerCase().trim();
      if (roleLower.includes('owner')) return <User className="h-4 w-4 text-blue-600" />;
      if (roleLower.includes('akuntan')) return <UserCog className="h-4 w-4 text-purple-600" />;
      if (roleLower.includes('admin proyek')) return <UserCog className="h-4 w-4 text-orange-600" />;
      if (roleLower.includes('arsitek')) return <User className="h-4 w-4 text-green-600" />;
      if (roleLower.includes('struktur')) return <User className="h-4 w-4 text-yellow-600" />;
      if (roleLower.includes('mep')) return <Wrench className="h-4 w-4 text-teal-600" />;
      if (roleLower.includes('admin developer')) return <Code className="h-4 w-4 text-gray-700" />;
      return <User className="h-4 w-4 text-muted-foreground" />;
  }
  
  const getTranslatedRole = React.useCallback((roleKey: string) => {
    if (!isClient || !usersDict?.roles || !roleKey) {
      // Fallback if dict or roles not ready
      const fallbackDict = defaultGlobalDict.manageUsersPage.roles as Record<string, string>;
      const key = roleKey?.trim().replace(/\s+/g, '').toLowerCase() || "";
      return fallbackDict[key] || roleKey;
    }
    const normalizedKey = roleKey?.trim().replace(/\s+/g, '').toLowerCase() as keyof typeof usersDict.roles;
    return usersDict.roles[normalizedKey] || roleKey;
  }, [isClient, usersDict, defaultGlobalDict]);


  if (!isClient || isLoading || !usersDict?.title) { 
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
  
  if (!currentUser || !['Owner', 'Akuntan', 'Admin Proyek', 'Admin Developer'].includes(currentUser.role.trim())) {
       return (
           <div className="container mx-auto py-4 px-4 md:px-6">
              <Card className="border-destructive">
                   <CardHeader>
                       <CardTitle className="text-destructive">{isClient ? usersDict.accessDeniedTitle : defaultGlobalDict.manageUsersPage.accessDeniedTitle}</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <p>{isClient ? usersDict.accessDeniedDesc : defaultGlobalDict.manageUsersPage.accessDeniedDesc}</p>
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
             <CardTitle className="text-xl md:text-2xl">{isClient ? usersDict.title : defaultGlobalDict.manageUsersPage.title}</CardTitle>
            <CardDescription>{isClient ? usersDict.description : defaultGlobalDict.manageUsersPage.description}</CardDescription>
          </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                 <Button className="accent-teal w-full sm:w-auto" disabled={isProcessing || isLoading || !canManageUsers}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {isClient ? usersDict.addUserButton : defaultGlobalDict.manageUsersPage.addUserButton}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{isClient ? usersDict.addUserDialogTitle : defaultGlobalDict.manageUsersPage.addUserDialogTitle}</DialogTitle>
                  <DialogDescription>
                  {isClient ? usersDict.addUserDialogDesc : defaultGlobalDict.manageUsersPage.addUserDialogDesc}
                  </DialogDescription>
                </DialogHeader>
                <Form {...addUserForm}>
                    <form onSubmit={addUserForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
                      <FormField
                        control={addUserForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isClient ? usersDict.usernameLabel : defaultGlobalDict.manageUsersPage.usernameLabel}</FormLabel>
                            <FormControl>
                              <Input placeholder={isClient ? usersDict.usernamePlaceholder : defaultGlobalDict.manageUsersPage.usernamePlaceholder} {...field} autoComplete="off" />
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
                              <FormLabel>{isClient ? usersDict.passwordLabel : defaultGlobalDict.manageUsersPage.passwordLabel}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder={isClient ? usersDict.passwordPlaceholder : defaultGlobalDict.manageUsersPage.passwordPlaceholder} {...field} autoComplete="new-password" />
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
                              <FormLabel>{isClient ? usersDict.roleLabel : defaultGlobalDict.manageUsersPage.roleLabel}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isProcessing}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultGlobalDict.manageUsersPage.rolePlaceholder} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {divisions
                                        .filter(division => {
                                            if (!currentUser) return false;
                                            if (currentUser.role === 'Admin Developer') return division !== 'Admin Developer'; 
                                            if (currentUser.role === 'Owner') return division !== 'Admin Developer'; 
                                            if (currentUser.role === 'Akuntan') {
                                                return ['Admin Proyek', 'Arsitek', 'Struktur', 'MEP'].includes(division);
                                            }
                                            if (currentUser.role === 'Admin Proyek') {
                                                 return ['Arsitek', 'Struktur', 'MEP'].includes(division);
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
                      <DialogFooter className="pt-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)} disabled={isProcessing}>{isClient ? usersDict.cancelButton : defaultGlobalDict.manageUsersPage.cancelButton}</Button>
                          <Button type="submit" className="accent-teal" disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessing ? (isClient ? usersDict.addingUserButton : defaultGlobalDict.manageUsersPage.addingUserButton ) : (isClient ? usersDict.addUserSubmitButton : defaultGlobalDict.manageUsersPage.addUserSubmitButton)}
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isClient ? usersDict.tableHeaderUsername : defaultGlobalDict.manageUsersPage.tableHeaderUsername}</TableHead>
                  <TableHead className="hidden sm:table-cell">{isClient ? usersDict.tableHeaderPassword : defaultGlobalDict.manageUsersPage.tableHeaderPassword}</TableHead>
                  <TableHead>{isClient ? usersDict.tableHeaderRole : defaultGlobalDict.manageUsersPage.tableHeaderRole}</TableHead>
                  <TableHead className="text-right">{isClient ? usersDict.tableHeaderActions : defaultGlobalDict.manageUsersPage.tableHeaderActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {isClient ? usersDict.noUsers : defaultGlobalDict.manageUsersPage.noUsers}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      const isTargetAdminDeveloper = user.role === 'Admin Developer'; 
                      const isTargetOwner = user.role === 'Owner';
                      const isTargetAccountant = user.role === 'Akuntan'; 
                      
                      let disableEditBasedOnRole = 
                          (isTargetAdminDeveloper && currentUser?.role !== 'Admin Developer') ||
                          (currentUser?.role === 'Akuntan' && (isTargetOwner || isTargetAdminDeveloper)) ||
                          (currentUser?.role === 'Admin Proyek' && (isTargetOwner || isTargetAccountant || isTargetAdminDeveloper));

                      let disableDeleteBasedOnRole =
                          isTargetAdminDeveloper ||
                          isSelf ||
                          (isTargetOwner && currentUser?.role !== 'Admin Developer' && currentUser?.role !== 'Owner') || 
                          (isTargetAccountant && currentUser?.role !== 'Owner' && currentUser?.role !== 'Admin Developer') ||
                          (currentUser?.role === 'Admin Proyek' && (isTargetOwner || isTargetAccountant || isTargetAdminDeveloper));
                      
                      const isPasswordVisible = visiblePasswords[user.id] || false;
                      let canViewPassword = false;
                      if(currentUser) {
                          canViewPassword = (currentUser.role === 'Owner' || currentUser.role === 'Akuntan' || currentUser.role === 'Admin Developer') && !isTargetAdminDeveloper;
                      }


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
                                          <span className="text-xs text-muted-foreground italic ml-1">({isClient ? usersDict.passwordNotSet : defaultGlobalDict.manageUsersPage.passwordNotSet})</span>
                                      )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">{isClient ? usersDict.passwordHidden : defaultGlobalDict.manageUsersPage.passwordHidden}</span>
                                )}
                            </TableCell>
                          <TableCell>
                              <div className="flex items-center gap-2">
                                  {getRoleIcon(user.role)}
                                  <span>{getTranslatedRole(user.role)}</span>
                              </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-0 sm:gap-1">
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditDialog(user)}
                                      disabled={isProcessing || disableEditBasedOnRole || !canManageUsers}
                                      aria-label={isClient ? usersDict.editUserButtonLabel : defaultGlobalDict.manageUsersPage.editUserButtonLabel}
                                      title={isClient ? usersDict.editUserButtonLabel : defaultGlobalDict.manageUsersPage.editUserButtonLabel}
                                  >
                                      <Edit className={`h-4 w-4 ${(disableEditBasedOnRole || !canManageUsers) ? 'text-muted-foreground' : 'text-blue-500'}`} />
                                  </Button>

                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isProcessing || disableDeleteBasedOnRole || !canManageUsers} aria-label={isClient ? usersDict.deleteUserButtonLabel : defaultGlobalDict.manageUsersPage.deleteUserButtonLabel} title={isClient ? usersDict.deleteUserButtonLabel : defaultGlobalDict.manageUsersPage.deleteUserButtonLabel}>
                                        <Trash2 className={`h-4 w-4 ${(disableDeleteBasedOnRole || !canManageUsers) ? 'text-muted-foreground' : 'text-destructive'}`} />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{isClient ? usersDict.deleteDialogTitle : defaultGlobalDict.manageUsersPage.deleteDialogTitle}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          {(isClient ? usersDict.deleteDialogDesc : defaultGlobalDict.manageUsersPage.deleteDialogDesc).replace('{username}', user.username)}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isProcessing}>{isClient ? usersDict.deleteDialogCancel : defaultGlobalDict.manageUsersPage.deleteDialogCancel}</AlertDialogCancel>
                                      <AlertDialogAction
                                          className="bg-destructive hover:bg-destructive/90"
                                          onClick={() => handleDeleteUser(user.id, user.username)}
                                          disabled={isProcessing}>
                                          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isClient ? usersDict.deleteDialogConfirm : defaultGlobalDict.manageUsersPage.deleteDialogConfirm}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                  <DialogTitle>{(isClient ? usersDict.editUserDialogTitle : defaultGlobalDict.manageUsersPage.editUserDialogTitle).replace('{username}', editingUser?.username || '')}</DialogTitle>
                  <DialogDescription>{isClient ? usersDict.editUserDialogDesc : defaultGlobalDict.manageUsersPage.editUserDialogDesc}</DialogDescription>
               </DialogHeader>
               <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                        <FormField
                          control={editUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{isClient ? usersDict.usernameLabel : defaultGlobalDict.manageUsersPage.usernameLabel}</FormLabel>
                              <FormControl>
                                <Input placeholder={isClient ? usersDict.usernamePlaceholder : defaultGlobalDict.manageUsersPage.usernamePlaceholder} {...field} autoComplete="off" />
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
                                <FormLabel>{isClient ? usersDict.roleLabel : defaultGlobalDict.manageUsersPage.roleLabel}</FormLabel>
                                <Select
                                   onValueChange={field.onChange}
                                   value={field.value || ""}
                                   disabled={
                                       isProcessing ||
                                       !currentUser || 
                                       (editingUser?.role === 'Admin Developer' && currentUser.role !== 'Admin Developer') || 
                                       (editingUser?.role === 'Owner' && currentUser.role !== 'Owner' && currentUser.role !== 'Admin Developer') ||
                                       (editingUser?.role === 'Akuntan' && currentUser.role === 'Admin Proyek') || 
                                       (currentUser.role === 'Akuntan' && editingUser?.role === 'Akuntan' && users.filter(u => u.role === 'Akuntan').length <= 1 && field.value !== 'Akuntan')
                                    }
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isClient ? usersDict.rolePlaceholder : defaultGlobalDict.manageUsersPage.rolePlaceholder} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {divisions
                                            .filter(division => {
                                                if (!currentUser || !editingUser) return false;
                                                if (editingUser.role === 'Admin Developer') return division === 'Admin Developer'; 
                                                if (currentUser.role === 'Admin Developer') return division !== 'Admin Developer'; 
                                                if (currentUser.role === 'Owner') return division !== 'Admin Developer'; 
                                                if (currentUser.role === 'Akuntan') {
                                                    if (editingUser.role === 'Akuntan') return division === 'Akuntan';
                                                    return ['Admin Proyek', 'Arsitek', 'Struktur', 'MEP'].includes(division);
                                                }
                                                if (currentUser.role === 'Admin Proyek') {
                                                     if (['Admin Proyek', 'Arsitek', 'Struktur', 'MEP'].includes(editingUser.role)) return ['Admin Proyek', 'Arsitek', 'Struktur', 'MEP'].includes(division);
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
                                {(currentUser?.role === 'Akuntan' && editingUser?.role === 'Akuntan' && users.filter(u => u.role === 'Akuntan').length <= 1 && editUserForm.getValues('role') !== 'Akuntan') && (
                                    <p className="text-xs text-muted-foreground">{isClient ? usersDict.cannotChangeLastAdminRoleHint : defaultGlobalDict.manageUsersPage.cannotChangeLastAdminRoleHint}</p>
                                )}
                                 {((currentUser?.role === 'Admin Proyek' && (editingUser?.role === 'Owner' || editingUser?.role === 'Akuntan' || editingUser?.role === 'Admin Developer')) ||
                                   (currentUser?.role === 'Akuntan' && (editingUser?.role === 'Owner' || editingUser?.role === 'Admin Developer'))) && (
                                    <p className="text-xs text-muted-foreground">{(isClient ? usersDict.toast.editPermissionDenied : defaultGlobalDict.manageUsersPage.toast.editPermissionDenied).replace('this user', getTranslatedRole(editingUser?.role || ''))}</p>
                                )}
                              </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => {setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={isProcessing}>{isClient ? usersDict.cancelButton : defaultGlobalDict.manageUsersPage.cancelButton}</Button>
                            <Button type="submit" className="accent-teal" disabled={isProcessing || !editUserForm.formState.isDirty}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isProcessing ? (isClient ? usersDict.editingUserButton : defaultGlobalDict.manageUsersPage.editingUserButton ) : (isClient ? usersDict.editUserSubmitButton : defaultGlobalDict.manageUsersPage.editUserSubmitButton)}
                             </Button>
                        </DialogFooter>
                   </form>
               </Form>
          </DialogContent>
       </Dialog>

    </div>
  );
}
