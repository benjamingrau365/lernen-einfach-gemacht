/* ==========================================================================
   FORMELPRÜFUNG — rechnet die Formelsammlung nach.

   Eine falsch umgestellte Formel in einer Formelsammlung ist schlimmer als
   gar keine: Sie wird geglaubt, und der Fehler fällt erst auf, wenn das
   Ergebnis in der Prüfung falsch ist. Von Hand lässt sich das nicht
   zuverlässig kontrollieren — 300 Umstellungen einzeln durchzugehen schafft
   niemand ohne Fehler.

   Deshalb rechnet dieser Prüfer. Für jede Formel werden Zufallszahlen
   eingesetzt, die Grundformel ausgerechnet und danach jede Umstellung
   gegengeprüft: Kommt links dasselbe heraus wie rechts? Das geschieht
   200-mal je Formel mit immer neuen Zahlen — ein Vorzeichenfehler oder ein
   vertauschter Nenner überlebt das nicht.

   Zusätzlich geprüft:
     · Jedes Formelzeichen im Ausdruck steht in der Größenliste — und umgekehrt
     · Jede Größe hat ein Wort dazu (und, wo sinnvoll, eine Einheit)
     · Kein Name kommt zweimal vor
     · Das Beispiel rechnet auf, und die gesuchte Größe hat einen Satz dazu

   Aufruf:  node pruefe-formeln.js
   ========================================================================== */
const fs = require("fs");
const h = fs.readFileSync(__dirname + "/index.html", "utf8");

const fehler = [];
const melde = (wo, txt) => fehler.push(`${wo}: ${txt}`);

/* ---------- den Rechenkern und die Sammlung aus der Seite holen ----------
   Bewusst nicht nachgebaut: Geprüft werden muss genau der Code, der auch
   ausgeliefert wird. Eine zweite Fassung hier würde irgendwann abweichen —
   und dann prüft der Prüfer sich selbst statt die App. */
function schneide(von, bis, name){
  const a = h.indexOf(von);
  if (a < 0) throw new Error(`${name}: „${von}“ steht nicht in der index.html`);
  const b = h.indexOf(bis, a + von.length);
  if (b < 0) throw new Error(`${name}: das Ende „${bis}“ steht nicht in der index.html`);
  return h.slice(a, b);
}

/* Die Marken enden bewusst vor dem Kommentar-Ende: Aus einer einzeiligen
   Überschrift wird beim nächsten Umbau eine mit Erklärung darunter, und dann
   fände der Prüfer sein Ende nicht mehr. Genau das ist beim Umbau der Seite
   auf zwei Ebenen passiert — und weil das Schneiden außerhalb des try stand,
   ist der Prüfer abgestürzt statt zu melden. Beides behoben. */
let umgebung, kern, daten;
try {
  kern  = schneide("function formelTeile(text){", "/* ---------- Die Sammlung ----------", "Rechenkern");
  daten = schneide("\nconst FORMELSAMMLUNG = [", "\n/* ---------- Die Seite ----------", "Sammlung");
  umgebung = new Function(`${kern}\n${daten}\nreturn {FORMELSAMMLUNG, formelBaum, formelWert, formelRechne, formelTermFuer, formelVariablen, formelZeichen, FORMEL_FN};`)();
} catch (e) {
  console.log("=== FORMELPRÜFUNG ===\n\n=== ERGEBNIS ===");
  console.log("Die Formelsammlung ließ sich nicht laden — " + e.message);
  process.exitCode = 1;
  return;
}
const { FORMELSAMMLUNG, formelRechne, formelTermFuer, formelVariablen } = umgebung;

/* ---------- Werkzeuge ---------- */
const ZUEGE = 200;
const STANDARD = [1, 9];

/* Gleich genug? Reine Fließkommarechnung trifft nie exakt. Verglichen wird
   deshalb relativ zur Größe der Zahlen — und bei Ergebnissen um die Null
   zusätzlich absolut, sonst wäre „ist 0“ nie erfüllbar. */
