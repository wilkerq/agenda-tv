import type { Event } from "@/lib/types";
import { EventCard } from "./event-card";

type EventListProps = {
  events: Event[];
};

const cardColors = [
  "rgb(254, 202, 202)", // soft red
  "rgb(254, 215, 170)", // soft orange
  "rgb(254, 240, 138)", // soft yellow
  "rgb(217, 249, 157)", // soft green
  "rgb(191, 219, 254)", // soft blue
  "rgb(233, 213, 255)", // soft purple
  "rgb(199, 210, 254)", // soft indigo
];


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
      {sortedEvents.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          color={cardColors[index % cardColors.length]}
        />
      ))}
    </div>
  );
}
