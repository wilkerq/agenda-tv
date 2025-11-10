
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
import { useAuth } from "@/firebase";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    if (!auth) {
      toast({
        title: "Erro de Inicialização",
        description: "O serviço de autenticação não está pronto.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Login bem-sucedido!",
        description: "Redirecionando para o painel...",
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error signing in with Google: ", error.message);
      let errorMessage = "Ocorreu um erro ao tentar fazer login com o Google.";
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "O pop-up de login foi bloqueado pelo seu navegador. Por favor, habilite os pop-ups para este site.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "A solicitação de login foi cancelada.";
        // Don't show a toast for this, as it's user-initiated
        setIsLoading(false);
        return;
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


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="mx-auto max-w-sm p-8 rounded-xl shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-gray-800">Login Administrativo</CardTitle>
          <CardDescription>
            Entre com seu email para acessar o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
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
                disabled={isLoading}
                className="p-3 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>
             <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 400.2 0 264.1 0 128.1 103.8 8.1 236 8.1c64.3 0 119.5 24.3 162.7 65.5L345 127.5c-28.9-27.1-68.5-43.9-112.5-43.9-86.1 0-155.1 67.4-155.1 150.5S146.4 415 232.5 415c92.1 0 140.6-66.2 144.9-101.4H232.5v-74.5h255.5z"></path>
                    </svg>
                )}
                Google
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
