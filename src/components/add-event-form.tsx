
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Event, TransmissionType, RepeatSettings, EventFormData } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { suggestOperator } from "@/ai/flows/suggest-operator-flow";
import { useToast } from "@/hooks/use-toast";

const locations = [
  "Auditório Francisco Gedda",
  "Auditório Carlos Vieira",
  "Plenário Iris Rezende Machado",
  "Sala Julio da Retifica \"CCJR\""
];

const operators = [
  "Mário Augusto",
  "Rodrigo Sousa",
  "Ovidio Dias",
  "Wilker Quirino",
  "Bruno Michel",
];

const formSchema = z.object({
  name: z.string().min(3, "O nome do evento deve ter pelo menos 3 caracteres."),
  location: z.string({ required_error: "O local do evento é obrigatório." }),
  date: z.date({
    required_error: "A data do evento é obrigatória.",
  }),
  time: z.string({ required_error: "A hora do evento é obrigatória." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido."),
  transmission: z.enum(["youtube", "tv"], {
    required_error: "Você precisa selecionar um tipo de transmissão.",
  }),
  operator: z.string({ required_error: "O operador é obrigatório." }),
  repeats: z.boolean().default(false),
  repeatFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  repeatCount: z.coerce.number().int().min(1).optional(),
}).refine(data => {
    if (data.repeats) {
        return !!data.repeatFrequency && !!data.repeatCount;
    }
    return true;
}, {
    message: "Frequência e contagem de repetição são obrigatórias.",
    path: ["repeatFrequency"],
});


type AddEventFormProps = {
  onAddEvent: (event: Omit<Event, "id" | "color">, repeatSettings?: RepeatSettings) => Promise<void>;
  preloadedData?: Partial<EventFormData>;
  onSuccess?: () => void;
};

export function AddEventForm({ onAddEvent, preloadedData, onSuccess }: AddEventFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: undefined,
      time: "",
      transmission: "youtube",
      operator: undefined,
      repeats: false,
      repeatCount: 1,
    },
  });

  const selectedDate = form.watch("date");
  const selectedTime = form.watch("time");
  const selectedLocation = form.watch("location");

  const handleSuggestOperator = React.useCallback(async () => {
    // Validate time format before proceeding
    if (!selectedDate || !selectedTime || !selectedLocation || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(selectedTime)) {
      return;
    }
    
    setIsSuggesting(true);
    try {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const eventDate = new Date(selectedDate);
        eventDate.setHours(hours, minutes, 0, 0);

        const result = await suggestOperator({
            date: eventDate.toISOString(),
            location: selectedLocation
        });

        if (result.operator && operators.includes(result.operator)) {
            form.setValue("operator", result.operator, { shouldValidate: true });
            toast({
                title: "Operador Sugerido com IA!",
                description: `${result.operator} foi selecionado com base na escala.`,
            });
        } else {
             toast({
                title: "Nenhuma sugestão automática",
                description: "A IA não sugeriu um operador. Selecione manualmente.",
                variant: "destructive",
            });
        }
    } catch (error) {
        console.error("Error suggesting operator:", error);
        toast({
            title: "Erro na Sugestão",
            description: "Não foi possível sugerir um operador automaticamente.",
            variant: "destructive",
        });
    } finally {
        setIsSuggesting(false);
    }
  }, [selectedDate, selectedTime, selectedLocation, form, toast]);

  React.useEffect(() => {
    handleSuggestOperator();
  }, [selectedDate, selectedTime, selectedLocation, handleSuggestOperator]);


  React.useEffect(() => {
    if (preloadedData) {
      form.reset({
        name: preloadedData.name || "",
        location: preloadedData.location || undefined,
        date: preloadedData.date ? new Date(preloadedData.date) : undefined,
        time: preloadedData.date ? format(new Date(preloadedData.date), "HH:mm") : "",
        transmission: preloadedData.transmission || "youtube",
        operator: preloadedData.operator || undefined,
        repeats: false,
        repeatCount: 1,
      });
    }
  }, [preloadedData, form]);

  const repeats = form.watch("repeats");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const [hours, minutes] = values.time.split(":").map(Number);
      const eventDate = new Date(values.date);
      eventDate.setHours(hours, minutes);
      eventDate.setSeconds(0);
      eventDate.setMilliseconds(0);

      const baseEvent = {
          name: values.name,
          location: values.location,
          date: eventDate,
          transmission: values.transmission as TransmissionType,
          operator: values.operator,
      };

      const repeatSettings = values.repeats ? {
          frequency: values.repeatFrequency!,
          count: values.repeatCount!,
      } : undefined;

      await onAddEvent(baseEvent, repeatSettings);
      
      form.reset({
        name: "",
        location: undefined,
        date: undefined,
        time: "",
        transmission: "youtube",
        operator: undefined,
        repeats: false,
        repeatFrequency: undefined,
        repeatCount: 1,
      });

      if (onSuccess) {
          onSuccess();
      }

    } catch (error) {
        console.error("Failed to submit event:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Evento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Sessão Plenária" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o local do evento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="operator"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  Operador
                   {isSuggesting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o operador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <FormDescription>
                  O operador é sugerido pela IA.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data do Evento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora do Evento</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transmission"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Tipo de Transmissão</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-4 pt-2"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="youtube" />
                      </FormControl>
                      <FormLabel className="font-normal">YouTube</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="tv" />
                      </FormControl>
                      <FormLabel className="font-normal">TV Aberta</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-4 border-t pt-6">
            <FormField
            control={form.control}
            name="repeats"
            render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                     <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                            Repetir evento
                        </FormLabel>
                        <FormDescription>
                           Marque esta opção para criar eventos recorrentes.
                        </FormDescription>
                    </div>
                </FormItem>
            )}
            />

           {repeats && (
            <div className="grid md:grid-cols-2 gap-8 p-4 border rounded-md">
                 <FormField
                    control={form.control}
                    name="repeatFrequency"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione a frequência" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="daily">Diariamente</SelectItem>
                            <SelectItem value="weekly">Semanalmente</SelectItem>
                            <SelectItem value="monthly">Mensalmente</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="repeatCount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número de Repetições</FormLabel>
                        <FormControl>
                        <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
           )}
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Adicionando..." : "Adicionar Evento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
