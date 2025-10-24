"use client";

import { useState, useEffect, FC } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

const personnelSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().min(10, "O telefone deve ser válido.").optional(),
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


const collectionTitles: Record<string, string> = {
  transmission_operators: "Operadores de Transmissão",
  cinematographic_reporters: "Repórteres Cinematográficos",
  production_personnel: "Pessoal de Produção",
};

interface PersonnelTabProps {
  collectionName: string;
  title: string;
}

const PersonnelTab: FC<PersonnelTabProps> = ({ collectionName, title }) => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof personnelSchema>>({
    resolver: zodResolver(personnelSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPersonnel: Personnel[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPersonnel.push({ id: doc.id, ...doc.data() } as Personnel);
      });
      setPersonnel(fetchedPersonnel.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}: `, error);
      toast({ title: "Erro", description: `Não foi possível buscar ${title}.`, variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, collectionName, title]);

  const handleAddPersonnel = async (values: z.infer<typeof personnelSchema>) => {
    setIsSubmitting(true);
    const personnelCollectionRef = collection(db, collectionName);
    
    addDoc(personnelCollectionRef, values)
      .then(() => {
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
    if (!editingPersonnel) return;
    setIsSubmitting(true);
    const docRef = doc(db, collectionName, editingPersonnel.id);

    updateDoc(docRef, values)
      .then(() => {
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
    const docRef = doc(db, collectionName, id);
    deleteDoc(docRef)
      .then(() => {
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
            {personnel.length > 0 ? personnel.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone || "N/A"}</TableCell>
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
                    <TableCell colSpan={3} className="text-center h-24">
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

const ProductionPersonnelTab: FC<{ collectionName: "production_personnel", title: string }> = ({ collectionName, title }) => {
  const [personnel, setPersonnel] = useState<ProductionPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<ProductionPersonnel | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productionPersonnelSchema>>({
    resolver: zodResolver(productionPersonnelSchema),
    defaultValues: { name: "", phone: "", isReporter: false, isProducer: false },
  });

  useEffect(() => {
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPersonnel: ProductionPersonnel[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPersonnel.push({ id: doc.id, ...doc.data() } as ProductionPersonnel);
      });
      setPersonnel(fetchedPersonnel.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}: `, error);
      toast({ title: "Erro", description: `Não foi possível buscar ${title}.`, variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast, collectionName, title]);

  const handleAddPersonnel = async (values: z.infer<typeof productionPersonnelSchema>) => {
    setIsSubmitting(true);
    const personnelCollectionRef = collection(db, collectionName);
    
    addDoc(personnelCollectionRef, values)
      .then(() => {
        toast({ title: "Sucesso!", description: "Novo membro adicionado." });
        form.reset({ name: "", phone: "", isReporter: false, isProducer: false });
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
    if (!editingPersonnel) return;
    setIsSubmitting(true);
    const docRef = doc(db, collectionName, editingPersonnel.id);

    updateDoc(docRef, values)
      .then(() => {
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
    const docRef = doc(db, collectionName, id);
    deleteDoc(docRef)
      .then(() => {
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
                    <TableCell colSpan={3} className="text-center h-24">
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
          <PersonnelTab collectionName="transmission_operators" title="Operadores de Transmissão" />
        </TabsContent>
        <TabsContent value="cinematographic_reporters">
          <PersonnelTab collectionName="cinematographic_reporters" title="Repórteres Cinematográficos" />
        </TabsContent>
        <TabsContent value="production_personnel">
          <ProductionPersonnelTab collectionName="production_personnel" title="Pessoal de Produção (Repórteres/Produtores)" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
