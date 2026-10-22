'use client';

import { useEffect } from 'react';

/**
 * Launch screen for the installed Android app.
 *
 * The markup is rendered by the server and hidden by CSS. The inline script in
 * ThemeInit adds `show-splash` to <html> before first paint — but only when the
 * page is running as an installed app (standalone / TWA) and only once per
 * session, so ordinary website visitors never see it and in-app reloads don't
 * flash it again.
 *
 * This component just dismisses it: it waits until the app has hydrated, keeps
 * the logo on screen for a short minimum so it doesn't flicker, then fades out.
 */
const MIN_VISIBLE_MS = 900;
const FADE_MS = 380;

export function AppSplash() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('show-splash')) return;

    const wait = Math.max(0, MIN_VISIBLE_MS - Math.round(performance.now()));
    let t2;
    const t1 = setTimeout(() => {
      root.classList.add('splash-out');
      t2 = setTimeout(() => {
        root.classList.remove('show-splash', 'splash-out');
        try {
          sessionStorage.setItem('herald_splash', '1');
        } catch {}
      }, FADE_MS);
    }, wait);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div id="app-splash" aria-hidden="true">
      <div className="splash-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-512.png" alt="" width="104" height="104" className="splash-logo" />
        <p className="splash-name">Herald</p>
      </div>
      <p className="splash-foot">News · Search · AI</p>
    </div>
  );
}
