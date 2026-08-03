/* ==========================================================================
   SEITENPRÜFUNG — die App als Ganzes, nicht nur die Aufgaben.

   Die drei anderen Prüfer schauen auf die Inhalte. Dieser hier schaut auf das
   Gerüst: Stimmen die Adressen? Gibt es jede Funktion, die ein Knopf aufruft?
   Fehlt eine Datei? Überschreibt ein doppelter Schlüssel heimlich ein Thema?

   Bewusst ohne Zusatzpakete — es braucht nur Node.

   Aufruf:  node pruefe-seite.js
   ========================================================================== */
const fs = require("fs");
const pfad = __dirname;
const h = fs.readFileSync(pfad + "/index.html", "utf8");

const fehler = [];
const hinweise = [];
const melde = (bereich, txt) => fehler.push(`${bereich}: ${txt}`);

const skript = (h.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i) || [])[1] || "";
const st = (v, b) => { const a = h.indexOf(v); if (a < 0) return "";
                       const c = h.indexOf(b, a + v.length); return c < 0 ? "" : h.slice(a, c); };

/* ------------------------------------------------------- 1. JS-Syntax */
try { new Function(skript); }
catch (e) { melde("JavaScript", "Syntaxfehler — " + e.message); }

/* ------------------------------------- 2. doppelte Schlüssel in Objekten */
/* Ein zweites Mal derselbe Themenname überschreibt das erste Thema still und
   leise. Das fällt sonst niemandem auf, deshalb hier gezielt gesucht. */
function doppelte(abschnitt, name, muster) {
  const gesehen = new Map();
  for (const m of abschnitt.matchAll(muster)) {
    const k = m[1];
    gesehen.set(k, (gesehen.get(k) || 0) + 1);
  }
  [...gesehen].filter(([, n]) => n > 1)
    .forEach(([k, n]) => melde(name, `„${k}“ steht ${n}-mal drin — der spätere Eintrag überschreibt den früheren`));
}
doppelte(st("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */"),
  "AUFGABEN", /^"([^"]+)":\s*\[/gm);
doppelte(st("const ERKLAERUNGEN", "\n};\n\nfunction hatErklaerung"),
  "ERKLAERUNGEN", /^"([^"]+)":\s*\{/gm);

/* --------------------------------------- 3. Themennamen gegen den KATALOG */
const werkzeuge = st("const rnd  =", "/* ---------- Aufgabenerzeuger ---------- */");
const katalog   = st("const KATALOG", "/* ---------- Werkzeuge");
const aufgaben  = st("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */");
const rest      = st("function entdoppeln(", "\n/* ---------- Fortschritt");

let umgebung = null;
try {
  umgebung = new Function(`${katalog}\n${werkzeuge}\n${aufgaben}\n};\n${rest}\nreturn {KATALOG, AUFGABEN, ERKLAERUNGEN};`)();
} catch (e) { melde("Daten", "Aufgaben oder Erklärungen nicht ladbar — " + e.message); }

if (umgebung) {
  const { KATALOG, AUFGABEN, ERKLAERUNGEN } = umgebung;
  const geplant = new Set();
  for (const f of Object.values(KATALOG))
    for (const liste of Object.values(f.themen)) liste.forEach((t) => geplant.add(t));

  Object.keys(AUFGABEN).forEach((t) => {
    if (!geplant.has(t))
      melde("AUFGABEN", `„${t}“ steht in keinem Klassenplan — Tippfehler? Die Aufgabe wäre unerreichbar`);
  });
  Object.keys(ERKLAERUNGEN).forEach((t) => {
    if (!geplant.has(t)) melde("ERKLAERUNGEN", `„${t}“ steht in keinem Klassenplan`);
  });
  Object.keys(AUFGABEN).forEach((t) => {
    if (!ERKLAERUNGEN[t]) melde("ERKLAERUNGEN", `zu „${t}“ fehlt die Erklärung`);
  });

  const ohne = [...geplant].filter((t) => !AUFGABEN[t]);
  if (ohne.length) hinweise.push(`${ohne.length} geplante Themen haben noch keine Aufgaben: ${ohne.join(", ")}`);
}

/* ------------------------------------------- 4. Adressen und Wegweiser */
/* Jede Adresse, die ein Link ansteuert, muss beim Neuladen wieder auf
   dieselbe Ansicht führen — sonst landet man auf der Startseite. */
