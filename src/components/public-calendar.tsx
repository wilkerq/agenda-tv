"use client";

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarIcon, User, Video, Mic, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types';
import { CalendarEventCard } from './calendar-event-card';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


type PublicCalendarProps = {
  events: Event[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
};

const roleIcons: Record<string, React.ReactNode> = {
    'transmissionOperator': <User className="mr-1 h-4 w-4" />,
    'cinematographicReporter': <Video className="mr-1 h-4 w-4" />,
    'reporter': <Mic className="mr-1 h-4 w-4" />,
    'producer': <Clipboard className="mr-1 h-4 w-4" />,
};

const roleLabels: Record<string, string> = {
    'transmissionOperator': 'Op. Transmissão',
    'cinematographicReporter': 'Rep. Cinematográfico',
    'reporter': 'Repórter',
    'producer': 'Produtor',
};


export function PublicCalendar({ events, selectedDate, onDateSelect }: PublicCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startingDayIndex = getDay(start);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };


  const filteredEvents = useMemo(() => {
    if (selectedRoles.length === 0) return events;
    return events.filter(event => 
        selectedRoles.some(role => {
            const eventRole = (event as any)[role];
            return eventRole && typeof eventRole === 'string' && eventRole.trim() !== '';
        })
    );
  }, [events, selectedRoles]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    filteredEvents.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [filteredEvents]);

  return (
    <div className="bg-card rounded-xl shadow-lg border">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className='flex items-center self-center'>
            <Button onClick={prevMonth} variant="ghost" size="icon">
              <ChevronLeft className="h-6 w-6" />
            </Button>
             <h2 className="text-xl sm:text-2xl font-bold text-center w-48 sm:w-64 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button onClick={nextMonth} variant="ghost" size="icon">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <ToggleGroup 
              type="multiple" 
              variant="outline" 
              value={selectedRoles}
              onValueChange={setSelectedRoles}
              className='flex-wrap justify-start'
              aria-label="Filtrar por função"
            >
              {Object.entries(roleIcons).map(([role, icon]) => (
                <ToggleGroupItem key={role} value={role} aria-label={roleLabels[role]} className='flex gap-1 px-2 sm:px-3'>
                  {icon} <span className="hidden sm:inline">{roleLabels[role]}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button onClick={goToToday} variant="outline" className="w-full sm:w-auto">
                <CalendarIcon className='mr-2 h-4 w-4' /> Hoje
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-muted-foreground text-xs sm:text-sm">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="border rounded-lg bg-muted/30 min-h-[80px] sm:min-h-[120px]"></div>
          ))}

          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            return (
              <div
                key={day.toString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  'border rounded-lg p-1 sm:p-2 min-h-[80px] sm:min-h-[120px] cursor-pointer transition-all duration-200',
                  !isSameMonth(day, currentMonth) && 'bg-muted/30 text-muted-foreground',
                  isSameDay(day, selectedDate) && 'ring-2 ring-primary ring-offset-2',
                  isSameMonth(day, currentMonth) && 'bg-background hover:bg-muted/50',
                )}
              >
                <div className='flex justify-between items-center'>
                    <time dateTime={format(day, 'yyyy-MM-dd')} className={cn(
                        "text-xs sm:text-sm font-semibold",
                        isToday(day) && "flex items-center justify-center h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary text-primary-foreground"
                    )}>
                    {format(day, 'd')}
                    </time>
                    {dayEvents.length > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-xs sm:h-5 sm:px-2 sm:text-sm">{dayEvents.length}</Badge>}
                </div>
                
                <div className="mt-1 sm:mt-2 space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <CalendarEventCard key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 2 && (
                     <p className="text-xs text-muted-foreground text-center mt-1">
                        + {dayEvents.length - 2} mais
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
