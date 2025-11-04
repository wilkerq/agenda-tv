
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp, CollectionReference, DocumentData } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, FilePen, Trash2, FilePlus, User, Send, UserPlus as UserPlusIcon } from "lucide-react";
import { JsonViewer } from '@textea/json-viewer';
import { useTheme } from 'next-themes';
import { errorEmitter, FirestorePermissionError, type SecurityRuleContext, useFirestore, useCollection, useMemoFirebase } from "@/firebase";

type AuditLogAction = 'create' | 'update' | 'delete' | 'automatic-send' | 'create-user' | 'reallocate';

interface AuditLog {
    id: string;
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    timestamp: Date;
    before?: object;
    after?: object;
    details?: object;
}

const actionDetails: Record<AuditLogAction, { text: string; icon: React.FC<any>; className: string }> = {
    create: { text: "Criação", icon: FilePlus, className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" },
    update: { text: "Atualização", icon: FilePen, className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" },
    delete: { text: "Exclusão", icon: Trash2, className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700" },
    'automatic-send': { text: "Envio Automático", icon: Send, className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700" },
    'create-user': { text: "Criação de Usuário", icon: UserPlusIcon, className: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-700" },
    reallocate: { text: "Reagendamento", icon: FilePen, className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700" },
};

export default function LogsPage() {
    const { theme } = useTheme();
    const db = useFirestore();

    const logsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    }, [db]);

    const { data: logs, isLoading: loading, error: fetchError } = useCollection<AuditLog>(logsQuery);

    useEffect(() => {
        if(fetchError){
            const permissionError = new FirestorePermissionError({
                path: 'audit_logs',
                operation: 'list',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    }, [fetchError]);

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
        if (log.action === 'create-user') {
            return `Criação do Usuário: ${(log.after as any)?.createdUserEmail || log.documentId}`;
        }
        const title = (log.after as any)?.name || (log.before as any)?.name;
        if (title) {
            return `${log.collectionName}: ${title}`;
        }
        return `Doc. ID: ${log.documentId}`;
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
                ) : !logs || logs.length === 0 ? (
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
                                                {format((log.timestamp as unknown as Timestamp).toDate(), "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <Card className="bg-muted/50 dark:bg-slate-800/50 p-4">
                                            <p className="text-xs text-muted-foreground mb-2">ID do Documento: <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded-sm">{log.documentId}</code></p>
                                            
                                            {log.details ? (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Detalhes da Ação</h4>
                                                    {renderJsonViewer(log.details)}
                                                </div>
                                            ) : (
                                                <>
                                                    <h4 className="font-semibold mb-2">Dados da Alteração</h4>
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
                                                    {!log.before && !log.after && !log.details && (
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

    