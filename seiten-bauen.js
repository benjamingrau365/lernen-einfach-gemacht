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
return {KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln};`)();
const { KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln } = umgebung;

/* Jedes Fach hat seine Farbe — dieselbe wie in der App, damit die Seite,
   auf der jemand von Google landet, und die App wie ein Stück wirken. */
const FACHFARBE = {
  mathe:        {hell:"#1f4fa8", weich:"#e8eefb", dunkel:"#173c80", dnk:"#8fb0ee", dweich:"#141d2e"},
  deutsch:      {hell:"#c22f24", weich:"#fdeae8", dunkel:"#9b241b", dnk:"#f0938a", dweich:"#2c1614"},
  englisch:     {hell:"#0f6f6a", weich:"#e0f2f1", dunkel:"#0b5551", dnk:"#4fc4bd", dweich:"#12302e"},
  elektroniker: {hell:"#a06c00", weich:"#fbf2dd", dunkel:"#7f5600", dnk:"#e3bd6a", dweich:"#2a2211"}
};
const farbeVon = (f) => FACHFARBE[f] || FACHFARBE.mathe;

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
  /* Die Ausbildungsthemen sind der Teil, für den es im Netz am wenigsten
     Brauchbares gibt — dort lohnt sich die Mühe mit den Suchbegriffen am
     meisten. Getippt wird, was im Betrieb gesagt wird, nicht was im
     Lehrplan steht. */
  "Ohmsches Gesetz": ["U = R · I", "Strom Spannung Widerstand berechnen"],
  "Elektrische Leistung und Arbeit": ["P = U · I", "Leistung berechnen", "Wirkarbeit kWh"],
  "Reihenschaltung": ["Widerstände in Reihe berechnen", "Gesamtwiderstand Reihenschaltung"],
  "Parallelschaltung": ["Widerstände parallel berechnen", "Gesamtwiderstand Parallelschaltung"],
  "Einheiten und Vorsätze": ["Milli Mikro Kilo umrechnen", "Zehnerpotenzen Technik"],
  "Widerstände und Farbcode": ["Farbcode Widerstand ablesen", "Widerstand Ringe Bedeutung"],
  "Sicherheitsregeln": ["Die fünf Sicherheitsregeln", "Freischalten gegen Wiedereinschalten sichern"],
  "Ladung und Strom": ["Q = I · t", "Ladungsmenge berechnen"],
  "Spannungsteiler": ["Spannungsteiler berechnen", "unbelasteter Spannungsteiler Formel"],
  "Frequenz und Periodendauer": ["50 Hz Periodendauer", "T = 1 durch f"],
  "Leiterquerschnitt": ["Querschnitt berechnen", "Kabelquerschnitt", "Spannungsfall Leitung"],
  "Schutzmaßnahmen": ["Schutzleiter RCD FI", "Schutz gegen elektrischen Schlag"],
  "Gemischte Schaltungen": ["gemischte Schaltung Gesamtwiderstand", "Reihe und parallel zusammen"],
  "Spule und Induktivität": ["Induktivität berechnen", "Blindwiderstand Spule XL"],
  "Kondensator im Wechselstrom": ["kapazitiver Blindwiderstand XC", "Kondensator Wechselstrom berechnen"],
  "Diode und Gleichrichter": ["Brückengleichrichter", "Diode Durchlassspannung"],
  "Stern und Dreieck": ["Sternschaltung Dreieckschaltung", "Strangspannung Außenleiterspannung"],
  "Transformator": ["Trafo berechnen", "Übersetzungsverhältnis"],
  "Wirkungsgrad": ["Wirkungsgrad berechnen Motor", "Eta Formel Technik"],
  "Motor und Drehzahl": ["Drehzahl Polpaarzahl berechnen", "Synchrondrehzahl Drehstrommotor"],
  "Messen im Betrieb": ["Multimeter richtig messen", "Strommessung Spannungsmessung"],
  "Netzformen": ["TN-S TN-C TT IT", "Netzformen Unterschied"],
  "Frequenzumrichter": ["Frequenzumrichter Drehzahl einstellen", "U/f-Kennlinie"],
  "Beleuchtung berechnen": ["Lux berechnen Raum", "Beleuchtungsstärke Lichtstrom"],
  "Kondensator laden": ["Ladekurve Kondensator Tau", "RC-Glied Zeitkonstante"],
  "Blindleistung und cos φ": ["Blindleistung berechnen", "Leistungsfaktor", "Blindstromkompensation"],
  "Energiekosten": ["Stromkosten berechnen kWh", "Verbrauch in Euro"],
  "Logikverknüpfungen": ["UND ODER NICHT Verknüpfung", "Wahrheitstabelle SPS"],
  "Fehler suchen": ["Fehlersuche Schaltung systematisch", "Störungssuche Anlage"],
  "Instandhaltung und Verfügbarkeit": ["MTBF MTTR berechnen", "Verfügbarkeit Anlage"],
  "Angebot kalkulieren": ["Angebot kalkulieren Handwerk", "Stundenverrechnungssatz"],
  "Anlage prüfen und protokollieren": ["Prüfprotokoll DGUV V3", "Erstprüfung Messwerte"],
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
   Diese Seiten sind ab sofort die Eingangstür: Wer über Google kommt, sieht
   sie zuerst und entscheidet in drei Sekunden, ob er bleibt. Deshalb dürfen
   sie nicht wie ein abgetipptes Schulbuch aussehen. Trotzdem ohne fremde
   Dateien — alles inline, damit die Seite sofort dasteht. */
const STIL = `
:root{--bg:#f4f8f7;--card:#fff;--ink:#16211e;--soft:#5b6b66;--line:#dfe8e5;
  --ac:#10a37f;--ac-soft:#e4f5ef;--ac-dark:#0b7a5f;--red:#b3382f;--red-soft:#fdecea;
  --amber:#8a5a09;--amber-soft:#fdf3e0;--knopfschrift:#fff;--schatten:0 1px 2px rgba(16,33,30,.05),0 8px 24px -18px rgba(16,33,30,.5)}
@media (prefers-color-scheme:dark){:root{--bg:#101614;--card:#18201d;--ink:#e8efec;
  --soft:#9bada7;--line:#2a3733;--ac:#2fbf99;--ac-soft:#17302a;--ac-dark:#7fe0c4;
  --red:#f08a80;--red-soft:#301a18;--amber:#e0b467;--amber-soft:#2c2415;
  /* Im Dunkelmodus ist das Grün heller — dann braucht der Knopf dunkle Schrift,
     sonst steht Weiß auf Hellgrün und man liest es kaum. */
  --knopfschrift:#06231c;
  --schatten:0 1px 2px rgba(0,0,0,.3)}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);-webkit-text-size-adjust:100%;
  font:17px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.huelle{max-width:760px;margin:0 auto;padding:0 18px 60px}
a{color:var(--fach-dark)}

/* Kopfleiste wie in der App, damit man merkt: gleiches Haus */
.leiste{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 0 18px;margin-bottom:6px}
.wortmarke{display:flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink);
  font-weight:900;letter-spacing:-.02em;font-size:18px}
