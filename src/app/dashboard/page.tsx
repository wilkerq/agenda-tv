
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, Timestamp, orderBy, query, where } from "firebase/firestore";
import type { Event, EventFormData, RepeatSettings, EventStatus, EventTurn, ReschedulingSuggestion, SecurityRuleContext } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EditEventForm } from "@/components/edit-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { add, format, startOfDay, endOfDay, getHours, differenceInMinutes, isSameDay } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AddEventFromImageForm } from "@/components/add-event-from-image-form";
import { errorEmitter, FirestorePermissionError, useFirestore, useUser } from "@/firebase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addEventAction, updateEventAction, deleteEventAction } from "@/lib/events-actions";


const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite';
};

const getEventStatus = (date: Date): EventStatus => {
  return date < new Date() ? 'Concluído' : 'Agendado';
}

type PendingEvent = {
    data: EventFormData;
    repeatSettings?: RepeatSettings;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isAddFromImageModalOpen, setAddFromImageModalOpen] = useState(false);
  const [preloadedEventData, setPreloadedEventData] = useState<Partial<EventFormData> | undefined>(undefined);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const [reallocationSuggestions, setReallocationSuggestions] = useState<ReschedulingSuggestion[] | null>(null);

  useEffect(() => {
    // Set the initial date and confirm client-side rendering
    setSelectedDate(new Date());
    setIsClient(true);
  }, []);


  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!selectedDate || !user || !db) {
      setLoading(false);
      return; 
    }
    setLoading(true);
    const eventsCollectionRef = collection(db, "events");
    
    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);

    const q = query(
        eventsCollectionRef, 
        where("date", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("date", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("date", "asc")
    );
    
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const eventDate = (data.date as Timestamp).toDate();
        const isTravel = data.transmission?.includes('viagem');
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          transmission: data.transmission,
          pauta: data.pauta,
          date: eventDate,
          color: isTravel ? '#dc2626' : data.color || getRandomColor(),
          transmissionOperator: data.transmissionOperator,
          cinematographicReporter: data.cinematographicReporter,
          reporter: data.reporter,
          producer: data.producer,
          status: getEventStatus(eventDate),
          turn: getEventTurn(eventDate),
          departure: data.departure ? (data.departure as Timestamp).toDate() : undefined,
          arrival: data.arrival ? (data.arrival as Timestamp).toDate() : undefined,
        };
      });
      setEvents(eventsData);
      setLoading(false);
    }, (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'events',
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [selectedDate, user, db]);


 const confirmAddEvent = useCallback(async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para adicionar um evento.", variant: "destructive" });
        return;
    }
    
    try {
        await addEventAction(eventData, user.email, repeatSettings);
        toast({ title: "Sucesso!", description: 'O evento foi adicionado à agenda.' });
    } catch (error) {
        console.error("Failed to add event:", error);
        toast({ title: "Erro ao Adicionar", description: "Não foi possível adicionar o evento.", variant: "destructive" });
    }
}, [user, toast]);

const handleAddEvent = useCallback(async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    try {
        // Only check for duplicates if it's not a recurring event being added
        if (!repeatSettings && selectedDate && isSameDay(eventData.date, selectedDate)) {
            const conflictingEvent = events.find(existingEvent =>
                existingEvent.name.toLowerCase() === eventData.name.toLowerCase() &&
                Math.abs(differenceInMinutes(eventData.date, existingEvent.date)) < 120
            );

            if (conflictingEvent) {
                setPendingEvent({ data: eventData, repeatSettings });
                setIsConflictDialogOpen(true);
                return; // Stop execution and wait for user confirmation
            }
        }
        
        await confirmAddEvent(eventData, repeatSettings);
    } catch (error) {
        // Errors from Server Actions will be caught, but we already toast inside confirmAddEvent
    }
}, [selectedDate, events, confirmAddEvent]);


