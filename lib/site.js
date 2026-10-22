// The public address of the site, used for share links, canonical URLs and
// social preview metadata. NEXT_PUBLIC_SITE_URL wins if set (e.g. once a real
// domain is connected); otherwise Vercel's own production URL; otherwise the
// current Vercel address. Never a made-up domain.
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : null;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || fromVercel || 'https://herald-frontend-ruby.vercel.app').replace(/\/$/, '');
