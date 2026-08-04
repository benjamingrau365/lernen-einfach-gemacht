/* ==========================================================================
   VORSCHAUBILD BAUEN

   Wenn jemand endlichkapiert.com in WhatsApp schickt — und genau so wird eine
   Lernseite unter Schülern weitergegeben — zeigt der Messenger eine
   Vorschaukarte. Ohne Bild bleibt dort eine graue Fläche mit einem Fetzen
   Text. Das sieht nach nichts aus, und niemand tippt darauf.

   Dieses Skript zeichnet die Karte einmal in einem Browser und legt sie als
   PNG ab. Danach ist sie eine gewöhnliche Datei — kein Dienst, keine
   Abhängigkeit zur Laufzeit, nichts, was ausfallen kann.

   Aufruf:  node vorschaubild.js
   Ergebnis: vorschau.png (1200 × 630) und vorschau-quadrat.png (1200 × 1200)

   Das Quadrat brauchen die Messenger, die keine breiten Karten zeigen.
   ========================================================================== */
const fs = require("fs");
const pfad = require("path");
const ORDNER = __dirname;

/* Der Browser liegt in dieser Umgebung an einem festen Ort. Steht er
   woanders, sagt Playwright das deutlich — deshalb keine stille Ausweiche. */
const CHROM = process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

/* ---------- Die Karte ----------
   Alles inline: Das Bild wird nur einmal gezeichnet, ein Stylesheet daneben
   wäre eine Datei mehr, die man vergessen kann. */
function karte({breit, hoch, gross}){
  const titel = gross ? 82 : 64;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${breit}px;height:${hoch}px;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:#0e2a22;color:#fff;display:flex;flex-direction:column;
    justify-content:space-between;padding:${gross ? 88 : 72}px;position:relative}
  /* Ein weicher Lichtschein von oben rechts — sonst wirkt die Fläche tot. */
  body::before{content:"";position:absolute;inset:0;
    background:radial-gradient(1100px 700px at 78% -12%, rgba(45,200,155,.42), transparent 62%),
               radial-gradient(700px 500px at 8% 108%, rgba(16,163,127,.22), transparent 60%)}
  .inhalt{position:relative;z-index:1;display:flex;flex-direction:column;
    justify-content:space-between;height:100%}
  .marke{display:flex;align-items:center;gap:18px}
  .zeichen{width:${gross ? 76 : 62}px;height:${gross ? 76 : 62}px;border-radius:${gross ? 22 : 18}px;
    background:#10a37f;display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 0 8px rgba(16,163,127,.16)}
  .zeichen svg{width:${gross ? 42 : 34}px;height:${gross ? 42 : 34}px}
  .markenname{font-size:${gross ? 34 : 28}px;font-weight:700;letter-spacing:-.01em}
  .markenname i{font-style:normal;color:#6fdcbb}
  h1{font-size:${titel}px;line-height:1.08;letter-spacing:-.035em;font-weight:800;
    max-width:${gross ? 1000 : 820}px}
  h1 em{font-style:normal;color:#6fdcbb}
  .unten{display:flex;align-items:flex-end;justify-content:space-between;gap:40px}
  .faecher{display:flex;flex-wrap:wrap;gap:${gross ? 12 : 10}px;max-width:${gross ? 900 : 700}px}
  .fach{border:2px solid rgba(255,255,255,.24);border-radius:999px;
    padding:${gross ? "10px 22px" : "8px 18px"};font-size:${gross ? 25 : 21}px;font-weight:600;
    color:rgba(255,255,255,.94)}
  .adresse{font-size:${gross ? 27 : 23}px;font-weight:700;color:#6fdcbb;white-space:nowrap}
  .kostenlos{margin-top:${gross ? 26 : 20}px;font-size:${gross ? 27 : 24}px;
    color:rgba(255,255,255,.72);font-weight:500}
  </style></head><body><div class="inhalt">

    <div class="marke">
      <span class="zeichen">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18h6"/><path d="M10 22h4"/>
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>
        </svg>
      </span>
      <span class="markenname">Endlich <i>kapiert</i></span>
    </div>

    <div>
      <h1>Du bekommst nie die&nbsp;Lösung.<br><em>Nur Fragen, die dich hinführen.</em></h1>
      <p class="kostenlos">Kostenlos · ohne Anmeldung · ohne Werbung</p>
    </div>

    <div class="unten">
      <div class="faecher">
        <span class="fach">Mathe</span>
        <span class="fach">Deutsch</span>
        <span class="fach">Englisch</span>
        <span class="fach">Elektroniker</span>
      </div>
      <span class="adresse">endlichkapiert.com</span>
    </div>

  </div></body></html>`;
}

(async () => {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch(e){
    console.error("Playwright fehlt — das Vorschaubild kann nur dort gebaut werden, wo ein Browser liegt.");
    console.error("Die bereits gebauten Dateien bleiben unverändert.");
    process.exit(1);
  }
  const browser = await chromium.launch({ executablePath: CHROM });
  const masse = [
    {datei:"vorschau.png",         breit:1200, hoch:630,  gross:false},
    {datei:"vorschau-quadrat.png", breit:1200, hoch:1200, gross:true}
  ];
  for (const m of masse){
    const c = await browser.newContext({ viewport:{width:m.breit, height:m.hoch},
                                         deviceScaleFactor: 1 });
    const seite = await c.newPage();
    await seite.setContent(karte(m), { waitUntil:"load" });
    await seite.screenshot({ path: pfad.join(ORDNER, m.datei) });
    await c.close();
    const kb = Math.round(fs.statSync(pfad.join(ORDNER, m.datei)).size / 1024);
    console.log(`${m.datei}: ${m.breit} × ${m.hoch}, ${kb} kB`);
  }
  await browser.close();
})();
