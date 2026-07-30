/* ==========================================================================
   QUELLENPRÜFUNG

   Manche Aufgaben behaupten Fakten: dass „Marschall“ früher Pferdeknecht hieß,
   dass „bios“ Leben bedeutet, dass Eichendorff zur Romantik gehört. Solche
   Behauptungen kann kein Programm herleiten — sie brauchen einen Beleg.

   Deshalb steht jeder dieser Fakten in quellen.json, zusammen mit der Quelle,
   auf die er sich stützt. Dieses Skript zieht die Aufgaben immer wieder und
   vergleicht jede Faktenbehauptung mit dem Verzeichnis:

     · weicht eine Aufgabe vom Beleg ab  -> Fehler
     · behauptet eine Aufgabe etwas, das gar nicht im Verzeichnis steht
       -> Fehler („unbelegt“)

   Damit kann niemand — auch ich nicht — ein Wissens-Thema erweitern, ohne die
   Quelle dazuzuschreiben.

   Aufruf:  node pruefe-quellen.js
   ========================================================================== */
const fs = require("fs");
const pfad = __dirname;
const h = fs.readFileSync(pfad + "/index.html", "utf8");
const verzeichnis = JSON.parse(fs.readFileSync(pfad + "/quellen.json", "utf8"));

const st = (v, b) => { const a = h.indexOf(v), c = h.indexOf(b); return h.slice(a, c); };
const AUFGABEN = new Function(`${st("const KATALOG", "/* ---------- Werkzeuge")}
${st("const rnd  =", "/* ---------- Aufgabenerzeuger ---------- */")}
${st("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */")}
};
${st("function entdoppeln(", "\n/* ---------- Fortschritt")}
return AUFGABEN;`)();

const RUNDEN = 600;
const fehler = [];
const gesehen = { Sprachwandel: new Set(), Fremdwoerter: new Set(), Literaturepochen: new Set() };

/* Umlaute vereinheitlichen, damit „Fremdwörter“ und „Fremdwoerter“ zusammenfinden
   und Anführungszeichen/Bindestriche nicht stören */
const schluessel = (s) => String(s).toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]/g, "");
const roh = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const richtige = (s) => roh(s.optionen.find((o) => o.ok).t);
const gleich = (a, b) => schluessel(a) === schluessel(b);

const belegFuer = (bereich, feld, wert) =>
  (verzeichnis.fakten[bereich] || []).find((e) => gleich(e[feld], wert));

/* ------------------------------------------------------------------ */
function pruefeSprachwandel(a) {
  const t = roh(a.text);
  const wort = (a.text.match(/„(.+?)“/) || [])[1];
  if (!wort) return "Wort nicht erkennbar: " + t;
  gesehen.Sprachwandel.add(schluessel(wort));

  const beleg = belegFuer("Sprachwandel", "wort", wort);
  if (!beleg) return `„${wort}“ steht in keiner Quelle — unbelegte Behauptung über Sprachgeschichte`;

  const frueher = (t.match(/früher:\s*(.+?)\s*heute:/) || [])[1] || "";
  const heute   = (t.match(/heute:\s*(.+)$/) || [])[1] || "";
  if (!gleich(frueher, beleg.frueher))
    return `„${wort}“: Aufgabe sagt früher „${frueher}“, die Quelle „${beleg.frueher}“`;
  if (!gleich(heute, beleg.heute))
    return `„${wort}“: Aufgabe sagt heute „${heute}“, die Quelle „${beleg.heute}“`;
  if (!gleich(roh(a.loesung), beleg.art))
    return `„${wort}“: Aufgabe ordnet als „${roh(a.loesung)}“ ein, die Quelle als „${beleg.art}“`;
  return null;
}

function pruefeFremdwoerter(a) {
  const wort = roh(a.text).replace(/^Das Fremdwort\s*/, "").trim();
  if (!wort) return "Fremdwort nicht erkennbar: " + roh(a.text);
  gesehen.Fremdwoerter.add(schluessel(wort));

  const beleg = belegFuer("Fremdwoerter", "wort", wort);
  if (!beleg) return `„${wort}“ steht in keiner Quelle — unbelegte Behauptung über Herkunft`;

  const sprache = richtige(a.schritte[1]);
  if (!gleich(sprache, beleg.sprache))
    return `„${wort}“: Aufgabe sagt ${sprache}, die Quelle ${beleg.sprache}`;

  const teile = (a.schritte[2].frage.match(/<b>(.+?)<\/b>/) || [])[1] || "";
  if (!gleich(teile, beleg.teile))
    return `„${wort}“: Bausteine „${roh(teile)}“ weichen von der Quelle „${beleg.teile}“ ab`;
  if (!gleich(roh(a.loesung), beleg.bedeutung))
    return `„${wort}“: Bedeutung „${roh(a.loesung)}“ weicht von der Quelle „${beleg.bedeutung}“ ab`;

  const deutsch = richtige(a.schritte[3]);
  if (!gleich(deutsch, beleg.deutsch))
    return `„${wort}“: deutsches Wort „${deutsch}“ weicht von der Quelle „${beleg.deutsch}“ ab`;
  return null;
}

