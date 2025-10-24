
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query, updateDoc, where, writeBatch, getDocs, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Event, EventFormData, RepeatSettings, EventStatus, EventTurn } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EditEventForm } from "@/components/edit-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { add, format, startOfDay, endOfDay, getHours, differenceInMinutes, isSameDay } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Sparkles, Users, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddEventFromImageForm } from "@/components/add-event-from-image-form";
import { logAction } from "@/lib/audit-log";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


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
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set the initial date and confirm client-side rendering
    setSelectedDate(new Date());
    setIsClient(true);
  }, []);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!selectedDate || !user) {
      setLoading(false);
      return; 
    }
    setLoading(true);
    const eventsCollection = collection(db, "events");
    
    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);

    const q = query(
        eventsCollection, 
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
            path: eventsCollection.path,
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [selectedDate, user, toast]);


 const confirmAddEvent = useCallback(async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para adicionar um evento.", variant: "destructive" });
        throw new Error("User not authenticated");
    }

    const userEmail = user.email;
    const isTravel = eventData.transmission?.includes('viagem');

    if (!repeatSettings || !repeatSettings.frequency || !repeatSettings.count) {
        const newEventData = {
            ...eventData,
            date: Timestamp.fromDate(eventData.date),
            departure: eventData.departure ? Timestamp.fromDate(eventData.departure) : undefined,
            arrival: eventData.arrival ? Timestamp.fromDate(eventData.arrival) : undefined,
            color: isTravel ? '#dc2626' : getRandomColor(),
        };

        const eventsCollectionRef = collection(db, "events");

        try {
            const docRef = await addDoc(eventsCollectionRef, newEventData);
            const serializableData = {
                ...eventData,
                date: eventData.date.toISOString(),
                departure: eventData.departure?.toISOString(),
                arrival: eventData.arrival?.toISOString(),
            };
            await logAction({
                action: 'create',
                collectionName: 'events',
                documentId: docRef.id,
                userEmail: userEmail,
                newData: serializableData,
            });
            toast({ title: "Sucesso!", description: 'O evento foi adicionado à agenda.' });
        } catch (serverError: any) {
            const permissionError = new FirestorePermissionError({
                path: eventsCollectionRef.path,
                operation: 'create',
                requestResourceData: newEventData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            throw serverError;
        }
    } else {
        const batch = writeBatch(db);
        const eventsCollection = collection(db, "events");
        let currentDate = new Date(eventData.date);
        const batchId = `recurring-${Date.now()}`;
        const logPromises: Promise<void>[] = [];

        for (let i = 0; i < repeatSettings.count; i++) {
            const newEventRef = doc(eventsCollection);
            const newEventData = { ...eventData, date: Timestamp.fromDate(currentDate), color: isTravel ? '#dc2626' : getRandomColor() };
            batch.set(newEventRef, newEventData);

            const serializableData = { ...eventData, date: currentDate.toISOString() };
            logPromises.push(logAction({ action: 'create', collectionName: 'events', documentId: newEventRef.id, userEmail: userEmail, newData: serializableData, batchId }));

            if (repeatSettings.frequency === 'daily') currentDate = add(currentDate, { days: 1 });
            else if (repeatSettings.frequency === 'weekly') currentDate = add(currentDate, { weeks: 1 });
            else if (repeatSettings.frequency === 'monthly') currentDate = add(currentDate, { months: 1 });
        }

        try {
            await Promise.all(logPromises);
            await batch.commit();
            toast({ title: "Sucesso!", description: 'O evento e suas repetições foram adicionados.' });
        } catch (serverError: any) {
            const permissionError = new FirestorePermissionError({ path: eventsCollection.path, operation: 'create', requestResourceData: { note: "Batch write for recurring events" } } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            throw serverError;
        }
    }
}, [user, toast]);

const handleAddEvent = useCallback(async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    // Duplication check
    if (!repeatSettings && selectedDate && isSameDay(eventData.date, selectedDate)) {
        const conflictingEvent = events.find(existingEvent =>
            existingEvent.name === eventData.name &&
            Math.abs(differenceInMinutes(eventData.date, existingEvent.date)) < 120
        );

        if (conflictingEvent) {
            setPendingEvent({ data: eventData, repeatSettings });
            setIsConflictDialogOpen(true);
            // Don't throw error here, just stop execution and wait for dialog
            return; 
        }
    }

    // If no conflict, proceed directly
    await confirmAddEvent(eventData, repeatSettings);

}, [selectedDate, events, confirmAddEvent]);


  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para excluir um evento.", variant: "destructive" });
        return;
    }
    
    const eventRef = doc(db, "events", eventId);
    const userEmail = user.email;
    
    const eventSnap = await getDoc(eventRef);
    const oldData = eventSnap.exists() ? eventSnap.data() : null;

    deleteDoc(eventRef)
      .then(async () => {
        if (oldData) {
            const serializableOldData = {
                ...oldData,
                date: (oldData.date as Timestamp).toDate().toISOString(),
            };
            await logAction({
                action: 'delete',
                collectionName: 'events',
                documentId: eventId,
                userEmail: userEmail,
                oldData: serializableOldData,
            });
        }
        
        toast({
            title: "Evento Excluído!",
            description: "O evento foi removido da agenda.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: eventRef.path,
            operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
  }, [toast, user]);

  const handleEditEvent = useCallback(async (eventId: string, eventData: EventFormData) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para editar um evento.", variant: "destructive" });
        throw new Error("User not authenticated");
    }
    
    const eventRef = doc(db, "events", eventId);
    const userEmail = user.email;
    const isTravel = eventData.transmission?.includes('viagem');

    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
        throw new Error("Event not found");
    }
    
    const oldData = eventSnap.data();
    const serializableOldData = {
        ...oldData,
        date: (oldData.date as Timestamp).toDate().toISOString(),
        departure: oldData.departure ? (oldData.departure as Timestamp).toDate().toISOString() : undefined,
        arrival: oldData.arrival ? (oldData.arrival as Timestamp).toDate().toISOString() : undefined,
    };

    const updatedData = {
        ...eventData,
        date: Timestamp.fromDate(eventData.date),
        departure: eventData.departure ? Timestamp.fromDate(eventData.departure) : undefined,
        arrival: eventData.arrival ? Timestamp.fromDate(eventData.arrival) : undefined,
        color: isTravel ? '#dc2626' : oldData.color || getRandomColor(),
    };
    
    updateDoc(eventRef, updatedData)
      .then(async () => {
        const serializableNewData = {
            ...eventData,
            date: eventData.date.toISOString(),
            departure: eventData.departure?.toISOString(),
            arrival: eventData.arrival?.toISOString(),
        };

        await logAction({
            action: 'update',
            collectionName: 'events',
            documentId: eventId,
            userEmail: userEmail,
            oldData: serializableOldData,
            newData: serializableNewData,
        });
        
        toast({
            title: "Sucesso!",
            description: "O evento foi atualizado.",
        });
      })
      .catch((serverError) => {
       const permissionError = new FirestorePermissionError({
          path: eventRef.path,
          operation: 'update',
          requestResourceData: { ...eventData, date: eventData.date.toISOString() },
       } satisfies SecurityRuleContext);
       errorEmitter.emit('permission-error', permissionError);
       throw serverError; // Re-throw to be caught by the form
    });
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
      await confirmAddEvent(pendingEvent.data, pendingEvent.repeatSettings);
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
          <DialogContent className="sm:max-w-[825px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Evento</DialogTitle>
               <CardDescription>
                Preencha os campos de data, hora e local, depois use o botão "Sugerir Equipe" para preencher a equipe.
              </CardDescription>
            </DialogHeader>
            <div className="py-4">
              <AddEventForm onAddEvent={handleAddEvent} preloadedData={preloadedEventData} onSuccess={handleAddSuccess} />
            </div>
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
                    <CardDescription>
                       Envie uma imagem (flyer, post, etc.) e nossa IA tentará extrair os detalhes do evento para preencher o formulário para você.
                    </CardDescription>
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
