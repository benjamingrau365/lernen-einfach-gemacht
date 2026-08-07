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
return {KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln, istEintippbar, zahlTeile, baueAufgabe};
`;

let umgebung;
try { umgebung = new Function(code)(); }
catch (e) { console.error("SYNTAXFEHLER beim Laden:", e.message); process.exit(1); }

const { KATALOG, AUFGABEN, ERKLAERUNGEN, entdoppeln, istEintippbar, zahlTeile, baueAufgabe } = umgebung;
const RUNDEN = 3000;
const probleme = [];
const melde = (thema, nr, text) => probleme.push(`${thema} [Variante ${nr}] ${text}`);

const nackt = (s) => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

for (const [thema, erzeuger] of Object.entries(AUFGABEN)) {
  erzeuger.forEach((fn, nr) => {
    for (let i = 0; i < RUNDEN; i++) {
      let a;
      /* Geprüft wird die fertige Aufgabe, nicht das, was der Erzeuger abliefert.
         Dazwischen liegen entdoppeln, der Schätzschritt und das Auffüllen der
         Antwortmöglichkeiten — genau dort sind schon Fehler entstanden, die
         hier vorher niemand sah, weil die Prüfung den Erzeuger direkt aufrief. */
      try { a = baueAufgabe(thema, nr); }
      catch (e) { melde(thema, nr, "wirft Fehler: " + e.message); break; }

      if (!a || typeof a !== "object") { melde(thema, nr, "liefert kein Objekt"); break; }
      if (!a.text || !nackt(a.text)) { melde(thema, nr, "hat keinen Aufgabentext"); break; }
      if (a.loesung === undefined || !nackt(a.loesung)) { melde(thema, nr, "hat keine Lösung"); break; }
      if (!Array.isArray(a.schritte) || !a.schritte.length) { melde(thema, nr, "hat keine Schritte"); break; }

      /* In der Standardeinstellung „gemischt" ist nur der LETZTE Schritt zum
         Eintippen. Endet eine Aufgabe mit einer Zusammenfassungsfrage, wurde die
         eigentliche Antwort vorher angeklickt — dann schreibt der Lernende nie
         selbst etwas hin, und genau darauf läuft die ganze App hinaus.
         Alle Aufgaben erfüllen das inzwischen — deshalb ist es jetzt eine
         harte Regel und keine Empfehlung mehr. */
      /* Seit hinter dem Rechenschritt ein Abschluss stehen darf, muss nicht mehr
         der letzte Schritt eintippbar sein — aber einer muss es, sonst schreibt
         der Lernende nie selbst etwas hin, und darauf laeuft die ganze App
         hinaus. Der Abschluss darf ausserdem nur EIN Schritt sein. */
      const tippbar = a.schritte.map(istEintippbar);
      const letzterTipp = tippbar.lastIndexOf(true);
      if (letzterTipp < 0)
        melde(thema, nr, "kein einziger Schritt laesst sich eintippen — dann bleibt es reines Anklicken");
      else if (a.schritte.length - 1 - letzterTipp > 1)
        melde(thema, nr, `nach dem Eintippschritt stehen noch ${a.schritte.length - 1 - letzterTipp} Schritte — hoechstens einer ist erlaubt`);

      a.schritte.forEach((s, si) => {
        if (!s.frage || !nackt(s.frage)) melde(thema, nr, `Schritt ${si + 1}: keine Frage`);
        if (!Array.isArray(s.optionen) || s.optionen.length < 2)
          return melde(thema, nr, `Schritt ${si + 1}: weniger als 2 Antworten`);

        /* Passt die Frage zu dem, was man anklicken kann?
           Gefunden hat das ein Nutzer, nicht diese Prüfung: Bei „Erzählen“
           lautete die Frage „Was ist an B besser?“ — zur Auswahl standen „A“,
           „B“ und „Beide gleich“. Das sind Antworten auf die Frage *welcher*,
           nicht auf *was*. Wer die Frage las und dann B anklickte, hatte recht,
           ohne zu verstehen, warum.
           Zahlen zählen nicht als Auswahlmarke — „Was ergibt 4 + 5?“ → „9“ ist
           völlig richtig. Und Fragen, die den Buchstaben selbst nennen
           („Welcher Satz — A oder B?“), sind ebenfalls in Ordnung. */
        const fragetext = nackt(s.frage);
        if (/^(was|warum|wieso|weshalb|wodurch|woran)\b/i.test(fragetext)
            && !/\bA\b[^.]*\bB\b/.test(fragetext)) {
          const marken = s.optionen
            .map((o) => nackt(o.t))
            .filter((t) => /^([A-H]|beide( gleich)?|beides|keins?|keiner|keines|alle)$/i.test(t));
          if (marken.length >= 2)
            melde(thema, nr, `Schritt ${si + 1}: die Frage „${fragetext}“ fragt nach dem Was, `
              + `zur Auswahl stehen aber nur Marken (${marken.join(", ")}) — das beantwortet ein Welcher`);
        }

        const richtige = s.optionen.filter((o) => o.ok);
        if (richtige.length !== 1)
          melde(thema, nr, `Schritt ${si + 1}: ${richtige.length} richtige Antworten (muss genau 1 sein)`);

        const gesehen = new Set();
        /* Zwei Antworten können verschieden geschrieben sein und trotzdem
           dieselbe Zahl meinen: „0“ und „-0“, „08“ und „8“. Dann steht neben
           der richtigen Antwort dieselbe Zahl noch einmal, markiert als
           falsch — wer sie anklickt, bekommt zu Unrecht ein Falsch. Deshalb
           wird hier nicht nur der Text verglichen, sondern auch der Wert. */
        const werte = new Map();
        s.optionen.forEach((o) => {
          if (o.t === undefined || !nackt(o.t))
            return melde(thema, nr, `Schritt ${si + 1}: leere Antwortmöglichkeit`);
          const k = nackt(o.t);
          if (gesehen.has(k)) melde(thema, nr, `Schritt ${si + 1}: doppelte Antwort „${k}“`);
          gesehen.add(k);

          const teile = zahlTeile(k);
          if (teile) {
            const wertschluessel = `${teile.wert}|${teile.suffix}`;
            if (werte.has(wertschluessel) && werte.get(wertschluessel) !== k)
              melde(thema, nr, `Schritt ${si + 1}: „${werte.get(wertschluessel)}“ und „${k}“ sind dieselbe Zahl`);
            werte.set(wertschluessel, k);
          }

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

/* ---------- Wie viel Abwechslung gibt es? ----------
   Gemeldet von Benjamin: „Es gibt zu viele gleiche Sätze. Und nicht nur
   gleiche Sätze, sondern gleiche Antwortmöglichkeiten.“ Er hat recht, und
   bis hierher hat es niemand gemessen.

   Zwei Zahlen je Thema:
     · wie viele verschiedene Aufgabentexte überhaupt herauskommen können
     · wie viele Schritte immer wortgleich dieselben Antworten anbieten

   Beides ist keine Fehlermeldung — ein Thema mit wenigen Fällen ist nicht
   kaputt, nur dünn. Aber ohne die Zahl sieht man nicht, wo es dünn ist. */
const VIELFALT_ZUEGE = 220;
const vielfalt = [];
for (const [thema, erzeuger] of Object.entries(AUFGABEN)) {
  const texte = new Set();
  const proSchritt = new Map();
  erzeuger.forEach((fn, nr) => {
    for (let i = 0; i < VIELFALT_ZUEGE; i++) {
      let a; try { a = baueAufgabe(thema, nr); } catch (e) { break; }
      texte.add(nackt(a.text));
      (a.schritte || []).forEach((s, si) => {
        const k = nr + "|" + si;
        if (!proSchritt.has(k)) proSchritt.set(k, new Set());
        /* Starr heißt: Auswahl UND richtige Antwort sind immer dieselben.
           Ein Ja/Nein-Schritt, bei dem mal das eine und mal das andere
           stimmt, ist nicht starr — man muss jedes Mal neu überlegen. */
        proSchritt.get(k).add(s.optionen.map((o) => nackt(o.t)).sort().join("¦")
          + " ⇒ " + nackt((s.optionen.find((o) => o.ok) || {}).t));
      });
    }
  });
  const starr = [...proSchritt.values()].filter((m) => m.size === 1).length;
  vielfalt.push({ thema, erzeuger: erzeuger.length, texte: texte.size,
                  schritte: proSchritt.size, starr });
}
const duenn = vielfalt.filter((v) => v.texte < 12).sort((a, b) => a.texte - b.texte);
const starrGesamt = vielfalt.reduce((a, v) => a + v.starr, 0);
const schrGesamt  = vielfalt.reduce((a, v) => a + v.schritte, 0);
console.log("\n=== ABWECHSLUNG ===");
console.log(`  ${vielfalt.reduce((a, v) => a + v.texte, 0)} verschiedene Aufgabentexte aus `
  + `${vielfalt.reduce((a, v) => a + v.erzeuger, 0)} Erzeugern`);
console.log(`  ${starrGesamt} von ${schrGesamt} Schritten bieten immer dieselben Antworten `
  + `(${Math.round(starrGesamt / schrGesamt * 100)} %)`);
if (duenn.length) {
  console.log(`  ${duenn.length} Themen mit weniger als 12 verschiedenen Aufgaben:`);
  duenn.slice(0, 12).forEach((v) => console.log(`    ${String(v.texte).padStart(3)} Aufgaben · `
    + `${v.starr}/${v.schritte} Schritte starr · ${v.thema}`));
  if (duenn.length > 12) console.log(`    … und ${duenn.length - 12} weitere`);
}

/* ---------- Wie tief gehen die Aufgaben? ----------
   Drei Schritte sind zu wenig: verstehen, Weg finden, ausrechnen — und weg.
   Sechs sind das Ziel. Erreicht wird das über EINSTIEG und ABSCHLUSS je Thema;
   dieser Zähler zeigt, wie weit die Arbeit gediehen ist. Er ist ausdrücklich
   keine Fehlermeldung: Ein Thema ohne Einträge ist nicht kaputt, nur noch
   nicht vertieft. */
const tiefe = [];
for (const [thema, erzeuger] of Object.entries(AUFGABEN)) {
  let wenigste = Infinity;
  erzeuger.forEach((fn, nr) => {
    for (let i = 0; i < 30; i++) {
      try { wenigste = Math.min(wenigste, baueAufgabe(thema, nr).schritte.length); }
      catch (e) { wenigste = 0; }
    }
  });
  tiefe.push([thema, wenigste]);
}
const tief = tiefe.filter(([, n]) => n >= 6);
const flach = tiefe.filter(([, n]) => n < 6).sort((a, b) => a[1] - b[1]);
console.log(`\n=== SCHRITTTIEFE ===`);
console.log(`  ${tief.length} von ${tiefe.length} Themen erreichen sechs Schritte oder mehr`);
if (flach.length) {
  const nachZahl = {};
  flach.forEach(([, n]) => nachZahl[n] = (nachZahl[n] || 0) + 1);
  console.log("  noch darunter: " + Object.keys(nachZahl).sort()
    .map(n => `${nachZahl[n]} Themen mit ${n}`).join(", "));
  console.log("  als Nächstes dran: " + flach.slice(0, 8).map(([t, n]) => `${t} (${n})`).join(", "));
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

  /* Seit der Überarbeitung gehören drei Abschnitte fest dazu: wozu man das
     braucht, wie man vorgeht und woran die meisten scheitern. Eine Erklärung
     ohne diese drei hilft dem nicht weiter, der ganz am Anfang steht. */
  const wozu = Array.isArray(e.wozu) ? e.wozu : (e.wozu ? [e.wozu] : []);
  if (!wozu.length) probleme.push(`${thema} (Erklärung): „wozu" fehlt — der Praxisbezug`);
  else if (wozu.some(t => nackt(t).length < 40))
    probleme.push(`${thema} (Erklärung): „wozu" ist zu knapp, um etwas zu erklären`);

  if (!Array.isArray(e.rezept) || e.rezept.length < 3)
    probleme.push(`${thema} (Erklärung): „rezept" fehlt oder hat weniger als drei Schritte`);

  /* Ausprobier-Feld: an den Rändern und in der Mitte durchrechnen. Ein Regler,
     der bei irgendeiner Stellung NaN oder Unendlich liefert, ist schlimmer als
     gar keiner — dann steht auf dem Schirm Unsinn. */
  if (e.spiel){
    const sp = e.spiel;
    if (!Array.isArray(sp.regler) || !sp.regler.length)
      probleme.push(`${thema} (Ausprobieren): keine Regler`);
    else if (typeof sp.ausgabe !== "function")
      probleme.push(`${thema} (Ausprobieren): „ausgabe" ist keine Funktion`);
    else {
      sp.regler.forEach(r => {
        if (!(r.von < r.bis)) probleme.push(`${thema} (Ausprobieren): Regler ${r.id} hat keinen Bereich`);
        if (!(r.schritt > 0)) probleme.push(`${thema} (Ausprobieren): Regler ${r.id} ohne Schrittweite`);
        if (r.start < r.von || r.start > r.bis)
          probleme.push(`${thema} (Ausprobieren): Startwert von ${r.id} liegt außerhalb`);
      });
      /* jede Reglerstellung einzeln bis an beide Enden ziehen */
      const stellungen = [];
      const basis = {}; sp.regler.forEach(r => basis[r.id] = r.start);
      stellungen.push({...basis});
      sp.regler.forEach(r => {
        const mitte = r.von + Math.round((r.bis - r.von) / 2 / r.schritt) * r.schritt;
        [r.von, mitte, r.bis].forEach(v => stellungen.push({...basis, [r.id]: v}));
      });
      /* dazu alle Regler gemeinsam ganz links und ganz rechts */
      const links = {}, rechts = {};
      sp.regler.forEach(r => { links[r.id] = r.von; rechts[r.id] = r.bis; });
      stellungen.push(links, rechts);

      for (const stellung of stellungen){
        let a;
        try { a = sp.ausgabe(stellung); }
        catch (fehler){
          probleme.push(`${thema} (Ausprobieren): stürzt ab bei ${JSON.stringify(stellung)} — ${fehler.message}`);
          break;
        }
        if (!a || !Array.isArray(a.werte) || !a.werte.length){
          probleme.push(`${thema} (Ausprobieren): liefert keine Werte bei ${JSON.stringify(stellung)}`); break;
        }
        const schlecht = a.werte.find(w => !w.name || !nackt(w.text) ||
          /NaN|Infinity|undefined/.test(String(w.text)));
        if (schlecht){
          probleme.push(`${thema} (Ausprobieren): „${schlecht.name}" ergibt „${schlecht.text}" bei ${JSON.stringify(stellung)}`);
          break;
        }
        if (a.bild && /NaN|Infinity|undefined/.test(a.bild)){
          probleme.push(`${thema} (Ausprobieren): Zeichnung enthält NaN bei ${JSON.stringify(stellung)}`); break;
        }
        if (a.satz && /NaN|Infinity|undefined/.test(a.satz)){
          probleme.push(`${thema} (Ausprobieren): Satz enthält NaN bei ${JSON.stringify(stellung)}`); break;
        }
      }
    }
  }

  if (!Array.isArray(e.fehler) || e.fehler.length < 3)
    probleme.push(`${thema} (Erklärung): „fehler" fehlt oder nennt weniger als drei Fallen`);
  else e.fehler.forEach((f, i) => {
    if (!Array.isArray(f) || f.length !== 2 || !nackt(f[0]) || !nackt(f[1]))
      probleme.push(`${thema} (Erklärung): Falle ${i + 1} braucht Titel und Erläuterung`);
    else if (nackt(f[1]).length < 30)
      probleme.push(`${thema} (Erklärung): Falle „${nackt(f[0])}" wird nicht erklärt`);
  });
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
