/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Article images come from many different outlets/RSS feeds, so we
    // can't pre-list every domain. remotePatterns with a wildcard-ish
    // approach: allow any https image. Tighten this later if you want
    // stricter control over which domains are trusted.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
