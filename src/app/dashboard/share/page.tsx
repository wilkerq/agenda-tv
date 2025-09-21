"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event, EventStatus, EventTurn, Operator } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addDays, startOfDay, endOfDay, format, isSameDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Share2, Bot, Send } from "lucide-react";
import { generateWhatsAppMessage } from "@/ai/flows/generate-whatsapp-message-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAIConfig } from "@/lib/ai-config";

const getEventTurn = (date: Date): EventTurn => {
  const hour = getHours(date);
  if (hour >= 6 && hour < 12) return 'Manhã';
  if (hour >= 12 && hour < 18) return 'Tarde';
  return 'Noite';
};

const getEventStatus = (date: Date): EventStatus => {
  return date < new Date() ? 'Concluído' : 'Agendado';
}

export default function ShareSchedulePage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("");
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const { toast } = useToast();
  const [aiConfig] = useAIConfig();

  useEffect(() => {
    const q = query(collection(db, "operators"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedOperators: Operator[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOperators.push({ id: doc.id, ...doc.data() } as Operator);
      });
      setOperators(fetchedOperators.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    // Set the initial date on the client side to avoid hydration mismatch
    setSelectedDate(new Date());
  }, []);

  const selectedOperator = useMemo(() => {
    return operators.find(op => op.id === selectedOperatorId);
  }, [operators, selectedOperatorId]);

  const fetchEvents = useCallback(async () => {
    if (!selectedOperator || !selectedDate) {
      setEvents([]);
      return;
    }

    setIsFetchingEvents(true);
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      const q = query(
        collection(db, "events"),
        where("operator", "==", selectedOperator.name),
        where("date", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("date", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const eventsForDate = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const eventDate = (data.date as Timestamp).toDate();
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          date: eventDate,
          transmission: data.transmission,
          color: data.color,
          operator: data.operator,
          status: getEventStatus(eventDate),
          turn: getEventTurn(eventDate),
        } as Event;
      });

      setEvents(eventsForDate);

    } catch (error) {
      console.error("Error fetching events: ", error);
      toast({
        title: "Erro ao buscar eventos",
        description: "Não foi possível carregar a agenda. Verifique se o índice do Firestore foi criado.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingEvents(false);
    }
  }, [selectedOperator, selectedDate, toast]);


  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  const handleGenerateMessage = useCallback(async () => {
    if (!selectedOperator || !selectedDate) return;

    if (events.length === 0) {
        const dateStr = format(selectedDate, "dd/MM/yyyy");
        setMessage(`Nenhum evento encontrado para ${selectedOperator.name} em ${dateStr}.`);
        return;
    }
    
    setIsGeneratingMessage(true);
    try {
        const eventStrings = events.map(e => `- ${format(e.date, "HH:mm")}h: ${e.name} (${e.location})`);
        const result = await generateWhatsAppMessage({
            operatorName: selectedOperator.name,
            scheduleDate: format(selectedDate, "PPPP", { locale: ptBR }),
            events: eventStrings,
            operatorPhone: selectedOperator.phone.replace('+', ''),
            config: aiConfig,
        });
        setMessage(result.message);
        if (result.sent) {
            toast({
                title: "Mensagem Enviada!",
                description: `A agenda foi enviada para ${selectedOperator.name} via n8n.`,
                className: "bg-green-100 border-green-300 text-green-800"
            });
        } else {
            toast({
                title: "Mensagem Gerada!",
                description: "A mensagem foi criada, mas o envio automático falhou (verifique a URL do n8n).",
                variant: "default"
            });
        }

    } catch (error) {
         console.error("Error generating message: ", error);
         toast({
            title: "Erro de IA",
            description: "Não foi possível gerar ou enviar a mensagem. Verifique a chave de API.",
            variant: "destructive",
        });
    } finally {
        setIsGeneratingMessage(false);
    }
  }, [events, selectedOperator, selectedDate, toast, aiConfig]);

  const handleShareManually = () => {
    if (!message) {
      toast({
        title: "Mensagem vazia",
        description: "Gere uma mensagem antes de compartilhar.",
        variant: "destructive",
      });
      return;
    }

    const phone = selectedOperator?.phone?.replace(/\D/g, '') || '';
    const text = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
    
    window.open(url, "_blank");
  };

  const hasEvents = events.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o operador e a data para gerar e enviar a agenda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="operator">Operador</Label>
                <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                <SelectTrigger id="operator">
                    <SelectValue placeholder="Selecione um operador" />
                </SelectTrigger>
                <SelectContent>
                    {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>Data</Label>
                 <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-0 border rounded-md"
                    locale={ptBR}
                    disabled={(date) => date < startOfDay(new Date())}
                />
            </div>
          </CardContent>
           <CardFooter>
             <Button onClick={handleGenerateMessage} disabled={isGeneratingMessage || isFetchingEvents || !selectedOperatorId || !selectedDate || !hasEvents}>
                {isGeneratingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isGeneratingMessage ? "Enviando..." : "Gerar e Enviar Agenda"}
            </Button>
           </CardFooter>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Agenda do Operador</CardTitle>
            <CardDescription>
              {isFetchingEvents 
                ? "Buscando eventos..." 
                : hasEvents && selectedOperator
                  ? `Agenda de ${selectedOperator.name} para ${selectedDate ? format(selectedDate, "dd/MM/yyyy") : ''}.`
                  : `Nenhum evento encontrado para ${selectedOperator?.name || 'o operador'} na data selecionada.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert>
                <Bot className="h-4 w-4" />
                <AlertTitle>Envio Automático</AlertTitle>
                <AlertDescription>
                  Ao clicar em "Gerar e Enviar", a mensagem abaixo será enviada automaticamente para o WhatsApp do operador via n8n. Se precisar, você pode editá-la antes de enviar ou usar o botão de compartilhamento manual.
                </AlertDescription>
            </Alert>
            <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Mensagem para WhatsApp</Label>
                <Textarea
                    id="whatsapp-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={10}
                    placeholder={isGeneratingMessage ? "Gerando mensagem..." : "A mensagem para o operador aparecerá aqui."}
                    readOnly={isGeneratingMessage}
                />
            </div>
          </CardContent>
          <CardFooter>
             <Button onClick={handleShareManually} disabled={!message || isGeneratingMessage} variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar Manualmente
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
