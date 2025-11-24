
import { Event } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { User, Tv, Youtube, Newspaper, Video, Mic, Clipboard, MapPin, Clock, Plane } from 'lucide-react';

type PanelEventCardProps = {
  event: Event;
};

const renderTransmissionIcon = (transmission: Event['transmission']) => {
  return (
    <div className="flex items-center gap-1">
      {transmission.includes('tv') && <Tv className="h-4 w-4 text-blue-400" />}
      {transmission.includes('youtube') && <Youtube className="h-4 w-4 text-red-500" />}
      {transmission.includes('pauta') && <Newspaper className="h-4 w-4 text-slate-400" />}
      {transmission.includes('viagem') && <Plane className="h-4 w-4 text-purple-400" />}
    </div>
  );
};


export function PanelEventCard({ event }: PanelEventCardProps) {
  return (
    <div
      className="p-2 rounded-lg text-xs border-l-4 bg-slate-900/70"
      style={{ borderColor: event.color}}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="font-bold text-sm text-white pr-2">{event.name}</p>
        {renderTransmissionIcon(event.transmission)}
      </div>

      <div className="space-y-1 text-slate-300">
        <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="font-semibold">{format(event.date, 'HH:mm')}h</span>
        </div>
        <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate text-xs">{event.location}</span>
        </div>
        <div className="space-y-1 pt-1 mt-1 border-t border-slate-700/50">
            {event.transmissionOperator && (
                <div className="flex items-center gap-2">
                    <User className="h-3 w-3 flex-shrink-0 text-cyan-400" />
                    <span className="truncate text-xs">{event.transmissionOperator}</span>
                </div>
            )}
            {event.cinematographicReporter && (
                <div className="flex items-center gap-2">
                    <Video className="h-3 w-3 flex-shrink-0 text-amber-400" />
                    <span className="truncate text-xs">{event.cinematographicReporter}</span>
                </div>
            )}
            {event.reporter && (
                <div className="flex items-center gap-2">
                    <Mic className="h-3 w-3 flex-shrink-0 text-rose-400" />
                    <span className="truncate text-xs">{event.reporter}</span>
                </div>
            )}
            {event.producer && (
                <div className="flex items-center gap-2">
                    <Clipboard className="h-3 w-3 flex-shrink-0 text-lime-400" />
                    <span className="truncate text-xs">{event.producer}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