.zeichen{width:32px;height:32px;border-radius:10px;background:var(--ac);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900}
.leiste .mini{font-size:14px;font-weight:700;color:var(--fach-dark);text-decoration:none;
  border:1.5px solid var(--fach);border-radius:999px;padding:7px 15px;white-space:nowrap}

.pfad{font-size:14px;color:var(--soft);margin:0 0 16px}
.pfad a{color:var(--soft)}
.karte{background:var(--card);border:1.5px solid var(--line);border-radius:18px;
  padding:24px 26px;margin-bottom:16px;box-shadow:var(--schatten)}
.karte.kopf{border-color:transparent;background:var(--fach-soft)}
h1{font-size:clamp(28px,6vw,38px);line-height:1.15;margin:0 0 12px;letter-spacing:-.025em}
h2{font-size:21px;margin:0 0 12px;letter-spacing:-.015em}
h3{font-size:16px;margin:18px 0 6px}
p{margin:0 0 12px}
p:last-child{margin-bottom:0}
ul,ol{margin:0 0 12px;padding-left:22px}
li{margin-bottom:7px}
.vorsatz{font-size:17px;color:var(--fach-dark);font-weight:600}
.marke{display:inline-block;font-size:12.5px;font-weight:800;letter-spacing:.07em;
  text-transform:uppercase;color:#fff;background:var(--fach);
  border-radius:999px;padding:5px 13px;margin-bottom:14px}
.auch{font-size:14.5px;color:var(--soft);margin:0 0 14px}
.knopf{display:block;text-align:center;background:var(--ac);color:var(--knopfschrift);text-decoration:none;
  font-weight:700;border-radius:14px;padding:16px 20px;margin-top:8px;font-size:17px}
