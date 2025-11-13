
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  limit
} from "firebase/firestore";
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
import { Separator } from "@/components/ui/separator";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.021,35.846,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  // Use o hook principal para obter tudo o que precisamos, incluindo o estado de carregamento do usuário
  const { auth, db, isUserLoading } = useFirebase();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    if (!auth || !db) {
        toast({
            title: "Erro de Inicialização",
            description: "Os serviços do Firebase não estão disponíveis. Tente novamente em alguns segundos.",
            variant: "destructive",
        });
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
        const personnelCollections = ["transmission_operators", "cinematographic_reporters", "production_personnel"];
        let userExistsInPersonnel = false;
        
        for (const collectionName of personnelCollections) {
            const q = query(collection(db, collectionName), where("email", "==", user.email), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                userExistsInPersonnel = true;
                break;
            }
        }
        
        const role = userExistsInPersonnel ? "editor" : "viewer";

        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: role,
            createdAt: new Date(),
        });
         toast({
          title: "Bem-vindo(a)!",
          description: `Sua conta foi criada com a permissão de ${role}.`,
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
            Acesse o painel com sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isFormDisabled}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
            Entrar com Google
          </Button>

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

    