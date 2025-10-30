
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Plane, LogIn, LogOut } from "lucide-react";
import * as React from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
import { cn } from "@/lib/utils";
import type { Event, TransmissionType, EventFormData } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

const locations = [
  "Auditório Francisco Gedda",
  "Auditório Carlos Vieira",
  "Plenário Iris Rezende Machado",
  "Sala Julio da Retifica \"CCJR\"",
  "Externa",
  "Deputados Aqui",
];

const transmissionOptions = [
    { id: 'youtube', label: 'YouTube' },
    { id: 'tv', label: 'TV Aberta' },
    { id: 'pauta', label: 'Pauta' },
    { id: 'viagem', label: 'Viagem' },
] as const;


const formSchema = z.object({
  name: z.string().min(3, "O nome do evento deve ter pelo menos 3 caracteres."),
  location: z.string({ required_error: "O local do evento é obrigatório." }),
  date: z.date({ required_error: "A data do evento é obrigatória." }),
  time: z.string({ required_error: "A hora do evento é obrigatória." }).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido."),
  transmission: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Você precisa selecionar pelo menos um tipo de evento.",
  }),
  pauta: z.string().optional(),
  transmissionOperator: z.string().optional(),
  cinematographicReporter: z.string().optional(),
  reporter: z.string().optional(),
  producer: z.string().optional(),
  departureDate: z.date().optional(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido.").optional().or(z.literal("")),
  arrivalDate: z.date().optional(),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido.").optional().or(z.literal("")),
}).refine(data => {
    if (data.transmission.includes('viagem')) {
        return !!data.departureDate && !!data.departureTime && !!data.arrivalDate && !!data.arrivalTime;
    }
    return true;
}, {
    message: "Data e hora de partida e chegada são obrigatórias para viagens.",
    path: ["departureDate"],
});


type EditEventFormProps = {
  event: Event;
  onEditEvent: (eventId: string, eventData: EventFormData) => Promise<void>;
  onClose: () => void;
};

type Personnel = {
  id: string;
  name: string;
};

type ProductionPersonnel = {
  id: string;
  name: string;
  isReporter: boolean;
  isProducer: boolean;
};

export function EditEventForm({ event, onEditEvent, onClose }: EditEventFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [transmissionOperators, setTransmissionOperators] = React.useState<Personnel[]>([]);
  const [cinematographicReporters, setCinematographicReporters] = React.useState<Personnel[]>([]);
  const [productionPersonnel, setProductionPersonnel] = React.useState<ProductionPersonnel[]>([]);

  const reporters = React.useMemo(() => productionPersonnel.filter(p => p.isReporter), [productionPersonnel]);
  const producers = React.useMemo(() => productionPersonnel.filter(p => p.isProducer), [productionPersonnel]);

  React.useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, 'transmission_operators')), (snapshot) => {
        const data: Personnel[] = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setTransmissionOperators(data.sort((a,b) => a.name.localeCompare(b.name)));
    });
    const unsub2 = onSnapshot(query(collection(db, 'cinematographic_reporters')), (snapshot) => {
        const data: Personnel[] = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setCinematographicReporters(data.sort((a,b) => a.name.localeCompare(b.name)));
    });
    const unsub3 = onSnapshot(query(collection(db, 'production_personnel')), (snapshot) => {
        const data: ProductionPersonnel[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionPersonnel));
        setProductionPersonnel(data.sort((a,b) => a.name.localeCompare(b.name)));
    });

    return () => {
        unsub1();
        unsub2();
        unsub3();
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event.name,
      location: event.location,
      date: event.date,
      time: format(event.date, "HH:mm"),
      transmission: event.transmission || [],
      pauta: event.pauta || "",
      transmissionOperator: event.transmissionOperator || "",
      cinematographicReporter: event.cinematographicReporter || "",
      reporter: event.reporter || "",
      producer: event.producer || "",
      departureDate: event.departure,
      departureTime: event.departure ? format(event.departure, "HH:mm") : "",
      arrivalDate: event.arrival,
      arrivalTime: event.arrival ? format(event.arrival, "HH:mm") : "",
    },
  });

  const transmission = form.watch("transmission");

  const combineDateTime = (date?: Date, time?: string): Date | undefined => {
      if (!date || !time) return undefined;
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
        const eventDate = combineDateTime(values.date, values.time)!;

        const eventData: EventFormData = {
            name: values.name,
            location: values.location,
            date: eventDate,
            transmission: values.transmission as TransmissionType[],
            pauta: values.pauta,
            transmissionOperator: values.transmissionOperator,
            cinematographicReporter: values.cinematographicReporter,
            reporter: values.reporter,
            producer: values.producer,
            departure: combineDateTime(values.departureDate, values.departureTime) || null,
            arrival: combineDateTime(values.arrivalDate, values.arrivalTime) || null,
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
        <DialogContent className="p-0 sm:max-w-3xl">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Editar Evento</DialogTitle>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-y-auto max-h-[85vh] p-6 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
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
                </div>
                 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FormField
                        control={form.control}
                        name="transmissionOperator"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Op. de Transmissão</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {transmissionOperators.map((op) => <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="cinematographicReporter"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rep. Cinematográfico</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {cinematographicReporters.map((op) => <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reporter"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Repórter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {reporters.map((op) => <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="producer"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Produtor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {producers.map((op) => <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-8">
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
                </div>
                <FormField
                    control={form.control}
                    name="transmission"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Tipo de Evento</FormLabel>
                             <FormMessage />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {transmissionOptions.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="transmission"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            const currentValue = Array.isArray(field.value) ? field.value : [];
                                            return checked
                                            ? field.onChange([...currentValue, item.id])
                                            : field.onChange(
                                                currentValue.filter(
                                                    (value) => value !== item.id
                                                )
                                                );
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {item.label}
                                    </FormLabel>
                                    </FormItem>
                                );
                                }}
                            />
                            ))}
                        </div>
                        </FormItem>
                    )}
                    />
                
                {transmission?.includes('viagem') && (
                    <div className="space-y-6 border-t pt-6">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 items-center">
                            <div className="flex items-center gap-2">
                                <Plane className="h-5 w-5 text-muted-foreground"/>
                                <h3 className="text-lg font-medium">Detalhes da Viagem</h3>
                            </div>
                            <div/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="departureDate"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><LogOut className="h-4 w-4"/> Saída</FormLabel>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Data</span>}
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="departureTime" render={({ field }) => (<FormItem><FormLabel className="text-transparent">.</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="arrivalDate"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2"><LogIn className="h-4 w-4"/> Chegada</FormLabel>
                                        <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Data</span>}
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="arrivalTime" render={({ field }) => (<FormItem><FormLabel className="text-transparent">.</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                        <FormMessage>{form.formState.errors.departureDate?.message}</FormMessage>
                    </div>
                )}

                {transmission?.includes('pauta') && (
                  <FormField
                    control={form.control}
                    name="pauta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto da Pauta</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Digite o texto da pauta, roteiro ou script aqui..."
                            className="resize-y min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                 <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
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

    