const pfadFuerCode = st("function pfadFuer(", "function aktuellerPfad()");
const ansichtCode  = st("function ansichtAusPfad()", "function navSpeichern()");

const bekannteDirekt = new Set();
const direktBlock = (ansichtCode.match(/const direkt = \{([\s\S]*?)\};/) || [])[1] || "";
for (const m of direktBlock.matchAll(/(\w+)\s*:/g)) bekannteDirekt.add(m[1]);
if (!bekannteDirekt.size) melde("Wegweiser", "die Zuordnung Adresse → Ansicht wurde nicht gefunden");

const faecher = umgebung ? Object.keys(umgebung.KATALOG) : ["mathe", "deutsch"];
const adressen = new Set();
for (const m of h.matchAll(/navLink\(\s*[`"']([^`"'$]*)/g)) if (m[1].startsWith("/")) adressen.add(m[1]);
for (const m of h.matchAll(/href="(\/[^"${]*)"/g)){
  /* .svg, .webmanifest … sind Dateien, keine Routen — die festen
     Erklärseiten tragen die Endung aber bewusst und werden geprüft. */
  if (!/\.[a-z0-9]+$/i.test(m[1]) || /^\/erklaerung/.test(m[1])) adressen.add(m[1]);
}

/* Feste Seiten außerhalb der App: Sie werden nicht von der App aufgelöst,
   sondern liegen als eigene HTML-Datei auf der Platte. Für sie gilt die
   umgekehrte Prüfung — es muss die Datei geben. */
const feste = (adr) => {
  if (adr === "/erklaerungen.html") return "erklaerungen.html";
  const m = adr.match(/^\/erklaerung\/(.+\.html)$/);
  return m ? "erklaerung/" + m[1] : null;
};

adressen.forEach((adr) => {
  const teile = adr.split("/").filter(Boolean);
  if (!teile.length) return;                                  /* "/" ist die Startseite */
  const datei = feste(adr);
  if (datei){
    if (!fs.existsSync(__dirname + "/" + datei))
      melde("Adressen", `„${adr}“ wird verlinkt, aber die Datei ${datei} gibt es nicht — „node seiten-bauen.js“ vergessen?`);
    return;
  }
  if (faecher.includes(teile[0])) return;                     /* /mathe , /mathe/8 */
  if (bekannteDirekt.has(teile[0])) return;
  melde("Adressen", `„${adr}“ wird verlinkt, aber beim Neuladen erkennt die App sie nicht — man landet auf der Startseite`);
});

/* und die Gegenrichtung: jede Ansicht braucht eine Adresse */
const ansichten = [...pfadFuerCode.matchAll(/case "(\w+)":/g)].map((m) => m[1]);
if (!ansichten.length) melde("Wegweiser", "keine Ansicht-zu-Adresse-Zuordnung gefunden");
[...bekannteDirekt].forEach((p) => {
  const ziel = (direktBlock.match(new RegExp(p + '\\s*:\\s*"(\\w+)"')) || [])[1];
  if (ziel && !ansichten.includes(ziel))
    melde("Wegweiser", `Adresse „/${p}“ führt zur Ansicht „${ziel}“, die aber keine eigene Adresse zurückgibt`);
});

/* ------------------------------------- 5. aufgerufene Funktionen prüfen */
const definiert = new Set();
for (const m of skript.matchAll(/function\s+([A-Za-zÄÖÜäöü_$][\w$]*)\s*\(/g)) definiert.add(m[1]);
for (const m of skript.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>/g)) definiert.add(m[1]);

const aufgerufen = new Set();
for (const m of h.matchAll(/on(?:click|change|input|keydown|submit)="([^"]*)"/g)) {
  for (const f of m[1].matchAll(/(^|[^.\w$])([A-Za-zÄÖÜäöü_$][\w$]*)\s*\(/g)) aufgerufen.add(f[2]);
}
for (const m of h.matchAll(/navLink\([^,]+,\s*[`"']([^`"']*)/g)) {
  for (const f of m[1].matchAll(/(^|[^.\w$])([A-Za-zÄÖÜäöü_$][\w$]*)\s*\(/g)) aufgerufen.add(f[2]);
}
const eingebaut = new Set(["if", "for", "while", "switch", "catch", "return", "typeof", "Number", "String",
  "Math", "Array", "Object", "JSON", "parseInt", "parseFloat", "alert", "confirm", "console", "setTimeout",
  "navKlick", "Boolean", "Date", "isNaN", "encodeURIComponent", "decodeURIComponent"]);
[...aufgerufen].forEach((f) => {
  if (!definiert.has(f) && !eingebaut.has(f))
    melde("Knöpfe", `„${f}()“ wird von einem Element aufgerufen, ist aber nirgends definiert`);
});

/* --------------------------------------------- 6. verwendete Symbole */
const symBlock = st("const SYM = {", "\n};");
const symDa = new Set([...symBlock.matchAll(/^\s{2}(\w+)\s*:/gm)].map((m) => m[1]));
for (const m of h.matchAll(/SYM\.(\w+)/g))
  if (!symDa.has(m[1])) melde("Symbole", `SYM.${m[1]} wird benutzt, ist aber nicht definiert`);

/* ------------------------------------------------- 7. Dateien und JSON */
[["icon.svg", "Icon"], ["manifest.webmanifest", "PWA-Manifest"], ["sw.js", "Service Worker"],
 ["vercel.json", "Vercel-Konfiguration"], ["quellen.json", "Quellenverzeichnis"]].forEach(([datei, was]) => {
  if (!fs.existsSync(pfad + "/" + datei)) return melde("Dateien", `${was} (${datei}) fehlt`);
  if (datei.endsWith(".json") || datei.endsWith(".webmanifest")) {
    try { JSON.parse(fs.readFileSync(pfad + "/" + datei, "utf8")); }
    catch (e) { melde("Dateien", `${datei} ist kein gültiges JSON — ${e.message}`); }
  }
});

/* im HTML verlinkte eigene Dateien müssen existieren */
for (const m of h.matchAll(/(?:href|src)="(?!https?:|data:|mailto:|#)([^"${]+)"/g)) {
  const ziel = m[1].replace(/^\//, "").split("?")[0];
  if (!/\.[a-z0-9]+$/i.test(ziel)) continue;            /* Route der App, keine Datei */
  if (ziel && !fs.existsSync(pfad + "/" + ziel))
    melde("Dateien", `verlinkt, aber nicht vorhanden: ${m[1]}`);
}

/* SPA-Umschreibung muss da sein, sonst sind Direktlinks tot */
try {
  const v = JSON.parse(fs.readFileSync(pfad + "/vercel.json", "utf8"));
  const hatRewrite = (v.rewrites || []).some((r) => r.destination === "/index.html");
  if (!hatRewrite) melde("Vercel", "keine Umschreibung auf /index.html — Direktlinks wie /mathe/8 liefern dann 404");
} catch (e) { /* oben schon gemeldet */ }

/* ------------------------------------------------------- 8. Grundgerüst */
[["<title>", "Seitentitel"], ["viewport", "Viewport-Angabe (Handy-Darstellung)"],
 ["manifest.webmanifest", "Verweis auf das PWA-Manifest"], ["lang=\"de\"", "Sprachangabe lang=\"de\""],
 ["theme-color", "Theme-Farbe"]].forEach(([was, name]) => {
  if (!h.includes(was)) melde("Grundgerüst", `${name} fehlt im HTML`);
});
if (!/id="screen"/.test(h)) melde("Grundgerüst", "der Hauptbereich #screen fehlt");

/* --------------------------------------------------------- Ausgabe */
console.log("=== SEITENPRÜFUNG ===");
console.log(`  ${adressen.size} verlinkte Adressen`);
console.log(`  ${aufgerufen.size} von Knöpfen aufgerufene Funktionen`);
console.log(`  ${symDa.size} Symbole`);
if (umgebung) console.log(`  ${Object.keys(umgebung.AUFGABEN).length} Themen mit Aufgaben`);

if (hinweise.length) { console.log("\n=== HINWEISE ==="); hinweise.forEach((x) => console.log("  · " + x)); }

console.log("\n=== ERGEBNIS ===");
const einzig = [...new Set(fehler)];
if (!einzig.length) console.log("Die Seite ist in sich stimmig: Adressen, Knöpfe, Symbole und Dateien passen zusammen.");
else { console.log(`${einzig.length} Fund(e):`); einzig.forEach((f) => console.log("  ! " + f)); process.exitCode = 1; }
