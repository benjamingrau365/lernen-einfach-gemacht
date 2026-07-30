/* ==========================================================================
   INHALTLICHE PRÜFUNG — rechnet nach, ob die als richtig markierte Antwort
   auch sachlich stimmt. Der Struktur-Prüfer (pruefe.js) zählt nur; dieser
   hier rechnet unabhängig gegen.

   Mathe:   Die Lösung wird ein zweites Mal auf einem anderen Weg bestimmt
            (Zahlen einsetzen, Probe machen) und mit der Angabe verglichen.
   Deutsch: Der Prüfer hält seine EIGENEN Regeln (welche Wörter Kommapflicht
            haben, wie Konjunktiv I gebildet wird …) und prüft, ob die
            Aufgabe dazu passt.
   ========================================================================== */
const fs = require("fs");
const h = fs.readFileSync(__dirname + "/index.html", "utf8");
const st = (v, b) => { const a = h.indexOf(v), c = h.indexOf(b); return h.slice(a, c); };
const AUFGABEN = new Function(`${st("const KATALOG", "/* ---------- Werkzeuge")}
${st("const rnd  =", "/* ---------- Aufgabenerzeuger ---------- */")}
${st("const AUFGABEN", "\n};\n\n/* Fach und Klasse zu einem Thema finden */")}
};
${st("function entdoppeln(", "\n/* ---------- Fortschritt")}
return AUFGABEN;`)();

const RUNDEN = 400;
const fehler = [];
const geprueft = {};
const melde = (t, txt) => fehler.push(`${t}: ${txt}`);
const zaehl  = (t) => geprueft[t] = (geprueft[t] || 0) + 1;

/* Minuszeichen der Anzeige (−, U+2212) auf das Rechen-Minus normieren */
const roh   = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/[−–]/g, "-").replace(/\s+/g, " ").trim();
/* deutsche Zahl -> JS-Zahl:  "1.331" -> 1331 ,  "12,5" -> 12.5 */
const zahl  = (s) => Number(String(s).replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, ""));
const zahlen = (s) => (roh(s).match(/-?\d+(?:\.\d+)?(?:,\d+)?/g) || []).map(zahl);

/* Term-Text in etwas verwandeln, das JavaScript ausrechnen kann */
function zuJS(s) {
  return String(s)
    .replace(/<sup>(.*?)<\/sup>/g, "**($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/−/g, "-").replace(/–/g, "-")
    .replace(/·/g, "*").replace(/×/g, "*")
    .replace(/²/g, "**2")
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*x/g, "$1*x")          // 10x -> 10*x
    .replace(/\)\s*\(/g, ")*(")            // )( -> )*(
    .replace(/\)\s*\*\*/g, ")**")
    .trim();
}
/* Term an mehreren Stellen auswerten — stimmen zwei Terme überall überein,
   sind sie gleich (bei Polynomen reicht mehr Stellen als der Grad). */
function gleichwertig(termA, termB, stellen = [-3.5, -1, 0, 1, 2, 4.5, 7]) {
  const a = zuJS(termA), b = zuJS(termB);
  for (const x of stellen) {
    let va, vb;
    try { va = new Function("x", `return ${a}`)(x); vb = new Function("x", `return ${b}`)(x); }
    catch (e) { return `nicht auswertbar (${a} | ${b}): ${e.message}`; }
    if (!isFinite(va) || !isFinite(vb)) return `kein endlicher Wert bei x=${x}`;
    if (Math.abs(va - vb) > 1e-9) return `bei x=${x}: „${termA}“ ergibt ${va}, „${termB}“ aber ${vb}`;
  }
  return null;
}

