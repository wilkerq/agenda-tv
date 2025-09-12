
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event, EventStatus, EventTurn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addDays, startOfDay, endOfDay, format, isSameDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Share2, Bot } from "lucide-react";
import { generateWhatsAppMessage } from "@/ai/flows/generate-whatsapp-message-flow";

const operators = [
  "Mário Augusto",
  "Rodrigo Sousa",
  "Ovidio Dias",
  "Wilker Quirino",
  "Bruno Michel",
];

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
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("");
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    if (!selectedOperator || !selectedDate) {
      setEvents([]);
      return;
    }

    setIsFetchingEvents(true);
    try {
      const q = query(
        collection(db, "events"),
        where("operator", "==", selectedOperator),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const allEventsForOperator = querySnapshot.docs.map(doc => {
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

      const eventsForDate = allEventsForOperator.filter(event => 
        isSameDay(event.date, selectedDate)
      );

      setEvents(eventsForDate);

    } catch (error) {
      console.error("Error fetching events: ", error);
      toast({
        title: "Erro ao buscar eventos",
        description: "Não foi possível carregar a agenda. Verifique o console para mais detalhes.",
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
    if (events.length === 0) {
        const dateStr = selectedDate ? format(selectedDate, "dd/MM/yyyy") : '';
        setMessage(`Nenhum evento encontrado para ${selectedOperator} em ${dateStr}.`);
        return;
    }
    
    setIsGeneratingMessage(true);
    try {
        const eventStrings = events.map(e => `- ${format(e.date, "HH:mm")}h: ${e.name} (${e.location})`);
        const result = await generateWhatsAppMessage({
            operatorName: selectedOperator,
            scheduleDate: format(selectedDate!, "PPPP", { locale: ptBR }),
            events: eventStrings,
        });
        setMessage(result.message);
         toast({
            title: "Mensagem Gerada!",
            description: "A mensagem para o WhatsApp foi criada com sucesso.",
        });
    } catch (error) {
         console.error("Error generating message: ", error);
         toast({
            title: "Erro de IA",
            description: "Não foi possível gerar a mensagem.",
            variant: "destructive",
        });
    } finally {
        setIsGeneratingMessage(false);
    }
  }, [events, selectedOperator, selectedDate, toast]);

  const handleShare = () => {
    if (!message) {
      toast({
        title: "Mensagem vazia",
        description: "Gere uma mensagem antes de compartilhar.",
        variant: "destructive",
      });
      return;
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const hasEvents = events.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o operador e a data para gerar a agenda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="operator">Operador</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger id="operator">
                    <SelectValue placeholder="Selecione um operador" />
                </SelectTrigger>
                <SelectContent>
                    {operators.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
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
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                />
            </div>
          </CardContent>
           <CardFooter>
             <Button onClick={handleGenerateMessage} disabled={isGeneratingMessage || isFetchingEvents || !selectedOperator || !selectedDate}>
                {isGeneratingMessage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Gerar Mensagem com IA
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
                : hasEvents 
                  ? `Agenda de ${selectedOperator} para ${selectedDate ? format(selectedDate, "dd/MM/yyyy") : ''}.`
                  : `Nenhum evento encontrado para ${selectedOperator} na data selecionada.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Mensagem para WhatsApp</Label>
                <Textarea
                    id="whatsapp-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={10}
                    placeholder={isGeneratingMessage ? "Gerando mensagem..." : "Clique em 'Gerar Mensagem' ou escreva sua mensagem aqui."}
                    readOnly={isGeneratingMessage}
                />
            </div>
          </CardContent>
          <CardFooter>
             <Button onClick={handleShare} disabled={!message || isGeneratingMessage}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar no WhatsApp
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
