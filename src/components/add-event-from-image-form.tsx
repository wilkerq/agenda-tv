
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createEventFromImage } from "@/ai/flows/create-event-from-image-flow";
import { type EventFormData } from "@/lib/types";
import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { parse } from "date-fns";

type AddEventFromImageFormProps = {
  onSuccess: (data: Partial<EventFormData>) => void;
};

export function AddEventFromImageForm({ onSuccess }: AddEventFromImageFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const processFile = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };
  
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processFile(new File([blob], "pasted-image.png", { type: blob.type }));
          }
          break; 
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Nenhuma imagem selecionada",
        description: "Por favor, selecione ou cole uma imagem para continuar.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      // Since the AI flow is disabled, we don't need to read the file.
      // We'll just call onSuccess with empty data to open the manual form.
      await createEventFromImage({ photoDataUri: '' }); // Call is still needed to respect flow
      onSuccess({});
      toast({
        title: "Adicionar Evento Manualmente",
        description: "A extração por imagem está desativada. Por favor, preencha os detalhes do evento.",
      });

    } catch (error) {
      console.error("Error in 'create from image' (disabled AI) flow:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Por favor, tente adicionar o evento manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="image-upload">Imagem do Evento</Label>
         <div className="flex items-center justify-center w-full">
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                {previewUrl ? (
                    <Image src={previewUrl} alt="Preview" width={192} height={192} className="object-contain h-full w-full p-2" />
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span>, cole (Ctrl+V) ou arraste</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP</p>
                    </div>
                )}
                 <Input id="image-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
            </label>
        </div> 
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !file}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Processando..." : "Continuar para Adição Manual"}
        </Button>
      </div>
    </form>
  );
}
