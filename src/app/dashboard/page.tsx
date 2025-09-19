
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query, updateDoc, where, writeBatch } from "firebase/firestore";
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
import { add, format, startOfDay, endOfDay, getHours } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AddEventFromImageForm } from "@/components/add-event-from-image-form";

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
          date: eventDate,
          color: data.color || getRandomColor(),
          operator: data.operator,
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
        description: "Não foi possível carregar a lista de eventos. Verifique suas permissões.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [selectedDate, user, toast]);


 const handleAddEvent = async (eventData: EventFormData, repeatSettings?: RepeatSettings) => {
    try {
      if (!repeatSettings || !repeatSettings.frequency || !repeatSettings.count) {
        // Handle single event
        await addDoc(collection(db, "events"), {
          ...eventData,
          date: Timestamp.fromDate(eventData.date),
          color: getRandomColor(),
        });
      } else {
        // Handle recurring events
        const batch = writeBatch(db);
        const eventsCollection = collection(db, "events");
        let currentDate = new Date(eventData.date); // Use a new variable for iteration

        for (let i = 0; i < repeatSettings.count; i++) {
          const newEvent = {
            ...eventData,
            date: Timestamp.fromDate(currentDate), // Use the iterating date
            color: getRandomColor(),
          };
          batch.set(doc(eventsCollection), newEvent);

          // Increment date for the next iteration
          if (repeatSettings.frequency === 'daily') {
            currentDate = add(currentDate, { days: 1 });
          } else if (repeatSettings.frequency === 'weekly') {
            currentDate = add(currentDate, { weeks: 1 });
          } else if (repeatSettings.frequency === 'monthly') {
            currentDate = add(currentDate, { months: 1 });
          }
        }
        await batch.commit();
      }

      toast({
        title: "Sucesso!",
        description: `O evento ${repeatSettings ? 'e suas repetições foram adicionados' : 'foi adicionado'} à agenda.`,
      });
    } catch (error) {
      console.error("Error adding event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível adicionar o evento.",
        variant: "destructive",
      });
      throw error; // Re-throw the error to be caught by the form
    }
  };

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteDoc(doc(db, "events", eventId));
      toast({
        title: "Evento Excluído!",
        description: "O evento foi removido da agenda.",
      });
    } catch (error) {
      console.error("Error deleting event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível excluir o evento.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleEditEvent = useCallback(async (eventId: string, eventData: EventFormData) => {
    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        ...eventData,
        date: Timestamp.fromDate(eventData.date), // Convert to Timestamp
      });
      toast({
        title: "Sucesso!",
        description: "O evento foi atualizado.",
      });
    } catch (error) {
      console.error("Error updating event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
      throw error; // Re-throw to be caught by the form
    }
  }, [toast]);


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
                Ao preencher os campos de data, hora e local, a IA sugerirá o operador mais adequado com base nas regras de negócio e na escala.
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
                    Adicionar com IA
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Evento com Imagem</DialogTitle>
                    <CardDescription>
                       Faça o upload de uma imagem e a IA tentará preencher os detalhes do evento para você, incluindo o operador e o tipo de transmissão, com base nas regras de negócio.
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
