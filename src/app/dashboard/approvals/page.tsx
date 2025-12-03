
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Event, SecurityRuleContext } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, AlertTriangle, Inbox, Edit, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logAction } from '@/lib/audit-log';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EditEventForm } from '@/components/edit-event-form';
import { updateEventAction } from '@/lib/events-actions';

function EventApprovalCard({ event, onApprove, onAction, isProcessing }: { event: Event, onApprove: (id: string) => void, onAction: () => void, isProcessing: boolean }) {
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const handleEditEvent = async (eventId: string, eventData: any) => {
        await updateEventAction(eventId, eventData, 'system-approval-edit');
        setEditingEvent(null);
        onAction();
    };

    return (
        <Card className="border-l-4 border-blue-500">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - {event.location}
                        </p>
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <p>Op: {event.transmissionOperator || 'N/A'}</p>
                            <p>Rep. Cine: {event.cinematographicReporter || 'N/A'}</p>
                            <p>Repórter: {event.reporter || 'N/A'}</p>
                            <p>Produtor: {event.producer || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => setEditingEvent(event)} disabled={isProcessing}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" onClick={() => onApprove(event.id)} disabled={isProcessing}>
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
            {editingEvent && (
                <EditEventForm
                    event={editingEvent}
                    onEditEvent={handleEditEvent}
                    onClose={() => setEditingEvent(null)}
                />
            )}
        </Card>
    );
}

function EventAlertCard({ event, onConfirmCancel, onIgnore, isProcessing }: { event: Event, onConfirmCancel: (id: string) => void, onIgnore: (id: string) => void, isProcessing: boolean }) {
    return (
        <Card className="border-l-4 border-yellow-500">
            <CardContent className="p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                            Agendado para: {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs mt-1">Este evento não foi encontrado na última sincronização e pode ter sido cancelado.</p>
                    </div>
                    <div className="flex gap-2">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="icon" variant="destructive" disabled={isProcessing}><X className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Cancelamento?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação irá marcar o evento como 'Cancelado' na agenda. A ação será registrada.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onConfirmCancel(event.id)}>Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button size="icon" variant="secondary" onClick={() => onIgnore(event.id)} disabled={isProcessing}>
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


export default function ApprovalsPage() {
    const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
    const [alertEvents, setAlertEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const db = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    useEffect(() => {
        if (!db) return;
        setLoading(true);

        const pendingQuery = query(collection(db, 'events'), where('status', '==', 'Pendente'));
        const alertQuery = query(collection(db, 'events'), where('status', '==', 'Alerta'));

        const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
            setPendingEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
        }, (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'events', operation: 'list' }));
        });

        const unsubAlert = onSnapshot(alertQuery, (snapshot) => {
            setAlertEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
        }, (err) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'events', operation: 'list' }));
        });

        setLoading(false);

        return () => {
            unsubPending();
            unsubAlert();
        };
    }, [db]);

    const handleAction = useCallback(async (
        eventId: string,
        update: object,
        logDetails: { action: 'sync-approve' | 'sync-cancel-alert', summary: string }
    ) => {
        if (!db || !user?.email) {
            toast({ title: 'Erro de autenticação', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, update);

            await logAction({
                action: logDetails.action,
                collectionName: 'events',
                documentId: eventId,
                userEmail: user.email,
                details: { summary: logDetails.summary }
            });

            toast({ title: 'Sucesso!', description: `O evento foi ${logDetails.summary.toLowerCase()}.` });
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível atualizar o evento.', variant: 'destructive' });
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    }, [db, user, toast]);

    const approveEvent = (id: string) => handleAction(id, { status: 'Agendado' }, { action: 'sync-approve', summary: 'Aprovado' });
    const confirmCancel = (id: string) => handleAction(id, { status: 'Cancelado' }, { action: 'sync-cancel-alert', summary: 'Cancelado' });
    const ignoreAlert = (id: string) => handleAction(id, { status: 'Agendado' }, { action: 'sync-approve', summary: 'Mantido (Alerta ignorado)' });

    const approveAll = async () => {
        if (!db || !user?.email || pendingEvents.length === 0) return;
        
        setIsProcessing(true);
        const batch = writeBatch(db);
        const batchId = `approve-all-${Date.now()}`;

        for (const event of pendingEvents) {
            const eventRef = doc(db, 'events', event.id);
            batch.update(eventRef, { status: 'Agendado' });
            
            await logAction({
                action: 'sync-approve',
                collectionName: 'events',
                documentId: event.id,
                userEmail: user.email,
                details: { summary: 'Aprovado em massa' },
                batchId: batchId,
            });
        }
        
        try {
            await batch.commit();
            toast({ title: `${pendingEvents.length} eventos foram aprovados.` });
        } catch (error) {
            toast({ title: 'Erro em massa', description: 'Não foi possível aprovar todos os eventos.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Send className="h-6 w-6"/> Eventos Pendentes de Aprovação</CardTitle>
                    <CardDescription>Eventos recebidos via sincronização que precisam de sua confirmação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pendingEvents.length > 0 ? (
                        pendingEvents.map(event => (
                            <EventApprovalCard key={event.id} event={event} onApprove={approveEvent} onAction={() => {}} isProcessing={isProcessing} />
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <Inbox className="mx-auto h-12 w-12 opacity-50" />
                            <p className="mt-4">Nenhum evento pendente.</p>
                        </div>
                    )}
                </CardContent>
                {pendingEvents.length > 1 && (
                     <CardContent>
                        <Button onClick={approveAll} disabled={isProcessing} className="w-full">
                           {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                            Aprovar Todos ({pendingEvents.length})
                        </Button>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600"><AlertTriangle className="h-6 w-6"/> Alertas de Cancelamento</CardTitle>
                    <CardDescription>Eventos que podem ter sido cancelados na origem e precisam de sua atenção.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {alertEvents.length > 0 ? (
                        alertEvents.map(event => (
                            <EventAlertCard key={event.id} event={event} onConfirmCancel={confirmCancel} onIgnore={ignoreAlert} isProcessing={isProcessing} />
                        ))
                    ) : (
                         <div className="text-center text-muted-foreground py-8">
                            <Inbox className="mx-auto h-12 w-12 opacity-50" />
                            <p className="mt-4">Nenhum alerta.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

