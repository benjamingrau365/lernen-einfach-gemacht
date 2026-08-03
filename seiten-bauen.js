/* ==========================================================================
   SEITEN BAUEN — schreibt für jedes Thema eine feste HTML-Seite mit der
   ganzen Erklärung darin, dazu sitemap.xml und robots.txt.

   Warum das nötig ist: Die App ist eine einzige Datei, die alles erst mit
   JavaScript zusammensetzt. Eine Suchmaschine sieht davon zuerst eine leere
   Seite. Wer bei Google „Bruchrechnen Klasse 6 erklärt“ eingibt, findet uns
   nur, wenn diese Wörter wirklich als Text auf einer eigenen Adresse stehen.

   Aufruf:  node seiten-bauen.js
   Ergebnis: erklaerung/<thema>.html, erklaerungen.html, sitemap.xml, robots.txt
   ========================================================================== */
const fs = require("fs");
const pfad = require("path");

const WURZEL = "https://endlichkapiert.com";
const ORDNER = __dirname;
const h = fs.readFileSync(ORDNER + "/index.html", "utf8");

const stueck = (von, bis) => {
  const a = h.indexOf(von), b = h.indexOf(bis);
  if (a < 0 || b < 0 || b <= a) throw new Error("Abschnitt nicht gefunden: " + von);
  return h.slice(a, b);
};
const umgebung = new Function(`
${stueck("const KATALOG", "/* ---------- Werkzeuge")}
${stueck("const rnd  =", "/* ---------- Aufgabenerzeuger ---------- */")}
${stueck("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */")}
};
${stueck("function entdoppeln(", "\n/* ---------- Fortschritt")}
return {KATALOG, AUFGABEN, ERKLAERUNGEN};`)();
const { KATALOG, AUFGABEN, ERKLAERUNGEN } = umgebung;

/* ---------- Adressbausteine ---------- */
/* Aus „Größen und Einheiten“ wird „groessen-und-einheiten“. Umlaute werden
   ausgeschrieben, nicht weggeworfen — sonst wird aus „üben“ ein „ben“. */
