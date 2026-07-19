import dynamic from 'next/dynamic';

const MapApp = dynamic(
  () => import('../components/MapApp').then((m) => m.MapApp),
  {
    ssr: false,
    loading: () => <div className="shell" aria-busy="true" />,
  },
);

export default function HomePage() {
  return <MapApp />;
}
