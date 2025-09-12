
import type { Event } from "@/lib/types";
import { EventCard } from "./event-card";
import { Button } from "./ui/button";
import { Edit, Trash2 } from "lucide-react";
import { CalendarSearch } from "lucide-react";

type EventListProps = {
  events: Event[];
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (event: Event) => void;
};

export function EventList({ events, onDeleteEvent, onEditEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card/60 backdrop-blur-sm rounded-lg shadow-sm border border-white/20">
        <CalendarSearch className="mx-auto h-12 w-12 text-foreground/50 mb-4" />
        <p className="text-lg font-medium text-foreground">Nenhum evento agendado para esta data.</p>
        <p className="text-sm text-foreground/70">Selecione outro dia no calendário ou adicione um novo evento no painel.</p>
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
          {onDeleteEvent && onEditEvent && (
             <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-background/80 hover:bg-background"
                  onClick={() => onEditEvent(event)}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar Evento</span>
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDeleteEvent(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir Evento</span>
                </Button>
             </div>
          )}
        </div>
      ))}
    </div>
  );
}
