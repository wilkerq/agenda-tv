
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
import { createUser } from "@/lib/auth-actions";

const createUserSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function CreateUserPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    setIsSubmitting(true);
    try {
      await createUser(values.email, values.password);
      toast({
        title: "Usuário Criado com Sucesso!",
        description: `O usuário ${values.email} foi adicionado.`,
      });
      form.reset();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este endereço de email já está em uso por outra conta.";
      }
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Novo Usuário</CardTitle>
        <CardDescription>
          Crie uma nova conta de usuário para dar acesso ao painel administrativo.
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
                  <FormLabel>Email</FormLabel>
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
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
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
