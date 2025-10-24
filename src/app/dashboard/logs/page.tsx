
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, FilePen, Trash2, FilePlus, User, Send } from "lucide-react";
import { JsonViewer } from '@textea/json-viewer';
import { useTheme } from 'next-themes';
import { errorEmitter } from "@/lib/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/errors";

type AuditLogAction = 'create' | 'update' | 'delete' | 'automatic-send';

interface AuditLog {
    id: string;
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    timestamp: Date;
    before?: object;
    after?: object;
    details?: {
        messagesSent: number;
        errors: string[];
        targetDate: string;
    };
}

const actionDetails: Record<AuditLogAction, { text: string; icon: React.FC<any>; className: string }> = {
    create: { text: "Criação", icon: FilePlus, className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" },
    update: { text: "Atualização", icon: FilePen, className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" },
    delete: { text: "Exclusão", icon: Trash2, className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700" },
    'automatic-send': { text: "Envio Automático", icon: Send, className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700" },
};

export default function LogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        const logsCollection = collection(db, "audit_logs");
        const q = query(logsCollection, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: (data.timestamp as Timestamp).toDate(),
                } as AuditLog;
            });
            setLogs(logsData);
            setLoading(false);
        }, (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: q.path,
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderJsonViewer = (data: object) => (
        <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800 my-2 text-sm text-foreground">
           <JsonViewer 
                value={data} 
                theme={theme === 'dark' ? "dark" : "light"}
                style={{ backgroundColor: 'transparent' }}
                displayDataTypes={false}
           />
        </div>
    );
    
    const renderLogTitle = (log: AuditLog) => {
        if (log.action === 'automatic-send') {
            return "Envio Automático de Agendas";
        }
        return `Evento: ${ (log.after as any)?.name || (log.before as any)?.name || log.documentId }`
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
                <CardDescription>
                    Uma trilha de todas as criações, atualizações, exclusões e automações executadas no sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-10">
                        <History className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 font-medium">Nenhum log encontrado</p>
                        <p className="text-sm text-muted-foreground">As alterações no sistema aparecerão aqui.</p>
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {logs.map(log => {
                            const details = actionDetails[log.action];
                            if (!details) return null; // Skip unknown log types
                            const Icon = details.icon;
                            return (
                                <AccordionItem value={log.id} key={log.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-4 w-full text-left">
                                             <Badge className={details.className}>
                                                <Icon className="mr-2 h-4 w-4" />
                                                {details.text}
                                            </Badge>
                                            <div className="flex-1">
                                                <p className="font-semibold text-foreground">
                                                    {renderLogTitle(log)}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                   <User className="h-3 w-3" /> <span>{log.userEmail}</span>
                                                </div>
                                            </div>
                                            <span className="text-sm text-muted-foreground pr-4">
                                                {format(log.timestamp, "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <Card className="bg-muted/50 dark:bg-slate-800/50 p-4">
                                            {log.action === 'automatic-send' && log.details ? (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Detalhes da Execução</h4>
                                                    <p className="text-sm"><strong>Data da Agenda Enviada:</strong> {format(new Date(log.details.targetDate), 'dd/MM/yyyy')}</p>
                                                    <p className="text-sm"><strong>Mensagens Enviadas com Sucesso:</strong> {log.details.messagesSent}</p>
                                                    {log.details.errors.length > 0 ? (
                                                        <div className="mt-2">
                                                            <h5 className="text-sm font-medium text-red-600 dark:text-red-400">Falhas</h5>
                                                            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                                                                {log.details.errors.map((err, i) => <li key={i}>{err}</li>)}
                                                            </ul>
                                                        </div>
                                                    ) : (
                                                       <p className="text-sm text-green-600 dark:text-green-400 mt-1">Todos os envios foram bem-sucedidos.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <h4 className="font-semibold mb-2">Detalhes da Alteração</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {log.before && (
                                                            <div>
                                                                <h5 className="text-sm font-medium text-red-600 dark:text-red-400">Antes</h5>
                                                                {renderJsonViewer(log.before)}
                                                            </div>
                                                        )}
                                                        {log.after && (
                                                            <div>
                                                                <h5 className="text-sm font-medium text-green-600 dark:text-green-400">Depois</h5>
                                                                {renderJsonViewer(log.after)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!log.before && !log.after && (
                                                        <p className="text-sm text-muted-foreground">Não há dados detalhados para esta ação.</p>
                                                    )}
                                                </>
                                            )}
                                        </Card>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}
