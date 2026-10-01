import Link from 'next/link';
import { Header } from '../components/layout';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper">
      <Header />
      <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold text-ink mb-3">Page not found</h1>
        <p className="text-ink-soft mb-6">
          This story may have been removed, or the link is broken.
        </p>
        <Link href="/" className="px-5 py-2.5 bg-ink text-paper rounded-full text-sm font-medium">
          Back to Herald
        </Link>
      </div>
    </main>
  );
}
