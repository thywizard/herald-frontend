import { Header } from '../../components/layout';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper pb-20">
      <Header />
      <div className="px-4 pt-6 max-w-2xl text-ink leading-relaxed space-y-5">
        <h1 className="font-serif text-3xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-ink-soft text-sm">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">No account required</h2>
          <p>
            Herald does not require you to create an account or log in. We do not collect your
            name, email address, or any personal identifying information to use the app.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">What we store on your device</h2>
          <p>
            Saved articles and display preferences (such as dark mode and text size) are stored
            locally in your browser and are never sent to our servers.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Advertising</h2>
          <p>
            Herald displays advertisements through Google AdSense, which may use cookies to show
            relevant ads. You can manage ad personalization through your Google account settings
            or browser controls.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Analytics</h2>
          <p>
            We use aggregate analytics to understand how Herald is used (for example, which
            articles are popular). This data does not identify you personally.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold mb-2">Contact</h2>
          <p>Questions about this policy: abdulhaqabdulganiy@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
