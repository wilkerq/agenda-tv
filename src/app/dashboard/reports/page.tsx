
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReportData = {
  [operator: string]: {
    count: number;
    events: Event[];
  };
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>({});
  const [totalEvents, setTotalEvents] = useState(0);

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
      eventsData.forEach(event => {
        if (!event.operator) return; 

        if (!newReportData[event.operator]) {
          newReportData[event.operator] = { count: 0, events: [] };
        }
        newReportData[event.operator].count++;
        newReportData[event.operator].events.push(event);
      });
      
      setReportData(newReportData);
      setTotalEvents(eventsData.length);
    });

    return () => unsubscribe();
  }, []);

  const sortedOperators = Object.keys(reportData).sort((a, b) => reportData[b].count - reportData[a].count);

  return (
    <div className="grid gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Resumo Geral</CardTitle>
          <CardDescription>Total de eventos cadastrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{totalEvents}</div>
          <p className="text-xs text-muted-foreground">Eventos totais</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Eventos por Operador</CardTitle>
          <CardDescription>Detalhes dos eventos agrupados por cada operador.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead className="text-center">Eventos Cadastrados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOperators.map(operator => (
                <TableRow key={operator}>
                  <TableCell className="font-medium">{operator}</TableCell>
                  <TableCell className="text-center">{reportData[operator].count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sortedOperators.map(operator => (
        <Card key={operator}>
          <CardHeader>
            <CardTitle>Detalhes: {operator}</CardTitle>
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
