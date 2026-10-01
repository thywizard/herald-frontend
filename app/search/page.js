import Script from 'next/script';
import { Header } from '../../components/layout';

export const metadata = { title: 'Search' };

export default function SearchPage() {
  const cseId = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID;

  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 py-4">
        {cseId ? (
          <>
            <Script async src={`https://cse.google.com/cse.js?cx=${cseId}`} strategy="afterInteractive" />
            <div className="gcse-search"></div>
          </>
        ) : (
          <p className="text-ink-soft text-sm py-16 text-center">
            Search isn't set up yet — add a Google Programmable Search Engine ID to enable it.
          </p>
        )}
      </div>
    </main>
  );
}