function gleich(a, b){
  if (!isFinite(a) || !isFinite(b)) return false;
  const spanne = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * spanne;
}
function ziehe(unten, oben){ return unten + Math.random() * (oben - unten); }

/* ---------- die Prüfung selbst ---------- */
let anzahlFormeln = 0, anzahlGleichungen = 0, anzahlZuege = 0;
const namen = new Map();

FORMELSAMMLUNG.forEach(bereich => {
  if (!bereich.id || !bereich.name) melde("Aufbau", "einem Bereich fehlt id oder name");
  (bereich.gruppen || []).forEach(gruppe => {
    const wo = `${bereich.name} / ${gruppe.titel}`;

    /* Tabellen haben keine Formeln, aber ihre eigenen Regeln. */
    if (gruppe.art === "tabelle"){
      if (!gruppe.kopf || !gruppe.zeilen || !gruppe.zeilen.length)
        return melde(wo, "Tabelle ohne Kopf oder ohne Zeilen");
      gruppe.zeilen.forEach((z, i) => {
        if (z.length !== gruppe.kopf.length)
          melde(wo, `Zeile ${i + 1} hat ${z.length} Felder, der Kopf aber ${gruppe.kopf.length}`);
      });
      return;
    }

    if (!(gruppe.eintraege || []).length) return melde(wo, "Gruppe ohne Formeln");

    gruppe.eintraege.forEach(e => {
      anzahlFormeln++;
      const ort = `${wo} / ${e.name}`;

      /* ---- 1. Name, Zweck, Größen ---- */
      if (!e.name) return melde(wo, "eine Formel ohne Namen");
      if (namen.has(e.name)) melde(ort, `den Namen gibt es schon in „${namen.get(e.name)}“`);
      else namen.set(e.name, wo);
      if (!e.wofuer) melde(ort, "kein Satz dazu, wozu man die Formel nimmt");
      if (!(e.g || []).length) return melde(ort, "keine Größenliste");
      if (!(e.f || []).length) return melde(ort, "keine Formel");

      const bekannt = new Set();
      e.g.forEach(x => {
        if (!x[0]) return melde(ort, "eine Größe ohne Kürzel");
        if (bekannt.has(x[0])) melde(ort, `das Kürzel „${x[0]}“ steht zweimal in der Größenliste`);
        bekannt.add(x[0]);
        if (!x[1]) melde(ort, `zu „${x[0]}“ fehlt das Wort — ein Kürzel allein hilft niemandem`);
        if (x.length < 3) melde(ort, `zu „${x[0]}“ fehlt das Feld für die Einheit`);
      });

      /* ---- 2. jedes Zeichen im Ausdruck muss erklärt sein ---- */
      const benutzt = new Set();
      const alleTexte = [];
      e.f.forEach(s => {
        alleTexte.push(s.z, s.t);
        (s.um || []).forEach(u => alleTexte.push(u[0], u[1]));
      });
      alleTexte.forEach(txt => formelVariablen(txt).forEach(v => benutzt.add(v)));
      benutzt.forEach(v => {
        if (!bekannt.has(v)) melde(ort, `„${v}“ kommt in einer Formel vor, steht aber nicht in der Größenliste`);
      });
      bekannt.forEach(v => {
        if (!benutzt.has(v)) melde(ort, `„${v}“ steht in der Größenliste, kommt aber in keiner Formel vor`);
      });

      /* ---- 3. nachrechnen ---- */
      const bereiche = e.probe || {};
      e.f.forEach((s, si) => {
        anzahlGleichungen += 1 + (s.um || []).length;
        const eigen = [];
        formelVariablen(s.z, eigen); formelVariablen(s.t, eigen);
        (s.um || []).forEach(u => { formelVariablen(u[0], eigen); formelVariablen(u[1], eigen); });
        /* Steht links ein einzelnes Formelzeichen, ist das die Grundformel:
           Alles andere wird gewürfelt, diese eine Größe wird ausgerechnet.
           Steht links ein ganzer Ausdruck, ist es eine Identität wie die
           binomischen Formeln — dann werden beide Seiten verglichen. */
        const grundgroesse = /^[A-Za-z_][A-Za-z0-9_]*$/.test(s.z.trim()) ? s.z.trim() : null;

        let schiefgegangen = 0;
        for (let zug = 0; zug < ZUEGE; zug++){
          const werte = {};
          eigen.forEach(v => {
            const b = bereiche[v] || STANDARD;
            werte[v] = ziehe(b[0], b[1]);
          });
          if (grundgroesse){
            werte[grundgroesse] = formelRechne(s.t, werte);
            if (!isFinite(werte[grundgroesse])){
              if (!schiefgegangen++) melde(ort, `Satz ${si + 1}: „${s.z} = ${s.t}“ ergibt keine Zahl`);
              continue;
            }
          } else if (!gleich(formelRechne(s.z, werte), formelRechne(s.t, werte))){
            if (!schiefgegangen++)
              melde(ort, `Satz ${si + 1}: „${s.z}“ und „${s.t}“ sind nicht dasselbe`);
            continue;
          }
          anzahlZuege++;
          (s.um || []).forEach((u, ui) => {
            const links = formelRechne(u[0], werte), rechts = formelRechne(u[1], werte);
            if (!gleich(links, rechts) && !schiefgegangen++){
              melde(ort, `Satz ${si + 1}, Umstellung ${ui + 1}: „${u[0]} = ${u[1]}“ stimmt nicht — `
                + `mit ${eigen.map(v => `${v} = ${werte[v].toPrecision(6)}`).join(", ")} `
                + `steht links ${Number(links).toPrecision(8)}, rechts ${Number(rechts).toPrecision(8)}`);
            }
          });
        }
      });

      /* ---- 4. das Beispiel ---- */
      if (e.bsp){
        const term = formelTermFuer(e, e.bsp.suche);
        if (!term) melde(ort, `das Beispiel sucht „${e.bsp.suche}“, dazu gibt es aber keinen Ausdruck`);
        else {
          const fehlend = formelVariablen(term).filter(v => !(v in e.bsp.werte));
          if (fehlend.length) melde(ort, `im Beispiel fehlen Werte für ${fehlend.join(", ")}`);
          else {
            const wert = formelRechne(term, e.bsp.werte);
            if (!isFinite(wert)) melde(ort, "das Beispiel lässt sich nicht ausrechnen");
            else if (wert <= 0 && !/Lösung|Veränderung|Winkel/.test(e.g.map(x => x[1]).join(" ")))
              melde(ort, `das Beispiel ergibt ${wert} — als Zahl zum Vorzeigen ungeeignet`);
          }
          Object.keys(e.bsp.werte).forEach(k => {
            if (!bekannt.has(k)) melde(ort, `das Beispiel setzt „${k}“ ein, das es in dieser Formel nicht gibt`);
          });
        }
      }
    });
  });
});

/* ---------- Ausgabe ---------- */
console.log("=== FORMELPRÜFUNG ===");
FORMELSAMMLUNG.forEach(b => {
  const n = b.gruppen.reduce((m, gr) => m + (gr.eintraege || []).length, 0);
  console.log(`  ${b.name}: ${n} Formeln in ${b.gruppen.length} Gruppen`);
});
console.log(`  ${anzahlGleichungen} Gleichungen, je ${ZUEGE}× mit Zufallszahlen nachgerechnet`);

console.log("\n=== ERGEBNIS ===");
const einzig = [...new Set(fehler)];
if (!einzig.length)
  console.log(`Alle ${anzahlFormeln} Formeln stimmen — jede Umstellung ergibt dasselbe wie ihre Grundformel.`);
else { console.log(`${einzig.length} Fund(e):`); einzig.forEach(f => console.log("  ! " + f)); process.exitCode = 1; }
