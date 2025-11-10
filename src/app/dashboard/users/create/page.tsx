
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUser, useFirestore, useAuth, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { logAction } from "@/lib/audit-log";
import type { SecurityRuleContext } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const userRoles = ["admin", "editor", "viewer"] as const;

const createUserSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  role: z.enum(userRoles).default("editor"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function CreateUserPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "editor",
    },
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
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      // 2. Set the user's display name
      await updateProfile(newUser, { displayName: values.name });

      // 3. Create the user document in Firestore with the selected role
      const userDocRef = doc(db, "users", newUser.uid);
      const newUserData = {
        uid: newUser.uid,
        email: values.email,
        displayName: values.name,
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
            throw serverError;
        });

      // 4. Log the action (optional but good practice)
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
        description: `O usuário ${values.email} foi adicionado com a função de ${values.role}.`,
      });
      form.reset();

    } catch (error: any) {
      if (!(error instanceof FirestorePermissionError)) {
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
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Novo Usuário</CardTitle>
        <CardDescription>
          Insira os dados e defina a função do novo usuário.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !adminUser || !db}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
