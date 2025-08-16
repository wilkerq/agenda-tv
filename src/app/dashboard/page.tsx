
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Event, EventFormData } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EditEventForm } from "@/components/edit-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay } from "date-fns";

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        const eventsCollection = collection(db, "events");
        
        // --- Otimização: Buscar apenas eventos futuros ou do dia atual ---
        const today = startOfDay(new Date());
        const q = query(
            eventsCollection, 
            where("date", ">=", Timestamp.fromDate(today)),
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
      }
    });

    return () => unsubscribeAuth();
  }, [router, toast]);


  const handleAddEvent = async (event: Omit<Event, "id" | "color">) => {
    try {
      await addDoc(collection(db, "events"), {
        ...event,
        color: getRandomColor(),
      });
      toast({
        title: "Sucesso!",
        description: "O evento foi adicionado à agenda.",
      });
    } catch (error) {
      console.error("Error adding event: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível adicionar o evento.",
        variant: "destructive",
      });
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


  if (loading) {
     return (
        <div className="grid gap-12">
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div className="grid md:grid-cols-3 gap-8">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>

            <section>
                <h2 className="font-headline text-3xl font-bold mb-6 text-primary-foreground/90">
                  Próximos Eventos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                          <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                          <CardContent className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                          <CardFooter>
                              <Skeleton className="h-10 w-24" />
                          </CardFooter>
                      </Card>
                   ))}
                </div>
            </section>
        </div>
    );
  }


  return (
    <div className="grid gap-12">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Adicionar Novo Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <AddEventForm onAddEvent={handleAddEvent} />
        </CardContent>
      </Card>

      <section>
        <h2 className="font-headline text-3xl font-bold mb-6 text-primary-foreground/90">
          Próximos Eventos
        </h2>
        <EventList events={events} onDeleteEvent={handleDeleteEvent} onEditEvent={handleOpenEditModal} />
      </section>

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
