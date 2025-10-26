"use client";

import { useState, useEffect, FC } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query, CollectionReference, DocumentData, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logAction } from "@/lib/audit-log";
import { onAuthStateChanged, type User } from 'firebase/auth';


const turns = ["Manhã", "Tarde", "Noite", "Geral"] as const;

const personnelSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().min(10, "O telefone deve ser válido.").optional(),
  turn: z.enum(turns).default("Geral"),
});

type Personnel = z.infer<typeof personnelSchema> & { id: string };

const productionPersonnelSchema = personnelSchema.extend({
    isReporter: z.boolean().default(false),
    isProducer: z.boolean().default(false),
}).refine(data => data.isReporter || data.isProducer, {
    message: "A pessoa deve ser marcada como Repórter e/ou Produtor.",
    path: ["isReporter"],
});

type ProductionPersonnel = z.infer<typeof productionPersonnelSchema> & { id: string };


const serializePersonnelData = (data: z.infer<typeof personnelSchema> | z.infer<typeof productionPersonnelSchema>) => {
  const serialized: any = {};
  for (const key in data) {
    const value = (data as any)[key];
    if (value !== null && value !== undefined) {
      serialized[key] = value;
    }
  }
  return serialized;
};


interface PersonnelTabProps {
  collectionName: string;
  title: string;
  currentUser: User | null;
}

