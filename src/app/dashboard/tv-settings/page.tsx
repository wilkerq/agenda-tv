
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Loader2 } from "lucide-react";
import { logAction } from "@/lib/audit-log";
import type { SecurityRuleContext } from "@/lib/types";

const tvConfigSchema = z.object({
  name: z.string().min(3, "O nome da TV é obrigatório."),
  address: z.string().min(5, "O endereço é obrigatório."),
  logoUrl: z.string().url("A URL da logo deve ser um link válido."),
});

type TvConfigFormData = z.infer<typeof tvConfigSchema>;

export default function TvSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TvConfigFormData>({
    resolver: zodResolver(tvConfigSchema),
    defaultValues: {
      name: "",
      address: "",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (!db) return;
    const fetchConfig = async () => {
      setIsLoading(true);
      const configRef = doc(db, "config", "tv");
      try {
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data() as TvConfigFormData);
        }
      } catch (error) {
         const permissionError = new FirestorePermissionError({ path: configRef.path, operation: 'get' });
         errorEmitter.emit('permission-error', permissionError);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [db, form]);

  const onSubmit = async (data: TvConfigFormData) => {
    if (!db || !user?.email) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para salvar as configurações.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const configRef = doc(db, "config", "tv");
    
    const docSnap = await getDoc(configRef);
    const oldData = docSnap.exists() ? docSnap.data() : null;
    
    try {
      await setDoc(configRef, data, { merge: true });
      
      await logAction({
          action: 'update',
          collectionName: 'config',
          documentId: 'tv',
          userEmail: user.email,
          oldData: oldData,
          newData: data,
          details: { summary: "Atualizou as configurações da TV" }
      });
      
      toast({
        title: "Sucesso!",
        description: "As configurações da TV foram salvas.",
      });
    } catch (error) {
       const permissionError = new FirestorePermissionError({ path: configRef.path, operation: 'update', requestResourceData: data });
       errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da TV</CardTitle>
        <CardDescription>
          Gerencie as informações da TV Alego que serão usadas nos relatórios e
          outras partes do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da TV</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: TV Alego" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Assembleia Legislativa do Estado de Goiás" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Logo</FormLabel>
                    <FormControl>
                      <Input placeholder="https://site.com/logo.png" {...field} />
                    </FormControl>
                    <FormDescription>
                      Insira o link público para a imagem da logo. A imagem
                      deve estar em formato PNG ou JPG.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
