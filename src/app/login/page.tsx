
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, type Auth } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, type Firestore } from "firebase/firestore";
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

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.7 0 265.4 0 129.1 110.3 18.8 244 18.8c71.2 0 127.9 27.8 173.3 69.1l-63.5 61.9c-41.2-38.3-95.6-61.9-152.8-61.9-122.3 0-209.4 92.2-209.4 220.1 0 127.9 87.1 220.1 209.4 220.1 143.3 0 186.2-100.9 193.3-152.1H244v-79.2h244z"></path>
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth, db } = useFirebase();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    if (!auth || !db) {
        toast({ title: "Erro de Inicialização", description: "Serviços do Firebase não estão disponíveis. Tente novamente em alguns segundos.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            const role = 'viewer';
            
            await setDoc(userDocRef, {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                role: role,
                createdAt: new Date(),
            });
            
             toast({
                title: "Bem-vindo(a)!",
                description: `Sua conta foi criada com a permissão de ${role}.`,
            });
        } else {
             toast({
                title: "Login bem-sucedido!",
                description: "Redirecionando para o painel...",
            });
        }
        
        router.push("/dashboard");

    } catch (error: any) {
        console.error("Erro no login com Google:", error.message);
        toast({
            title: "Falha no Login com Google",
            description: error.message || "Não foi possível fazer login com o Google. Tente novamente.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="mx-auto max-w-sm w-full p-6 sm:p-8 rounded-xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-800">Login Administrativo</CardTitle>
          <CardDescription>
            Entre para acessar o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleGoogleLogin} 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Entrar com Google
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                    </span>
                </div>
            </div>

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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar com Email'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
