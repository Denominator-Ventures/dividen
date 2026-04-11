import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'DiviDen — The Agentic Working Protocol',
  description: 'The last interface you\'ll ever need. Your personal AI agent that manages your pipeline, coordinates with other agents, and acts on your behalf — across every team, tool, and company boundary.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DiviDen',
  },
  openGraph: {
    title: 'DiviDen — The Last Interface You\'ll Ever Need',
    description: 'Your personal AI agent that manages your pipeline, coordinates with other agents, and acts on your behalf. Protocol-first. Open source. Federated by design.',
    siteName: 'DiviDen',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1436,
        height: 682,
        alt: 'DiviDen — The last interface you\'ll ever need',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DiviDen — The Last Interface You\'ll Ever Need',
    description: 'Your personal AI agent that manages your pipeline, coordinates with other agents, and acts on your behalf.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700&family=JetBrains+Mono:ital,wght@0,400;0,500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0a0a" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className="min-h-full overflow-x-hidden" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}