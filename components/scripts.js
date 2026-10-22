import Script from 'next/script';

export function ThemeInit() {
  const code = `
    try {
      var theme = localStorage.getItem('herald_theme');
      if (theme === 'dark') document.documentElement.classList.add('dark');
      var scale = localStorage.getItem('herald_font_scale');
      if (scale) document.documentElement.style.fontSize = scale;
      var st = JSON.parse(localStorage.getItem('herald_settings') || '{}');
      document.documentElement.dataset.saver = st.dataSaver ? 'on' : 'off';
    } catch (e) {}
    try {
      var isApp = (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches))
        || navigator.standalone === true
        || (document.referrer || '').indexOf('android-app://') === 0;
      var seen = sessionStorage.getItem('herald_splash') === '1';
      if (isApp && !seen && location.pathname.indexOf('/admin') !== 0) {
        document.documentElement.classList.add('show-splash');
      }
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
