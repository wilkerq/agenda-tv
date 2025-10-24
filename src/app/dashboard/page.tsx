
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
import { PlusCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddEventFromImageForm } from "@/components/add-event-from-image-form";
import { logAction } from "@/lib/audit-log";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";


const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite';
};

const getEventStatus = (date: Date): EventStatus => {
  return date < new Date() ? 'Concluído' : 'Agendado';
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

  useEffect(() => {
    // Set the initial date on the client side to avoid hydration mismatch
    setSelectedDate(new Date());
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
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          transmission: data.transmission,
          pauta: data.pauta,
          date: eventDate,
          color: data.color || getRandomColor(),
          transmissionOperator: data.transmissionOperator,
          cinematographicReporter: data.cinematographicReporter,
          reporter: data.reporter,
          producer: data.producer,
          status: getEventStatus(eventDate),
          turn: getEventTurn(eventDate),
        };
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      toast({
        title: "Erro ao buscar eventos",
        description: "Não foi possível carregar la lista de eventos. Verifique suas permissões.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [selectedDate, user, toast]);


 const handleAddEvent = async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    if (!user || !user.email) throw new Error("Usuário não autenticado.");
    
    // --- DUPLICATION CHECK (In-memory) ---
    if (!repeatSettings && selectedDate && isSameDay(eventData.date, selectedDate)) {
      const conflictingEvent = events.find(existingEvent => 
          existingEvent.name === eventData.name &&
          Math.abs(differenceInMinutes(eventData.date, existingEvent.date)) < 120
      );

      if (conflictingEvent) {
        toast({
          title: "Evento Duplicado Encontrado",
          description: `Um evento chamado "${eventData.name}" já está agendado para um horário próximo neste dia.`,
          variant: "destructive",
        });
        // Throw an error to stop execution and indicate failure to the form
        throw new Error("Duplicate event");
      }
    }
    // --- END DUPLICATION CHECK ---


    if (!repeatSettings || !repeatSettings.frequency || !repeatSettings.count) {
      // Handle single event
      const newEventData = {
          ...eventData,
          date: Timestamp.fromDate(eventData.date),
          color: getRandomColor(),
      };
      
      const eventsCollectionRef = collection(db, "events");

      return addDoc(eventsCollectionRef, newEventData).then(async (docRef) => {
        await logAction({
            action: 'create',
            collectionName: 'events',
            documentId: docRef.id,
            userEmail: user.email,
            newData: { ...eventData, date: eventData.date.toISOString() },
        });
        toast({
            title: "Sucesso!",
            description: 'O evento foi adicionado à agenda.',
        });
      }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: eventsCollectionRef.path,
          operation: 'create',
          requestResourceData: newEventData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to be caught by the form
      });

    } else {
      // Handle recurring events
      const batch = writeBatch(db);
      const eventsCollection = collection(db, "events");
      let currentDate = new Date(eventData.date); // Use a new variable for iteration
      const batchId = `recurring-${Date.now()}`;

      for (let i = 0; i < repeatSettings.count; i++) {
        const newEventRef = doc(eventsCollection);
        const newEventData = {
          ...eventData,
          date: currentDate,
          color: getRandomColor(),
        };
        batch.set(newEventRef, { ...newEventData, date: Timestamp.fromDate(currentDate) });

         await logAction({
              action: 'create',
              collectionName: 'events',
              documentId: newEventRef.id,
              userEmail: user.email,
              newData: { ...eventData, date: currentDate.toISOString() },
              batchId: batchId
          });

        // Increment date for the next iteration
        if (repeatSettings.frequency === 'daily') {
          currentDate = add(currentDate, { days: 1 });
        } else if (repeatSettings.frequency === 'weekly') {
          currentDate = add(currentDate, { weeks: 1 });
        } else if (repeatSettings.frequency === 'monthly') {
          currentDate = add(currentDate, { months: 1 });
        }
      }
      
      return batch.commit().then(() => {
        toast({
          title: "Sucesso!",
          description: 'O evento e suas repetições foram adicionados.',
        });
      }).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: eventsCollection.path,
          operation: 'create',
          requestResourceData: { note: "Batch write for recurring events" },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to be caught by the form
      });
    }
  };

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para excluir um evento.", variant: "destructive" });
        return;
    }
    
    const eventRef = doc(db, "events", eventId);
    
    try {
        const eventSnap = await getDoc(eventRef);

        if(eventSnap.exists()) {
            const oldData = eventSnap.data();
            const serializableOldData = {
                ...oldData,
                date: oldData.date.toDate().toISOString(),
            };
            await logAction({
                action: 'delete',
                collectionName: 'events',
                documentId: eventId,
                userEmail: user.email,
                oldData: serializableOldData,
            });
        }

        deleteDoc(eventRef).then(() => {
            toast({
                title: "Evento Excluído!",
                description: "O evento foi removido da agenda.",
            });
        }).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: eventRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    } catch (error) {
        // This might catch errors from getDoc, although less likely to be a permission error
        console.error("Error preparing to delete event: ", error);
        toast({ title: "Erro", description: "Não foi possível preparar a exclusão do evento.", variant: "destructive" });
    }
  }, [toast, user]);

  const handleEditEvent = useCallback(async (eventId: string, eventData: EventFormData) => {
    if (!user || !user.email) {
        toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para editar um evento.", variant: "destructive" });
        throw new Error("User not authenticated");
    }
    
    const eventRef = doc(db, "events", eventId);
    const updatedData = {
        ...eventData,
        date: Timestamp.fromDate(eventData.date),
    };

    try {
        const eventSnap = await getDoc(eventRef);
        
        if(eventSnap.exists()) {
          const oldData = eventSnap.data();
          const serializableOldData = {
            ...oldData,
            date: oldData.date.toDate().toISOString(),
          };
          const serializableNewData = {
            ...eventData,
            date: eventData.date.toISOString(),
          };

          await logAction({
              action: 'update',
              collectionName: 'events',
              documentId: eventId,
              userEmail: user.email,
              oldData: serializableOldData,
              newData: serializableNewData,
          });
        }
        
        return updateDoc(eventRef, updatedData).then(() => {
          toast({
            title: "Sucesso!",
            description: "O evento foi atualizado.",
          });
        }).catch((serverError) => {
           const permissionError = new FirestorePermissionError({
              path: eventRef.path,
              operation: 'update',
              requestResourceData: updatedData,
           } satisfies SecurityRuleContext);
           errorEmitter.emit('permission-error', permissionError);
           throw serverError; // Re-throw to be caught by the form
        });

    } catch (error) {
        console.error("Error preparing to update event: ", error);
        toast({ title: "Erro", description: "Não foi possível preparar a atualização do evento.", variant: "destructive" });
        throw error; // Re-throw to be caught by the form
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
                Ao preencher os campos de data, hora e local, a IA sugerirá o operador de transmissão mais adequado.
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
    </div>
  );
}

    