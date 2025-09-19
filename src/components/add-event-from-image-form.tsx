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
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const photoDataUri = reader.result as string;
        const result = await createEventFromImage({ photoDataUri });
        
        const preloadedData: Partial<EventFormData> = {};
        if (result.name) preloadedData.name = result.name;
        if (result.location) preloadedData.location = result.location;
        if (result.transmission) preloadedData.transmission = result.transmission;
        if (result.operator) preloadedData.operator = result.operator;

        if (result.date && result.time) {
            const dateStr = `${result.date}T${result.time}`;
            const parsedDate = parse(dateStr, "yyyy-MM-dd'T'HH:mm", new Date());
             if (!isNaN(parsedDate.getTime())) {
                preloadedData.date = parsedDate;
            } else {
                 toast({
                    title: "Data ou hora inválida",
                    description: "A IA retornou um formato de data/hora inválido. Por favor, insira manualmente.",
                    variant: "destructive"
                });
            }
        } else {
             toast({
                title: "Data ou Hora não encontrada",
                description: "A IA não conseguiu determinar a data ou a hora do evento. Por favor, insira manualmente.",
                variant: "default"
            });
        }


        toast({
            title: "Sucesso!",
            description: "Os detalhes do evento foram extraídos. Revise e salve o evento.",
        });

        onSuccess(preloadedData);
      };
      reader.onerror = (_error) => {
         throw new Error("Falha ao ler o arquivo de imagem.");
      };

    } catch (error) {
      console.error("Error creating event from image:", error);
      toast({
        title: "Erro de IA",
        description: "Não foi possível extrair os detalhes do evento da imagem.",
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
          {isLoading ? "Analisando..." : "Extrair Detalhes do Evento"}
        </Button>
      </div>
    </form>
  );
}
