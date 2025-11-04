
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Share2, Bot, CalendarSearch, Users } from "lucide-react";
import { generateDailyAgenda } from "@/ai/flows/generate-daily-agenda-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { errorEmitter, FirestorePermissionError, type SecurityRuleContext, useFirestore, useCollection, useMemoFirebase } from "@/firebase";

export default function DailyAgendaPage() {
  // Initialize state to undefined on the server, and set it on the client.
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  // Set the initial date only on the client-side to prevent hydration errors.
  useEffect(() => {
    setSelectedDate(new Date());
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

  const { data: events, isLoading: isFetchingEvents, error: fetchError } = useCollection<Event>(eventsQuery);

  useEffect(() => {
      if(fetchError){
           const permissionError = new FirestorePermissionError({
            path: (eventsQuery?.path as any) || 'events',
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      }
  }, [fetchError, eventsQuery]);

  const handleGenerateCompleteMessage = useCallback(async () => {
    if (!selectedDate || !events || events.length === 0) {
        const dateStr = selectedDate ? format(selectedDate, "dd/MM/yyyy") : '';
        setMessage(`Nenhum evento encontrado para a data ${dateStr}.`);
        return;
    }
    
    setIsGeneratingMessage(true);
    try {
        const eventStrings = events.map(e => {
            const operator = e.transmissionOperator ? `Op: ${e.transmissionOperator}` : '';
            const cineReporter = e.cinematographicReporter ? `Rep. Cine: ${e.cinematographicReporter}` : '';
            const reporter = e.reporter ? `Repórter: ${e.reporter}` : '';
            const producer = e.producer ? `Prod: ${e.producer}` : '';
            
            const staff = [operator, cineReporter, reporter, producer].filter(Boolean).join(' / ');
            return `- ${staff} - ${e.name} (${e.location})`;
        });
        
        const result = await generateDailyAgenda({
            scheduleDate: selectedDate.toISOString(),
            events: eventStrings,
        });
        setMessage(result.message);
         toast({
            title: "Pauta Gerada!",
            description: "A pauta completa do dia foi criada. Verifique e compartilhe.",
        });
    } catch (error) {
         console.error("Error generating message: ", error);
         toast({
            title: "Erro de IA",
            description: "Não foi possível gerar a pauta. Verifique as configurações e tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsGeneratingMessage(false);
    }
  }, [events, selectedDate, toast]);

  const handleGenerateOperatorsMessage = useCallback(async () => {
    if (!selectedDate || !events || events.length === 0) {
        const dateStr = selectedDate ? format(selectedDate, "dd/MM/yyyy") : '';
        setMessage(`Nenhum evento encontrado para a data ${dateStr}.`);
        return;
    }
    
    setIsGeneratingMessage(true);
    try {
        const eventStrings = events
            .filter(e => e.transmissionOperator) // Apenas eventos com operador
            .map(e => {
                const operator = `Op: ${e.transmissionOperator}`;
                return `- ${operator} - ${e.name} (${e.location})`;
            });
        
        const result = await generateDailyAgenda({
            scheduleDate: selectedDate.toISOString(),
            events: eventStrings,
        });
        setMessage(result.message);
         toast({
            title: "Pauta Gerada!",
            description: "A pauta dos operadores foi criada com sucesso.",
        });
    } catch (error) {
         console.error("Error generating message: ", error);
         toast({
            title: "Erro de IA",
            description: "Não foi possível gerar a pauta. Verifique as configurações.",
            variant: "destructive",
        });
    } finally {
        setIsGeneratingMessage(false);
    }
  }, [events, selectedDate, toast]);


  const handleShare = () => {
    if (!message) {
      toast({
        title: "Mensagem vazia",
        description: "Gere a pauta antes de compartilhar.",
        variant: "destructive",
      });
      return;
    }
    // Remove os asteriscos de formatação de negrito para o encodeURI
    const plainMessage = message.replace(/\*/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send/?text=${encodeURIComponent(plainMessage)}`;
    window.open(whatsappUrl, "_blank");
  };
  
  const formattedDate = selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : '...';

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Data</CardTitle>
            <CardDescription>Escolha a data para gerar a pauta do dia.</CardDescription>
          </CardHeader>
          <CardContent>
             <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="p-0 border rounded-md"
                locale={ptBR}
                disabled={!selectedDate} // Disable calendar until date is set on client
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Eventos de {formattedDate}</CardTitle>
            <CardDescription>
              {isFetchingEvents 
                ? "Buscando eventos..." 
                : `${events?.length || 0} evento(s) encontrado(s).`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {isFetchingEvents ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : events && events.length > 0 ? (
                <ul className="space-y-3">
                    {events.map(event => (
                        <li key={event.id} className="flex items-center gap-4 rounded-md border p-3">
                             <div className="font-mono text-sm bg-muted text-muted-foreground p-2 rounded-md">
                                {format((event.date as unknown as Timestamp).toDate(), "HH:mm")}
                            </div>
                            <div>
                                <p className="font-semibold">{event.name}</p>
                                <p className="text-sm text-muted-foreground">{event.location}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10 px-4 bg-muted/50 rounded-lg">
                    <CalendarSearch className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="font-medium text-foreground">Nenhum evento agendado.</p>
                    <p className="text-sm text-muted-foreground">Selecione outra data ou adicione eventos no dashboard.</p>
                </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Pauta do Dia</CardTitle>
                <CardDescription>Gere, revise e compartilhe a pauta diária no WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={handleGenerateCompleteMessage} disabled={isGeneratingMessage || isFetchingEvents || !events || events.length === 0} className="w-full sm:w-auto">
                            {isGeneratingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            Gerar Pauta (Completa)
                        </Button>
                        <Button onClick={handleGenerateOperatorsMessage} disabled={isGeneratingMessage || isFetchingEvents || !events || events.length === 0} variant="outline" className="w-full sm:w-auto">
                            {isGeneratingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                            Gerar Pauta (Operadores)
                        </Button>
                    </div>
                    <Textarea
                        id="whatsapp-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={12}
                        placeholder={isGeneratingMessage ? "Gerando pauta com base nos eventos do dia..." : "A pauta do dia aparecerá aqui após ser gerada."}
                        readOnly={isGeneratingMessage}
                        className="mt-4"
                    />
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleShare} disabled={!message || isGeneratingMessage}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar Pauta no WhatsApp
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    