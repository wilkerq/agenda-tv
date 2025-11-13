
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  // Use o hook principal para obter tudo o que precisamos, incluindo o estado de carregamento do usuário
  const { auth, isUserLoading } = useFirebase();


  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!auth) {
        toast({
            title: "Erro de Inicialização",
            description: "O serviço de autenticação não está pronto. Tente novamente em alguns segundos.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel...",
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Erro de autenticação:", error.message);
      let errorMessage = "Ocorreu um erro ao tentar fazer o login.";
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorMessage = "Email ou senha inválidos.";
          break;
        case "auth/invalid-email":
          errorMessage = "O formato do email é inválido.";
          break;
        default:
          errorMessage = "Não foi possível fazer login. Tente novamente.";
          break;
      }
      toast({
        title: "Falha no Login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Desabilita todos os formulários enquanto o Firebase verifica o estado inicial do usuário ou uma ação está em andamento.
  const isFormDisabled = isUserLoading || isLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="mx-auto max-w-sm w-full p-6 sm:p-8 rounded-xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">Login Administrativo</CardTitle>
          <CardDescription>
            Entre com seu e-mail e senha para acessar o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="grid gap-4">
            <div className="grid gap-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isFormDisabled}
                className="p-3 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-2 text-left">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isFormDisabled}
                className="p-3 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md"
              disabled={isFormDisabled}
            >
              {isFormDisabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar com Email'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
