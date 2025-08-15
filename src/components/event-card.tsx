
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, Tv, User, Youtube } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Event } from "@/lib/types";

type EventCardProps = {
  event: Event;
};

const transmissionIcons = {
  youtube: <Youtube className="h-5 w-5 text-red-600" />,
  tv: <Tv className="h-5 w-5 text-blue-600" />,
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Card 
      className="flex flex-col h-full shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-xl border-l-4"
      style={{ borderLeftColor: event.color }}
    >
      <CardHeader>
        <CardDescription className="flex items-center pt-2 text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4" />
          {format(event.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </CardDescription>
        <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center text-card-foreground/90">
          <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center text-card-foreground/90">
          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{format(event.date, "HH:mm")}</span>
        </div>
        <div className="flex items-center text-card-foreground/90">
          <User className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{event.operator}</span>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 text-sm text-card-foreground/90">
          {transmissionIcons[event.transmission]}
          <span className="font-semibold">
            {event.transmission === "youtube" ? "YouTube" : "TV Aberta"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
