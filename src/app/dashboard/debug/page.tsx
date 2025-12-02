
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Loader2, Server, CheckCircle, XCircle } from "lucide-react";
import { checkOllamaStatus, checkCredentialsStatus } from "@/lib/debug-actions";

type AiStatus = 'checking' | 'online' | 'offline' | 'error';
type CredentialStatus = {
    credentialsExist: boolean;
    projectId?: string;
    clientEmail?: string;
    parseError?: string;
};

export default function DebugEnvPage() {
    const [aiStatus, setAiStatus] = useState<AiStatus>('checking');
    const [ollamaUrl, setOllamaUrl] = useState('');
    const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);

    useEffect(() => {
        const performChecks = async () => {
            const [ollamaResult, credsResult] = await Promise.all([
                checkOllamaStatus(),
                checkCredentialsStatus(),
            ]);
            setAiStatus(ollamaResult.status);
            setOllamaUrl(ollamaResult.url);
            setCredentialStatus(credsResult);
        };
        performChecks();
    }, []);

    const renderStatus = (isDefined: boolean) => {
        return isDefined
            ? <Badge variant="default" className="bg-green-600">Definida</Badge>
            : <Badge variant="destructive">Não Definida</Badge>;
    };
    
    const renderAiStatus = () => {
        switch (aiStatus) {
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Depuração de Variáveis de Ambiente do Servidor</CardTitle>
                    <CardDescription>
                        Esta página verifica se as credenciais do Firebase Admin SDK (variável `FIREBASE_CREDENTIALS`) estão disponíveis e são válidas no ambiente do servidor.
                        Este valor vem do seu arquivo `.env`.
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
                                {renderStatus(credentialStatus.credentialsExist)}
                            </div>

                            {credentialStatus.credentialsExist && !credentialStatus.parseError && (
                                <>
                                    <div className="flex justify-between items-center border p-4 rounded-md">
                                        <div>
                                            <p className="font-semibold">Project ID (do JSON)</p>
                                            <p className="text-sm text-muted-foreground font-mono">{credentialStatus.projectId || "Não encontrado no JSON"}</p>
                                        </div>
                                        {renderStatus(!!credentialStatus.projectId)}
                                    </div>
                                    <div className="flex justify-between items-center border p-4 rounded-md">
                                        <div>
                                            <p className="font-semibold">Client Email (do JSON)</p>
                                            <p className="text-sm text-muted-foreground font-mono">{credentialStatus.clientEmail || "Não encontrado no JSON"}</p>
                                        </div>
                                        {renderStatus(!!credentialStatus.clientEmail)}
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
                                    <p>A variável `FIREBASE_CREDENTIALS` parece estar definida e foi processada como um JSON válido. Se a inicialização do Admin SDK ainda falhar, o problema pode estar no conteúdo das credenciais (ex: chave inválida).</p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Status da Conexão de IA (Ollama)</CardTitle>
                    <CardDescription>
                       Verifica se o backend da aplicação consegue se comunicar com o servidor Ollama configurado.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border p-4 rounded-md">
                        <div>
                            <p className="font-semibold">Servidor Ollama</p>
                            <p className="text-sm text-muted-foreground font-mono">
                                {ollamaUrl || 'Verificando...'}
                            </p>
                        </div>
                        {renderAiStatus()}
                    </div>
                     {aiStatus === 'error' && (
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                            <h4 className="font-bold">Ação Necessária</h4>
                            <p>Não foi possível conectar ao servidor Ollama. Verifique se o endereço IP está correto, se o serviço Ollama está rodando e se não há um firewall bloqueando a conexão na porta 11434.</p>
                        </div>
                    )}
                    {aiStatus === 'online' && (
                         <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                            <h4 className="font-bold">Conexão Ativa!</h4>
                            <p>A aplicação conseguiu se comunicar com o servidor Ollama. As funcionalidades de IA devem estar operacionais.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
