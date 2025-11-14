
import type { Event } from "@/lib/types";
import { Button } from "./ui/button";
import { Edit, Trash2, CalendarSearch, User, MapPin, Clock, Tv, Youtube, Newspaper, Video, Mic, Clipboard, Plane, LogOut, LogIn, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type EventListProps = {
  events: Event[];
  onDeleteEvent: (eventId: string) => void;
  onEditEvent: (event: Event) => void;
};

const renderTransmission = (transmission: Event['transmission']) => {
  return (
    <div className="flex items-center gap-2">
      {transmission.includes('tv') && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Tv className="h-4 w-4 text-blue-600" /></TooltipTrigger>
            <TooltipContent>TV Aberta</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {transmission.includes('youtube') && (
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Youtube className="h-4 w-4 text-red-600" /></TooltipTrigger>
            <TooltipContent>YouTube</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {transmission.includes('pauta') && (
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Newspaper className="h-4 w-4 text-gray-600" /></TooltipTrigger>
            <TooltipContent>Pauta</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {transmission.includes('viagem') && (
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Plane className="h-4 w-4 text-purple-600" /></TooltipTrigger>
            <TooltipContent>Viagem</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

const handleAddToGoogleCalendar = (event: Event) => {
  const startTime = format(event.date, "yyyyMMdd'T'HHmmss");
  // Assume event duration is 1 hour if not specified
  const endTime = format(new Date(event.date.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");

  const details = `
Equipe:
- Op. Transmissão: ${event.transmissionOperator || 'N/A'}
- Rep. Cinematográfico: ${event.cinematographicReporter || 'N/A'}
- Repórter: ${event.reporter || 'N/A'}
- Produtor: ${event.producer || 'N/A'}
  `.trim();

  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`;
  
  window.open(googleCalendarUrl, '_blank');
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
              <div className="flex flex-col gap-2 text-sm text-muted-foreground mt-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center"><User className="mr-1.5 h-4 w-4" /> {event.transmissionOperator || "N/A"}</span>
                    <span className="flex items-center"><Video className="mr-1.5 h-4 w-4" /> {event.cinematographicReporter || "N/A"}</span>
                    <span className="flex items-center"><Mic className="mr-1.5 h-4 w-4" /> {event.reporter || "N/A"}</span>
                    <span className="flex items-center"><Clipboard className="mr-1.5 h-4 w-4" /> {event.producer || "N/A"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> {format(event.date, 'HH:mm')}</span>
                    <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {event.location}</span>
                </div>
                {event.transmission.includes('viagem') && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 pt-1 border-t border-dashed">
                      {event.departure && <span className="flex items-center text-xs"><LogOut className="mr-1.5 h-3 w-3 text-red-500"/> Saída: {format(event.departure, "dd/MM HH:mm", {locale: ptBR})}</span>}
                      {event.arrival && <span className="flex items-center text-xs"><LogIn className="mr-1.5 h-3 w-3 text-green-500"/> Chegada: {format(event.arrival, "dd/MM HH:mm", {locale: ptBR})}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0 text-sm font-semibold">
                {renderTransmission(event.transmission)}
            </div>
          </div>
          
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-background/80 hover:bg-background"
                    onClick={() => handleAddToGoogleCalendar(event)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    <span className="sr-only">Adicionar ao Google Agenda</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar ao Google Agenda</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                 <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-background/80 hover:bg-background"
                      onClick={() => onEditEvent(event)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Editar Evento</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Editar Evento</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir Evento</span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Excluir Evento</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá remover permanentemente o evento da agenda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteEvent(event.id)}>
                    Continuar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
