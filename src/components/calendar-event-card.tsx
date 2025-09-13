
import { Event } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { User, Tv, Youtube } from 'lucide-react';

type CalendarEventCardProps = {
  event: Event;
};

const statusColors = {
  Agendado: 'bg-blue-500/20 text-blue-700 border-blue-500/50',
  Concluído: 'bg-green-500/20 text-green-700 border-green-500/50',
  Cancelado: 'bg-red-500/20 text-red-700 border-red-500/50',
};

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  return (
    <div
      className={cn(
        "p-1.5 rounded-md text-xs border cursor-pointer",
        statusColors[event.status]
      )}
      style={{ borderLeft: `3px solid ${event.color}`}}
    >
      <p className="font-semibold truncate">{event.name}</p>
      <p className="text-muted-foreground">{format(event.date, 'HH:mm')}</p>
       <div className="flex items-center text-muted-foreground mt-1 truncate">
        <User className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="truncate">{event.operator}</span>
      </div>
      <div className='flex justify-end mt-1'>
          {event.transmission === 'tv' ? (
              <div className="flex items-center gap-1">
                  <Tv className="h-3 w-3 text-blue-600" />
                  <Youtube className="h-3 w-3 text-red-600" />
              </div>
          ) : (
              <div className="flex items-center">
                  <Youtube className="h-3 w-3 text-red-600" />
              </div>
          )}
      </div>
    </div>
  );
}
