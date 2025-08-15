
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const eventsCollection = collection(db, "events");
    const q = query(eventsCollection, orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    });

    return () => unsubscribe();
  }, []);

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
        <EventList events={events} onDeleteEvent={handleDeleteEvent} />
      </section>
    </div>
  );
}
