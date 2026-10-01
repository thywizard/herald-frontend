import Script from 'next/script';

export function ThemeInit() {
  const code = `
    try {
      var theme = localStorage.getItem('herald_theme');
      if (theme === 'dark') document.documentElement.classList.add('dark');
      var scale = localStorage.getItem('herald_font_scale');
      if (scale) document.documentElement.style.fontSize = scale;
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
