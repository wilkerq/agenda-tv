
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createEventFromImage } from "@/ai/flows/create-event-from-image-flow";
import { type EventFormData } from "@/lib/types";
import { Loader2, UploadCloud, X } from "lucide-react";
import Image from 'next/image';

type AddEventFromImageFormProps = {
  onSuccess: (data: Partial<EventFormData>) => void;
};

export function AddEventFromImageForm({ onSuccess }: AddEventFromImageFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };
  
  const handleRemoveImage = () => {
    setFile(null);
    setPreview(null);
    // Reset the input value
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
        input.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !preview) {
      toast({
        title: "Nenhuma imagem selecionada",
        description: "Por favor, selecione uma imagem para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createEventFromImage({ photoDataUri: preview });
      
      const parsedData: Partial<EventFormData> = {
        ...result,
        date: result.date ? new Date(result.date + 'T12:00:00') : undefined, // Add time to avoid timezone issues
      }
      
      onSuccess(parsedData);
      
      toast({
        title: "Dados Extraídos!",
        description: "Os dados da imagem foram pré-preenchidos. Por favor, revise e complete o formulário.",
      });

    } catch (error) {
      console.error("Error creating event from image:", error);
      toast({
        title: "Erro ao ler a imagem",
        description: "A IA não conseguiu processar a imagem. Verifique se sua chave de API está configurada corretamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Evento
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            {preview ? (
              <div className="relative group">
                <Image src={preview} alt="Pré-visualização da imagem" width={400} height={400} className="mx-auto h-48 w-auto rounded-md object-contain"/>
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
                    htmlFor="image-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                  >
                    <span>Carregar um arquivo</span>
                    <Input id="image-upload" name="image-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP até 10MB</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !file}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Analisando Imagem...' : 'Extrair Informações'}
        </Button>
      </div>
    </form>
  );
}
