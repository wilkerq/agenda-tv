
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Operator } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Users } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

const operatorSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().min(10, "O telefone deve ser válido."),
});

const initialOperators = [
  { name: 'Rodrigo', phone: '+5562981234219' },
  { name: 'Bruno', phone: '+5562995193003' },
  { name: 'Mario', phone: '+5562999060960' },
  { name: 'Ovideo', phone: '+5562982729985' },
];

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof operatorSchema>>({
    resolver: zodResolver(operatorSchema),
    defaultValues: { name: "", phone: "" },
  });

  const seedInitialData = useCallback(async () => {
    const operatorsCollection = collection(db, "operators");
    const snapshot = await getDocs(operatorsCollection);
    if (snapshot.empty) {
      const batch = writeBatch(db);
      initialOperators.forEach(op => {
        const docRef = doc(operatorsCollection);
        batch.set(docRef, op);
      });
      await batch.commit();
      toast({ title: "Operadores Iniciais", description: "Dados iniciais dos operadores foram semeados." });
    }
  }, [toast]);

  useEffect(() => {
    seedInitialData();
    
    const q = query(collection(db, "operators"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedOperators: Operator[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOperators.push({ id: doc.id, ...doc.data() } as Operator);
      });
      setOperators(fetchedOperators.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching operators: ", error);
      toast({ title: "Erro", description: "Não foi possível buscar os operadores.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, seedInitialData]);

  const handleAddOperator = async (values: z.infer<typeof operatorSchema>) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "operators"), values);
      toast({ title: "Sucesso!", description: "Operador adicionado." });
      form.reset();
      setAddModalOpen(false);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar o operador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOperator = async (values: z.infer<typeof operatorSchema>) => {
    if (!editingOperator) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "operators", editingOperator.id), values);
      toast({ title: "Sucesso!", description: "Operador atualizado." });
      setEditingOperator(null);
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o operador.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOperator = async (id: string) => {
    try {
      await deleteDoc(doc(db, "operators", id));
      toast({ title: "Sucesso!", description: "Operador removido." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível remover o operador.", variant: "destructive" });
    }
  };
  
  const openEditModal = (operator: Operator) => {
    setEditingOperator(operator);
    form.reset(operator);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciar Operadores</CardTitle>
          <CardDescription>Adicione, edite ou remova operadores do sistema.</CardDescription>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Operador
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Novo Operador</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddOperator)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl><Input placeholder="Nome do Operador" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone (com código do país)</FormLabel>
                                    <FormControl><Input placeholder="+55629..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Adicionar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
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
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operators.length > 0 ? operators.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.name}</TableCell>
                <TableCell>{op.phone}</TableCell>
                <TableCell className="text-right">
                  <Dialog open={editingOperator?.id === op.id} onOpenChange={(isOpen) => !isOpen && setEditingOperator(null)}>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(op)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                       <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Editar Operador</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                              <form onSubmit={form.handleSubmit(handleEditOperator)} className="space-y-4">
                                  <FormField
                                      control={form.control}
                                      name="name"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Nome</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <FormField
                                      control={form.control}
                                      name="phone"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>Telefone</FormLabel>
                                              <FormControl><Input {...field} /></FormControl>
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
                       <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá remover permanentemente o operador.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteOperator(op.id)}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        Nenhum operador encontrado. Comece adicionando um.
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
