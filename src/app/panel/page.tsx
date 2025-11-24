"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, Timestamp, orderBy, query } from "firebase/firestore";
import { Event, EventStatus, EventTurn, SecurityRuleContext } from "@/lib/types";
import { getHours, addHours } from "date-fns";
import { Loader2 } from "lucide-react";
import { PanelCalendar } from "@/components/panel-calendar";
import { errorEmitter, FirestorePermissionError, useFirestore } from "@/firebase";

const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite';
};

const getEventStatus = (date: Date): EventStatus => {
    return date < new Date() ? 'Concluído' : 'Agendado';
};

export default function PanelPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const db = useFirestore();

  // Atualiza a hora atual a cada minuto para re-renderizar e filtrar
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minuto
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const eventsCollectionRef = collection(db, "events");
    const q = query(eventsCollectionRef, orderBy("date", "asc"));
    
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
          color: data.color,
          transmissionOperator: data.transmissionOperator,
          cinematographicReporter: data.cinematographicReporter,
          reporter: data.reporter,
          producer: data.producer,
          status: getEventStatus(eventDate),
          turn: getEventTurn(eventDate),
        };
      });
      setAllEvents(eventsData);
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
  }, [db]);

  // Filtra os eventos com base na hora atual
  useEffect(() => {
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    const visibleEvents = allEvents.filter(event => event.date >= oneHourAgo);
    setFilteredEvents(visibleEvents);
  }, [allEvents, currentTime]);


  if (loading) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando painel de eventos...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
        <div className="p-4 flex-grow">
            <main className="flex-1 space-y-8">
                <div className="text-center py-2">
                    <h1 className="text-3xl font-bold">Painel de Eventos - TV Alego</h1>
                </div>
                <PanelCalendar events={filteredEvents} />
            </main>
        </div>
    </div>
  );
}
