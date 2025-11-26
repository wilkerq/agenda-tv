
"use client";

import { useEffect, useState }from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Loader2, UploadCloud, X } from "lucide-react";
import { logAction } from "@/lib/audit-log";
import type { SecurityRuleContext } from "@/lib/types";
import Image from "next/image";

const tvConfigSchema = z.object({
  name: z.string().min(3, "O nome da TV é obrigatório."),
  address: z.string().min(5, "O endereço é obrigatório."),
  logoUrl: z.string().startsWith("data:image/", "A logo deve ser uma imagem válida.").min(20, "A logo é obrigatória."),
});

type TvConfigFormData = z.infer<typeof tvConfigSchema>;

export default function TvSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
          const data = docSnap.data() as TvConfigFormData;
          form.reset(data);
          if (data.logoUrl) {
            setPreview(data.logoUrl);
          }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // Limite de 500KB
        toast({
            title: "Imagem muito grande",
            description: "Por favor, selecione uma imagem com menos de 500KB.",
            variant: "destructive",
        });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      form.setValue("logoUrl", result, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = () => {
    setPreview(null);
    form.setValue("logoUrl", "", { shouldValidate: true });
    const input = document.getElementById('logo-upload') as HTMLInputElement;
    if (input) {
        input.value = '';
    }
  };


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
          newData: {...data, logoUrl: data.logoUrl ? 'data:image/...[removido]' : ''},
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
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                       <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            {preview ? (
                              <div className="relative group mx-auto">
                                <Image src={preview} alt="Pré-visualização da logo" width={150} height={150} className="mx-auto h-24 w-auto rounded-md object-contain"/>
                                <Button 
                                    type="button"
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleRemoveImage}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                  <label
                                    htmlFor="logo-upload"
                                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                                  >
                                    <span>Carregar uma imagem</span>
                                    <Input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                                  </label>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, WEBP até 500KB</p>
                              </>
                            )}
                          </div>
                        </div>
                    </FormControl>
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

    