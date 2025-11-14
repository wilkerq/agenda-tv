
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import type { Event, SecurityRuleContext } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, Calendar as CalendarIcon, User, Rocket } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter, FirestorePermissionError, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { sendDailyAgendaToAll } from "@/ai/flows/send-daily-agenda-to-all-flow";

interface EventsByPersonnel {
  [personnelName: string]: Event[];
}

export default function ShareSchedulePage() {
  const [eventsByPersonnel, setEventsByPersonnel] = useState<EventsByPersonnel>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isFetchingEvents, setIsFetchingEvents] = useState(true);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    // Set the initial date on the client side to avoid hydration mismatch
    setSelectedDate(new Date());
    setIsClient(true);
  }, []);

  const eventsQuery = useMemoFirebase(() => {
    if (!selectedDate || !db) return null;
    
    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);
    
    return query(
      collection(db, "events"),
      where("date", ">=", Timestamp.fromDate(startOfSelectedDay)),
      where("date", "<=", Timestamp.fromDate(endOfSelectedDay)),
      orderBy("date", "asc")
    );
  }, [selectedDate, db]);


  const fetchEvents = useCallback(async () => {
    if (!eventsQuery) {
      setEventsByPersonnel({});
      setIsFetchingEvents(false);
      return;
    }

    setIsFetchingEvents(true);
    try {
      const querySnapshot = await getDocs(eventsQuery);

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

    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: 'events',
        operation: 'list',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsFetchingEvents(false);
    }
  }, [eventsQuery]);


  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  const handleSendToAll = async () => {
    if (!user?.email) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para executar esta ação.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingAll(true);
    try {
      const result = await sendDailyAgendaToAll({ adminUserEmail: user.email });
      if (result.success && result.messagesSent > 0) {
        toast({
          title: "Envio em Massa Concluído!",
          description: `${result.messagesSent} pauta(s) foram enviadas com sucesso para o dia seguinte.`,
        });
      } else if (result.messagesSent === 0) {
        toast({
          title: "Nenhuma Pauta para Enviar",
          description: "Não foram encontrados eventos para o dia de amanhã ou os colaboradores envolvidos não possuem eventos.",
          variant: "default",
        });
      } else {
         toast({
          title: "Alguns Envios Falharam",
          description: `Houve erro ao enviar para: ${result.errors.join(', ')}. Verifique os logs para mais detalhes.`,
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (error: any) {
      console.error("Failed to send daily agenda to all:", error);
      toast({
        title: "Erro Crítico no Envio",
        description: error.message || "Não foi possível iniciar o fluxo de envio em massa. Verifique os logs e as permissões.",
        variant: "destructive",
      });
    } finally {
      setIsSendingAll(false);
    }
  };

  const personnelNames = useMemo(() => Object.keys(eventsByPersonnel).sort((a, b) => a.localeCompare(b)), [eventsByPersonnel]);
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
            <CardDescription>Use esta tela para visualizar a agenda de um dia específico e disparar o envio da pauta de amanhã.</CardDescription>
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
                  O envio da agenda do dia seguinte para os operadores também ocorre automaticamente todos os dias às 20h.
                </AlertDescription>
            </Alert>
          </CardContent>
           <CardFooter>
             <Button 
                className="w-full" 
                onClick={handleSendToAll} 
                disabled={isSendingAll}
              >
                {isSendingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {isSendingAll ? "Enviando Pautas..." : "Disparar Pautas de Amanhã"}
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