/* ---------------------------------------------------------------- MATHE */
const matheProben = {
  "Terme umformen": (a) => gleichwertig(a.text, a.loesung),

  "Binomische Formeln": (a) => gleichwertig(a.text, a.loesung),

  "Quadratische Gleichungen": (a) => {
    const links = zuJS(a.text.split("=")[0]);
    const wurzeln = (roh(a.loesung).match(/-?\d+/g) || []).map(Number);
    if (wurzeln.length !== 2) return "konnte die beiden Lösungen nicht lesen: " + roh(a.loesung);
    for (const w of wurzeln) {
      const wert = new Function("x", `return ${links}`)(w);
      if (Math.abs(wert) > 1e-9) return `x = ${w} eingesetzt in „${roh(a.text)}“ ergibt ${wert}, nicht 0`;
    }
    if (wurzeln[0] === wurzeln[1]) return "beide Lösungen sind gleich";
    return null;
  },

  "Satz des Pythagoras": (a) => {
    const t = roh(a.text), n = zahlen(t), l = zahlen(a.loesung)[0];
    /* nach der FRAGE unterscheiden, nicht nach den Angaben — beide Varianten
       enthalten das Wort „Hypotenuse" */
    if (!/wie lang ist die Hypotenuse/.test(t)) {  // Kathete gesucht
      const [c, k] = n;
      if (Math.abs(k*k + l*l - c*c) > 1e-9) return `${k}² + ${l}² ist nicht ${c}²`;
    } else {                                       // Hypotenuse gesucht
      const [ka, kb] = n;
      if (Math.abs(ka*ka + kb*kb - l*l) > 1e-9) return `${ka}² + ${kb}² ist nicht ${l}²`;
      if (l <= ka || l <= kb) return "die Hypotenuse ist nicht die längste Seite";
    }
    return null;
  },

  "Potenzen und Wurzeln": (a) => {
    const t = roh(a.text);
    if (/√/.test(t)) {
      const q = zahlen(t)[0], w = zahlen(a.loesung)[0];
      if (Math.abs(w*w - q) > 1e-9) return `√${q} ist nicht ${w} (denn ${w}² = ${w*w})`;
      return null;
    }
    const e = (a.text.match(/<sup>(\d+)<\/sup>/g) || []).map(s => Number(s.replace(/\D/g, "")));
    const erg = Number((a.loesung.match(/<sup>(\d+)<\/sup>/) || [])[1]);
    if (e.length !== 2 || !isFinite(erg)) return "Hochzahlen nicht lesbar";
    const basis = 2;
    const soll = /:/.test(t) ? Math.pow(basis, e[0]) / Math.pow(basis, e[1])
                             : Math.pow(basis, e[0]) * Math.pow(basis, e[1]);
    if (Math.abs(soll - Math.pow(basis, erg)) > 1e-9)
      return `mit a=2 ergibt die Aufgabe ${soll}, die Lösung a^${erg} aber ${Math.pow(basis, erg)}`;
    return null;
  },

  "Lineare Funktionen": (a) => {
    const t = roh(a.text);
    if (/Steigung/.test(t)) {
      const n = zahlen(t);                        // x1 y1 x2 y2
      if (n.length < 4) return "Punkte nicht lesbar: " + t;
      const [x1, y1, x2, y2] = n;
      const m = (y2 - y1) / (x2 - x1);
      const angegeben = zahlen(a.loesung)[0];
      if (Math.abs(m - angegeben) > 1e-9) return `Steigung ist ${m}, angegeben ist ${angegeben}`;
      return null;
    }
    /* Punktprobe: P(px | py) auf y = m x + b ? */
    const p = t.match(/P\(\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)/);
    const g = t.match(/y\s*=\s*(-?\d+)x\s*([+-])\s*(\d+)/);
    if (!p || !g) return "Punkt oder Gerade nicht lesbar: " + t;
    const px = +p[1], py = +p[2], m = +g[1], b = (g[2] === "-" ? -1 : 1) * +g[3];
    const drauf = (m * px + b) === py;
    const behauptet = /^Ja/.test(roh(a.loesung));
    if (drauf !== behauptet)
      return `${m}·${px}${b < 0 ? b : "+" + b} = ${m*px+b}, Punkt hat ${py} — Aussage „${roh(a.loesung)}“ stimmt nicht`;
    return null;
  },

  "Quadratische Funktionen": (a) => {
    const t = roh(a.text);
    const sf = t.match(/\(x\s*([+-])\s*(\d+)\)\*{0,2}²?\s*([+-])\s*(\d+)/);
    if (sf) {                                     // Scheitelform
      const d = (sf[1] === "-" ? 1 : -1) * +sf[2];   // Vorzeichen dreht sich
      const e = (sf[3] === "-" ? -1 : 1) * +sf[4];
      const ang = roh(a.loesung).match(/S\(\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)/);
      if (!ang) return "Scheitelpunkt nicht lesbar";
      if (+ang[1] !== d || +ang[2] !== e) return `Scheitel müsste S(${d} | ${e}) sein, angegeben ist ${ang[0]}`;
      const f = (x) => Math.pow(x - d, 2) + e;
      if (f(d) !== e || f(d - 1) <= f(d) || f(d + 1) <= f(d)) return "der angegebene Punkt ist nicht der Tiefpunkt";
      return null;
    }
    /* Öffnung und Breite */
    const fa = t.match(/f\(x\)\s*=\s*(-?[\d,]+)?x\*{0,2}²/);
    if (!fa) return "Funktionsterm nicht lesbar: " + t;
    const av = fa[1] ? zahl(fa[1]) : 1;
    const nachOben = /nach oben/.test(a.loesung), schmaler = /schmaler/.test(a.loesung);
    if ((av > 0) !== nachOben) return `a = ${av}, aber Lösung sagt „${roh(a.loesung)}“`;
    if ((Math.abs(av) > 1) !== schmaler) return `|a| = ${Math.abs(av)}, aber Lösung sagt „${roh(a.loesung)}“`;
    return null;
  },

  "Trigonometrie": (a) => {
    const t = roh(a.text);
    if (/welche Winkelfunktion/.test(t)) {
      const paare = { Sinus:["Gegenkathete","Hypotenuse"], Kosinus:["Ankathete","Hypotenuse"], Tangens:["Gegenkathete","Ankathete"] };
      const soll = paare[roh(a.loesung)];
      if (!soll) return "unbekannte Funktion: " + roh(a.loesung);
      if (!soll.every(s => t.includes(s))) return `„${roh(a.loesung)}“ passt nicht zu den genannten Seiten`;
      return null;
    }
    const c = zahlen(t)[0], grad = zahlen(t)[1], ang = zahlen(a.loesung)[0];
    const soll = c * Math.sin(grad * Math.PI / 180);
    if (Math.abs(soll - ang) > 0.35) return `${c}·sin(${grad}°) = ${soll.toFixed(3)}, angegeben ist ${ang}`;
    if (ang >= c) return "die Gegenkathete ist nicht kürzer als die Hypotenuse";
    return null;
  },

  "Exponentielles Wachstum": (a) => {
    const t = roh(a.text);
    const n = zahlen(t);
    const start = n[0], p = n[1], jahre = n[2], ang = zahlen(a.loesung)[0];
    const ab = /ab\b|abnimmt|abnehmen/.test(t);
    const faktor = ab ? 1 - p/100 : 1 + p/100;
    const soll = Math.round(start * Math.pow(faktor, jahre));
    if (Math.abs(soll - ang) > 1) return `${start} · ${faktor}^${jahre} = ${soll}, angegeben ist ${ang}`;
    if (ab && ang >= start) return "bei Abnahme müsste der Wert kleiner werden";
    if (!ab && ang <= start) return "bei Zunahme müsste der Wert größer werden";
    return null;
  }
};

