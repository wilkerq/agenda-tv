
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event, Operator } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Calendar as CalendarIcon, User } from "lucide-react";
import { sendDailyAgendaToAll } from "@/ai/flows/send-daily-agenda-to-all-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EventsByOperator {
  [operatorName: string]: Event[];
}

export default function ShareSchedulePage() {
  const [eventsByOperator, setEventsByOperator] = useState<EventsByOperator>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    if (!selectedDate) {
      setEventsByOperator({});
      return;
    }

    setIsFetchingEvents(true);
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      const q = query(
        collection(db, "events"),
        where("date", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("date", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Event;
      });

      const groupedEvents: EventsByOperator = {};
      fetchedEvents.forEach(event => {
        const operator = event.transmissionOperator;
        if (operator) {
          if (!groupedEvents[operator]) {
            groupedEvents[operator] = [];
          }
          groupedEvents[operator].push(event);
        }
      });

      setEventsByOperator(groupedEvents);

    } catch (error) {
      console.error("Error fetching events: ", error);
      toast({
        title: "Erro ao buscar eventos",
        description: "Não foi possível carregar a agenda. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEvents(false);
    }
  }, [selectedDate, toast]);


  useEffect(() => {
    fetchEvents();
  }, [selectedDate, fetchEvents]);
  
  const handleSendToAll = useCallback(async () => {
    setIsSending(true);
    try {
      const result = await sendDailyAgendaToAll({});
      if (result.success) {
        toast({
          title: "Agendas Enviadas!",
          description: `${result.messagesSent} operadores foram notificados com sucesso para o dia de amanhã.`,
        });
      } else {
        toast({
          title: "Envio Parcial",
          description: `${result.messagesSent} agendas enviadas, mas falhou para: ${result.errors.join(', ')}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending daily agenda: ", error);
      toast({
        title: "Erro no Envio Automático",
        description: "Não foi possível enviar as agendas. Verifique o console.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [toast]);

  const operatorNames = useMemo(() => Object.keys(eventsByOperator).sort(), [eventsByOperator]);
  const hasEvents = operatorNames.length > 0;
  
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Controle de Envio</CardTitle>
            <CardDescription>Visualize a agenda diária e dispare o envio automático para o dia seguinte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar Data para Visualização</label>
                 <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-0 border rounded-md"
                    locale={ptBR}
                />
            </div>
            <Alert>
                <Send className="h-4 w-4" />
                <AlertTitle>Envio Automático para Amanhã</AlertTitle>
                <AlertDescription>
                  Este botão envia a agenda do **dia seguinte** para todos os operadores que possuem eventos agendados.
                </AlertDescription>
            </Alert>
          </CardContent>
           <CardFooter>
             <Button onClick={handleSendToAll} disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? "Enviando para todos..." : "Enviar Agenda de Amanhã"}
            </Button>
           </CardFooter>
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
                ? `Encontrados eventos para ${operatorNames.length} operador(es).`
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
                operatorNames.map(operatorName => (
                    <div key={operatorName}>
                        <h3 className="flex items-center text-lg font-semibold mb-2">
                            <User className="mr-2 h-5 w-5 text-primary" />
                            {operatorName}
                        </h3>
                        <ul className="space-y-2 border-l-2 border-primary/20 pl-4 ml-2">
                            {eventsByOperator[operatorName].map(event => (
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
