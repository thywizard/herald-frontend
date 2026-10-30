import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { ThemeInit, Analytics } from '../components/scripts';
import { SITE_URL } from '../lib/site';
import { BottomNav } from '../components/layout';
import { AppSplash } from '../components/splash';
import { BackToTop, InstallPrompt, ServiceWorkerRegister, AutoPushPrompt } from '../components/interactive';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Herald — News, as it happens',
    template: '%s | Herald',
  },
  description: 'Every story, every angle. Politics, sports, business, world news and more.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Herald',
  },
  openGraph: {
    type: 'website',
    siteName: 'Herald',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport = {
  themeColor: '#15181F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <ThemeInit />
        {/* Google AdSense — must be a plain server-rendered tag in <head> so
            Google's crawler can find it when verifying the site. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8026135429131617"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AppSplash />
        {children}
        <BottomNav />
        <BackToTop />
        <InstallPrompt />
        <ServiceWorkerRegister />
        <AutoPushPrompt />
        <Analytics />
      </body>
    </html>
  );
}
