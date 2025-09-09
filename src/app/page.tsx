
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { EventList } from "@/components/event-list";
import { getRandomColor } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const eventsCollection = collection(db, "events");
    
    const q = query(
      eventsCollection, 
      orderBy("date", "asc")
    );
    
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
      setLoading(false);
    }, (error) => {
        console.error("Error fetching events: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen">
      <header className="bg-white/10 backdrop-blur-lg text-white p-4 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7" />
          <h1 className="text-2xl font-bold">Agenda de Eventos</h1>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="bg-card/80 backdrop-blur-sm border-white/20">
                        <CardHeader><Skeleton className="h-5 w-3/4 bg-white/30" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-full bg-white/30" />
                            <Skeleton className="h-4 w-2/3 bg-white/30" />
                            <Skeleton className="h-4 w-1/2 bg-white/30" />
                        </CardContent>
                        <CardFooter>
                           <Skeleton className="h-6 w-1/4 bg-white/30" />
                        </CardFooter>
                    </Card>
                ))}
             </div>
        ) : (
            <EventList events={events} />
        )}
      </main>
    </div>
  );
}
