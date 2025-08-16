
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Moon, Tv, Users, Youtube, MapPin } from "lucide-react";

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

  useEffect(() => {
    const eventsCollection = collection(db, "events");
    const q = query(eventsCollection, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
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
        if (event.transmission) {
            newTransmissionReport[event.transmission]++;
        }
      });
      
      setReportData(newReportData);
      setTotalEvents(eventsData.length);
      setTotalNightEvents(nightEventsCount);
      setLocationReport(newLocationReport);
      setTransmissionReport(newTransmissionReport);
    });

    return () => unsubscribe();
  }, []);

  const sortedOperators = Object.keys(reportData).sort((a, b) => reportData[b].count - reportData[a].count);
  const sortedLocations = Object.keys(locationReport).sort((a, b) => locationReport[b] - locationReport[a]);

  return (
    <div className="grid gap-6">
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

  