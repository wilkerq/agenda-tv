
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, Timestamp, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Event, EventStatus, EventTurn } from "@/lib/types";
import { PublicCalendar } from "@/components/public-calendar";
import { EventDetailCard } from "@/components/event-detail-card";
import { isSameDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";

const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite'; // Covers 18:00 to 05:59
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set the initial date and confirm client-side rendering
    setSelectedDate(new Date());
    setIsClient(true);
  }, []);


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
          pauta: data.pauta,
          date: eventDate,
          color: data.color,
          transmissionOperator: data.transmissionOperator,
          cinematographicReporter: data.cinematographicReporter,
          reporter: data.reporter,
          producer: data.producer,
          status,
          turn,
          departure: data.departure ? (data.departure as Timestamp).toDate() : undefined,
          arrival: data.arrival ? (data.arrival as Timestamp).toDate() : undefined,
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

  useEffect(() => {
    if (selectedDate) {
      const eventsForDate = events.filter(event => isSameDay(event.date, selectedDate));
      setSelectedEvents(eventsForDate);
    }
  }, [selectedDate, events]);


  if (loading || !isClient) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando eventos...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="container mx-auto p-2 sm:p-6 lg:p-8 flex-grow">
        <main className="flex-1 space-y-8">
            {/* Desktop Calendar View */}
            <div className="hidden lg:block">
              <PublicCalendar 
                events={events} 
                selectedDate={selectedDate!}
                onDateSelect={setSelectedDate}
              />
            </div>

            {/* Mobile Calendar View */}
            <div className="block lg:hidden">
               <Card>
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

            {selectedEvents.length > 0 && (
              <div className="mt-8">
                  <EventDetailCard
                      date={selectedDate!}
                      events={selectedEvents}
                  />
              </div>
            )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
