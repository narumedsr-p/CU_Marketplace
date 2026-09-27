import { color, font } from './tokens';

// Drop once at the app root. Loads Bai Jamjuree (Thai + Latin) and the keyframes.
export default function GlobalStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        body { margin:0; background:${color.canvas}; font-family:${font};
               color:${color.ink}; -webkit-font-smoothing:antialiased; }
        * { box-sizing:border-box; }
        input,textarea,select,button { font-family:inherit; }
        ::placeholder { color:#B79FAA; }
        a { color:${color.pink}; text-decoration:none; }
        a:hover { color:${color.pinkHover}; }
        @keyframes rsaIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes rsaToast {
          0%{opacity:0;transform:translateY(10px)} 12%{opacity:1;transform:none}
          88%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(10px)}
        }
        @keyframes rsaShimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
        .rsa-scroll { scrollbar-width:none; -ms-overflow-style:none; }
        .rsa-scroll::-webkit-scrollbar { display:none; height:0; width:0; }
      `}</style>
    </>
  );
}
