/* Prüft alle Aufgaben-Erzeuger: zieht jede Aufgabe viele Male und kontrolliert,
   dass sie lösbar, eindeutig und in sich stimmig ist. */
const fs = require("fs");
const QUELLE = __dirname + "/index.html";
const h = fs.readFileSync(QUELLE, "utf8");

const stueck = (von, bis) => {
  const a = h.indexOf(von), b = h.indexOf(bis);
  if (a < 0 || b < 0 || b <= a) throw new Error("Abschnitt nicht gefunden: " + von);
  return h.slice(a, b);
};

const werkzeuge = stueck("const rnd  =", "/* ---------- Aufgabenerzeuger ---------- */");
const katalog  = stueck("const KATALOG", "/* ---------- Werkzeuge");
const aufgaben = stueck("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */");
const entdopp  = stueck("function entdoppeln(", "\n/* ---------- Fortschritt");

/* Der Abschnitt ab entdoppeln enthält bereits die nachgereichten Deutsch-Themen
   (Object.assign) und die Erklärungen — beides wird hier mit ausgewertet. */
const code = `
${katalog}
${werkzeuge}
${aufgaben}
};
${entdopp}
return {KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln};
`;

let umgebung;
try { umgebung = new Function(code)(); }
catch (e) { console.error("SYNTAXFEHLER beim Laden:", e.message); process.exit(1); }

const { KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln } = umgebung;
const RUNDEN = 3000;
const probleme = [];
const melde = (thema, nr, text) => probleme.push(`${thema} [Variante ${nr}] ${text}`);

const nackt = (s) => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

for (const [thema, erzeuger] of Object.entries(AUFGABEN)) {
  erzeuger.forEach((fn, nr) => {
    for (let i = 0; i < RUNDEN; i++) {
      let a;
      try { a = fn(); } catch (e) { melde(thema, nr, "wirft Fehler: " + e.message); break; }
      try { entdoppeln(a); } catch (e) { melde(thema, nr, "entdoppeln wirft: " + e.message); break; }

      if (!a || typeof a !== "object") { melde(thema, nr, "liefert kein Objekt"); break; }
      if (!a.text || !nackt(a.text)) { melde(thema, nr, "hat keinen Aufgabentext"); break; }
      if (a.loesung === undefined || !nackt(a.loesung)) { melde(thema, nr, "hat keine Lösung"); break; }
      if (!Array.isArray(a.schritte) || !a.schritte.length) { melde(thema, nr, "hat keine Schritte"); break; }

      a.schritte.forEach((s, si) => {
        if (!s.frage || !nackt(s.frage)) melde(thema, nr, `Schritt ${si + 1}: keine Frage`);
        if (!Array.isArray(s.optionen) || s.optionen.length < 2)
          return melde(thema, nr, `Schritt ${si + 1}: weniger als 2 Antworten`);

        const richtige = s.optionen.filter((o) => o.ok);
        if (richtige.length !== 1)
          melde(thema, nr, `Schritt ${si + 1}: ${richtige.length} richtige Antworten (muss genau 1 sein)`);

        const gesehen = new Set();
        s.optionen.forEach((o) => {
          if (o.t === undefined || !nackt(o.t))
            return melde(thema, nr, `Schritt ${si + 1}: leere Antwortmöglichkeit`);
          const k = nackt(o.t);
          if (gesehen.has(k)) melde(thema, nr, `Schritt ${si + 1}: doppelte Antwort „${k}“`);
          gesehen.add(k);
          if (!o.fb || !nackt(o.fb))
            melde(thema, nr, `Schritt ${si + 1}: Antwort „${k}“ ohne Rückmeldung`);
        });

        if (s.tippAntwort !== undefined && !nackt(s.tippAntwort))
          melde(thema, nr, `Schritt ${si + 1}: leerer tippAntwort`);

        /* Die Hilfe läuft in Stufen: erst tipp, dann tipp2. Fehlt der zweite,
           bringt der zweite Druck auf „Ich weiß nicht weiter“ nichts Neues. */
        if (!s.tipp || !nackt(s.tipp))
          melde(thema, nr, `Schritt ${si + 1}: erster Tipp fehlt`);
        if (!s.tipp2 || !nackt(s.tipp2))
          melde(thema, nr, `Schritt ${si + 1}: zweiter Tipp fehlt`);
        else if (nackt(s.tipp2) === nackt(s.tipp))
          melde(thema, nr, `Schritt ${si + 1}: zweiter Tipp ist wortgleich mit dem ersten`);
      });
    }
  });
}

/* Jedes Thema mit Aufgaben braucht auch eine Erklärung — das ist der Kern der App */
for (const thema of Object.keys(AUFGABEN)) {
  const e = ERKLAERUNGEN[thema];
  if (!e) { probleme.push(`${thema}: hat Aufgaben, aber KEINE Erklärung`); continue; }
  if (!e.worum) probleme.push(`${thema} (Erklärung): „worum" fehlt`);
  if (!Array.isArray(e.einfach) || !e.einfach.length) probleme.push(`${thema} (Erklärung): „einfach" fehlt`);
  if (!Array.isArray(e.regeln) || !e.regeln.length) probleme.push(`${thema} (Erklärung): „regeln" fehlen`);
  if (!e.beispiel || !e.beispiel.aufgabe || !e.beispiel.ergebnis)
    probleme.push(`${thema} (Erklärung): Beispiel unvollständig`);
}

/* Abdeckung je Klasse */
console.log("=== ABDECKUNG ===");
let geplant = 0, fertig = 0;
for (const [fk, f] of Object.entries(KATALOG)) {
  const zeilen = [];
  for (const [kl, liste] of Object.entries(f.themen)) {
    const da = liste.filter((t) => AUFGABEN[t]);
    geplant += liste.length; fertig += da.length;
    const wort = f.stufenwort === "Lehrjahr" ? "Lehrjahr" : "Klasse";
    zeilen.push(`  ${wort} ${String(kl).padStart(2)}: ${da.length}/${liste.length}` +
      (da.length ? "  " + da.join(", ") : "   <-- leer"));
  }
  console.log(f.name + "\n" + zeilen.join("\n"));
}
console.log(`\nGesamt: ${fertig}/${geplant} Themen fertig`);

console.log("\n=== PRÜFUNG ===");
const einzig = [...new Set(probleme)];
if (!einzig.length) {
  const n = Object.values(AUFGABEN).reduce((a, v) => a + v.length, 0);
  console.log(`Alles sauber — ${Object.keys(AUFGABEN).length} Themen, ${n} Erzeuger, je ${RUNDEN}× gezogen.`);
} else {
  console.log(`${einzig.length} Problem(e):`);
  einzig.slice(0, 60).forEach((p) => console.log("  ! " + p));
  process.exitCode = 1;
}
