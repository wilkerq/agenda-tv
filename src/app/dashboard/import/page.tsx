
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { importAlegoAgenda } from '@/ai/flows/import-alego-agenda-flow';
import { Loader2, Import, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsLoading(true);
    setImportResult(null);

    try {
      const result = await importAlegoAgenda();
      setImportResult(result);
      
      if (result.count > 0) {
        toast({
          title: 'Importação Concluída!',
          description: `${result.count} novo(s) evento(s) foram importados e salvos com sucesso.`,
        });
      }

    } catch (error) {
      console.error('Error importing agenda:', error);
      toast({
        title: 'Erro na Importação',
        description: 'Não foi possível buscar ou processar os eventos da agenda oficial. Verifique o console para detalhes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Importar da Agenda Oficial</CardTitle>
          <CardDescription>
            Busque e importe automaticamente os próximos eventos diretamente do portal da Alego.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert>
                <Import className="h-4 w-4" />
                <AlertTitle>Como funciona?</AlertTitle>
                <AlertDescription>
                    Ao clicar no botão, nosso assistente de IA irá acessar a <a href="https://portal.al.go.leg.br/agenda" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-primary">agenda oficial da Alego</a>, extrair os eventos futuros, aplicar as regras de negócio (como atribuição de operador) e salvar apenas os eventos que ainda não existem no seu sistema.
                </AlertDescription>
            </Alert>
            {importResult !== null && (
                <Alert variant={importResult.count > 0 ? 'default' : 'default'} className="bg-green-50 border-green-200 text-green-800">
                    <AlertTitle>Resultado da Última Importação</AlertTitle>
                    <AlertDescription>
                        {importResult.count > 0 
                            ? `${importResult.count} novo(s) evento(s) foram adicionados à sua agenda.`
                            : `Nenhum evento novo foi encontrado. Sua agenda já estava sincronizada.`
                        }
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>
        <CardFooter className='flex-col items-start gap-4'>
          <Button onClick={handleImport} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando, isso pode levar um minuto...
              </>
            ) : (
              <>
                <Import className="mr-2 h-4 w-4" />
                Buscar e Importar Eventos
              </>
            )}
          </Button>
            {isLoading && <p className='text-sm text-muted-foreground'>O assistente está lendo o site da Alego e processando os eventos. Por favor, aguarde.</p>}
        </CardFooter>
      </Card>
    </div>
  );
}
