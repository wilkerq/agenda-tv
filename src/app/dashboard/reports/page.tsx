
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event, ReportDataInput } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, Loader2, Moon, Sparkles, Tv, Users, Youtube, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeReports } from "@/ai/flows/summarize-reports-flow";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import 'jspdf-autotable';

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

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: format(new Date(currentYear, i), "MMMM", { locale: ptBR }),
}));


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

  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    setLoading(true);

    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const eventsCollection = collection(db, "events");
    const q = query(
        eventsCollection, 
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate)),
        orderBy("date", "desc")
    );

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
        } as Event;
      });

      const newReportData: ReportData = {};
      const newLocationReport: LocationReport = {};
      const newTransmissionReport: TransmissionReport = { youtube: 0, tv: 0 };
      let nightEventsCount = 0;

      eventsData.forEach(event => {
        if (event.operator) {
          if (!newReportData[event.operator]) {
            newReportData[event.operator] = { count: 0, nightCount: 0, events: [] };
          }
          newReportData[event.operator].count++;
          newReportData[event.operator].events.push(event);
          
          if (event.date.getHours() >= 18) {
            newReportData[event.operator].nightCount++;
          }
        }
        
        if (event.date.getHours() >= 18) {
            nightEventsCount++;
        }

        if (event.location) {
            newLocationReport[event.location] = (newLocationReport[event.location] || 0) + 1;
        }

        if (event.transmission === 'youtube') {
            newTransmissionReport.youtube++;
        } else if (event.transmission === 'tv') {
            newTransmissionReport.tv++;
            newTransmissionReport.youtube++; // Eventos de TV também são transmitidos no YouTube
        }
      });
      
      setReportData(newReportData);
      setTotalEvents(eventsData.length);
      setTotalNightEvents(nightEventsCount);
      setLocationReport(newLocationReport);
      setTransmissionReport(newTransmissionReport);
      setLoading(false);
      setAiSummary(""); // Reset AI summary when filters change
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
  }, [selectedYear, selectedMonth, toast]);

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
  
  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();
    const margin = 10;
    let y = margin;
    
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || "";

    doc.setFontSize(18);
    doc.text(`Relatório de Eventos - ${monthLabel}/${selectedYear}`, margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Total de Eventos: ${totalEvents}`, margin, y);
    doc.text(`Eventos Noturnos: ${totalNightEvents}`, margin + 70, y);
    y += 7;
    doc.text(`Transmissões (YouTube): ${transmissionReport.youtube}`, margin, y);
    doc.text(`Transmissões (TV Aberta): ${transmissionReport.tv}`, margin + 70, y);
    y += 10;

    if (aiSummary) {
        doc.setFontSize(14);
        doc.text("Resumo da IA:", margin, y);
        y += 7;
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(aiSummary, 180);
        doc.text(splitSummary, margin, y);
        y += (splitSummary.length * 5) + 10;
    }
    
    if (sortedOperators.length > 0) {
      autoTable(doc, {
          startY: y,
          head: [['Operador', 'Eventos Totais', 'Eventos Noturnos']],
          body: sortedOperators.map(op => [op, reportData[op].count, reportData[op].nightCount]),
          theme: 'striped',
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (sortedLocations.length > 0) {
      autoTable(doc, {
          startY: y,
          head: [['Local', 'Quantidade']],
          body: sortedLocations.map(loc => [loc, locationReport[loc]]),
          theme: 'striped',
      });
    }


    doc.save(`relatorio_eventos_${selectedMonth}_${selectedYear}.pdf`);
  };


  const sortedOperators = Object.keys(reportData).sort((a, b) => reportData[b].count - reportData[a].count);
  const sortedLocations = Object.keys(locationReport).sort((a, b) => locationReport[b] - locationReport[a]);
  
  const reportTitle = useMemo(() => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;
    return `${monthLabel} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  return (
    <div className="grid gap-6" id="report-content">
       <Card>
          <CardHeader>
              <CardTitle>Filtros do Relatório</CardTitle>
              <CardDescription>Selecione o período para gerar os relatórios.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione o Mês" />
                      </SelectTrigger>
                      <SelectContent>
                          {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex-1">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                          <SelectValue placeholder="Selecione o Ano" />
                      </SelectTrigger>
                      <SelectContent>
                          {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
          </CardContent>
          <CardFooter>
             <Button onClick={handleExportPDF} disabled={loading || totalEvents === 0}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Salvar como PDF
              </Button>
          </CardFooter>
      </Card>
      
      {loading ? (
        <div className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando dados para {reportTitle}...</p>
        </div>
      ) : (
      <>
       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo com Inteligência Artificial
            </CardTitle>
            <CardDescription>Clique no botão para gerar uma análise dos dados do período selecionado.</CardDescription>
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
            {!isAiSummaryLoading && !aiSummary && totalEvents === 0 && (
                <p className="text-muted-foreground">Nenhum dado para gerar resumo neste período.</p>
            )}
          </CardContent>
          <CardFooter>
             <Button onClick={handleGenerateSummary} disabled={isAiSummaryLoading || totalEvents === 0}>
              {isAiSummaryLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bot className="mr-2 h-4 w-4" />
              )}
              Gerar Resumo com IA
            </Button>
          </CardFooter>
        </Card>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Eventos em {reportTitle}.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Noturnos</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNightEvents}</div>
            <p className="text-xs text-muted-foreground">Eventos a partir das 18h.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Relatório de Transmissão</CardTitle>
                <CardDescription>Contagem de plataformas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center">
                    <Youtube className="h-6 w-6 mx-auto text-red-600 mb-2" />
                    <p className="text-2xl font-bold">{transmissionReport.youtube}</p>
                    <p className="text-xs text-muted-foreground">YouTube</p>
                </div>
                 <div className="text-center">
                    <Tv className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{transmissionReport.tv}</p>
                    <p className="text-xs text-muted-foreground">TV Aberta</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Operador</CardTitle>
            <CardDescription>Eventos totais e noturnos por operador em {reportTitle}.</CardDescription>
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
                {sortedOperators.length > 0 ? sortedOperators.map(operator => (
                  <TableRow key={operator}>
                    <TableCell className="font-medium">{operator}</TableCell>
                    <TableCell className="text-center">{reportData[operator].count}</TableCell>
                    <TableCell className="text-center">{reportData[operator].nightCount}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum evento encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Eventos por Local</CardTitle>
            <CardDescription>Locais mais utilizados para eventos em {reportTitle}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedLocations.length > 0 ? sortedLocations.map(location => (
                        <TableRow key={location}>
                            <TableCell className="font-medium">{location}</TableCell>
                            <TableCell className="text-center">{locationReport[location]}</TableCell>
                        </TableRow>
                    )) : (
                       <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum evento encontrado.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {sortedOperators.length > 0 && sortedOperators.map(operator => (
        <Card key={operator}>
          <CardHeader>
            <CardTitle>Detalhes: {operator}</CardTitle>
            <CardDescription>Lista de eventos de {operator} em {reportTitle}.</CardDescription>
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
      </>
      )}
    </div>
  );
}
