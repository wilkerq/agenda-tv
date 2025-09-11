
"use client";

import { Event, EventStatus } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Clock, MapPin, User, Tv, Youtube, Moon, Sun, Cloud } from "lucide-react";

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

export function EventDetailCard({ date, events }: EventDetailCardProps) {

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">
                    Eventos para {format(date, "d 'de' MMMM, yyyy", { locale: ptBR })}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {events.map(event => (
                        <div key={event.id} className="p-4 rounded-lg border-l-4" style={{ borderColor: event.color }}>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold">{event.name}</h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                        <span className="flex items-center"><User className="mr-1.5 h-4 w-4" /> {event.operator}</span>
                                        <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {event.location}</span>
                                        <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> {format(event.date, 'HH:mm')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                     <Badge className={cn("capitalize", statusColors[event.status])}>
                                        {event.status}
                                    </Badge>
                                    <Badge variant="outline" className="flex items-center gap-1.5">
                                        {turnIcons[event.turn]}
                                        {event.turn}
                                    </Badge>
                                    <Badge variant="outline" className={cn(event.transmission === 'youtube' ? 'border-red-200' : 'border-blue-200')}>
                                      {event.transmission === 'youtube' ? 
                                        <Youtube className="h-4 w-4 text-red-600 mr-1.5"/> : 
                                        <Tv className="h-4 w-4 text-blue-600 mr-1.5"/>
                                      }
                                      {event.transmission === 'youtube' ? 'YouTube' : 'TV Aberta'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
