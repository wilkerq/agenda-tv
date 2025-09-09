
import { Event } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

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
      <div className='flex justify-end'>
        <Badge 
           variant="outline" 
           className={cn(
            "text-xs mt-1", 
            event.transmission === 'youtube' ? 'border-red-500/50 text-red-600' : 'border-blue-500/50 text-blue-600'
            )}
        >
            {event.transmission === 'youtube' ? 'YouTube' : 'TV'}
        </Badge>
      </div>
    </div>
  );
}