function schnipsel(text){
  return String(text).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function stufenwort(f){ return KATALOG[f].stufenwort || "Klasse"; }
function stufenText(f, k){ return `${stufenwort(f)} ${k}`; }
/* In welchem Fach und welcher Stufe steht das Thema? */
function themaOrt(thema){
  for (const [f, v] of Object.entries(KATALOG))
    for (const [k, liste] of Object.entries(v.themen))
      if (liste.includes(thema)) return {fach:f, klasse:Number(k), fachname:v.name};
  return null;
}

/* ---------- Wie Leute wirklich suchen ----------
   Unsere Themen heißen so, wie sie im Buch heißen. Getippt wird aber anders:
   niemand sucht „Brüche“, alle suchen „Bruchrechnen“. Diese Wörter kommen
   zusätzlich in Titel und Beschreibung — erfunden wird dabei nichts, es sind
   nur die gebräuchlichen Namen derselben Sache. */
const SUCHWORTE = {
  "Brüche": ["Bruchrechnen", "Brüche kürzen und erweitern"],
  "Dezimalzahlen": ["Kommazahlen"],
  "Prozent und Zinsen": ["Prozentrechnung", "Zinsrechnung"],
  "Terme umformen": ["Terme vereinfachen"],
  "Gleichungen umstellen": ["Gleichungen lösen"],
  "Formeln umstellen": ["Formeln nach einer Größe auflösen"],
  "Satz des Pythagoras": ["Pythagoras berechnen", "a² + b² = c²"],
  "Flächen und Umfang": ["Flächeninhalt berechnen", "Umfang berechnen"],
  "Körper und Volumen": ["Volumen berechnen"],
  "Lineare Funktionen": ["Geradengleichung", "y = mx + b"],
  "Quadratische Gleichungen": ["pq-Formel", "Mitternachtsformel"],
  "Trigonometrie": ["Sinus Kosinus Tangens", "sin cos tan"],
  "Groß- und Kleinschreibung": ["Rechtschreibung Groß und Klein"],
  "das oder dass": ["das dass Regel"],
  "Kommas bei Nebensätzen": ["Kommaregeln"],
  "Wortarten erkennen": ["Wortarten bestimmen"],
  "Satzglieder bestimmen": ["Subjekt Prädikat Objekt"],
  "Ohmsches Gesetz": ["U = R · I", "Strom Spannung Widerstand berechnen"],
  "Elektrische Leistung und Arbeit": ["P = U · I", "Leistung berechnen"],
  "Leiterquerschnitt": ["Querschnitt berechnen", "Kabelquerschnitt"],
  "Blindleistung und cos φ": ["Blindleistung berechnen", "Leistungsfaktor"],
  "Sicherheitsregeln": ["Die fünf Sicherheitsregeln"],
  "Transformator": ["Trafo berechnen", "Übersetzungsverhältnis"],
  "Stern und Dreieck": ["Sternschaltung Dreieckschaltung"],
  "Simple Present": ["Simple Present Übungen", "Simple Present Regeln"],
  "Simple Past": ["Simple Past Übungen", "unregelmäßige Verben"],
  "Present Progressive": ["Present Progressive Übungen"],
  "Steigerung von Adjektiven": ["comparative superlative"]
};
const auchGenannt = (thema) => SUCHWORTE[thema] || [];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* Erklärungstexte enthalten bewusst <b>, <i> und <br> — die sollen bleiben.
   Alles andere fliegt raus, damit aus einem Inhalt kein Markup-Unfall wird. */
const zahm = (s) => String(s).replace(/<(?!\/?(b|i|br|sup|sub|em|strong)\b)[^>]*>/g, "");
const nackt = (s) => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/* ---------- Aussehen ----------
   Bewusst knapp und ohne fremde Dateien: Eine Seite, die sofort dasteht,
   wird eher gelesen — und Ladezeit zählt bei Google mit. */
const STIL = `
:root{--bg:#f4f8f7;--card:#fff;--ink:#16211e;--soft:#5b6b66;--line:#dfe8e5;
  --ac:#10a37f;--ac-soft:#e4f5ef;--ac-dark:#0b7a5f;--red:#b3382f;--red-soft:#fdecea;
  --amber:#8a5a09;--amber-soft:#fdf3e0}
@media (prefers-color-scheme:dark){:root{--bg:#101614;--card:#18201d;--ink:#e8efec;
  --soft:#9bada7;--line:#2a3733;--ac:#2fbf99;--ac-soft:#17302a;--ac-dark:#7fe0c4;
  --red:#f08a80;--red-soft:#301a18;--amber:#e0b467;--amber-soft:#2c2415}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.huelle{max-width:760px;margin:0 auto;padding:20px 18px 60px}
a{color:var(--ac-dark)}
.pfad{font-size:14px;color:var(--soft);margin:0 0 18px}
.pfad a{color:var(--soft)}
.karte{background:var(--card);border:1.5px solid var(--line);border-radius:16px;
  padding:22px 24px;margin-bottom:16px}
h1{font-size:clamp(26px,5vw,34px);line-height:1.2;margin:0 0 10px;letter-spacing:-.02em}
h2{font-size:20px;margin:0 0 10px;letter-spacing:-.01em}
h3{font-size:16px;margin:18px 0 6px}
p{margin:0 0 12px}
p:last-child{margin-bottom:0}
ul,ol{margin:0 0 12px;padding-left:22px}
li{margin-bottom:7px}
.marke{display:inline-block;font-size:13px;font-weight:800;letter-spacing:.06em;
  text-transform:uppercase;color:var(--ac-dark);background:var(--ac-soft);
  border-radius:999px;padding:4px 12px;margin-bottom:12px}
.knopf{display:block;text-align:center;background:var(--ac);color:#fff;text-decoration:none;
  font-weight:700;border-radius:13px;padding:15px 20px;margin-top:6px}
.knopf.leise{background:transparent;color:var(--ac-dark);border:1.6px solid var(--ac);margin-top:10px}
table{width:100%;border-collapse:collapse;font-size:15px;margin-bottom:12px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-weight:800;color:var(--soft);font-size:13.5px}
.rollen{overflow-x:auto}
.fehler{background:var(--red-soft);border-radius:12px;padding:13px 15px;margin-bottom:10px}
.fehler b{color:var(--red);display:block;margin-bottom:3px}
.merke{background:var(--amber-soft);border-radius:12px;padding:13px 15px}
.begriff{border-bottom:1px solid var(--line);padding:9px 0}
.begriff:last-child{border-bottom:none}
.begriff b{display:block}
.begriff span{color:var(--soft);font-size:15px}
svg{width:100%;max-width:420px;height:auto;display:block;margin:14px auto;color:var(--ink)}
.fuss{font-size:14px;color:var(--soft);text-align:center;margin-top:26px}
.fuss a{color:var(--soft)}
.andere{display:grid;gap:8px}
.andere a{display:block;background:var(--card);border:1.5px solid var(--line);
  border-radius:12px;padding:12px 15px;text-decoration:none;color:var(--ink);font-weight:600}
`;

function huelle({titel, text, adresse, inhalt, jsonld}){
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(text)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${WURZEL}${adresse}">
<meta property="og:site_name" content="Endlich kapiert">
<meta property="og:type" content="article">
<meta property="og:locale" content="de_DE">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(text)}">
<meta property="og:url" content="${WURZEL}${adresse}">
<meta name="theme-color" content="#10a37f">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>${STIL}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body>
<div class="huelle">
${inhalt}
<p class="fuss"><a href="/">Endlich kapiert</a> · <a href="/erklaerungen">Alle Erklärungen</a>
  · <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a></p>
</div>
</body>
</html>`;
}

/* ---------- Eine Themenseite ---------- */
function themenseite(thema, e, ort, nachbarn){
  const stufe = stufenText(ort.fach, ort.klasse);
  const adresse = `/erklaerung/${schnipsel(thema)}`;
  const anzahl = (AUFGABEN[thema] || []).length;

  const abschnitt = (titel, drin) => drin ? `<div class="karte"><h2>${titel}</h2>${drin}</div>` : "";
  const liste = (arr) => arr && arr.length
    ? `<ul>${arr.map(x => `<li>${zahm(x)}</li>`).join("")}</ul>` : "";

  const inhalt = `
<p class="pfad"><a href="/">Startseite</a> › <a href="/${ort.fach}">${esc(ort.fachname)}</a> › ${esc(stufe)}</p>

<div class="karte">
  <span class="marke">${esc(ort.fachname)} · ${esc(stufe)}</span>
  <h1>${esc(thema)} — einfach erklärt</h1>
  ${auchGenannt(thema).length
    ? `<p style="color:var(--soft);font-size:15px">Oft auch gesucht als: ${auchGenannt(thema).map(esc).join(" · ")}</p>`
    : ""}
  ${e.worum ? `<p>${zahm(e.worum)}</p>` : ""}
  <a class="knopf" href="/${ort.fach}/${ort.klasse}">${anzahl ? "Jetzt üben" : "Zum Fach"} — du bekommst nie die Lösung, nur Fragen</a>
  <a class="knopf leise" href="/${ort.fach}/${ort.klasse}">Alle Themen in ${esc(stufe)}</a>
</div>

${e.einfach && e.einfach.length ? `<div class="karte">
  <h2>Von ganz vorn</h2>
  <p style="color:var(--soft);font-size:15px">Ein Satz nach dem anderen, ohne Vorwissen.</p>
  ${e.einfach.map(s => `<p>${zahm(s)}</p>`).join("")}
</div>` : ""}

${abschnitt("Wozu man das braucht", liste(e.wozu))}
${abschnitt("Schritt für Schritt", e.rezept && e.rezept.length
  ? `<ol>${e.rezept.map(s => `<li>${zahm(s)}</li>`).join("")}</ol>` : "")}

${e.beispiel ? `<div class="karte">
  <h2>Ein durchgerechnetes Beispiel</h2>
  <p><b>Aufgabe:</b> ${zahm(e.beispiel.aufgabe)}</p>
  ${e.beispiel.schritte ? `<ol>${e.beispiel.schritte.map(s => `<li>${zahm(s)}</li>`).join("")}</ol>` : ""}
  <p><b>Ergebnis:</b> ${zahm(e.beispiel.ergebnis)}</p>
</div>` : ""}

${e.fehler && e.fehler.length ? `<div class="karte">
  <h2>Die häufigsten Fehler</h2>
  ${e.fehler.map(f => `<div class="fehler"><b>${zahm(f[0])}</b>${zahm(f[1])}</div>`).join("")}
</div>` : ""}

${e.tabelle ? `<div class="karte">
  <h2>${esc(e.tabelle.titel || "Übersicht")}</h2>
  <div class="rollen"><table>
    <thead><tr>${e.tabelle.kopf.map(k => `<th>${zahm(k)}</th>`).join("")}</tr></thead>
    <tbody>${e.tabelle.zeilen.map(z => `<tr>${z.map(c => `<td>${zahm(c)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>
  ${e.tabelle.fuss ? `<p style="color:var(--soft);font-size:15px">${zahm(e.tabelle.fuss)}</p>` : ""}
</div>` : ""}

${e.bild ? `<div class="karte"><h2>Zum Ansehen</h2>${e.bild}</div>` : ""}

${e.begriffe && e.begriffe.length ? `<div class="karte">
  <h2>Wörter, die man kennen muss</h2>
  ${e.begriffe.map(b => `<div class="begriff"><b>${zahm(b[0])}</b><span>${zahm(b[1])}</span></div>`).join("")}
</div>` : ""}

${e.regeln && e.regeln.length ? `<div class="karte">
  <h2>Das Wichtigste in Kürze</h2>
  <div class="merke">${liste(e.regeln)}</div>
</div>` : ""}

${e.spiel ? `<div class="karte">
  <h2>${esc(e.spiel.titel)} — zum Ausprobieren</h2>
  <p>${zahm(e.spiel.hinweis || "")}</p>
  <p style="color:var(--soft);font-size:15px">Das Modell zum Schieben steht in der App —
    dort siehst du sofort, was sich ändert, wenn du an einem Wert drehst.</p>
  <a class="knopf" href="/${ort.fach}/${ort.klasse}">Modell ausprobieren</a>
</div>` : ""}

<div class="karte">
  <h2>Weiter in ${esc(stufe)}</h2>
  <div class="andere">
    ${nachbarn.map(n => `<a href="/erklaerung/${schnipsel(n)}">${esc(n)} — einfach erklärt</a>`).join("")}
  </div>
</div>

<div class="karte">
  <h2>Und dann?</h2>
  <p>Lesen reicht nicht. Verstanden hast du es erst, wenn du es selbst hinschreiben kannst —
    deshalb bekommst du in der App nie die Lösung, sondern Fragen, die dich hinführen.
    Was hakt, kommt von allein wieder: nach einem Tag, nach drei Tagen, nach einer Woche.</p>
  <a class="knopf" href="/${ort.fach}/${ort.klasse}">${esc(thema)} jetzt üben</a>
</div>`;

  const kern = e.worum
    ? nackt(e.worum).slice(0, 190)
    : `${thema} für ${stufe} von ganz vorn erklärt, mit Beispiel und den häufigsten Fehlern.`;
  const beschreibung = `${thema} für ${stufe}: ${kern}`;
  /* Der erste Suchbegriff kommt in den Titel — dort zählt er am meisten. */
  const zusatz = auchGenannt(thema)[0];

  return huelle({
    titel: `${thema} einfach erklärt${zusatz ? " — " + zusatz : ""} (${stufe}) | Endlich kapiert`,
    text: beschreibung,
    adresse,
    inhalt,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "name": `${thema} — einfach erklärt`,
      "description": beschreibung,
      "url": WURZEL + adresse,
      "inLanguage": "de",
      "isAccessibleForFree": true,
      "learningResourceType": "Erklärung und Übungen",
      "educationalLevel": stufe,
      "about": {"@type": "Thing", "name": thema},
      "teaches": thema,
      "provider": {"@type": "Organization", "name": "Endlich kapiert", "url": WURZEL}
    }
  });
}

/* ---------- Übersichtsseite über alle Erklärungen ---------- */
function uebersicht(alle){
  const nachFach = {};
  alle.forEach(({thema, ort}) => {
    const schluessel = ort.fach + "|" + ort.klasse;
    (nachFach[schluessel] = nachFach[schluessel] || {ort, themen: []}).themen.push(thema);
  });
  const inhalt = `
<p class="pfad"><a href="/">Startseite</a> › Alle Erklärungen</p>
<div class="karte">
  <span class="marke">Übersicht</span>
  <h1>Alle Erklärungen</h1>
  <p>${alle.length} Themen, jedes von ganz vorn erklärt — mit Beispiel, den häufigsten Fehlern
    und Übungen, bei denen dir niemand die Lösung hinlegt.</p>
</div>
${Object.values(nachFach).map(({ort, themen}) => `
<div class="karte">
  <h2>${esc(ort.fachname)} · ${esc(stufenText(ort.fach, ort.klasse))}</h2>
  <div class="andere">
    ${themen.map(t => `<a href="/erklaerung/${schnipsel(t)}">${esc(t)} — einfach erklärt</a>`).join("")}
  </div>
</div>`).join("")}`;
  return huelle({
    titel: "Alle Erklärungen — Mathe, Deutsch, Englisch, Elektrotechnik | Endlich kapiert",
    text: `${alle.length} Themen von Klasse 5 bis 10 und für die Ausbildung zum Elektroniker für Betriebstechnik — jedes einzeln und von ganz vorn erklärt.`,
    adresse: "/erklaerungen",
    inhalt
  });
}

/* ---------- Bauen ---------- */
const zielordner = pfad.join(ORDNER, "erklaerung");
if (fs.existsSync(zielordner))
  fs.readdirSync(zielordner).forEach(d => fs.unlinkSync(pfad.join(zielordner, d)));
else fs.mkdirSync(zielordner);

const alle = [];
for (const thema of Object.keys(ERKLAERUNGEN)){
  const ort = themaOrt(thema);
  if (!ort){ console.log("  übersprungen (steht in keinem Katalog): " + thema); continue; }
  alle.push({thema, ort});
}
/* Nachbarn = die anderen Themen derselben Stufe, damit die Seiten sich
   gegenseitig verlinken. Interne Links sind das, was Google folgt. */
alle.forEach(({thema, ort}) => {
  const nachbarn = (KATALOG[ort.fach].themen[ort.klasse] || [])
    .filter(t => t !== thema && ERKLAERUNGEN[t]).slice(0, 6);
  fs.writeFileSync(pfad.join(zielordner, schnipsel(thema) + ".html"),
    themenseite(thema, ERKLAERUNGEN[thema], ort, nachbarn));
});
fs.writeFileSync(pfad.join(ORDNER, "erklaerungen.html"), uebersicht(alle));

/* ---------- sitemap.xml ---------- */
const heute = new Date().toISOString().slice(0, 10);
const adressen = [
  {a: "/", p: "1.0"},
  {a: "/faecher", p: "0.9"},
  {a: "/erklaerungen", p: "0.9"},
  {a: "/vokabeln", p: "0.7"},
  {a: "/warum", p: "0.5"},
  {a: "/ueber", p: "0.4"},
  {a: "/faq", p: "0.4"}
];
Object.entries(KATALOG).forEach(([f, v]) => {
  adressen.push({a: `/${f}`, p: "0.8"});
  Object.keys(v.themen).forEach(k => adressen.push({a: `/${f}/${k}`, p: "0.8"}));
});
alle.forEach(({thema}) => adressen.push({a: `/erklaerung/${schnipsel(thema)}`, p: "0.9"}));

fs.writeFileSync(pfad.join(ORDNER, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adressen.map(u => `  <url><loc>${WURZEL}${u.a}</loc><lastmod>${heute}</lastmod><priority>${u.p}</priority></url>`).join("\n")}
</urlset>
`);

fs.writeFileSync(pfad.join(ORDNER, "robots.txt"),
`User-agent: *
Allow: /

Sitemap: ${WURZEL}/sitemap.xml
`);

console.log(`${alle.length} Themenseiten gebaut, ${adressen.length} Adressen in der sitemap.xml.`);
