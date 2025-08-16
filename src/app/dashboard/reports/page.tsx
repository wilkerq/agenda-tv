

"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, Loader2, Moon, Sparkles, Tv, Users, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeReports, type ReportDataInput } from "@/ai/flows/summarize-reports-flow";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type OperatorReport = {
  count: number;
  nightCount: number;
  events: Event[];
};

type ReportData = {
  [operator: string]: OperatorReport;
};

type LocationReport = {
  [location: string]: number;
};

type TransmissionReport = {
  youtube: number;
  tv: number;
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({});
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalNightEvents, setTotalNightEvents] = useState(0);
  const [locationReport, setLocationReport] = useState<LocationReport>({});
  const [transmissionReport, setTransmissionReport] = useState<TransmissionReport>({ youtube: 0, tv: 0 });
  const [loading, setLoading] = useState(true);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const eventsCollection = collection(db, "events");
    const q = query(eventsCollection, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          location: data.location,
          transmission: data.transmission,
          date: (data.date as Timestamp).toDate(),
          color: data.color,
          operator: data.operator,
        };
      });

      const newReportData: ReportData = {};
      const newLocationReport: LocationReport = {};
      const newTransmissionReport: TransmissionReport = { youtube: 0, tv: 0 };
      let nightEventsCount = 0;

      eventsData.forEach(event => {
        // Operator Report
        if (event.operator) {
          if (!newReportData[event.operator]) {
            newReportData[event.operator] = { count: 0, nightCount: 0, events: [] };
          }
          newReportData[event.operator].count++;
          newReportData[event.operator].events.push(event);
          
          const eventHour = event.date.getHours();
          if (eventHour >= 18) {
            newReportData[event.operator].nightCount++;
          }
        }
        
        // Night Events Count
        if (event.date.getHours() >= 18) {
            nightEventsCount++;
        }

        // Location Report
        if (event.location) {
            newLocationReport[event.location] = (newLocationReport[event.location] || 0) + 1;
        }

        // Transmission Report
        if (event.transmission === 'youtube' || event.transmission === 'tv') {
            newTransmissionReport[event.transmission]++;
        }
      });
      
      setReportData(newReportData);
      setTotalEvents(eventsData.length);
      setTotalNightEvents(nightEventsCount);
      setLocationReport(newLocationReport);
      setTransmissionReport(newTransmissionReport);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching reports: ", error);
        toast({
            title: "Erro ao carregar relatórios",
            description: "Não foi possível buscar os dados dos eventos.",
            variant: "destructive"
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleGenerateSummary = async () => {
    setIsAiSummaryLoading(true);
    setAiSummary("");

    const reportToSummarize: ReportDataInput = {
        totalEvents,
        totalNightEvents,
        reportData: Object.entries(reportData).reduce((acc, [key, value]) => {
            acc[key] = { count: value.count, nightCount: value.nightCount };
            return acc;
        }, {} as Record<string, { count: number; nightCount: number;}>),
        locationReport,
        transmissionReport,
    };

    try {
        const result = await summarizeReports(reportToSummarize);
        setAiSummary(result.summary);
    } catch (error) {
        console.error("Error generating AI summary: ", error);
        toast({
            title: "Erro ao gerar resumo",
            description: "Não foi possível conectar com o serviço de IA.",
            variant: "destructive"
        });
    } finally {
        setIsAiSummaryLoading(false);
    }
  };


  const sortedOperators = Object.keys(reportData).sort((a, b) => reportData[b].count - reportData[a].count);
  const sortedLocations = Object.keys(locationReport).sort((a, b) => locationReport[b] - locationReport[a]);

  if (loading) {
      return (
        <div className="grid gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-48" />
                </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="shadow-lg">
                        <CardHeader>
                            <Skeleton className="h-5 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="h-4 w-full mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </div>
             <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-lg">
                    <CardHeader>
                         <Skeleton className="h-6 w-1/2" />
                         <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg">
                    <CardHeader>
                         <Skeleton className="h-6 w-1/2" />
                         <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      );
  }

  return (
    <div className="grid gap-6">
       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo com Inteligência Artificial
            </CardTitle>
            <CardDescription>Clique no botão para gerar uma análise dos dados desta página com o Gemini.</CardDescription>
          </CardHeader>
          <CardContent>
            {isAiSummaryLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analisando dados e gerando insights...</span>
                </div>
            )}
            {aiSummary && (
                <div className="prose prose-sm max-w-full text-foreground">
                    <p>{aiSummary}</p>
                </div>
            )}
          </CardContent>
          <CardFooter>
             <Button onClick={handleGenerateSummary} disabled={isAiSummaryLoading}>
              {isAiSummaryLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Gerar Resumo com IA
            </Button>
          </CardFooter>
        </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Eventos cadastrados no sistema.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Noturnos</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNightEvents}</div>
            <p className="text-xs text-muted-foreground">Eventos realizados a partir das 18h.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transmissões (YouTube)</CardTitle>
                <Youtube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{transmissionReport.youtube}</div>
                <p className="text-xs text-muted-foreground">Total de transmissões no YouTube.</p>
            </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transmissões (TV Aberta)</CardTitle>
                <Tv className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{transmissionReport.tv}</div>
                <p className="text-xs text-muted-foreground">Total de transmissões na TV Aberta.</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Operador</CardTitle>
            <CardDescription>Eventos totais e noturnos por operador.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Eventos Totais</TableHead>
                  <TableHead className="text-center">Eventos Noturnos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOperators.map(operator => (
                  <TableRow key={operator}>
                    <TableCell className="font-medium">{operator}</TableCell>
                    <TableCell className="text-center">{reportData[operator].count}</TableCell>
                    <TableCell className="text-center">{reportData[operator].nightCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Local</CardTitle>
            <CardDescription>Locais mais utilizados para eventos.</CardDescription>
          </Header>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedLocations.map(location => (
                        <TableRow key={location}>
                            <TableCell className="font-medium">{location}</TableCell>
                            <TableCell className="text-center">{locationReport[location]}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {sortedOperators.map(operator => (
        <Card key={operator}>
          <CardHeader>
            <CardTitle>Detalhes: {operator}</CardTitle>
            <CardDescription>Lista de todos os eventos cadastrados por {operator}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData[operator].events.map(event => (
                  <TableRow key={event.id}>
                    <TableCell>{event.name}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{format(event.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