const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!user?.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para excluir um evento.", variant: "destructive" });
        return;
    }

    try {
        await deleteEventAction(eventId, user.email);
        toast({
            title: "Evento Excluído!",
            description: "O evento foi removido da agenda com sucesso.",
        });
    } catch (error) {
        console.error("Failed to delete event:", error);
        toast({
            title: "Erro ao Excluir",
            description: "Não foi possível excluir o evento. Verifique os logs.",
            variant: "destructive",
        });
    }
}, [toast, user]);

  const handleEditEvent = useCallback(async (eventId: string, eventData: EventFormData) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para editar um evento.", variant: "destructive" });
        return;
    }
    
    try {
        await updateEventAction(eventId, eventData, user.email);
        toast({ title: "Sucesso!", description: "O evento foi atualizado." });
    } catch (error) {
        console.error("Failed to edit event:", error);
        toast({ title: "Erro ao Editar", description: "Não foi possível atualizar o evento.", variant: "destructive" });
    }
  }, [toast, user]);


  const handleOpenEditModal = (event: Event) => {
    setEditingEvent(event);
  };

  const handleCloseEditModal = () => {
    setEditingEvent(null);
  };
  
  const formattedDate = selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...';

  const handleAiSuccess = (data: Partial<EventFormData>) => {
    setPreloadedEventData(data);
    setAddFromImageModalOpen(false);
    setAddModalOpen(true);
  };

  const handleAddSuccess = () => {
    setAddModalOpen(false);
    setPreloadedEventData(undefined); // Clear preloaded data
  };

  const onConfirmConflict = async () => {
    if (pendingEvent) {
      try {
        await confirmAddEvent(pendingEvent.data, pendingEvent.repeatSettings);
      } catch (error) {
        // Errors from confirmAddEvent are handled inside it.
      }
    }
    setIsConflictDialogOpen(false);
    setPendingEvent(null);
  };

  const onCancelConflict = () => {
    setIsConflictDialogOpen(false);
    setPendingEvent(null);
    toast({
        title: "Criação Cancelada",
        description: "O evento não foi adicionado.",
        variant: "default"
    });
  };

  const handleConfirmReallocation = async (suggestions: ReschedulingSuggestion[]) => {
      if (!user?.email || !db) {
          toast({ title: "Erro de Autenticação", description: "Usuário não logado.", variant: "destructive" });
          return;
      }
      // This is a client-side action that calls a server action. The server action needs the DB.
      // Re-evaluating if this function should be a server action itself. For now, it's not.
      // Let's keep it but recognize it's calling another server action.
      try {
          const result = await reallocateConflictingEvents(suggestions, user.email);
          if (result.success) {
              toast({
                  title: "Sucesso!",
                  description: result.message,
              });
          } else {
              throw new Error(result.message);
          }
      } catch (error: any) {
           toast({
              title: "Erro no Reagendamento",
              description: error.message || "Não foi possível reagendar os eventos.",
              variant: "destructive",
          });
      }
  };


  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Dialog open={isAddModalOpen} onOpenChange={(isOpen) => {
            setAddModalOpen(isOpen);
            if (!isOpen) {
                setPreloadedEventData(undefined); // Clear preloaded data when modal closes
            }
        }}>
          <DialogTrigger asChild>
             <Button size="lg" className="w-full" onClick={() => setAddModalOpen(true)}>
                <PlusCircle className="mr-2 h-5 w-5" />
                Adicionar Novo Evento
              </Button>
          </DialogTrigger>
          <DialogContent className="p-0 sm:max-w-3xl">
            <AddEventForm 
                onAddEvent={handleAddEvent} 
                preloadedData={preloadedEventData} 
                onSuccess={handleAddSuccess}
                reallocationSuggestions={reallocationSuggestions}
                setReallocationSuggestions={setReallocationSuggestions}
                onConfirmReallocation={handleConfirmReallocation}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isAddFromImageModalOpen} onOpenChange={setAddFromImageModalOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full" variant="outline" onClick={() => setAddFromImageModalOpen(true)}>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Adicionar com Imagem
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Evento com Imagem</DialogTitle>
                    <DialogDescription>
                       Envie uma imagem (flyer, post, etc.) e nossa IA tentará extrair os detalhes do evento para preencher o formulário para você.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <AddEventFromImageForm onSuccess={handleAiSuccess} />
                </div>
            </DialogContent>
        </Dialog>
        
        <Card>
           <CardHeader>
             <CardTitle>Selecionar Data</CardTitle>
           </CardHeader>
           <CardContent className="p-0">
             {!selectedDate ? (
                <div className="p-4">
                  <Skeleton className="h-[280px] w-full" />
                </div>
             ) : (
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="p-0"
                    classNames={{
                        root: "w-full",
                        months: "w-full",
                        month: "w-full",
                        table: "w-full border-collapse",
                        head_row: "flex justify-around",
                        row: "flex justify-around mt-2 w-full",
                        caption: "flex justify-center items-center relative mb-4 px-4",
                        caption_label: "text-lg font-medium",
                    }}
                    locale={ptBR}
                />
             )}
           </CardContent>
         </Card>
      </div>
      <div className="lg:col-span-2">
         <Card className="h-full">
           <CardHeader>
             <CardTitle>Eventos para {formattedDate}</CardTitle>
           </CardHeader>
           <CardContent>
            {loading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
            ) : (
                <EventList 
                  events={events} 
                  onDeleteEvent={handleDeleteEvent} 
                  onEditEvent={handleOpenEditModal} 
                />
            )}
           </CardContent>
         </Card>
      </div>

       {editingEvent && (
        <EditEventForm 
          event={editingEvent}
          onEditEvent={handleEditEvent}
          onClose={handleCloseEditModal}
        />
      )}

      <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Evento Similar Encontrado</AlertDialogTitle>
            <AlertDialogDescription>
                Um evento com nome e horário parecidos já existe neste dia. Deseja continuar mesmo assim?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelConflict}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmConflict}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