/* -------------------------------------------------------------- DEUTSCH */
/* Der Prüfer hält hier seine eigenen Regeln — unabhängig von der Aufgabe. */
const KOMMA_WOERTER = ["um", "ohne", "statt", "anstatt", "außer", "als"];
const GLIED_FRAGE = { "Subjekt":"Wer oder was?", "Akkusativobjekt":"Wen oder was?", "Dativobjekt":"Wem?" };
const STILMITTEL = ["Metapher", "Vergleich", "Personifikation", "Alliteration", "Hyperbel"];

/* an einem von Leerzeichen umgebenen Gedankenstrich trennen (Minus im Wort bleibt heil) */
const trennen = (s) => roh(s).split(/\s[-–—]\s/).map(x => x.trim()).filter(Boolean);
const richtige = (s) => s.optionen.find(o => o.ok);
const falsche  = (s) => s.optionen.filter(o => !o.ok);

const deutschProben = {
  "Stilmittel erkennen": (a) => {
    const m = roh(a.loesung), satz = roh(a.text);
    if (!STILMITTEL.includes(m)) return "unbekanntes Stilmittel: " + m;
    const hatWie = /\bwie\b/.test(satz);
    if (m === "Vergleich" && !hatWie) return `als Vergleich markiert, aber ohne „wie“: ${satz}`;
    if (m !== "Vergleich" && hatWie) return `enthält „wie“, ist aber als ${m} markiert: ${satz}`;
    if (m === "Alliteration") {
      const anfang = satz.replace(/[„“.,!?]/g, "").split(" ").filter(Boolean).map(w => w[0].toLowerCase());
      const haeufig = Math.max(...Object.values(anfang.reduce((z, b) => (z[b] = (z[b]||0)+1, z), {})));
      if (haeufig < 3) return `als Alliteration markiert, aber kein Laut kommt dreimal am Wortanfang vor: ${satz}`;
    }
    /* erste Frage („steht wie drin?") muss zur Wirklichkeit passen */
    const s1 = roh(richtige(a.schritte[0]).t);
    if ((s1 === "Ja") !== hatWie) return `Schritt 1 behauptet „${s1}“, im Satz ${hatWie ? "steht" : "steht kein"} „wie“`;
    return null;
  },

  "Satzglieder bestimmen": (a) => {
    const glied = roh(a.loesung);
    if (!GLIED_FRAGE[glied]) return "unbekanntes Satzglied: " + glied;
    const t = roh(a.text);
    const teil = (a.text.match(/„(.+?)“/) || [])[1];
    if (!teil) return "das gefragte Satzglied steht nicht im Text";
    const satz = t.split("?").pop().trim();
    if (!satz.includes(teil)) return `„${teil}“ kommt im Satz „${satz}“ gar nicht vor`;
    const frage = roh(richtige(a.schritte[1]).t);
    if (frage !== GLIED_FRAGE[glied]) return `zu ${glied} gehört „${GLIED_FRAGE[glied]}“, gefragt wird aber „${frage}“`;
    return null;
  },

  "Konjunktiv": (a) => {
    const konj = roh(a.loesung);
    const opts = a.schritte[2].optionen.map(o => roh(o.t));
    const grund = opts.find(o => /en$/.test(o));
    const norm  = opts.find(o => o !== konj && o !== grund);
    if (!grund) return "keine Grundform unter den Antworten: " + opts.join(", ");
    if (!/e$/.test(konj)) return `Konjunktiv I endet immer auf -e, hier steht „${konj}“`;
    const gebildet = grund.replace(/en$/, "") + "e";
    if (konj !== gebildet) return `aus „${grund}“ wird „${gebildet}“, angegeben ist „${konj}“`;
    if (konj === norm) return `Konjunktiv „${konj}“ ist nicht von der normalen Form zu unterscheiden`;
    return null;
  },

  "Satzreihe und Satzgefüge": (a) => {
    const NEBEN = ["weil","dass","wenn","obwohl","bis","während","sobald","bevor","ob","damit","nachdem","seit"];
    const HAUPT = ["und","aber","denn","oder","sondern"];
    const t = roh(a.text);
    const teile = t.split(",");
    if (teile.length < 2) return "kein Komma im Satz: " + t;
    const zweiter = teile.slice(1).join(",").trim().replace(/\.$/, "");
    const wort = zweiter.split(" ")[0].toLowerCase();
    const erwartet = NEBEN.includes(wort) ? "Satzgefüge" : HAUPT.includes(wort) ? "Satzreihe" : null;
    if (!erwartet) return `unbekanntes Bindewort „${wort}“`;
    if (roh(a.loesung) !== erwartet) return `„${wort}“ ergibt ein ${erwartet}, markiert ist ${roh(a.loesung)}`;
    /* Gegenprobe über die Verbstellung, so wie die Aufgabe es lehrt */
    const verb = roh(richtige(a.schritte[1]).t);
    const amEnde = verb === "Ganz am Ende";
    if (amEnde !== (erwartet === "Satzgefüge"))
      return `Verbstellung „${verb}“ passt nicht zu ${erwartet}`;
    const woerter = zweiter.split(" ");
    const letztes = woerter[woerter.length - 1];
    const verbWort = (t.match(/Verb „(.+?)“/) || [])[1];
    if (verbWort && amEnde && letztes !== verbWort.split(" ").pop())
      return `Verb „${verbWort}“ soll am Ende stehen, dort steht aber „${letztes}“`;
    return null;
  },

  "Kommas bei Infinitivgruppen": (a) => {
    const t = roh(a.text);
    const nachLuecke = t.split("___")[1] || "";
    const wort = nachLuecke.trim().split(" ")[0];
    if (!KOMMA_WOERTER.includes(wort)) return `„${wort}“ gehört nicht zu den sechs Wörtern mit Kommapflicht`;
    /* „zu" steht entweder allein („zu lesen") oder steckt bei trennbaren Verben
       mitten im Wort („umzudrehen") — beides ist eine Infinitivgruppe */
    if (!/\bzu\b/.test(nachLuecke) && !/\w+zu\w+en\b/.test(nachLuecke))
      return "keine Infinitivgruppe erkennbar (kein „zu“): " + nachLuecke;
    const loes = roh(richtige(a.schritte[3]).t);
    if (!loes.includes(", " + wort)) return `im Lösungssatz fehlt das Komma vor „${wort}“: ${loes}`;
    return null;
  },

  "Adjektive steigern": (a) => {
    const [grund, komp, sup] = trennen(a.loesung);
    if (!grund || !komp || !sup) return "Steigerungsformen nicht lesbar: " + roh(a.loesung);
    if (!/^am /.test(sup)) return `Höchstform muss mit „am“ beginnen: ${sup}`;
    const art = roh(richtige(a.schritte[1]).t);
    const mitUmlaut = grund.replace(/([aou])/, (c) => ({ "a":"ä","o":"ö","u":"ü" })[c]);
    /* Endet das Adjektiv auf -e, wird nur ein r angehängt: leise -> leiser */
    const anhaengen = (w) => /e$/.test(w) ? w + "r" : w + "er";
    /* Reihenfolge wichtig: „Unregelmäßig" enthält das Wort „regelmäßig" */
    if (/[Uu]nregelmäßig/.test(art)) {
      if (komp === anhaengen(grund) || komp === anhaengen(mitUmlaut))
        return `als unregelmäßig markiert, ist aber regelmäßig gebildet: ${komp}`;
    } else if (/Umlaut/.test(art)) {
      if (komp !== anhaengen(mitUmlaut))
        return `mit Umlaut müsste „${anhaengen(mitUmlaut)}“ herauskommen, angegeben ist „${komp}“`;
      if (mitUmlaut === grund) return "als Umlaut markiert, aber die Grundform hat gar keinen Umlaut-Vokal";
    } else {
      if (komp !== anhaengen(grund))
        return `regelmäßig müsste „${anhaengen(grund)}“ heißen, angegeben ist „${komp}“`;
    }
    if (komp === grund) return "Vergleichsform ist gleich der Grundform";
    return null;
  },

  "Kommas bei Aufzählungen": (a) => {
    /* geprüft wird der fertige Satz, nicht die Lückenfassung */
    const loes = roh(a.loesung), t = roh(a.text);
    if (!/\b(und|oder)\b/.test(loes)) return "kein Bindewort am Ende der Aufzählung: " + loes;
    if (/,\s+(und|oder)\b/.test(loes)) return "vor „und“/„oder“ darf kein Komma stehen: " + loes;
    if ((loes.match(/,/g) || []).length < 1) return "Aufzählung ohne Komma: " + loes;
    /* jede Lücke der Aufgabe muss in der Lösung gefüllt sein */
    const luecken = (t.match(/___/g) || []).length;
    const kommas  = (loes.match(/,/g) || []).length;
    if (kommas !== luecken - 1)
      return `${luecken} Lücken, aber ${kommas} Kommas — vor „und“/„oder“ bleibt eine Lücke ohne Komma: ${loes}`;
    return null;
  },

  "Wörtliche Rede": (a) => {
    const loes = roh(a.loesung);
    const auf = (loes.match(/„/g) || []).length, zu = (loes.match(/“/g) || []).length;
    if (auf !== 1 || zu !== 1) return "Anführungszeichen nicht paarweise gesetzt: " + loes;
    if (/^„/.test(loes)) {                       // Rede vorn -> Komma nach dem Zitat
      if (!/“\s*,/.test(loes)) return "nach der vorangestellten Rede fehlt das Komma: " + loes;
    } else {                                      // Begleitsatz vorn -> Doppelpunkt
      if (!/:\s*„/.test(loes)) return "vor der Rede fehlt der Doppelpunkt: " + loes;
    }
    return null;
  },

  "das oder dass": (a) => {
    const loes = roh(a.loesung);
    if (!["das", "dass"].includes(loes)) return "unerwartete Lösung: " + loes;
    /* Gegenprobe: Schritt 2 sagt, ob der Ersetz-Test „dieses" klappt.
       Klappt er -> „das". Klappt er nicht -> „dass". */
    const test = roh(richtige(a.schritte[1]).t);
    const klappt = /^Ja/.test(test);
    if (klappt !== (loes === "das"))
      return `Ersetz-Test sagt „${test}“, die Lösung ist aber „${loes}“`;
    /* und Schritt 3: Nebensatz-Einleiter -> dass, Begleiter eines Nomens -> das */
    const rolle = roh(richtige(a.schritte[2]).t);
    const nebensatz = /Nebensatz/.test(rolle);
    if (nebensatz !== (loes === "dass"))
      return `Rolle „${rolle}“ passt nicht zu „${loes}“`;
    return null;
  },

  "Zeitformen": (a) => {
    const ZEITEN = ["Präsens","Präteritum","Perfekt","Plusquamperfekt","Futur I","Futur II"];
    const zeit = roh(a.loesung);
    if (!ZEITEN.includes(zeit)) return "unbekannte Zeitform: " + zeit;
    const form = (a.text.match(/„(.+?)“/) || [])[1] || roh(a.text);
    const woerter = form.trim().split(/\s+/).length;
    const einteilig = ["Präsens", "Präteritum"].includes(zeit);
    if (einteilig && woerter > 2) return `${zeit} ist einteilig, „${form}“ hat aber ${woerter} Wörter`;
    if (!einteilig && woerter < 3) return `${zeit} braucht ein Hilfsverb, „${form}“ hat nur ${woerter} Wörter`;
    return null;
  },

  "Groß- und Kleinschreibung": (a) => {
    /* Lösung hat die Form „Schule — groß" bzw. „schnell — klein" */
    const [wort, urteil] = trennen(a.loesung);
    if (!wort || !urteil) return "Lösung nicht lesbar: " + roh(a.loesung);
    const gross = /^[A-ZÄÖÜ]/.test(wort);
    if (gross !== /groß/.test(urteil))
      return `„${wort}“ ist ${gross ? "groß" : "klein"} geschrieben, das Urteil sagt aber „${urteil}“`;
    /* eigene Regel: steht ein Artikel (auch verschmolzen) davor, wird großgeschrieben */
    const ARTIKEL = ["der","die","das","ein","eine","einen","einem","einer","dem","den","beim","zum","zur","vom","im","ins"];
    const vor = roh(a.text).split("___")[0].trim().split(" ").pop().toLowerCase().replace(/[^a-zäöüß]/g, "");
    if (ARTIKEL.includes(vor) && !gross)
      return `vor „${wort}“ steht „${vor}“ — dann muss großgeschrieben werden`;
    return null;
  }
};

