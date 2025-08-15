
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { EventList } from "@/components/event-list";
import { getRandomColor } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);

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

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center">
          <CalendarDays className="text-2xl mr-2" />
          <h1 className="text-2xl font-bold">Agenda de Eventos</h1>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <EventList events={events} />
      </main>
    </div>
  );
}
