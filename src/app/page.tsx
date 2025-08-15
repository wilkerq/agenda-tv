
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

export default function HomePage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
      setAllEvents(eventsData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const eventsForDate = allEvents.filter(event => 
      isSameDay(event.date, selectedDate)
    );
    setFilteredEvents(eventsForDate);
  }, [selectedDate, allEvents]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const formattedMonth = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
  const formattedDay = format(selectedDate, "EEE, dd", { locale: ptBR });

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 shadow-md flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center">
          <CalendarDays className="text-2xl mr-3" />
          <h1 className="text-2xl font-bold">Agenda de Eventos</h1>
        </div>
        <div className="flex items-center space-x-2 bg-white/20 p-2 rounded-lg">
           <span className="text-sm font-medium capitalize">{formattedMonth}</span>
           <span className="text-sm font-bold uppercase mx-2">{formattedDay}</span>
           <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                size="icon"
                className={cn(
                  "w-9 h-9 bg-transparent text-white hover:bg-white/30 hover:text-white border-white/50"
                )}
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
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <EventList events={filteredEvents} />
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
