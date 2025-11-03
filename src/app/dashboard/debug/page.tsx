
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DebugEnvPage() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyExists = !!process.env.FIREBASE_PRIVATE_KEY;
    const privateKeyPreview = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 30) + "..." 
        : "Não definida";

    const renderStatus = (isDefined: boolean) => {
        return isDefined
            ? <Badge variant="default" className="bg-green-600">Definida</Badge>
            : <Badge variant="destructive">Não Definida</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Depuração de Variáveis de Ambiente do Servidor</CardTitle>
                <CardDescription>
                    Esta página verifica se as credenciais do Firebase Admin SDK estão disponíveis no ambiente do servidor.
                    Estes valores vêm do seu arquivo `.env`.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center border p-4 rounded-md">
                    <div>
                        <p className="font-semibold">FIREBASE_PROJECT_ID</p>
                        <p className="text-sm text-muted-foreground font-mono">{projectId || "N/A"}</p>
                    </div>
                    {renderStatus(!!projectId)}
                </div>
                <div className="flex justify-between items-center border p-4 rounded-md">
                     <div>
                        <p className="font-semibold">FIREBASE_CLIENT_EMAIL</p>
                        <p className="text-sm text-muted-foreground font-mono">{clientEmail || "N/A"}</p>
                    </div>
                    {renderStatus(!!clientEmail)}
                </div>
                 <div className="flex justify-between items-center border p-4 rounded-md">
                     <div>
                        <p className="font-semibold">FIREBASE_PRIVATE_KEY</p>
                        <p className="text-sm text-muted-foreground font-mono break-all">{privateKeyPreview}</p>
                    </div>
                    {renderStatus(privateKeyExists)}
                </div>
                
                 {!projectId || !clientEmail || !privateKeyExists ? (
                     <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                        <h4 className="font-bold">Ação Necessária</h4>
                        <p>Uma ou mais variáveis de ambiente essenciais não estão definidas. A inicialização do Firebase Admin SDK falhará. Verifique se o seu arquivo `.env` está correto e se o servidor foi reiniciado após a alteração.</p>
                    </div>
                ) : (
                    <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                        <h4 className="font-bold">Tudo Certo!</h4>
                        <p>Todas as variáveis de ambiente necessárias para o Firebase Admin SDK parecem estar definidas. Se o erro persistir, o problema pode estar no conteúdo das variáveis (ex: chave privada mal formatada).</p>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
