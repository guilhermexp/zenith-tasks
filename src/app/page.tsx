'use client';

import dynamicImport from 'next/dynamic';

const App = dynamicImport(() => import('../components/App'), {
  ssr: false,
});

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <App />;
}