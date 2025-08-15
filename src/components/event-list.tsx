import type { Event } from "@/lib/types";
import { EventCard } from "./event-card";

type EventListProps = {
  events: Event[];
};

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card rounded-lg shadow-sm">
        <p className="text-muted-foreground">Nenhum evento agendado no momento.</p>
        <p className="text-sm text-muted-foreground/80">Volte em breve para mais atualizações.</p>
      </div>
    );
  }

  // Sort events by date, from oldest to newest
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedEvents.map((event) => (
        <EventCard
          key={event.id}
          event={event}
        />
      ))}
    </div>
  );
}
