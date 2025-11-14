
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DebugEnvPage() {
    const credentialsExist = !!process.env.FIREBASE_CREDENTIALS;
    let projectId: string | undefined;
    let clientEmail: string | undefined;
    let parseError: string | null = null;

    if (credentialsExist) {
        try {
            const creds = JSON.parse(process.env.FIREBASE_CREDENTIALS!);
            projectId = creds.project_id;
            clientEmail = creds.client_email;
        } catch (e: any) {
            parseError = `Erro ao processar FIREBASE_CREDENTIALS: ${e.message}. Verifique se é um JSON válido.`;
        }
    }

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
                    Esta página verifica se as credenciais do Firebase Admin SDK (variável `FIREBASE_CREDENTIALS`) estão disponíveis e são válidas no ambiente do servidor.
                    Este valor vem do seu arquivo `.env`.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center border p-4 rounded-md">
                    <div>
                        <p className="font-semibold">FIREBASE_CREDENTIALS</p>
                        <p className="text-sm text-muted-foreground font-mono">
                            {credentialsExist ? "Definida e sendo processada." : "Não definida."}
                        </p>
                    </div>
                    {renderStatus(credentialsExist)}
                </div>

                {credentialsExist && !parseError && (
                    <>
                        <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                                <p className="font-semibold">Project ID (do JSON)</p>
                                <p className="text-sm text-muted-foreground font-mono">{projectId || "Não encontrado no JSON"}</p>
                            </div>
                            {renderStatus(!!projectId)}
                        </div>
                        <div className="flex justify-between items-center border p-4 rounded-md">
                            <div>
                                <p className="font-semibold">Client Email (do JSON)</p>
                                <p className="text-sm text-muted-foreground font-mono">{clientEmail || "Não encontrado no JSON"}</p>
                            </div>
                            {renderStatus(!!clientEmail)}
                        </div>
                    </>
                )}
                
                {parseError ? (
                     <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                        <h4 className="font-bold">Erro de Processamento</h4>
                        <p>{parseError}</p>
                    </div>
                ) : !credentialsExist ? (
                     <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                        <h4 className="font-bold">Ação Necessária</h4>
                        <p>A variável de ambiente `FIREBASE_CREDENTIALS` não está definida. A inicialização do Firebase Admin SDK falhará. Verifique se o seu arquivo `.env` está correto e contém a variável com o conteúdo do seu arquivo JSON de credenciais.</p>
                    </div>
                ) : (
                    <div className="p-4 bg-green-600/10 border-l-4 border-green-600 text-green-800 dark:text-green-300 rounded-md">
                        <h4 className="font-bold">Tudo Certo!</h4>
                        <p>A variável `FIREBASE_CREDENTIALS` parece estar definida e foi processada como um JSON válido. Se a inicialização do Admin SDK ainda falhar, o problema pode estar no conteúdo das credenciais (ex: chave inválida).</p>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