/* --------------------------------------------------------------- LAUF */
const NICHT_PRUEFBAR = {
  "Fremdwörter": "Herkunft und Bedeutung sind Faktenwissen — dafür braucht es eine Quelle, keine Regel.",
  "Sprachwandel": "Welche Bedeutung ein Wort früher hatte, ist Faktenwissen.",
  "Literaturepochen": "Jahreszahlen, Autoren und Merkmale sind Faktenwissen.",
  "Rede und Rhetorik": "Die Zuordnung Wirkung ↔ Mittel ist eine Deutungsfrage, keine Rechenregel.",
  "Gedichte deuten": "Ob sich zwei Zeilen reimen, ist eine Klangfrage — maschinell nur grob prüfbar.",
  "Nominalisierung": "Beruht auf Wortwissen, nicht auf einer eindeutig prüfbaren Regel.",
  "Wortarten erkennen": "Die Wortart ergibt sich aus dem Sprachgefühl, nicht aus einer Rechenregel.",
  "Kommas bei Nebensätzen": "Sinngemäß dieselbe Regel wie „Satzreihe und Satzgefüge“, dort geprüft."
};

const proben = { ...matheProben, ...deutschProben };

for (const [thema, erzeuger] of Object.entries(AUFGABEN)) {
  const probe = proben[thema];
  if (!probe) continue;
  erzeuger.forEach((fn) => {
    for (let i = 0; i < RUNDEN; i++) {
      let a; try { a = fn(); } catch (e) { melde(thema, "Erzeuger stürzt ab: " + e.message); break; }
      let r; try { r = probe(a); } catch (e) { r = "Probe stürzt ab: " + e.message; }
      zaehl(thema);
      if (r) { melde(thema, r); break; }
    }
  });
}

const alle = Object.keys(AUFGABEN);
const mitProbe = alle.filter(t => proben[t]);
const ohneProbe = alle.filter(t => !proben[t]);

console.log("=== NACHGERECHNET ===");
mitProbe.forEach(t => console.log(`  ${String(geprueft[t] || 0).padStart(4)}× ${t}`));
console.log(`\n${mitProbe.length} von ${alle.length} Themen werden inhaltlich nachgerechnet.`);

console.log("\n=== NICHT MASCHINELL PRÜFBAR ===");
ohneProbe.forEach(t => console.log(`  ${t} — ${NICHT_PRUEFBAR[t] || "keine Regel hinterlegt"}`));

console.log("\n=== ERGEBNIS ===");
const einzig = [...new Set(fehler)];
if (!einzig.length) console.log("Keine inhaltlichen Fehler gefunden.");
else { console.log(`${einzig.length} Fund(e):`); einzig.forEach(f => console.log("  ! " + f)); process.exitCode = 1; }
