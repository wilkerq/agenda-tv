"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp, where, doc, getDoc } from "firebase/firestore";
import type { Event, ReportDataInput, ReportSummaryOutput, SecurityRuleContext } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Bot, Loader2, Moon, Tv, Users, Youtube, FileDown, Plane, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { summarizeReports } from "@/ai/flows/summarize-reports-flow";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { errorEmitter, FirestorePermissionError, useFirestore } from "@/firebase";

type PersonnelReport = {
    [name: string]: { count: number; events: Event[] };
};

type ReportData = {
    transmissionOperator: PersonnelReport;
    cinematographicReporter: PersonnelReport;
    reporter: PersonnelReport;
    producer: PersonnelReport;
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

interface TvConfig {
    name: string;
    address: string;
    logoUrl: string; // Can be a Data URI
}


export default function ReportsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<ReportSummaryOutput | null>(null);
  const { toast } = useToast();
  const db = useFirestore();

  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth) - 1;
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const eventsCollectionRef = collection(db, "events");
    const q = query(
        eventsCollectionRef, 
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
          transmissionOperator: data.transmissionOperator,
          cinematographicReporter: data.cinematographicReporter,
          reporter: data.reporter,
          producer: data.producer,
          departure: data.departure ? (data.departure as Timestamp).toDate() : undefined,
          arrival: data.arrival ? (data.arrival as Timestamp).toDate() : undefined,
        } as Event;
      });
      
      setAllEvents(eventsData);
      setLoading(false);
      setSummary(null); // Reset summary when filters change
    }, (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'events',
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedYear, selectedMonth, db]);
  
  const reportData = useMemo(() => {
    const data: ReportData = {
        transmissionOperator: {},
        cinematographicReporter: {},
        reporter: {},
        producer: {}
    };

    allEvents.forEach(event => {
        const roles: (keyof ReportData)[] = ['transmissionOperator', 'cinematographicReporter', 'reporter', 'producer'];
        roles.forEach(role => {
            const personName = event[role];
            if (personName) {
                if (!data[role][personName]) {
                    data[role][personName] = { count: 0, events: [] };
                }
                data[role][personName].count++;
                data[role][personName].events.push(event);
            }
        });
    });

    return data;
  }, [allEvents]);

  const travelEvents = useMemo(() => allEvents.filter(e => e.transmission.includes('viagem')), [allEvents]);
  
  const totalNightEvents = useMemo(() => allEvents.filter(e => e.date.getHours() >= 18).length, [allEvents]);
  
  const totalPersonnel = useMemo(() => {
    const personnel = new Set<string>();
    Object.values(reportData).forEach(roleReport => {
      Object.keys(roleReport).forEach(name => personnel.add(name));
    });
    return personnel.size;
  }, [reportData]);

  const handleGenerateSummary = async () => {
    setIsSummaryLoading(true);
    setSummary(null);
    
    const locationReport = allEvents.reduce((acc, event) => {
        if(event.location) acc[event.location] = (acc[event.location] || 0) + 1;
        return acc;
    }, {} as LocationReport);

    const transmissionReport = allEvents.reduce((acc, event) => {
        if(event.transmission.includes('youtube')) acc.youtube++;
        if(event.transmission.includes('tv')) acc.tv++;
        return acc;
    }, { youtube: 0, tv: 0 } as TransmissionReport);

    const reportToSummarize: ReportDataInput = {
        totalEvents: allEvents.length,
        totalNightEvents,
        reportData: Object.keys(reportData.transmissionOperator).map(op => ({ nome: op, eventos: reportData.transmissionOperator[op].count })),
        locationReport: Object.entries(locationReport).map(([loc, count]) => ({ nome: loc, eventos: count })),
        transmissionReport: [
            { nome: 'YouTube', eventos: transmissionReport.youtube },
            { nome: 'TV Aberta', eventos: transmissionReport.tv },
        ]
    };

    try {
        const result = await summarizeReports(reportToSummarize);
        setSummary(result);
    } catch (error) {
        console.error("Error generating summary: ", error);
        toast({
            title: "Erro ao gerar resumo",
            description: "Ocorreu um erro ao processar os dados do relatório.",
            variant: "destructive"
        });
    } finally {
        setIsSummaryLoading(false);
    }
  };
  
