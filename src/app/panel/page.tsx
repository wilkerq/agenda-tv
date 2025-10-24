
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, Timestamp, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Event, EventStatus, EventTurn } from "@/lib/types";
import { getHours } from "date-fns";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { PanelCalendar } from "@/components/panel-calendar";
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
};

export default function PanelPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eventsCollection = collection(db, "events");
    const q = query(eventsCollection, orderBy("date", "asc"));
    
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const now = new Date();
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
      setEvents(eventsData);
      setLoading(false);
    }, (serverError) => {
      console.error("Error fetching events: ", serverError);
       const permissionError = new FirestorePermissionError({
        path: eventsCollection.path,
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, []);

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
                    <p className="text-base text-slate-400">Agenda da semana</p>
                </div>
                <PanelCalendar events={events} />
            </main>
        </div>
    </div>
  );
}
