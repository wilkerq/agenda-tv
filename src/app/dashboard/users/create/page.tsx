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
import { Loader2, Copy, Check } from "lucide-react";
import { createUser } from "@/lib/auth-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser } from "@/firebase";

const createUserSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function CreateUserPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useUser();

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
    },
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
    setGeneratedLink(null);
    setCopied(false);

    try {
      const result = await createUser(values.email, adminUser.email);
      setGeneratedLink(result.passwordResetLink);
      toast({
        title: "Usuário Criado com Sucesso!",
        description: `O usuário ${values.email} foi adicionado. Copie o link abaixo e envie para ele.`,
      });
      form.reset();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-exists') {
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

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Novo Usuário</CardTitle>
        <CardDescription>
          Insira o e-mail do novo usuário. Um link será gerado para que ele possa definir sua própria senha.
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
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !adminUser}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Criando..." : "Criar Usuário e Gerar Link"}
              </Button>
            </div>
          </form>
        </Form>

        {generatedLink && (
            <Alert className="mt-6">
                <AlertTitle className="font-semibold">Link de Definição de Senha</AlertTitle>
                <AlertDescription className="break-all text-sm text-muted-foreground mt-2">
                    Envie este link para o novo usuário. Ele é válido por um tempo limitado.
                </AlertDescription>
                 <div className="relative mt-4">
                    <Input 
                        readOnly 
                        value={generatedLink} 
                        className="pr-12 bg-muted"
                    />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </Alert>
        )}

      </CardContent>
    </Card>
  );
}