const handleExportPDF = async () => {
    if (!db) {
        toast({ title: "Erro", description: "O serviço de banco de dados não está disponível.", variant: "destructive" });
        return;
    }

    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || "";

    // 1. Fetch TV Config from Firestore
    let tvConfig: TvConfig | null = null;
    try {
        const configRef = doc(db, "config", "tv");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            tvConfig = configSnap.data() as TvConfig;
        } else {
             toast({ title: "Aviso", description: "Configurações da TV não encontradas. O cabeçalho do PDF pode ficar incompleto."});
        }
    } catch (error) {
         console.error("Erro ao buscar configurações da TV:", error);
         toast({ title: "Erro de Configuração", description: "Não foi possível carregar as configurações da TV para o PDF.", variant: "destructive"});
    }

    const addHeader = (data: any) => {
        if (tvConfig?.logoUrl && tvConfig.logoUrl.startsWith("data:image")) {
             try {
                doc.addImage(tvConfig.logoUrl, 'PNG', margin, 5, 20, 20);
             } catch(e) {
                 console.error("Could not add logo to PDF:", e);
             }
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(tvConfig?.name || "Relatório de Eventos", margin + 25, 12);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(tvConfig?.address || "", margin + 25, 18);
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Relatório de Eventos - ${monthLabel}/${selectedYear}`, pageWidth / 2, 30, { align: 'center' });
    };

    const addFooter = (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
    };

    const generateLogicalSummary = (): string => {
        const totalEvents = allEvents.length;
        if (totalEvents === 0) {
            return "Nenhum evento registrado no período selecionado.";
        }
        const allPersonnelProductivity: { name: string, count: number }[] = [];
        Object.values(reportData).forEach(roleReport => {
            Object.entries(roleReport).forEach(([name, data]) => {
                const existing = allPersonnelProductivity.find(p => p.name === name);
                if (existing) {
                    existing.count += data.count;
                } else {
                    allPersonnelProductivity.push({ name, count: data.count });
                }
            });
        });

        const topPerformer = allPersonnelProductivity.sort((a,b) => b.count - a.count)[0];
        
        const locationReport = allEvents.reduce((acc, event) => {
            if(event.location) acc[event.location] = (acc[event.location] || 0) + 1;
            return acc;
        }, {} as LocationReport);

        const topLocation = Object.entries(locationReport).sort(([,a], [,b]) => b - a)[0];
        
        const nightPercentage = ((totalNightEvents / totalEvents) * 100).toFixed(1);

        const summaryParts = [
            `No período de ${monthLabel}/${selectedYear}, foram realizados ${totalEvents} eventos.`,
            `${totalNightEvents} (${nightPercentage}%) ocorreram no período noturno.`,
        ];

        if (topPerformer) {
            summaryParts.push(`O profissional mais produtivo foi ${topPerformer.name} com ${topPerformer.count} participações.`);
        }
        if (topLocation) {
            summaryParts.push(`O local mais utilizado foi ${topLocation[0]} com ${topLocation[1]} eventos.`);
        }
        return summaryParts.join(' ');
    };

    autoTable(doc, {
        didDrawPage: addHeader,
        margin: { top: 40 },
    });
    
    let finalY = (doc as any).lastAutoTable.finalY || 40;

    doc.setFontSize(12);
    doc.text(`Total de Eventos: ${allEvents.length}`, margin, finalY);
    finalY += 7;
    doc.text(`Eventos Noturnos: ${totalNightEvents}`, margin, finalY);
    finalY += 7;
    doc.text(`Viagens: ${travelEvents.length}`, margin, finalY);
    finalY += 10;

    const addPersonnelTable = (title: string, data: PersonnelReport) => {
        const sorted = Object.entries(data).sort(([, a], [, b]) => b.count - a.count);
        if (sorted.length > 0) {
            autoTable(doc, {
                startY: finalY,
                head: [[title, 'Eventos']],
                body: sorted.map(([name, { count }]) => [name, count]),
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                didDrawPage: addHeader,
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }
    };
    
    addPersonnelTable("Produtividade: Op. de Transmissão", reportData.transmissionOperator);
    addPersonnelTable("Produtividade: Rep. Cinematográficos", reportData.cinematographicReporter);
    addPersonnelTable("Produtividade: Repórteres", reportData.reporter);
    addPersonnelTable("Produtividade: Produtores", reportData.producer);

    // Adicionar Resumo Lógico ao final
    const logicalSummary = generateLogicalSummary();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Analítico', margin, finalY);
    finalY += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitSummary = doc.splitTextToSize(logicalSummary, pageWidth - margin * 2);
    doc.text(splitSummary, margin, finalY);
    finalY += (splitSummary.length * 5) + 10;

    // Adicionar rodapé em todas as páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter({ pageNumber: i, pageCount });
    }

    doc.save(`relatorio_${selectedMonth}_${selectedYear}.pdf`);
};

  
  const reportTitle = useMemo(() => {
    const monthLabel = months.find(m => m.value === selectedMonth)?.label;
    return `${monthLabel} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const PersonnelReportTable = ({ data, title }: { data: PersonnelReport; title: string }) => {
    const sortedData = useMemo(() => Object.entries(data).sort(([,a], [,b]) => b.count - a.count), [data]);
    if (sortedData.length === 0) return <p className="text-muted-foreground text-sm">Nenhum dado para este período.</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="text-center">Total de Eventos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.map(([name, { count }]) => (
                            <TableRow key={name}>
                                <TableCell className="font-medium">{name}</TableCell>
                                <TableCell className="text-center">{count}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
  };

  return (
    <div id="report-content">
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Filtros do Relatório</CardTitle>
                <CardDescription>Selecione o período para gerar os relatórios.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger><SelectValue placeholder="Selecione o Mês" /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger><SelectValue placeholder="Selecione o Ano" /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </CardContent>
             <CardFooter className="gap-2">
                <Button onClick={handleGenerateSummary} disabled={isSummaryLoading || loading || allEvents.length === 0}>
                    {isSummaryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Gerar Resumo com IA
                </Button>
                <Button onClick={handleExportPDF} disabled={loading || allEvents.length === 0} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Salvar como PDF
                </Button>
            </CardFooter>
        </Card>
        
        {loading ? (
          <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Carregando dados...</p></div>
        ) : (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Eventos</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{allEvents.length}</div><p className="text-xs text-muted-foreground">no período</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Eventos Noturnos</CardTitle><Moon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalNightEvents}</div><p className="text-xs text-muted-foreground">a partir das 18h</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Viagens</CardTitle><Plane className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{travelEvents.length}</div><p className="text-xs text-muted-foreground">eventos marcados</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Equipe Envolvida</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalPersonnel}</div><p className="text-xs text-muted-foreground">profissionais participaram</p></CardContent></Card>
            </div>

            {isSummaryLoading && (<div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Analisando dados...</span></div>)}
            {summary?.resumoNarrativo && (<Card><CardHeader><CardTitle>Resumo Analítico</CardTitle></CardHeader><CardContent><p>{summary.resumoNarrativo}</p></CardContent></Card>)}
            
            <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="productivity">Produtividade</TabsTrigger>
                    <TabsTrigger value="travels">Viagens</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Todos os Eventos ({allEvents.length})</CardTitle><CardDescription>Lista de todos os eventos registrados para {reportTitle}.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Evento</TableHead><TableHead>Local</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {allEvents.length > 0 ? allEvents.map(event => (
                                        <TableRow key={event.id}><TableCell>{format(event.date, "dd/MM/yy HH:mm")}</TableCell><TableCell>{event.name}</TableCell><TableCell>{event.location}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center h-24">Nenhum evento encontrado.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="productivity" className="space-y-4">
                     <div className="grid gap-6 md:grid-cols-2">
                        <PersonnelReportTable data={reportData.transmissionOperator} title="Op. de Transmissão" />
                        <PersonnelReportTable data={reportData.cinematographicReporter} title="Rep. Cinematográficos" />
                        <PersonnelReportTable data={reportData.reporter} title="Repórteres" />
                        <PersonnelReportTable data={reportData.producer} title="Produtores" />
                    </div>
                </TabsContent>
                <TabsContent value="travels">
                    <Card>
                        <CardHeader><CardTitle>Eventos de Viagem ({travelEvents.length})</CardTitle><CardDescription>Lista de todos as viagens registradas para {reportTitle}.</CardDescription></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Saída</TableHead><TableHead>Chegada</TableHead><TableHead>Equipe</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {travelEvents.length > 0 ? travelEvents.map(event => (
                                        <TableRow key={event.id}>
                                            <TableCell>{event.name} ({event.location})</TableCell>
                                            <TableCell>{event.departure ? format(event.departure, "dd/MM HH:mm") : 'N/A'}</TableCell>
                                            <TableCell>{event.arrival ? format(event.arrival, "dd/MM HH:mm") : 'N/A'}</TableCell>
                                            <TableCell className="text-xs">
                                                {[event.transmissionOperator, event.cinematographicReporter, event.reporter, event.producer].filter(Boolean).join(', ')}
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhuma viagem encontrada.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
        )}
      </div>
    </div>
  );
}