.knopf.leise{background:transparent;color:var(--fach-dark);border:1.6px solid var(--fach);margin-top:10px}
.knopf small{display:block;font-weight:500;font-size:13.5px;opacity:.85;margin-top:2px}

/* Was einen hier erwartet — die drei Punkte, die uns von anderen unterscheiden */
.punkte{display:grid;gap:12px;margin:0}
.punkt{display:flex;gap:13px;align-items:flex-start}
.punkt .haken{flex:none;width:24px;height:24px;border-radius:8px;background:var(--ac-soft);
  color:var(--ac-dark);display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:900;margin-top:2px}
.punkt b{display:block;margin-bottom:1px}
.punkt span{font-size:15.5px;color:var(--soft)}

/* Eine echte Aufgabe als Vorschau */
.probe{border:1.5px dashed var(--fach);border-radius:14px;padding:17px 19px;background:var(--fach-soft)}
.probefrage{font-size:18px;font-weight:700;margin:0 0 14px}
.probeschritt{font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:var(--fach-dark);margin:0 0 6px}
.wahl{display:grid;gap:8px;margin-top:12px}
.wahl div{background:var(--card);border:1.5px solid var(--line);border-radius:11px;
  padding:11px 14px;font-size:15.5px}
.abbruch{margin:14px 0 0;font-size:15px;color:var(--soft)}

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
.fuss{font-size:14px;color:var(--soft);text-align:center;margin-top:26px;line-height:2}
.fuss a{color:var(--soft)}
.andere{display:grid;gap:8px}
.andere a{display:flex;justify-content:space-between;align-items:center;gap:10px;
  background:var(--card);border:1.5px solid var(--line);
  border-radius:12px;padding:13px 16px;text-decoration:none;color:var(--ink);font-weight:600}
.andere a span{color:var(--soft);font-weight:400;font-size:20px;line-height:1}
`;

function huelle({titel, text, adresse, inhalt, jsonld, fach}){
  const f = farbeVon(fach);
  const farbstil = `<style>
:root{--fach:${f.hell};--fach-soft:${f.weich};--fach-dark:${f.dunkel}}
@media (prefers-color-scheme:dark){:root{--fach:${f.dnk};--fach-soft:${f.dweich};--fach-dark:${f.dnk}}}
</style>`;
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
${farbstil}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body>
<div class="huelle">
<div class="leiste">
  <a class="wortmarke" href="/"><span class="zeichen">Ek</span>Endlich kapiert</a>
  <a class="mini" href="/faecher">Üben</a>
</div>
${inhalt}
<p class="fuss"><a href="/">Startseite</a> · <a href="/erklaerungen">Alle Erklärungen</a>
  · <a href="/warum">Warum keine KI-Lösungen?</a><br>
  <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a><br>
  Ein Lernprojekt aus Deutschland · kostenlos, ohne Werbung</p>
</div>
</body>
</html>`;
}

/* ---------- Eine echte Aufgabe als Vorschau ----------
   Der stärkste Satz über diese App ist keiner, sondern ein Beispiel: Man sieht
   sofort, dass hier gefragt und nicht vorgesagt wird. Gezogen wird beim Bauen
   einmal, dann steht sie fest. Die Lösung steht bewusst NICHT dabei — sonst
   wäre die Seite genau das, wogegen das ganze Projekt gebaut ist. */
