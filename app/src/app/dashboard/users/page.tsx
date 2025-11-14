
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
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
import { useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { createUserAction, updateUserAction, deleteUserAction } from "@/lib/user-actions";
import type { SecurityRuleContext } from "@/lib/types";
import { sendPasswordResetEmail } from "firebase/auth";

const userRoles = ["admin", "editor", "viewer"] as const;

// Schema for editing an existing user
const editUserSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  email: z.string().email(), // Add email for readonly display
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

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", displayName: "", role: "editor" },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    if (!adminUser?.email) {
      toast({
        title: "Erro de Autenticação",
        description: "Não foi possível identificar o administrador logado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const result = await createUserAction(values, adminUser.email);
    
    if (result.success) {
       toast({
        title: "Usuário Criado com Sucesso!",
        description: `Um e-mail será enviado para ${values.email} para que o usuário defina sua própria senha.`,
        duration: 8000,
      });
      form.reset();
      onSuccess(); // Close the dialog
    } else {
       toast({
        title: "Falha ao Criar Usuário",
        description: result.message,
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
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
          <Button type="submit" disabled={isSubmitting || !adminUser}>
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
    defaultValues: { displayName: "", email: "", role: "viewer" },
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
    if (!editingUser || !currentUser?.email) return;
    setIsSubmitting(true);
    
    const result = await updateUserAction(editingUser.id, values, currentUser.email);
    
    if (result.success) {
      toast({ title: "Sucesso!", description: "Usuário atualizado." });
      setEditingUser(null);
    } else {
        toast({ title: "Erro ao Atualizar", description: result.message, variant: "destructive" });
    }
    
    setIsSubmitting(false);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!currentUser?.email) return;
    
    const result = await deleteUserAction(id, email, currentUser.email);
    
    if (result.success) {
      toast({ title: "Sucesso!", description: result.message });
    } else {
      toast({ title: "Erro ao Excluir", description: result.message, variant: "destructive" });
    }
  };
  
  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    form.reset({ displayName: user.displayName, email: user.email, role: user.role });
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
                        Um e-mail será enviado para que o novo usuário defina sua própria senha.
                    </DialogDescription>
                </DialogHeader>
                <CreateUserForm onSuccess={() => setIsCreateUserOpen(false)} />
            </DialogContent>
          </Dialog>
      </CardHeader>
      <CardContent>
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
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} readOnly disabled />
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
                          Esta ação irá remover o usuário <strong>{user.displayName}</strong> do banco de dados do aplicativo e da autenticação. Esta ação não pode ser desfeita.
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
      </CardContent>
    </Card>
  );
}
