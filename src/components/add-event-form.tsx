"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Users, Plane, LogOut, LogIn, Sparkles } from "lucide-react";
import * as React from "react";
import { collection, onSnapshot, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from 'firebase/auth';

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
import type { TransmissionType, RepeatSettings, EventFormData } from "@/lib/types";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";
import { suggestTeam } from "@/ai/flows/suggest-team-flow";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";


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
  repeats: z.boolean().default(false),
  repeatFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  repeatCount: z.coerce.number().int().min(1).optional(),
  departureDate: z.date().optional(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido.").optional().or(z.literal("")),
  arrivalDate: z.date().optional(),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido.").optional().or(z.literal("")),
}).refine(data => {
    if (data.repeats) {
        return !!data.repeatFrequency && !!data.repeatCount;
    }
    return true;
}, {
    message: "Frequência e contagem de repetição são obrigatórias.",
    path: ["repeatFrequency"],
}).refine(data => {
    if (data.transmission.includes('viagem')) {
        return !!data.departureDate && !!data.departureTime && !!data.arrivalDate && !!data.arrivalTime;
    }
    return true;
}, {
    message: "Data e hora de partida e chegada são obrigatórias para viagens.",
    path: ["departureDate"],
});


type AddEventFormProps = {
  onAddEvent: (eventData: EventFormData, repeatSettings?: RepeatSettings) => Promise<void>;
  preloadedData?: Partial<EventFormData>;
  onSuccess?: () => void;
};

type Personnel = {
  id: string;
  name: string;
  turn: 'Manhã' | 'Tarde' | 'Noite' | 'Geral';
};

type ProductionPersonnel = Personnel & {
  isReporter: boolean;
  isProducer: boolean;
};

