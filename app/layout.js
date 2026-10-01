import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { ThemeInit, Analytics } from '../components/scripts';
import { BottomNav } from '../components/layout';
import { BackToTop, InstallPrompt } from '../components/interactive';

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
  metadataBase: new URL('https://herald.ng'),
  title: {
    default: 'Herald — News, as it happens',
    template: '%s | Herald',
  },
  description: 'Every story, every angle. Politics, sports, business, world news and more.',
  manifest: '/manifest.json',
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <ThemeInit />
      </head>
      <body>
        {children}
        <BottomNav />
        <BackToTop />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
