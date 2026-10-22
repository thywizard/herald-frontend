// True when Herald is running as an installed app (Android app / home-screen
// install) rather than in a normal browser tab. Client-side only.
export function isInstalledApp() {
  if (typeof window === 'undefined') return false;
  try {
    return (
      (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches)) ||
      window.navigator.standalone === true ||
      (document.referrer || '').startsWith('android-app://')
    );
  } catch {
    return false;
  }
}