function pruefeEpochen(a) {
  const epoche = roh(a.loesung);
  gesehen.Literaturepochen.add(schluessel(epoche));

  const beleg = belegFuer("Literaturepochen", "epoche", epoche);
  if (!beleg) return `„${epoche}“ steht in keiner Quelle — unbelegte Behauptung über Literaturgeschichte`;

  const autor = richtige(a.schritte[3]);
  if (!gleich(autor, beleg.autor))
    return `${epoche}: Aufgabe nennt „${autor}“, die Quelle „${beleg.autor}“`;

  /* die Jahreszahlen stehen im Tipp des dritten Schritts */
  const tipp = roh(a.schritte[2].tipp || "");
  const jahre = (tipp.match(/\d{4}\s*[–-]\s*\d{4}/) || [])[0];
  const belegJahre = (beleg.zeit.match(/\d{4}\s*[–-]\s*\d{4}/) || [])[0];
  if (jahre && belegJahre && jahre.replace(/\s/g, "") !== belegJahre.replace(/\s/g, ""))
    return `${epoche}: Aufgabe datiert ${jahre}, die Quelle ${belegJahre}`;
  return null;
}

const proben = {
  "Sprachwandel": pruefeSprachwandel,
  "Fremdwörter": pruefeFremdwoerter,
  "Literaturepochen": pruefeEpochen
};

for (const [thema, probe] of Object.entries(proben)) {
  const erzeuger = AUFGABEN[thema];
  if (!erzeuger) { fehler.push(`${thema}: Thema existiert nicht mehr in den Aufgaben`); continue; }
  erzeuger.forEach((fn) => {
    for (let i = 0; i < RUNDEN; i++) {
      let a; try { a = fn(); } catch (e) { fehler.push(`${thema}: Erzeuger stürzt ab: ${e.message}`); break; }
      let r; try { r = probe(a); } catch (e) { r = "Prüfung stürzt ab: " + e.message; }
      if (r) { fehler.push(`${thema} — ${r}`); break; }
    }
  });
}

/* Einträge, die im Verzeichnis stehen, aber nie in einer Aufgabe auftauchen:
   kein Fehler, aber ein Hinweis auf Karteileichen. */
const verwaist = [];
for (const [bereich, liste] of Object.entries(verzeichnis.fakten)) {
  const feld = bereich === "Literaturepochen" ? "epoche" : "wort";
  liste.forEach((e) => {
    if (!gesehen[bereich] || !gesehen[bereich].has(schluessel(e[feld])))
      verwaist.push(`${bereich}: „${e[feld]}“ ist belegt, kommt aber in keiner Aufgabe vor`);
  });
}

/* ------------------------------------------------------------- Ausgabe */
const anzahl = Object.values(verzeichnis.fakten).reduce((s, l) => s + l.length, 0);
console.log("=== QUELLENVERZEICHNIS ===");
console.log(`  ${anzahl} belegte Fakten aus ${Object.keys(verzeichnis.quellen).length} Quellen (Stand ${verzeichnis._stand})`);
Object.entries(verzeichnis.fakten).forEach(([b, l]) => console.log(`  ${String(l.length).padStart(3)} × ${b}`));

console.log("\n=== ABGLEICH MIT DEN AUFGABEN ===");
Object.keys(proben).forEach((t) => {
  const n = gesehen[t] ? gesehen[t].size : (gesehen.Fremdwoerter || new Set()).size;
  console.log(`  ${t}: ${(gesehen[t] || gesehen.Fremdwoerter).size} verschiedene Fakten geprüft`);
});

if (verwaist.length) { console.log("\n=== HINWEISE ==="); verwaist.forEach((v) => console.log("  · " + v)); }

console.log("\n=== ERGEBNIS ===");
const einzig = [...new Set(fehler)];
if (!einzig.length) console.log("Jede Faktenbehauptung ist belegt und stimmt mit ihrer Quelle überein.");
else { console.log(`${einzig.length} Fund(e):`); einzig.forEach((f) => console.log("  ! " + f)); process.exitCode = 1; }
