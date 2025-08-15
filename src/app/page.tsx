
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { EventList } from "@/components/event-list";
import { getRandomColor } from "@/lib/utils";
import { CalendarDays, UserCog } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

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
        };
      });
      setEvents(eventsData);
    });

    // Update date every minute to keep it current
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const formattedDate = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  const formattedDay = format(currentDate, "EEE, dd", { locale: ptBR });


  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center">
          <CalendarDays className="text-2xl mr-3" />
          <h1 className="text-2xl font-bold">Agenda de Eventos</h1>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 p-2 rounded-lg">
           <span className="text-sm font-medium capitalize">{formattedDate}</span>
           <CalendarDays className="h-5 w-5" />
           <span className="text-sm font-bold uppercase">{formattedDay}</span>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <EventList events={events} />
      </main>

      <Link href="/login" passHref>
        <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
            <UserCog className="h-6 w-6" />
            <span className="sr-only">Login Administrativo</span>
        </Button>
      </Link>
    </div>
  );
}
