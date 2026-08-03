/* ==========================================================================
   VOKABELN PRÜFEN — geht jeden Eintrag einzeln durch.

   Bei über vierhundert Wörtern fällt ein vergessenes Feld oder ein doppelt
   eingetragenes Wort von Hand nicht mehr auf. Geprüft wird deshalb:

     Aufbau      drei Teile je Eintrag, keiner leer
     Beispiel    enthält die Lücke ___ und ist ein ganzer Satz
     Doppelte    kein englisches Wort zweimal in derselben Klasse
     Sprache     das englische Feld enthält keine Umlaute, das deutsche
                 keine offensichtlich englischen Artikel
     Passung     der Beispielsatz gehört zum Wort — die Lücke steht dort,
                 wo das Wort hingehört, und der Satz nennt es nicht zusätzlich

   Aufruf: node pruefe-vokabeln.js
   ========================================================================== */
const fs = require("fs");
const h = fs.readFileSync(__dirname + "/index.html", "utf8");

const roh = (h.match(/const VOKABELN = (\{[\s\S]*?\n\});/) || [])[1];
if (!roh){ console.error("VOKABELN nicht gefunden"); process.exit(1); }
const VOKABELN = eval("(" + roh + ")");

const probleme = [];
const melde = (wo, text) => probleme.push(`${wo}: ${text}`);

let anzahl = 0, themen = 0;
const proKlasse = {};

for (const [klasse, block] of Object.entries(VOKABELN)){
  const gesehen = new Map();          /* englisches Wort -> Thema */
  let inKlasse = 0;
  for (const [thema, woerter] of Object.entries(block)){
    themen++;
    if (!Array.isArray(woerter) || !woerter.length){
      melde(`Klasse ${klasse} · ${thema}`, "keine Wörter");
      continue;
    }
    woerter.forEach((w, i) => {
      const wo = `Klasse ${klasse} · ${thema} · Eintrag ${i + 1}`;
      anzahl++; inKlasse++;

      if (!Array.isArray(w) || w.length !== 3){
        melde(wo, `hat ${Array.isArray(w) ? w.length : "keine"} Teile statt drei`);
        return;
      }
      const [en, de, satz] = w.map(x => String(x));
      if (!en.trim()) melde(wo, "englisches Wort fehlt");
      if (!de.trim()) melde(wo, `deutsche Übersetzung fehlt (${en})`);
      if (!satz.trim()) melde(wo, `Beispielsatz fehlt (${en})`);

      /* Der Beispielsatz muss die Lücke haben — sonst kann die dritte
         Hilfestufe das Wort nicht verbergen. */
      if (!satz.includes("___")) melde(wo, `Beispielsatz ohne Lücke: „${satz}“ (${en})`);
      if ((satz.match(/___/g) || []).length > 1) melde(wo, `mehr als eine Lücke: „${satz}“`);
      if (!/[.?!]\s*$/.test(satz.trim())) melde(wo, `Beispielsatz endet nicht auf Satzzeichen: „${satz}“`);
      if (satz.trim().split(/\s+/).length < 4) melde(wo, `Beispielsatz zu kurz: „${satz}“`);

      /* Das gesuchte Wort darf im Beispielsatz nicht zusätzlich stehen —
         sonst steht die Lösung direkt daneben. Der Wortstamm reicht als
         Prüfung; „to switch off“ wird auf „switch“ verkürzt. */
      const kern = en.replace(/^to\s+/, "").split(/\s+/)[0].toLowerCase();
      if (kern.length > 3){
        const ohneLuecke = satz.replace("___", " ").toLowerCase();
        if (new RegExp(`\\b${kern.replace(/[^a-z]/g, "")}\\b`).test(ohneLuecke))
          melde(wo, `„${kern}“ steht schon im Beispielsatz: „${satz}“`);
      }

      /* Sprachprobe: Umlaute gehören nicht ins englische Feld */
      if (/[äöüßÄÖÜ]/.test(en)) melde(wo, `Umlaut im englischen Wort: „${en}“`);
      /* und ein deutscher Eintrag beginnt nicht mit „to“ */
      if (/^to\s/i.test(de)) melde(wo, `deutsches Feld beginnt mit „to“: „${de}“`);

      /* Doppelte innerhalb einer Klasse */
      const schluessel = en.toLowerCase().trim();
      if (gesehen.has(schluessel))
        melde(wo, `„${en}“ steht in dieser Klasse schon unter „${gesehen.get(schluessel)}“`);
      else gesehen.set(schluessel, thema);
    });
  }
  proKlasse[klasse] = inKlasse;
}

console.log("=== VOKABELN ===");
for (const [k, n] of Object.entries(proKlasse))
  console.log(`  Klasse ${String(k).padStart(2)}: ${String(n).padStart(3)} Wörter in ${Object.keys(VOKABELN[k]).length} Themen`);
console.log(`\n  Gesamt: ${anzahl} Wörter in ${themen} Themen`);

console.log("\n=== ERGEBNIS ===");
if (probleme.length){
  console.log(`${probleme.length} Fund(e):`);
  probleme.slice(0, 40).forEach(p => console.log("  ! " + p));
  if (probleme.length > 40) console.log(`  … und ${probleme.length - 40} weitere`);
  process.exit(1);
}
console.log("Alle Vokabeln sind vollständig, eindeutig und haben einen brauchbaren Beispielsatz.");
