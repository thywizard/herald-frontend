import { Header } from '../../components/layout';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-6 max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-ink mb-4">About Herald</h1>

        <p className="text-ink leading-relaxed mb-4">
          Herald brings you news from every angle — politics, sports, business, world affairs
          and more — gathered from a wide range of outlets and made free to read for everyone,
          with no login required.
        </p>

        <p className="text-ink leading-relaxed mb-6">
          Some articles on Herald are written by our team; others are compiled from other news
          outlets using an AI-assisted process and reviewed by our editorial team. Every article
          credits its original source.
        </p>

        <h2 className="font-serif text-xl font-semibold text-ink mb-2">Made by</h2>
        <p className="text-ink leading-relaxed mb-1">HaqTech — completely free to use.</p>
        <ul className="text-ink-soft text-sm mb-6 space-y-1">
          <li>Abdulhaq Abdulganiy — abdulhaqabdulganiy@gmail.com</li>
          <li>Jason Miller — jasonmillerx25@gmail.com</li>
          <li>Saladin — imamsaladin34@gmail.com</li>
        </ul>

        <h2 className="font-serif text-xl font-semibold text-ink mb-2">Sponsors</h2>
        <p className="text-ink-soft text-sm mb-6">Newstar · ALKS · BIGWIG · Render</p>

        <h2 className="font-serif text-xl font-semibold text-ink mb-2">Contact</h2>
        <p className="text-ink-soft text-sm">abdulhaqabdulganiy@gmail.com</p>
      </div>
    </main>
  );
}
