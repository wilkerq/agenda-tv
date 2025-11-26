"use client";

import { useState, useMemo } from 'react';
import {
  format,
  eachDayOfInterval,
  isToday,
  addDays,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/types';
import { PanelEventCard } from './panel-event-card';
import { cn } from '@/lib/utils';

type PanelCalendarProps = {
  events: Event[];
  currentTime: Date;
};

export function PanelCalendar({ events, currentTime }: PanelCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const start = currentDate;
  const end = addDays(currentDate, 6); // 7 dias no total
  const days = eachDayOfInterval({ start, end });

  const prevWeek = () => setCurrentDate(subDays(currentDate, 7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700">
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className='flex items-center'>
            <Button onClick={prevWeek} variant="ghost" size="icon">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold text-center w-64 capitalize">
              {format(start, 'd MMM')} - {format(end, 'd MMM, yyyy', { locale: ptBR })}
            </h2>
            <Button onClick={nextWeek} variant="ghost" size="icon">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
          <Button onClick={goToToday} variant="outline">
            <CalendarIcon className='mr-2 h-4 w-4' /> Hoje
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            return (
              <div
                key={day.toString()}
                className={cn(
                  'border border-slate-700 rounded-lg p-2 min-h-[400px] flex flex-col bg-slate-800/50',
                  isToday(day) && 'border-primary ring-2 ring-primary/50'
                )}
              >
                <div className={cn(
                    "text-center font-bold mb-2 pb-2 border-b border-slate-700",
                    isToday(day) && 'text-primary'
                )}>
                  <p className='text-sm capitalize'>{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className='text-xl'>{format(day, 'd')}</p>
                </div>
                
                <div className="mt-2 space-y-2 overflow-y-auto flex-1">
                  {dayEvents.length > 0 ? (
                    dayEvents.map(event => (
                      <PanelEventCard key={event.id} event={event} currentTime={currentTime} />
                    ))
                  ) : (
                     <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-slate-500">Nenhum evento</p>
                    </div>
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
