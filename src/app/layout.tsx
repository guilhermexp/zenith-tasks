import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zenith Tasks - Gerenciador de Tarefas Inteligente',
  description: 'Um gerenciador de tarefas moderno com IA integrada para organizar sua vida de forma inteligente.',
  keywords: ['tarefas', 'produtividade', 'organização', 'IA', 'gerenciamento'],
  authors: [{ name: 'Zenith Tasks' }],
  // Use dev URL in local, configure a public URL in production via env if needed
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3457'),
  openGraph: {
    title: 'Zenith Tasks - Gerenciador de Tarefas Inteligente',
    description: 'Um gerenciador de tarefas moderno com IA integrada para organizar sua vida de forma inteligente.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zenith Tasks - Gerenciador de Tarefas Inteligente',
    description: 'Um gerenciador de tarefas moderno com IA integrada para organizar sua vida de forma inteligente.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <html lang="pt-BR" className="h-full">
        <head>
          <link
            rel="icon"
            href={
              `data:image/svg+xml;utf8,` +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
                  <defs>
                    <linearGradient id='g' x1='0' x2='1'>
                      <stop offset='0%' stopColor='#8ab4ff'/>
                      <stop offset='100%' stopColor='#d08bff'/>
                    </linearGradient>
                  </defs>
                  <circle cx='32' cy='32' r='28' fill='url(#g)'/>
                </svg>`
              )
            }
          />
        </head>
        <body className="font-sans h-full antialiased">
          {children}
        </body>
      </html>
    </Providers>
  );
}
