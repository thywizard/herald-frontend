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
  // Android's "this app owns this site" proof must be served as JSON, fresh,
  // and from exactly /.well-known/assetlinks.json — that's what removes the
  // browser bar in the installed app.
  async headers() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
