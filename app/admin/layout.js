import { StudioShell } from '../../components/studio';

// Herald Studio is its own installable app: its own name, icon and PWA
// manifest (scope /admin), so installing it from here gives a separate
// "Studio" icon on the home screen — never a second copy of the reader app.
export const metadata = {
  title: { absolute: 'Herald Studio' },
  description: 'Write, manage and publish Herald.',
  manifest: '/studio-manifest.json',
  icons: {
    icon: [{ url: '/studio-192.png', sizes: '192x192', type: 'image/png' }],
    shortcut: '/studio-192.png',
    apple: '/studio-apple-touch.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Studio' },
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#14152B',
  width: 'device-width',
  initialScale: 1,
};

export default function AdminLayout({ children }) {
  return <StudioShell>{children}</StudioShell>;
}
