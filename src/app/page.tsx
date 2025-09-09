
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, Timestamp, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Event, EventStatus, EventTurn } from "@/lib/types";
import { PublicCalendar } from "@/components/public-calendar";
import { EventDetailCard } from "@/components/event-detail-card";
import { isSameDay, getHours } from "date-fns";
import { Loader2 } from "lucide-react";

const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  if (hour >= 18 && hour < 24) return 'Noite';
  return 'Madrugada';
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);

  useEffect(() => {
    const eventsCollection = collection(db, "events");
    const q = query(eventsCollection, orderBy("date", "asc"));
    
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const eventDate = (data.date as Timestamp).toDate();
        const status: EventStatus = eventDate < now ? 'Concluído' : 'Agendado';
        const turn = getEventTurn(eventDate);
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          transmission: data.transmission,
          date: eventDate,
          color: data.color,
          operator: data.operator,
          status,
          turn,
        };
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, []);

  useEffect(() => {
    const eventsForDate = events.filter(event => isSameDay(event.date, selectedDate));
    setSelectedEvents(eventsForDate);
  }, [selectedDate, events]);


  if (loading) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando eventos...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <main className="flex-1 space-y-8">
          <PublicCalendar 
            events={events} 
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />

          {selectedEvents.length > 0 && (
            <div className="mt-8">
                <EventDetailCard
                    date={selectedDate}
                    events={selectedEvents}
                />
            </div>
          )}
       </main>
    </div>
  );
}
