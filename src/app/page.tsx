
"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/lib/types";
import { EventList } from "@/components/event-list";
import { getRandomColor } from "@/lib/utils";
import { CalendarDays, Tv, Youtube } from "lucide-react";

const initialEvents: Event[] = [
  {
    id: "1",
    name: "Sessão Ordinária",
    date: new Date(2024, 6, 25, 15, 0),
    location: "Plenário Iris Rezende Machado",
    transmission: "youtube",
    color: "",
  },
  {
    id: "2",
    name: "Audiência Pública - Saúde",
    date: new Date(2024, 6, 26, 10, 0),
    location: "Auditório Solon Amaral",
    transmission: "tv",
    color: "",
  },
  {
    id: "3",
    name: "Comissão de Constituição e Justiça",
    date: new Date(2024, 6, 27, 9, 30),
    location: "Sala Julio da Retifica \"CCJ\"",
    transmission: "youtube",
    color: "",
  },
];

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const eventsWithColors = initialEvents.map((event) => ({
      ...event,
      color: getRandomColor(),
    }));
    setEvents(eventsWithColors);
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
