
"use client";

import { useState, useEffect } from "react";
import type { Event } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRandomColor } from "@/lib/utils";

const initialEvents: Omit<Event, "id" | "color">[] = [
  {
    name: "Sessão Ordinária",
    date: new Date(2024, 6, 25, 15, 0),
    location: "Plenário Iris Rezende Machado",
    transmission: "youtube",
  },
  {
    name: "Audiência Pública - Saúde",
    date: new Date(2024, 6, 26, 10, 0),
    location: "Auditório Solon Amaral",
    transmission: "tv",
  },
  {
    name: "Comissão de Constituição e Justiça",
    date: new Date(2024, 6, 27, 9, 30),
    location: "Sala Julio da Retifica \"CCJ\"",
    transmission: "youtube",
  },
];

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const eventsWithIdsAndColors = initialEvents.map((event, index) => ({
      ...event,
      id: `${index + 1}`,
      color: getRandomColor(),
    }));
    setEvents(eventsWithIdsAndColors);
  }, []);


  const handleAddEvent = (event: Omit<Event, "id" | "color">) => {
    setEvents((prevEvents) => [
      ...prevEvents,
      { ...event, id: crypto.randomUUID(), color: getRandomColor() },
    ]);
  };

  return (
    <div className="grid gap-12">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Adicionar Novo Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <AddEventForm onAddEvent={handleAddEvent} />
        </CardContent>
      </Card>

      <section>
        <h2 className="font-headline text-3xl font-bold mb-6 text-primary-foreground/90">
          Próximos Eventos
        </h2>
        <EventList events={events} />
      </section>
    </div>
  );
}
