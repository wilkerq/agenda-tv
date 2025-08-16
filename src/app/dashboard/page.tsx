
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Event, EventFormData, RepeatSettings } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EditEventForm } from "@/components/edit-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { add, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
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
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          transmission: data.transmission,
          date: (data.date as Timestamp).toDate(),
          color: data.color || getRandomColor(),
          operator: data.operator,
        };
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      toast({
        title: "Erro ao buscar eventos",
        description: "Não foi possível carregar a lista de eventos.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [selectedDate, toast]);


  const handleAddEvent = async (event: Omit<Event, "id" | "color">, repeatSettings?: RepeatSettings) => {
    try {
        if (!repeatSettings || !repeatSettings.frequency || !repeatSettings.count) {
             await addDoc(collection(db, "events"), {
                ...event,
                color: getRandomColor(),
            });
        } else {
            const batch = writeBatch(db);
            const eventsCollection = collection(db, "events");
            let currentDate = new Date(event.date);

            for (let i = 0; i < repeatSettings.count; i++) {
                const newEvent = {
                    ...event,
                    date: currentDate,
                    color: getRandomColor(),
                };
                batch.set(doc(eventsCollection), newEvent);

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
      setAddModalOpen(false);
    } catch (error) {
      console.error("Error adding event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível adicionar o evento.",
        variant: "destructive",
      });
      throw error;
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
      await updateDoc(eventRef, eventData);
      toast({
        title: "Sucesso!",
        description: "O evento foi atualizado.",
      });
      setEditingEvent(null);
    } catch (error) {
      console.error("Error updating event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível atualizar o evento.",
        variant: "destructive",
      });
    }
  }, [toast]);


  const handleOpenEditModal = (event: Event) => {
    setEditingEvent(event);
  };

  const handleCloseEditModal = () => {
    setEditingEvent(null);
  };
  
  const formattedDate = format(selectedDate, "dd 'de' MMMM", { locale: ptBR });


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
         <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
          <DialogTrigger asChild>
             <Button size="lg" className="w-full">
                <PlusCircle className="mr-2 h-5 w-5" />
                Adicionar Novo Evento
              </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[825px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AddEventForm onAddEvent={handleAddEvent} />
            </div>
          </DialogContent>
        </Dialog>
        
        <Card>
           <CardHeader>
             <CardTitle>Selecionar Data</CardTitle>
           </CardHeader>
           <CardContent className="p-0">
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
