import type { Metadata, Viewport } from 'next';
import '@openfirewx/design-system/tokens.css';
import '@openfirewx/design-system/fonts.css';
import '@openfirewx/ui/styles.css';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'Open Fire WX',
  description: 'Open source wildfire intelligence map',
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Open Fire WX',
  },
  icons: {
    icon: `${basePath}/icon.svg`,
    apple: `${basePath}/icon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1c1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
