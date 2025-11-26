
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Provider } from 'jotai';

export const metadata: Metadata = {
  title: 'Agenda Alego',
  description: 'Sistema de gerenciamento de eventos da TV Assembleia Legislativa do Estado de Goiás.',
  manifest: '/manifest.webmanifest',
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
        <meta name="application-name" content="Agenda Alego" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Agenda Alego" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f172a" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <FirebaseClientProvider>
              {children}
            </FirebaseClientProvider>
            <Toaster />
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
