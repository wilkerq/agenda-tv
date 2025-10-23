
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import * as React from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import type { Event, TransmissionType, EventFormData, Operator } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

const locations = [
  "Auditório Francisco Gedda",
  "Auditório Carlos Vieira",
  "Plenário Iris Rezende Machado",
  "Sala Julio da Retifica \"CCJR\"",
  "Externa",
  "Deputados Aqui",
];

const formSchema = z.object({
  name: z.string().min(3, "O nome do evento deve ter pelo menos 3 caracteres."),
  location: z.string({ required_error: "O local do evento é obrigatório." }),
  date: z.date({
    required_error: "A data do evento é obrigatória.",
  }),
  time: z.string({ required_error: "A hora do evento é obrigatória." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido."),
  transmission: z.enum(["youtube", "tv", "pauta"], {
    required_error: "Você precisa selecionar um tipo de transmissão.",
  }),
  operator: z.string({ required_error: "O operador é obrigatório." }),
});

type EditEventFormProps = {
  event: Event;
  onEditEvent: (eventId: string, eventData: EventFormData) => Promise<void>;
  onClose: () => void;
};

export function EditEventForm({ event, onEditEvent, onClose }: EditEventFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [operators, setOperators] = React.useState<Operator[]>([]);

   React.useEffect(() => {
    const q = query(collection(db, "operators"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedOperators: Operator[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOperators.push({ id: doc.id, ...doc.data() } as Operator);
      });
      setOperators(fetchedOperators.sort((a,b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event.name,
      location: event.location,
      date: event.date,
      time: format(event.date, "HH:mm"),
      transmission: event.transmission,
      operator: event.operator,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const [hours, minutes] = values.time.split(":").map(Number);
        const eventDate = new Date(values.date);
        eventDate.setHours(hours, minutes);
        eventDate.setSeconds(0);
        eventDate.setMilliseconds(0);

        const eventData: EventFormData = {
            name: values.name,
            location: values.location,
            date: eventDate,
            transmission: values.transmission as TransmissionType,
            operator: values.operator,
        };

        await onEditEvent(event.id, eventData);
        onClose(); // Close the modal only on success
    } catch(error) {
        // Error toast is handled by the parent component, so we don't need to show another one here.
        console.error("Failed to edit event:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[825px]">
            <DialogHeader>
                <DialogTitle>Editar Evento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4">
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
                        <FormLabel>Operador</FormLabel>
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
                            <SelectItem key={operator.id} value={operator.name}>
                                {operator.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
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
                        <FormLabel>Tipo de Evento</FormLabel>
                        <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
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
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="pauta" />
                              </FormControl>
                              <FormLabel className="font-normal">Pauta</FormLabel>
                            </FormItem>
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}

    