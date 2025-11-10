
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Edit, PlusCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { logAction } from "@/lib/audit-log";
import type { SecurityRuleContext } from "@/lib/types";
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available or can be added

// Helper to generate random password
const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8) + 'A1!';
}

const userRoles = ["admin", "editor", "viewer"] as const;

// Schema for editing an existing user
const editUserSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  role: z.enum(userRoles),
});

// Schema for creating a new user (password is now handled server-side)
const createUserSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  role: z.enum(userRoles).default("editor"),
});

type UserData = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "editor" | "viewer";
};

type CreateUserFormValues = z.infer<typeof createUserSchema>;

// Component for the Create User Form
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", displayName: "", role: "editor" },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    if (!adminUser?.email || !db || !auth) {
      toast({
        title: "Erro de Autenticação",
        description: "Não foi possível identificar o administrador logado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // 1. Generate a temporary password
      const tempPassword = generateTempPassword();

      // 2. Create the user in Firebase Auth with the temp password
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, tempPassword);
      const newUser = userCredential.user;

      // 3. Set the user's display name
      await updateProfile(newUser, { displayName: values.displayName });

      // 4. Create the user document in Firestore with the selected role
      const userDocRef = doc(db, "users", newUser.uid);
      const newUserData = {
        uid: newUser.uid,
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        createdAt: new Date(),
      };
      
      await setDoc(userDocRef, newUserData)
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: newUserData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            throw serverError; // Propagate to be caught by the outer try-catch
        });

      // 5. Send password reset email, which acts as a "set your password" link
      await sendPasswordResetEmail(auth, values.email);

      // 6. Log the action
      await logAction({
          db,
          action: 'create-user',
          collectionName: 'users',
          documentId: newUser.uid,
          userEmail: adminUser.email,
          newData: {
              createdUserEmail: values.email,
              uid: newUser.uid,
              role: values.role,
          },
      });

      toast({
        title: "Usuário Criado com Sucesso!",
        description: `Um e-mail foi enviado para ${values.email} para que o usuário defina sua própria senha.`,
        duration: 8000,
      });
      form.reset();
      onSuccess(); // Close the dialog

    } catch (error: any) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este endereço de email já está em uso por outra conta.";
      }
      console.error("Falha ao criar usuário:", error.message);
      toast({
        title: "Falha ao Criar Usuário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Nome Sobrenome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email do Novo Usuário</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
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
              <FormLabel>Função</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {userRoles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button type="submit" disabled={isSubmitting || !adminUser || !db}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user: currentUser } = useUser();

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { displayName: "", role: "viewer" },
  });

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "users"));
  }, [db]);

  useEffect(() => {
    if (!usersQuery) {
        setLoading(false);
        return;
    };
    
    setLoading(true);
    const unsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
      const fetchedUsers: UserData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedUsers.push({ id: doc.id, ...data } as UserData);
      });
      setUsers(fetchedUsers.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: 'users',
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [usersQuery]);

  const handleEditUser = async (values: z.infer<typeof editUserSchema>) => {
    if (!editingUser || !currentUser?.email || !db) return;
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", editingUser.id);
      await updateDoc(userDocRef, values);

      await logAction({
        db,
        action: 'update',
        collectionName: 'users',
        documentId: editingUser.id,
        userEmail: currentUser.email,
        newData: values,
        oldData: { displayName: editingUser.displayName, role: editingUser.role }
      });
      toast({ title: "Sucesso!", description: "Usuário atualizado." });
      setEditingUser(null);
    } catch (error) {
       const docRef = doc(db, "users", editingUser.id);
       const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: values });
       errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!currentUser?.email || !db) return;
    try {
      await deleteDoc(doc(db, "users", id));
      await logAction({
        db,
        action: 'delete',
        collectionName: 'users',
        documentId: id,
        userEmail: currentUser.email,
        details: { deletedUserEmail: email }
      });
      toast({ title: "Sucesso!", description: "Usuário removido do Firestore. A conta de autenticação ainda pode precisar de remoção manual." });
    } catch (error) {
       const docRef = doc(db, "users", id);
       const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
       errorEmitter.emit('permission-error', permissionError);
    }
  };
  
  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    form.reset({ displayName: user.displayName, role: user.role });
  };

  if (!currentUser) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  // Simple role check on client, Firestore rules are the source of truth
  const userIsAdmin = users.find(u => u.uid === currentUser.uid)?.role === 'admin';
  
  if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  if (!userIsAdmin) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Acesso Negado</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Você não tem permissão para gerenciar usuários.</p>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>Visualize, edite ou remova usuários do sistema.</CardDescription>
          </div>
          <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Usuário
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        O novo usuário receberá um e-mail para definir sua própria senha.
                    </DialogDescription>
                </DialogHeader>
                <CreateUserForm onSuccess={() => setIsCreateUserOpen(false)} />
            </DialogContent>
          </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                <TableCell className="text-right">
                  <Dialog open={editingUser?.id === user.id} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
                      <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(user)}>
                              <Edit className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                       <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Editar Usuário</DialogTitle>
                              <DialogDescription>Atualize o nome e a função do usuário.</DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleEditUser)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
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
                                            <FormLabel>Função</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione uma função" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {userRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar
                                    </Button>
                                </DialogFooter>
                            </form>
                          </Form>
                      </DialogContent>
                  </Dialog>
                  
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" disabled={currentUser?.uid === user.uid}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover o usuário <strong>{user.displayName}</strong> do banco de dados do aplicativo. A conta de autenticação precisará ser removida manualmente no Console do Firebase. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.email)}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        Nenhum usuário encontrado.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
