"use client";

import { useState } from "react";
import type { Event } from "@/lib/types";
import { AddEventForm } from "@/components/add-event-form";
import { EventList } from "@/components/event-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialEvents: Event[] = [
  {
    id: "1",
    name: "Sessão Ordinária",
    date: new Date(2024, 6, 25),
    location: "Plenário Getulino Artiaga",
    transmission: "youtube",
  },
  {
    id: "2",
    name: "Audiência Pública - Saúde",
    date: new Date(2024, 6, 26),
    location: "Auditório Solon Amaral",
    transmission: "tv",
  },
  {
    id: "3",
    name: "Comissão de Constituição e Justiça",
    date: new Date(2024, 6, 27),
    location: "Sala de Comissões",
    transmission: "youtube",
  },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  const handleAddEvent = (event: Omit<Event, "id">) => {
    setEvents((prevEvents) => [
      ...prevEvents,
      { ...event, id: crypto.randomUUID() },
    ]);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary-foreground/90">
          Agenda Alego
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe os próximos eventos da Assembleia Legislativa.
        </p>
      </header>

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
    </main>
  );
}
