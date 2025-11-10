
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { logAction } from "@/lib/audit-log";
import type { SecurityRuleContext } from "@/lib/types";

const userRoles = ["admin", "editor", "viewer"] as const;

const userSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  role: z.enum(userRoles),
});

type UserData = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "editor" | "viewer";
};

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const { user: currentUser } = useUser();

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
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

  const handleEditUser = async (values: z.infer<typeof userSchema>) => {
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
  if (currentUser && !users.find(u => u.uid === currentUser.uid)?.role.includes('admin')) {
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
      <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
          <CardDescription>Visualize, edite ou remova usuários do sistema.</CardDescription>
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

    