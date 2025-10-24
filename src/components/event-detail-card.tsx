
"use client";

import { Event, EventStatus } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Clock, MapPin, User, Tv, Youtube, Moon, Sun, Cloud, Newspaper, Video, Mic, Clipboard, Plane, LogOut, LogIn } from "lucide-react";

type EventDetailCardProps = {
    date: Date;
    events: Event[];
}

const statusColors: Record<EventStatus, string> = {
    Agendado: "border-blue-500 bg-blue-50 text-blue-800",
    Concluído: "border-green-500 bg-green-50 text-green-800",
    Cancelado: "border-red-500 bg-red-50 text-red-800",
};

const turnIcons = {
    'Manhã': <Sun className="h-4 w-4" />,
    'Tarde': <Cloud className="h-4 w-4" />,
    'Noite': <Moon className="h-4 w-4" />,
};

const renderTransmissionBadge = (transmission: Event['transmission']) => {
    return (
      <div className="flex flex-wrap gap-2">
        {transmission.includes('tv') && (
          <Badge variant="outline" className='border-blue-200'>
            <div className="flex items-center">
              <Tv className="h-4 w-4 text-blue-600 mr-1.5" />
              <span>TV Aberta</span>
            </div>
          </Badge>
        )}
        {transmission.includes('youtube') && (
          <Badge variant="outline" className='border-red-200'>
            <div className="flex items-center">
              <Youtube className="h-4 w-4 text-red-600 mr-1.5" />
              <span>YouTube</span>
            </div>
          </Badge>
        )}
        {transmission.includes('pauta') && (
          <Badge variant="outline" className='border-gray-300'>
            <div className="flex items-center">
              <Newspaper className="h-4 w-4 text-gray-600 mr-1.5" />
              <span>Pauta</span>
            </div>
          </Badge>
        )}
        {transmission.includes('viagem') && (
            <Badge variant="outline" className='border-purple-300'>
                <div className="flex items-center">
                    <Plane className="h-4 w-4 text-purple-600 mr-1.5"/>
                    <span>Viagem</span>
                </div>
            </Badge>
        )}
      </div>
    );
};

export function EventDetailCard({ date, events }: EventDetailCardProps) {

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl md:text-2xl">
                    Eventos para {format(date, "d 'de' MMMM, yyyy", { locale: ptBR })}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {events.map(event => (
                        <div key={event.id} className="p-4 rounded-lg border-l-4" style={{ borderColor: event.color }}>
                            <div className="flex flex-col gap-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold">{event.name}</h3>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                                        <span className="flex items-center"><User className="mr-1.5 h-4 w-4 flex-shrink-0" /> Op. Transmissão: {event.transmissionOperator || "N/A"}</span>
                                        <span className="flex items-center"><Video className="mr-1.5 h-4 w-4 flex-shrink-0" /> Rep. Cinematográfico: {event.cinematographicReporter || "N/A"}</span>
                                        <span className="flex items-center"><Mic className="mr-1.5 h-4 w-4 flex-shrink-0" /> Repórter: {event.reporter || "N/A"}</span>
                                        <span className="flex items-center"><Clipboard className="mr-1.5 h-4 w-4 flex-shrink-0" /> Produtor: {event.producer || "N/A"}</span>
                                        <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4 flex-shrink-0" /> {event.location}</span>
                                        <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4 flex-shrink-0" /> {format(event.date, 'HH:mm')}</span>
                                    </div>
                                    {event.transmission.includes('viagem') && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2 pt-2 border-t border-dashed">
                                            {event.departure && <span className="flex items-center"><LogOut className="mr-1.5 h-4 w-4 text-red-500"/> Saída: {format(event.departure, "dd/MM HH:mm", {locale: ptBR})}</span>}
                                            {event.arrival && <span className="flex items-center"><LogIn className="mr-1.5 h-4 w-4 text-green-500"/> Chegada: {format(event.arrival, "dd/MM HH:mm", {locale: ptBR})}</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                     <Badge className={cn("capitalize", statusColors[event.status])}>
                                        {event.status}
                                    </Badge>
                                    <Badge variant="outline" className="flex items-center gap-1.5">
                                        {turnIcons[event.turn]}
                                        {event.turn}
                                    </Badge>
                                    {renderTransmissionBadge(event.transmission)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
