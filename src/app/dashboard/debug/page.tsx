
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Loader2, Server, CheckCircle, XCircle } from "lucide-react";
import { checkOllamaStatus, checkCredentialsStatus, checkFirestoreConnection } from "@/lib/debug-actions";

type Status = 'checking' | 'online' | 'offline' | 'error';
type CredentialStatus = {
    credentialsExist: boolean;
    projectId?: string;
    clientEmail?: string;
    parseError?: string;
};

export default function DebugEnvPage() {
    const [aiStatus, setAiStatus] = useState<Status>('checking');
    const [firestoreStatus, setFirestoreStatus] = useState<Status>('checking');
    const [ollamaUrl, setOllamaUrl] = useState('');
    const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);

    useEffect(() => {
        const performChecks = async () => {
            const [ollamaResult, credsResult, firestoreResult] = await Promise.all([
                checkOllamaStatus(),
                checkCredentialsStatus(),
                checkFirestoreConnection(),
            ]);
            setAiStatus(ollamaResult.status);
            setOllamaUrl(ollamaResult.url);
            setCredentialStatus(credsResult);
            setFirestoreStatus(firestoreResult.status);
        };
        performChecks();
    }, []);

    const renderStatusBadge = (status: Status) => {
        switch (status) {
            case 'checking':
                return <Badge variant="secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verificando...</Badge>;
            case 'online':
                return <Badge className="bg-green-600"><CheckCircle className="mr-2 h-4 w-4"/> Online</Badge>;
            case 'offline':
                return <Badge variant="destructive"><XCircle className="mr-2 h-4 w-4"/> Offline</Badge>;
            case 'error':
                 return <Badge variant="destructive"><XCircle className="mr-2 h-4 w-4"/> Erro de Rede</Badge>;
            default:
                return null;
        }
    };

    const renderCredsStatus = (isDefined: boolean) => {
        return isDefined
            ? <Badge variant="default" className="bg-green-600">Definida</Badge>
            : <Badge variant="destructive">Não Definida</Badge>;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Depuração do Ambiente</CardTitle>
                    <CardDescription>
                        Esta página verifica as conexões com serviços externos e a configuração das variáveis de ambiente no servidor.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Firestore Status */}
                    <div className="flex justify-between items-center border p-4 rounded-md">
                        <div>
                            <p className="font-semibold">Conexão com Cloud Firestore</p>
                            <p className="text-sm text-muted-foreground font-mono">
                                O servidor consegue se comunicar com o Firestore?
                            </p>
                        </div>
                        {renderStatusBadge(firestoreStatus)}
                    </div>
                     {firestoreStatus === 'error' && (
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                            <h4 className="font-bold">Ação Necessária (Firestore)</h4>
                            <p>O servidor não conseguiu se conectar ao Cloud Firestore. Isso geralmente indica um problema de rede ou firewall que está bloqueando o acesso aos serviços do Google Cloud. Verifique as políticas de rede de saída do seu ambiente.</p>
                        </div>
                    )}
                    {firestoreStatus === 'online' && (
                         <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                            <h4 className="font-bold">Firestore Conectado!</h4>
                            <p>A aplicação no lado do servidor conseguiu se comunicar com o Firestore.</p>
                        </div>
                    )}
                     {/* Ollama Status */}
                    <div className="flex justify-between items-center border p-4 rounded-md">
                        <div>
                            <p className="font-semibold">Servidor de IA (Ollama)</p>
                            <p className="text-sm text-muted-foreground font-mono">
                                {ollamaUrl || 'Verificando...'}
                            </p>
                        </div>
                        {renderStatusBadge(aiStatus)}
                    </div>
                     {aiStatus === 'error' && (
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                            <h4 className="font-bold">Ação Necessária (IA)</h4>
                            <p>Não foi possível conectar ao servidor Ollama. Verifique se o endereço IP está correto, se o serviço Ollama está rodando e se não há um firewall bloqueando a conexão na porta 11434.</p>
                        </div>
                    )}
                    {aiStatus === 'online' && (
                         <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                            <h4 className="font-bold">Conexão de IA Ativa!</h4>
                            <p>A aplicação conseguiu se comunicar com o servidor Ollama.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Credenciais do Servidor (Firebase Admin)</CardTitle>
                    <CardDescription>
                        Verifica se a variável `FIREBASE_CREDENTIALS` está disponível e válida no ambiente do servidor.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {credentialStatus === null ? (
                        <div className="flex justify-center items-center p-4">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Verificando credenciais...
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center border p-4 rounded-md">
                                <div>
                                    <p className="font-semibold">FIREBASE_CREDENTIALS</p>
                                    <p className="text-sm text-muted-foreground font-mono">
                                        {credentialStatus.credentialsExist ? "Definida e sendo processada." : "Não definida."}
                                    </p>
                                </div>
                                {renderCredsStatus(credentialStatus.credentialsExist)}
                            </div>

                            {credentialStatus.credentialsExist && !credentialStatus.parseError && (
                                <>
                                    <div className="flex justify-between items-center border p-4 rounded-md">
                                        <div>
                                            <p className="font-semibold">Project ID (do JSON)</p>
                                            <p className="text-sm text-muted-foreground font-mono">{credentialStatus.projectId || "Não encontrado no JSON"}</p>
                                        </div>
                                        {renderCredsStatus(!!credentialStatus.projectId)}
                                    </div>
                                    <div className="flex justify-between items-center border p-4 rounded-md">
                                        <div>
                                            <p className="font-semibold">Client Email (do JSON)</p>
                                            <p className="text-sm text-muted-foreground font-mono">{credentialStatus.clientEmail || "Não encontrado no JSON"}</p>
                                        </div>
                                        {renderCredsStatus(!!credentialStatus.clientEmail)}
                                    </div>
                                </>
                            )}
                            
                            {credentialStatus.parseError ? (
                                <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                                    <h4 className="font-bold">Erro de Processamento</h4>
                                    <p>{credentialStatus.parseError}</p>
                                </div>
                            ) : !credentialStatus.credentialsExist ? (
                                <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                                    <h4 className="font-bold">Ação Necessária</h4>
                                    <p>A variável de ambiente `FIREBASE_CREDENTIALS` não está definida. A inicialização do Firebase Admin SDK falhará. Verifique se o seu arquivo `.env` está correto e contém a variável com o conteúdo do seu arquivo JSON de credenciais. **Após alterar o arquivo `.env`, você precisa reiniciar o servidor de desenvolvimento.**</p>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                                    <h4 className="font-bold">Tudo Certo!</h4>
                                    <p>A variável `FIREBASE_CREDENTIALS` parece estar definida e foi processada como um JSON válido.</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    