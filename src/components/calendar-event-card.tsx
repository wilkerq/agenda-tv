
import { Event } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { User, Tv, Youtube, Newspaper, Video } from 'lucide-react';

type CalendarEventCardProps = {
  event: Event;
};

const statusColors = {
  Agendado: 'bg-blue-500/20 text-blue-700 border-blue-500/50',
  Concluído: 'bg-green-500/20 text-green-700 border-green-500/50',
  Cancelado: 'bg-red-500/20 text-red-700 border-red-500/50',
};

const renderTransmissionIcon = (transmission: Event['transmission']) => {
  if (transmission === 'tv') {
    return (
      <div className="flex items-center gap-1">
        <Tv className="h-3 w-3 text-blue-600" />
        <Youtube className="h-3 w-3 text-red-600" />
      </div>
    );
  }
  if (transmission === 'pauta') {
    return <Newspaper className="h-3 w-3 text-gray-600" />;
  }
  return <Youtube className="h-3 w-3 text-red-600" />;
};


export function CalendarEventCard({ event }: CalendarEventCardProps) {
  return (
    <div
      className={cn(
        "p-1 rounded-md text-xs border cursor-pointer",
        statusColors[event.status]
      )}
      style={{ borderLeft: `3px solid ${event.color}`}}
    >
      <p className="font-semibold truncate">{event.name}</p>
      <p className="text-muted-foreground text-[10px] sm:text-xs">{format(event.date, 'HH:mm')}</p>
       <div className="flex items-center text-muted-foreground mt-1 truncate">
        <User className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="truncate">{event.transmissionOperator || 'N/A'}</span>
      </div>
       <div className="flex items-center text-muted-foreground mt-1 truncate">
        <Video className="h-3 w-3 mr-1 flex-shrink-0" />
        <span className="truncate">{event.cinematographicReporter || 'N/A'}</span>
      </div>
      <div className='flex justify-end mt-1'>
          {renderTransmissionIcon(event.transmission)}
      </div>
    </div>
  );
}
