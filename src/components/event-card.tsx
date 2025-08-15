import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MapPin, Tv, Youtube } from "lucide-react";

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
  color: string;
};

const transmissionIcons = {
  youtube: <Youtube className="h-5 w-5 text-red-600" />,
  tv: <Tv className="h-5 w-5 text-blue-800" />,
};

export function EventCard({ event, color }: EventCardProps) {
  const cardStyle = {
    backgroundColor: color,
    border: `1px solid ${color.replace(')', ', 0.5)').replace('rgb', 'rgba')}`,
  };

  return (
    <Card style={cardStyle} className="flex flex-col h-full shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.name}</CardTitle>
        <CardDescription className="text-foreground/80 flex items-center pt-2">
          <CalendarDays className="mr-2 h-4 w-4" />
          {format(event.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center text-foreground/90">
          <MapPin className="mr-2 h-4 w-4" />
          <span>{event.location}</span>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {transmissionIcons[event.transmission]}
          <span className="font-semibold text-foreground/90">
            {event.transmission === "youtube" ? "YouTube" : "TV Aberta"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
