
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Calendar as CalendarIcon, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";

interface EventsByPersonnel {
  [personnelName: string]: Event[];
}

export default function ShareSchedulePage() {
  const [eventsByPersonnel, setEventsByPersonnel] = useState<EventsByPersonnel>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isFetchingEvents, setIsFetchingEvents] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set the initial date on the client side to avoid hydration mismatch
    setSelectedDate(new Date());
    setIsClient(true);
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!selectedDate) {
      setEventsByPersonnel({});
      setIsFetchingEvents(false);
      return;
    }

    setIsFetchingEvents(true);
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      const eventsCollectionRef = collection(db, "events");
      const q = query(
        eventsCollectionRef,
        where("date", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("date", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: eventsCollectionRef.path,
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
      });

      const fetchedEvents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Event;
      });
      
      const groupedEvents: EventsByPersonnel = {};
      fetchedEvents.forEach(event => {
        const involvedPersonnel = new Set([
            event.transmissionOperator,
            event.cinematographicReporter,
            event.reporter,
            event.producer
        ].filter(p => p && p.trim() !== ''));

        involvedPersonnel.forEach(personName => {
             if (personName) {
                if (!groupedEvents[personName]) {
                    groupedEvents[personName] = [];
                }
                groupedEvents[personName].push(event);
            }
        });
      });

      setEventsByPersonnel(groupedEvents);

    } catch (error) {
      console.error("Error fetching events: ", error);
      if (!(error instanceof FirestorePermissionError)) {
          toast({
            title: "Erro ao buscar eventos",
            description: "Não foi possível carregar a agenda. Verifique o console.",
            variant: "destructive",
          });
      }
    } finally {
      setIsFetchingEvents(false);
    }
  }, [selectedDate, toast]);


  useEffect(() => {
    if (selectedDate) {
      fetchEvents();
    }
  }, [selectedDate, fetchEvents]);
  
  const personnelNames = useMemo(() => Object.keys(eventsByPersonnel).sort(), [eventsByPersonnel]);
  const hasEvents = personnelNames.length > 0;
  
  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Painel de Visualização</CardTitle>
            <CardDescription>Use esta tela para visualizar a agenda de um dia específico para toda a equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Data para Visualização</label>
                 {!selectedDate ? (
                   <Skeleton className="h-[280px] w-full" />
                 ) : (
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="p-0 border rounded-md"
                        locale={ptBR}
                    />
                 )}
            </div>
            <Alert>
                <Send className="h-4 w-4" />
                <AlertTitle>Envio Automatizado</AlertTitle>
                <AlertDescription>
                  O envio da agenda do dia seguinte para os operadores é feito automaticamente todos os dias às 20h.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Agenda de {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...'}</CardTitle>
            <CardDescription>
              {isFetchingEvents 
                ? "Buscando eventos..." 
                : hasEvents
                ? `Encontrados eventos para ${personnelNames.length} profissional(is).`
                : "Nenhum evento encontrado para esta data."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isFetchingEvents ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : hasEvents ? (
                personnelNames.map(personName => (
                    <div key={personName}>
                        <h3 className="flex items-center text-lg font-semibold mb-2">
                            <User className="mr-2 h-5 w-5 text-primary" />
                            {personName}
                        </h3>
                        <ul className="space-y-2 border-l-2 border-primary/20 pl-4 ml-2">
                            {eventsByPersonnel[personName].map(event => (
                                <li key={event.id} className="text-sm">
                                    <span className="font-mono text-muted-foreground mr-2">{format(event.date, "HH:mm")}h</span>
                                    <span>{event.name} ({event.location})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            ) : (
                 <div className="text-center py-10 px-4 bg-muted/50 rounded-lg">
                    <CalendarIcon className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="font-medium text-foreground">Nenhum evento agendado.</p>
                    <p className="text-sm text-muted-foreground">Selecione outra data para visualizar a agenda.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