function probeAufgabe(thema){
  const erzeuger = AUFGABEN[thema];
  if (!erzeuger || !erzeuger.length) return "";
  let a, s;
  /* Ein paar Versuche, bis eine Aufgabe mit brauchbarem ersten Schritt kommt.
     Harte Bedingung: In der Vorschau darf die Lösung nirgends auftauchen.
     Sonst wäre ausgerechnet die Seite, die für „nie die Lösung“ wirbt, die
     Stelle, an der man sie abschreiben kann. */
  for (let i = 0; i < 40 && !a; i++){
    try {
      const kandidat = erzeuger[i % erzeuger.length]();
      entdoppeln(kandidat);
      if (!kandidat || !kandidat.text || !kandidat.schritte || kandidat.schritte.length < 2) continue;
      const erster = kandidat.schritte[0];
      if (!erster.optionen || erster.optionen.length < 2) continue;
      /* Geprüft werden Frage und Tipp — nicht die Aufgabenstellung (dort steht
         das gesuchte Wort oft zu Recht schon drin, etwa bei „Setz some oder any
         ein“) und nicht die Antwortmöglichkeiten (die stehen unmarkiert da,
         genau wie in der App — daraus lässt sich nichts abschreiben). */
      const loesung = nackt(kandidat.loesung || "");
      const heikel = nackt([erster.frage, erster.tipp || ""].join(" "));
      if (loesung && loesung.length > 1 && heikel.includes(loesung)) continue;
      a = kandidat; s = erster;
    } catch(e){ /* nächste Variante versuchen */ }
  }
  if (!a) return "";
  return `
<div class="karte">
  <h2>So sieht das beim Üben aus</h2>
  <p style="color:var(--soft);font-size:15.5px;margin-bottom:16px">Eine echte Aufgabe aus diesem Thema.
    Du bekommst sie nicht vorgerechnet — du wirst hingeführt.</p>
  <div class="probe">
    <p class="probeschritt">Die Aufgabe</p>
    <p class="probefrage">${zahm(a.text)}</p>
    <p class="probeschritt">Erste Frage an dich</p>
    <p style="margin:0">${zahm(s.frage)}</p>
    <div class="wahl">
      ${s.optionen.slice(0, 3).map(o => `<div>${zahm(o.t)}</div>`).join("")}
    </div>
    <p class="abbruch">Danach kommen ${a.schritte.length - 1} weitere Fragen —
      und am Schluss schreibst du die Antwort selbst hin.
      ${s.tipp ? `Wenn du nicht weiterweißt, gibt es einen Tipp: <i>${zahm(s.tipp)}</i>` : ""}</p>
  </div>
</div>`;
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

<div class="karte kopf">
  <span class="marke">${esc(ort.fachname)} · ${esc(stufe)}</span>
  <h1>${esc(thema)} — einfach erklärt</h1>
  ${auchGenannt(thema).length
    ? `<p class="auch">Oft auch gesucht als: ${auchGenannt(thema).map(esc).join(" · ")}</p>`
    : ""}
  ${e.worum ? `<p class="vorsatz">${zahm(e.worum)}</p>` : ""}
  <a class="knopf" href="/${ort.fach}/${ort.klasse}">${esc(thema)} jetzt üben
    <small>${anzahl ? "Kostenlos, ohne Anmeldung" : "Zum Fach"} · du bekommst nie die Lösung, nur Fragen</small></a>
</div>

<div class="karte">
  <h2>Was dich hier erwartet</h2>
  <div class="punkte">
    <div class="punkt"><span class="haken">✓</span><div><b>Erklärt von ganz vorn</b>
      <span>Ohne Vorwissen, ein Satz nach dem anderen. Wer es schon kann, überspringt es.</span></div></div>
    <div class="punkt"><span class="haken">✓</span><div><b>Nie die fertige Lösung</b>
      <span>Du bekommst Fragen, die dich hinführen. Abschreiben geht hier nicht — verstehen schon.</span></div></div>
    <div class="punkt"><span class="haken">✓</span><div><b>Was hakt, kommt wieder</b>
      <span>Nach einem Tag, nach drei Tagen, nach einer Woche. So lange, bis es sitzt.</span></div></div>
  </div>
</div>

${probeAufgabe(thema)}

${e.einfach && e.einfach.length ? `<div class="karte">
  <h2>${esc(thema)} von ganz vorn</h2>
  <p style="color:var(--soft);font-size:15.5px">Ein Satz nach dem anderen, ohne Vorwissen.</p>
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
    ${nachbarn.map(n => `<a href="/erklaerung/${schnipsel(n)}">${esc(n)} — einfach erklärt<span>›</span></a>`).join("")}
  </div>
  <a class="knopf leise" href="/erklaerungen">Alle Erklärungen ansehen</a>
</div>

<div class="karte kopf">
  <h2>Lesen reicht nicht</h2>
  <p>Verstanden hast du es erst, wenn du es selbst hinschreiben kannst. Genau dafür ist
    diese Seite gebaut: Du bekommst nie die fertige Lösung, sondern Fragen, die dich
    hinführen — und am Schluss schreibst du die Antwort selbst.</p>
  <p>Kostenlos, ohne Werbung. Ein Konto brauchst du nur, wenn sich die Seite merken soll,
    was bei dir noch hakt.</p>
  <a class="knopf" href="/${ort.fach}/${ort.klasse}">${esc(thema)} jetzt üben
    <small>${anzahl ? anzahl + (anzahl === 1 ? " Aufgabentyp" : " Aufgabentypen") + ", immer neue Zahlen" : "Zum Fach"}</small></a>
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
    fach: ort.fach,
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
