
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { logAction } from "@/lib/audit-log";


const createUserSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
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
      // 1. Create the user in Firebase Auth using the client SDK
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;
      
      // 2. Grant admin role in Firestore on the client-side
      const adminRoleRef = doc(db, "roles_admin", newUser.uid);
      const newAdminData = {
        email: values.email,
        grantedAt: new Date(),
        grantedBy: adminUser.email,
      };

      await setDoc(adminRoleRef, newAdminData)
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'create',
                requestResourceData: newAdminData,
            });
            errorEmitter.emit('permission-error', permissionError);
            // Re-throw to be caught by the outer try-catch
            throw serverError;
        });

      // 3. Log the action
      await logAction({
          db,
          action: 'create-user',
          collectionName: 'users',
          documentId: newUser.uid,
          userEmail: adminUser.email,
          newData: {
              createdUserEmail: values.email,
              uid: newUser.uid,
          },
      });

      toast({
        title: "Usuário Criado com Sucesso!",
        description: `O usuário ${values.email} foi adicionado como administrador.`,
      });
      form.reset();
    } catch (error: any) {
      // Don't toast if it's a permission error, as it will be handled globally
      if (!(error instanceof FirestorePermissionError)) {
          let errorMessage = "Ocorreu um erro desconhecido.";
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Este endereço de email já está em uso por outra conta.";
          }
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
        <CardTitle>Criar Novo Usuário Administrador</CardTitle>
        <CardDescription>
          Insira o e-mail e uma senha temporária para o novo usuário. Ele terá permissões de administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <FormLabel>Senha Temporária</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
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
