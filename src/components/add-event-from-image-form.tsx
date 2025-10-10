
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createEventFromImage } from "@/ai/flows/create-event-from-image-flow";
import { type EventFormData } from "@/lib/types";
import { Loader2 } from "lucide-react";

type AddEventFromImageFormProps = {
  onSuccess: (data: Partial<EventFormData>) => void;
};

export function AddEventFromImageForm({ onSuccess }: AddEventFromImageFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // The AI flow is disabled and will return an empty object.
      const result = await createEventFromImage({ photoDataUri: "" });
      
      onSuccess(result); // Pass the empty object to open the manual form.
      
      toast({
        title: "Adição Manual",
        description: "Por favor, preencha os detalhes do evento no formulário.",
      });

    } catch (error) {
      console.error("Error in disabled image flow:", error);
      toast({
        title: "Erro Inesperado",
        description: "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continuar para Adição Manual
        </Button>
      </div>
    </form>
  );
}
