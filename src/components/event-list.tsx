
import type { Event } from "@/lib/types";
import { Button } from "./ui/button";
import { Edit, Trash2, CalendarSearch, User, MapPin, Clock, Tv, Youtube, Newspaper, Video, Mic } from "lucide-react";
import { format } from "date-fns";

type EventListProps = {
  events: Event[];
  onDeleteEvent?: (eventId: string) => void;
  onEditEvent?: (event: Event) => void;
};

const renderTransmission = (transmission: Event['transmission']) => {
  if (transmission === 'tv') {
    return (
      <div className="flex items-center gap-2">
        <Tv className="h-4 w-4 text-blue-600" />
        <Youtube className="h-4 w-4 text-red-600" />
        <span>TV Aberta e YouTube</span>
      </div>
    );
  }
  if (transmission === 'pauta') {
    return (
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-gray-600" />
        <span>Pauta</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Youtube className="h-4 w-4 text-red-600" />
      <span>YouTube</span>
    </div>
  );
};

export function EventList({ events, onDeleteEvent, onEditEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card/60 backdrop-blur-sm rounded-lg shadow-sm border">
        <CalendarSearch className="mx-auto h-12 w-12 text-foreground/50 mb-4" />
        <p className="text-lg font-medium text-foreground">Nenhum evento agendado para esta data.</p>
        <p className="text-sm text-foreground/70">Selecione outro dia no calendário ou adicione um novo evento no painel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="group relative p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md" style={{ borderLeft: `4px solid ${event.color}`}}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold pr-20">{event.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                <span className="flex items-center"><User className="mr-1.5 h-4 w-4" /> {event.transmissionOperator || "N/A"}</span>
                <span className="flex items-center"><Video className="mr-1.5 h-4 w-4" /> {event.cinematographicReporter || "N/A"}</span>
                <span className="flex items-center"><Mic className="mr-1.5 h-4 w-4" /> {event.reporter || "N/A"}</span>
                <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {event.location}</span>
                <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> {format(event.date, 'HH:mm')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0 text-sm font-semibold">
                {renderTransmission(event.transmission)}
            </div>
          </div>
          
          {onDeleteEvent && onEditEvent && (
             <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
