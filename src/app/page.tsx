

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { EventList } from "@/components/event-list";
import { getRandomColor } from "@/lib/utils";
import { Calendar as CalendarIcon, CalendarDays, UserCog } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This ensures that new Date() is only called on the client-side after hydration.
    setSelectedDate(new Date());
  }, []);

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
      setAllEvents(eventsData);
      setLoading(false);
    }, () => {
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const eventsForDate = allEvents.filter(event => 
        isSameDay(event.date, selectedDate)
      );
      setFilteredEvents(eventsForDate);
    }
  }, [selectedDate, allEvents]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const formattedMonth = selectedDate ? format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR }) : "";
  const formattedDay = selectedDate ? format(selectedDate, "EEE, dd", { locale: ptBR }) : "";

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center">
          <CalendarDays className="text-2xl mr-3" />
          <h1 className="text-2xl font-bold">Agenda de Eventos</h1>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 p-2 rounded-lg">
           {selectedDate ? (
            <>
              <span className="text-sm font-medium capitalize">{formattedMonth}</span>
              <span className="text-sm font-bold uppercase mx-2">{formattedDay}</span>
            </>
           ) : (
            <>
              <Skeleton className="h-5 w-24 bg-white/30" />
              <Skeleton className="h-5 w-16 bg-white/30" />
            </>
           )}
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                size="icon"
                className={cn(
                  "w-9 h-9 bg-transparent text-white hover:bg-white/30 hover:text-white border-white/50"
                )}
                disabled={!selectedDate}
              >
                <CalendarIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                locale={ptBR}
                disabled={(date) => date < new Date("1900-01-01")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {loading ? (
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
        ) : (
            <EventList events={filteredEvents} />
        )}
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