const PersonnelTab: FC<PersonnelTabProps> = ({ collectionName, title, currentUser }) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof personnelSchema>>({
    resolver: zodResolver(personnelSchema),
    defaultValues: { name: "", phone: "", turn: "Geral" },
  });

  useEffect(() => {
    const personnelCollectionRef = collection(db, collectionName);
    const q = query(personnelCollectionRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPersonnel: Personnel[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPersonnel.push({ id: doc.id, ...doc.data() } as Personnel);
      });
      setPersonnel(fetchedPersonnel.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: personnelCollectionRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, collectionName, title]);

  const handleAddPersonnel = async (values: z.infer<typeof personnelSchema>) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    const personnelCollectionRef = collection(db, collectionName);
    
    addDoc(personnelCollectionRef, values)
      .then(async (docRef) => {
        await logAction({
          action: 'create',
          collectionName,
          documentId: docRef.id,
          userEmail: currentUser.email!,
          newData: serializePersonnelData(values)
        });
        toast({ title: "Sucesso!", description: `${title.slice(0, -1)} adicionado.` });
        form.reset();
        setAddModalOpen(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: personnelCollectionRef.path,
          operation: 'create',
          requestResourceData: values,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleEditPersonnel = async (values: z.infer<typeof personnelSchema>) => {
    if (!editingPersonnel || !currentUser) return;
    setIsSubmitting(true);
    const docRef = doc(db, collectionName, editingPersonnel.id);
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : null;

    updateDoc(docRef, values)
      .then(async () => {
         await logAction({
          action: 'update',
          collectionName,
          documentId: editingPersonnel.id,
          userEmail: currentUser.email!,
          oldData: oldData ? serializePersonnelData(oldData as any) : undefined,
          newData: serializePersonnelData(values)
        });
        toast({ title: "Sucesso!", description: `${title.slice(0, -1)} atualizado.` });
        setEditingPersonnel(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: values,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDeletePersonnel = async (id: string) => {
    if (!currentUser) return;
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : null;

    deleteDoc(docRef)
      .then(async () => {
        if(oldData) {
          await logAction({
            action: 'delete',
            collectionName,
            documentId: id,
            userEmail: currentUser.email!,
            oldData: serializePersonnelData(oldData as any)
          });
        }
        toast({ title: "Sucesso!", description: `${title.slice(0, -1)} removido.` });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };
  
  const openEditModal = (person: Personnel) => {
    setEditingPersonnel(person);
    form.reset(person);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Adicione, edite ou remova membros da equipe.</CardDescription>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Novo Membro</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddPersonnel)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl><Input placeholder="Nome do membro" {...field} /></FormControl>
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
                         <FormField
                            control={form.control}
                            name="turn"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Turno</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o turno de trabalho" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {turns.map(turn => <SelectItem key={turn} value={turn}>{turn}</SelectItem>)}
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
              <TableHead>Turno</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.length > 0 ? personnel.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone || "N/A"}</TableCell>
                <TableCell><Badge variant="outline">{p.turn || "Geral"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Dialog open={editingPersonnel?.id === p.id} onOpenChange={(isOpen) => !isOpen && setEditingPersonnel(null)}>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(p)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                       <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Editar Membro</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                              <form onSubmit={form.handleSubmit(handleEditPersonnel)} className="space-y-4">
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
                                   <FormField
                                        control={form.control}
                                        name="turn"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Turno</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o turno" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {turns.map(turn => <SelectItem key={turn} value={turn}>{turn}</SelectItem>)}
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
                       <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso irá remover permanentemente o membro da equipe.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePersonnel(p.id)}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        Nenhum membro encontrado. Comece adicionando um.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
};

interface ProductionPersonnelTabProps {
  collectionName: "production_personnel";
  title: string;
  currentUser: User | null;
}

const ProductionPersonnelTab: FC<ProductionPersonnelTabProps> = ({ collectionName, title, currentUser }) => {
  const [personnel, setPersonnel] = useState<ProductionPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<ProductionPersonnel | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productionPersonnelSchema>>({
    resolver: zodResolver(productionPersonnelSchema),
    defaultValues: { name: "", phone: "", isReporter: false, isProducer: false, turn: "Geral" },
  });

  useEffect(() => {
    const personnelCollectionRef = collection(db, collectionName);
    const q = query(personnelCollectionRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPersonnel: ProductionPersonnel[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPersonnel.push({ id: doc.id, ...doc.data() } as ProductionPersonnel);
      });
      setPersonnel(fetchedPersonnel.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: personnelCollectionRef.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, collectionName, title]);

  const handleAddPersonnel = async (values: z.infer<typeof productionPersonnelSchema>) => {
     if (!currentUser) return;
    setIsSubmitting(true);
    const personnelCollectionRef = collection(db, collectionName);
    
    addDoc(personnelCollectionRef, values)
      .then(async (docRef) => {
        await logAction({
          action: 'create',
          collectionName,
          documentId: docRef.id,
          userEmail: currentUser.email!,
          newData: serializePersonnelData(values)
        });
        toast({ title: "Sucesso!", description: "Novo membro adicionado." });
        form.reset({ name: "", phone: "", isReporter: false, isProducer: false, turn: "Geral" });
        setAddModalOpen(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: personnelCollectionRef.path,
          operation: 'create',
          requestResourceData: values,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleEditPersonnel = async (values: z.infer<typeof productionPersonnelSchema>) => {
    if (!editingPersonnel || !currentUser) return;
    setIsSubmitting(true);
    const docRef = doc(db, collectionName, editingPersonnel.id);
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : null;

    updateDoc(docRef, values)
      .then(async() => {
        await logAction({
          action: 'update',
          collectionName,
          documentId: editingPersonnel.id,
          userEmail: currentUser.email!,
          oldData: oldData ? serializePersonnelData(oldData as any) : undefined,
          newData: serializePersonnelData(values)
        });
        toast({ title: "Sucesso!", description: "Membro atualizado." });
        setEditingPersonnel(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: values,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleDeletePersonnel = async (id: string) => {
     if (!currentUser) return;
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    const oldData = docSnap.exists() ? docSnap.data() : null;

    deleteDoc(docRef)
      .then(async () => {
         if (oldData) {
          await logAction({
            action: 'delete',
            collectionName,
            documentId: id,
            userEmail: currentUser.email!,
            oldData: serializePersonnelData(oldData as any)
          });
        }
        toast({ title: "Sucesso!", description: "Membro removido." });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const openEditModal = (person: ProductionPersonnel) => {
    setEditingPersonnel(person);
    form.reset(person);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Adicione, edite ou remova membros da equipe de produção.</CardDescription>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Adicionar Pessoal de Produção</DialogTitle>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddPersonnel)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl><Input placeholder="Nome do membro" {...field} /></FormControl>
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
                         <FormField
                            control={form.control}
                            name="turn"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Turno</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o turno de trabalho" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {turns.map(turn => <SelectItem key={turn} value={turn}>{turn}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                            <FormLabel>Funções</FormLabel>
                            <div className="flex items-center space-x-4">
                                <FormField
                                    control={form.control}
                                    name="isReporter"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">Repórter</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isProducer"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">Produtor</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormMessage>{form.formState.errors.isReporter?.message}</FormMessage>
                        </div>
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
              <TableHead>Funções</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personnel.length > 0 ? personnel.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                    <div className="flex gap-2">
                        {p.isReporter && <Badge variant="outline">Repórter</Badge>}
                        {p.isProducer && <Badge variant="outline">Produtor</Badge>}
                    </div>
                </TableCell>
                <TableCell><Badge variant="outline">{p.turn || "Geral"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Dialog open={editingPersonnel?.id === p.id} onOpenChange={(isOpen) => !isOpen && setEditingPersonnel(null)}>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(p)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                       <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Editar Membro</DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                              <form onSubmit={form.handleSubmit(handleEditPersonnel)} className="space-y-4">
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
                                   <FormField
                                        control={form.control}
                                        name="turn"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Turno</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o turno" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                         {turns.map(turn => <SelectItem key={turn} value={turn}>{turn}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                   <div className="space-y-2">
                                        <FormLabel>Funções</FormLabel>
                                        <div className="flex items-center space-x-4">
                                            <FormField
                                                control={form.control}
                                                name="isReporter"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                        <FormLabel className="font-normal">Repórter</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="isProducer"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                        <FormLabel className="font-normal">Produtor</FormLabel>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         <FormMessage>{form.formState.errors.isReporter?.message}</FormMessage>
                                    </div>

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
                          Esta ação não pode ser desfeita. Isso irá remover permanentemente o membro da equipe.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePersonnel(p.id)}>Continuar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                        Nenhum membro encontrado. Comece adicionando um.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
};


export default function OperatorsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Gerenciar Pessoal</CardTitle>
        <CardDescription>Adicione, edite ou remova membros da equipe para cada função.</CardDescription>
      </CardHeader>
      <Tabs defaultValue="transmission_operators" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transmission_operators">Op. de Transmissão</TabsTrigger>
          <TabsTrigger value="cinematographic_reporters">Rep. Cinematográficos</TabsTrigger>
          <TabsTrigger value="production_personnel">Pessoal de Produção</TabsTrigger>
        </TabsList>
        <TabsContent value="transmission_operators">
          <PersonnelTab collectionName="transmission_operators" title="Operadores de Transmissão" currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="cinematographic_reporters">
          <PersonnelTab collectionName="cinematographic_reporters" title="Repórteres Cinematográficos" currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="production_personnel">
          <ProductionPersonnelTab collectionName="production_personnel" title="Pessoal de Produção (Repórteres/Produtores)" currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
