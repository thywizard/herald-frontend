'use client';

import { useEffect, useState } from 'react';
import { Header } from '../../components/layout';
import { HeraldMark } from '../../components/layout';
import { isInstalledApp } from '../../lib/installed';

const STEPS = [
  'Tap “Download Herald for Android” below.',
  'When the download finishes, open the file (look in your Downloads).',
  'If Android asks, allow “Install unknown apps” for your browser, then tap Install.',
  'Open Herald from your home screen — it runs full screen like any other app.',
];

export default function DownloadPage() {
  // The APK is a file we add to the site after building it. Until it's there,
  // show "coming soon" instead of a dead download link.
  const [available, setAvailable] = useState(null);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(isInstalledApp());
    fetch('/herald.apk', { method: 'HEAD' })
      .then((r) => setAvailable(r.ok && !(r.headers.get('content-type') || '').includes('text/html')))
      .catch(() => setAvailable(false));
  }, []);

  return (
    <main className="min-h-screen bg-paper pb-24">
      <Header />
      <div className="px-5 pt-8 text-center">
        <div className="flex justify-center mb-4">
          <HeraldMark size={72} />
        </div>
        <h1 className="font-serif text-3xl font-semibold text-ink mb-2">Herald for Android</h1>
        <p className="text-ink-soft text-sm max-w-xs mx-auto mb-6">
          The full Herald experience as an app — news, search and Herald AI, without a browser bar.
        </p>

        {inApp && (
          <p className="inline-block px-5 py-3 rounded-full bg-rule/50 text-ink text-sm">You’re already using the Herald app. 🎉</p>
        )}
        {!inApp && available === null && <div className="h-12" />}
        {!inApp && available === true && (
          <a
            href="/herald.apk"
            download="Herald.apk"
            className="inline-block px-7 py-3.5 rounded-full bg-ink text-paper text-sm font-semibold"
          >
            Download Herald for Android
          </a>
        )}
        {!inApp && available === false && (
          <p className="inline-block px-5 py-3 rounded-full bg-rule/50 text-ink-soft text-sm">The Android app is coming soon.</p>
        )}
      </div>

      {!inApp && (
      <div className="mx-4 mt-8 border border-rule rounded-2xl p-5">
        <h2 className="font-serif text-lg font-semibold text-ink mb-3">How to install</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-ink">
              <span className="w-6 h-6 shrink-0 rounded-full bg-accent/20 text-accent-dark text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink-soft mt-4">
          Prefer not to install a file? Open Herald in Chrome, tap the ⋮ menu and choose “Install app” — you get the same thing.
        </p>
      </div>
      )}
    </main>
  );
}