export function AddEventForm({ onAddEvent, preloadedData, onSuccess }: AddEventFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);

  const [transmissionOperators, setTransmissionOperators] = React.useState<Personnel[]>([]);
  const [cinematographicReporters, setCinematographicReporters] = React.useState<Personnel[]>([]);
  const [productionPersonnel, setProductionPersonnel] = React.useState<ProductionPersonnel[]>([]);

  const reporters = React.useMemo(() => productionPersonnel.filter(p => p.isReporter), [productionPersonnel]);
  const producers = React.useMemo(() => productionPersonnel.filter(p => p.isProducer), [productionPersonnel]);


  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!user) return;

    const fetchPersonnel = <T extends Personnel>(collectionName: string, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
      const personnelCollectionRef = collection(db, collectionName);
      const q = query(personnelCollectionRef);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(data.sort((a,b) => a.name.localeCompare(b.name)));
      }, (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: personnelCollectionRef.path,
              operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      });
      return unsubscribe;
    };
    
    const unsub1 = fetchPersonnel<Personnel>('transmission_operators', setTransmissionOperators);
    const unsub2 = fetchPersonnel<Personnel>('cinematographic_reporters', setCinematographicReporters);
    const unsub3 = fetchPersonnel<ProductionPersonnel>('production_personnel', setProductionPersonnel);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    }

  }, [user]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: undefined,
      time: "",
      transmission: ["youtube"],
      pauta: "",
      transmissionOperator: "",
      cinematographicReporter: "",
      reporter: "",
      producer: "",
      repeats: false,
      repeatCount: 1,
      departureDate: undefined,
      departureTime: "",
      arrivalDate: undefined,
      arrivalTime: "",
    },
  });

  const handleSuggestion = React.useCallback(async () => {
    const { date, time, location, transmission } = form.getValues();
    
    if (!user) {
       toast({ title: "Autenticação necessária", description: "Você precisa estar logado para usar a sugestão.", variant: "destructive"});
       return;
    }

    if (!date || !time || !location || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      toast({
        title: "Dados Incompletos",
        description: "Por favor, preencha a data, hora e local do evento antes de pedir uma sugestão.",
        variant: "destructive"
      })
      return;
    }
    
    setIsSuggesting(true);
    try {
        const [hours, minutes] = time.split(":").map(Number);
        const eventDate = new Date(date);
        eventDate.setHours(hours, minutes, 0, 0);

        const result = await suggestTeam({
            date: eventDate.toISOString(),
            location: location,
            transmissionTypes: transmission as TransmissionType[],
        });
        
        const suggestionsMade: string[] = [];

        if (result.transmissionOperator) {
            form.setValue("transmissionOperator", result.transmissionOperator, { shouldValidate: true });
            suggestionsMade.push(`Op. Transmissão: ${result.transmissionOperator}`);
        }
        if (result.cinematographicReporter) {
            form.setValue("cinematographicReporter", result.cinematographicReporter, { shouldValidate: true });
            suggestionsMade.push(`Rep. Cinematográfico: ${result.cinematographicReporter}`);
        }
        if (result.reporter) {
            form.setValue("reporter", result.reporter, { shouldValidate: true });
            suggestionsMade.push(`Repórter: ${result.reporter}`);
        }
        if (result.producer) {
            form.setValue("producer", result.producer, { shouldValidate: true });
            suggestionsMade.push(`Produtor: ${result.producer}`);
        }
        
        if (suggestionsMade.length > 0) {
            toast({
                title: "Equipe Sugerida com Sucesso!",
                description: (
                    <ul className="mt-2 list-disc list-inside">
                        {suggestionsMade.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                ),
            });
        } else {
             toast({
                title: "Nenhuma sugestão disponível",
                description: "Não foi possível sugerir uma equipe completa. Verifique as escalas ou preencha manually.",
                variant: "default",
            });
        }

    } catch (error) {
        console.error("Error during auto-population:", error);
        toast({
            title: "Erro na Sugestão",
            description: "Não foi possível sugerir a equipe. Verifique o console para detalhes.",
            variant: "destructive",
        });
    } finally {
        setIsSuggesting(false);
    }
  }, [form, toast, user]);


  React.useEffect(() => {
    if (preloadedData) {
      form.reset({
        name: preloadedData.name || "",
        location: preloadedData.location || undefined,
        date: preloadedData.date ? new Date(preloadedData.date) : undefined,
        time: preloadedData.date ? format(new Date(preloadedData.date), "HH:mm") : "",
        transmission: preloadedData.transmission || ["youtube"],
        pauta: preloadedData.pauta || "",
        transmissionOperator: preloadedData.transmissionOperator || "",
        cinematographicReporter: preloadedData.cinematographicReporter || "",
        reporter: preloadedData.reporter || "",
        producer: preloadedData.producer || "",
        repeats: false,
        repeatCount: 1,
      });
    }
  }, [preloadedData, form]);

  const repeats = form.watch("repeats");
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

      const repeatSettings = values.repeats ? {
          frequency: values.repeatFrequency!,
          count: values.repeatCount!,
      } : undefined;

      await onAddEvent(eventData, repeatSettings);
      
      form.reset({
        name: "",
        location: undefined,
        date: undefined,
        time: "",
        transmission: ["youtube"],
        pauta: "",
        transmissionOperator: "",
        cinematographicReporter: "",
        reporter: "",
        producer: "",
        repeats: false,
        repeatFrequency: undefined,
        repeatCount: 1,
        departureDate: undefined,
        departureTime: "",
        arrivalDate: undefined,
        arrivalTime: "",
      });

      if (onSuccess) {
          onSuccess();
      }

    } catch (error: any) {
        if (error.message !== 'Duplicate event confirmation pending') {
             toast({
                title: "Erro ao Adicionar Evento",
                description: "Não foi possível salvar o evento. Verifique os dados e tente novamente.",
                variant: "destructive"
            });
        }
        console.error("Failed to submit event:", error);
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        <div className="grid md:grid-cols-3 gap-8 items-end">
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
          <FormItem>
             <FormLabel className="text-transparent">.</FormLabel>
            <Button type="button" onClick={handleSuggestion} disabled={isSuggesting || !user || transmissionOperators.length === 0} className="w-full">
                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Sugerir Equipe
            </Button>
          </FormItem>
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
                            <SelectItem value="none">Nenhum</SelectItem>
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
                             <SelectItem value="none">Nenhum</SelectItem>
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
                             <SelectItem value="none">Nenhum</SelectItem>
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
                             <SelectItem value="none">Nenhum</SelectItem>
                            {producers.map((op) => <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
                    <FormDescription>
                    Selecione um ou mais tipos para este evento.
                    </FormDescription>
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
                <FormMessage />
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
