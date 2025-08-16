
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, Timestamp, orderBy, query } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getRandomColor } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        const eventsCollection = collection(db, "events");
        const q = query(eventsCollection, orderBy("date", "desc"));
        
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
                <Skeleton className="h-9 w-1/4 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                          <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
                          <CardContent className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                          <CardFooter>
                              <Skeleton className="h-6 w-1/4" />
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
        <EventList events={events} onDeleteEvent={handleDeleteEvent} />
      </section>
    </div>
  );
}
