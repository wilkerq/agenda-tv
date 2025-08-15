
import type { Event } from "@/lib/types";
import { EventCard } from "./event-card";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

type EventListProps = {
  events: Event[];
  onDeleteEvent?: (eventId: string) => void;
};

export function EventList({ events, onDeleteEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card rounded-lg shadow-sm">
        <p className="text-muted-foreground">Nenhum evento agendado para esta data.</p>
        <p className="text-sm text-muted-foreground/80">Selecione outro dia no calendário.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <div key={event.id} className="relative group">
          <EventCard
            event={event}
          />
          {onDeleteEvent && (
             <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDeleteEvent(event.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
          )}
        </div>
      ))}
    </div>
  );
}
