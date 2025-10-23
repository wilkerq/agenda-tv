
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils"
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: 'Agenda Alego',
  description: 'Sistema de gerenciamento de eventos da TV Assembleia Legislativa do Estado de Goiás.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
