import { Header } from '../../components/layout';

export const metadata = { title: 'Terms of Use' };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-6 max-w-2xl text-ink leading-relaxed space-y-5">
        <h1 className="font-serif text-3xl font-semibold mb-2">Terms of Use</h1>
        <p className="text-ink-soft text-sm">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Using Herald</h2>
          <p>
            Herald is free to use. By using this site, you agree to use it lawfully and not to
            misuse, disrupt, or attempt to gain unauthorized access to any part of the service.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Content</h2>
          <p>
            Articles are sourced from a range of outlets and may be rewritten by our team with
            AI assistance and edited for accuracy. Original sources are credited on each article.
            While we aim for accuracy, Herald makes no guarantee that all content is complete,
            current, or error-free.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Changes</h2>
          <p>These terms may be updated from time to time. Continued use of Herald means you accept the current terms.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Contact</h2>
          <p>abdulhaqabdulganiy@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
