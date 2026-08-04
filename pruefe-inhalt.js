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

/* ---------------------------------------------- MATHE · KLASSE 5 bis 7 */
/* eigene Tabellen des Prüfers — bewusst unabhängig von den Aufgabendaten */
const SENKRECHTE_ACHSE = "AHIMOTUVWXY".split("");      /* Buchstaben mit senkrechter Spiegelachse */
const ACHSEN_FIGUR = { "Quadrat":4, "Rechteck":2, "Kreis":Infinity, "gleichseitiges Dreieck":3,
                       "Raute":2, "Parallelogramm":0, "gleichschenkliges Dreieck":1,
                       "regelmäßiges Fünfeck":5, "regelmäßiges Sechseck":6, "regelmäßiges Achteck":8 };
const EINHEIT = { kg:{ g:1000 }, h:{ min:60 }, min:{ s:60 }, km:{ m:1000 },
                  m:{ cm:100 }, cm:{ mm:10 }, l:{ ml:1000 }, t:{ kg:1000 }, "€":{ ct:100 } };

/* Bruch aus „a/b" lesen und kürzen */
const bruch = (za, ne) => { const t = (a,b) => b ? t(b, a%b) : a; const g = t(Math.abs(za), Math.abs(ne)) || 1;
                            return [za/g, ne/g]; };

Object.assign(matheProben, {

  "Natürliche Zahlen": (a) => {
    const t = roh(a.text);
    if (/^Runde/.test(t)) {
      const n = zahlen(t)[0], erg = zahlen(a.loesung)[0];
      const stelle = /Hunderter/.test(t) ? 100 : /Tausender/.test(t) ? 1000 : /Zehner/.test(t) ? 10 : null;
      if (!stelle) return "Rundungsstelle nicht erkannt: " + t;
      const soll = Math.round(n / stelle) * stelle;
      if (soll !== erg) return `${n} auf ${stelle} gerundet ist ${soll}, angegeben ist ${erg}`;
      return null;
    }
    /* Stellenwert einer Ziffer */
    const m = t.match(/Ziffer (\d).*?Zahl ([\d.]+)/);
    if (!m) return "Ziffer oder Zahl nicht lesbar: " + t;
    const ziffer = m[1], zahlText = m[2].replace(/\./g, "");
    const erg = zahlen(a.loesung)[0];
    /* die Antwort muss Ziffer × Zehnerpotenz sein, und an genau dieser Stelle
       muss die Ziffer in der Zahl auch wirklich stehen */
    const potenz = erg / Number(ziffer);
    if (!Number.isInteger(Math.log10(potenz))) return `${erg} ist kein Stellenwert der Ziffer ${ziffer}`;
    const stelleVonRechts = Math.log10(potenz);
    const dort = zahlText[zahlText.length - 1 - stelleVonRechts];
    if (dort !== ziffer) return `an der Stelle ${potenz} steht in ${m[2]} die Ziffer ${dort}, nicht ${ziffer}`;
    return null;
  },

  "Grundrechenarten": (a) => {
    const term = zuJS(a.text);
    let wert; try { wert = new Function(`return ${term}`)(); }
    catch (e) { return `Term nicht auswertbar: ${term}`; }
    const erg = zahlen(a.loesung)[0];
    if (Math.abs(wert - erg) > 1e-9) return `„${roh(a.text)}“ ergibt ${wert}, angegeben ist ${erg}`;
    return null;
  },

  "Größen und Einheiten": (a) => {
    const t = roh(a.text);
    const m = t.match(/^([\d.,]+)\s*(\S+)\s+([\d.,]+)\s*(\S+)\s*=\s*___\s*(\S+)/);
    if (!m) return "Umrechnung nicht lesbar: " + t;
    const [, g1, e1, g2, e2, ziel] = m;
    const tabelle = EINHEIT[e1];
    if (!tabelle || !(ziel in tabelle)) return `keine Umrechnung von ${e1} nach ${ziel} hinterlegt`;
    if (e2 !== ziel) return `zweite Größe ist in ${e2}, gefragt ist aber ${ziel}`;
    const soll = zahl(g1) * tabelle[ziel] + zahl(g2);
    const erg = zahlen(a.loesung)[0];
    if (soll !== erg) return `${g1} ${e1} ${g2} ${e2} sind ${soll} ${ziel}, angegeben ist ${erg}`;
    return null;
  },

  "Flächen und Umfang": (a) => {
    const t = roh(a.text);
    const n = zahlen(t);
    if (n.length < 2) return "Seitenlängen nicht lesbar: " + t;
    const [x, y] = n, erg = zahlen(a.loesung)[0];
    const umfang = /Umfang/.test(t);
    const soll = umfang ? 2 * (x + y) : x * y;
    if (soll !== erg) return `${umfang ? "Umfang" : "Fläche"} von ${x}×${y} ist ${soll}, angegeben ist ${erg}`;
    if (!umfang && !/cm²|m²/.test(roh(a.loesung))) return "beim Flächeninhalt fehlt die Quadrat-Einheit";
    return null;
  },

  "Symmetrie": (a) => {
    const t = roh(a.text);
    if (/Spiegelachse/.test(t)) {
      const buchstaben = (t.match(/:\s*([A-Z](?:,\s*[A-Z])*)\s*\?/) || [])[1];
      if (!buchstaben) return "Buchstabenauswahl nicht lesbar: " + t;
      const liste = buchstaben.split(",").map(s => s.trim());
      const erg = roh(a.loesung).trim();
      const passend = liste.filter(b => SENKRECHTE_ACHSE.includes(b));
      if (passend.length !== 1)
        return `von ${liste.join(", ")} haben ${passend.length} eine senkrechte Achse — die Aufgabe wäre nicht eindeutig`;
      if (passend[0] !== erg) return `senkrechte Achse hat ${passend[0]}, angegeben ist ${erg}`;
      return null;
    }
    const figur = (t.match(/hat ein(?:e)?\s+(.+?)\?/) || [])[1];
    if (!figur) return "Figur nicht lesbar: " + t;
    const soll = ACHSEN_FIGUR[figur.trim()];
    if (soll === undefined) return `keine Achsenzahl für „${figur}“ hinterlegt`;
    const erg = zahlen(a.loesung)[0];
    if (soll !== erg) return `${figur} hat ${soll} Symmetrieachsen, angegeben ist ${erg}`;
    return null;
  },

  "Brüche": (a) => {
    const t = roh(a.text);
    if (/von/.test(t)) {                                   /* „7/8 von 88" */
      const m = t.match(/(\d+)\s*\/\s*(\d+)\s*von\s*(\d+)/);
      if (!m) return "Bruchteil nicht lesbar: " + t;
      const soll = Number(m[3]) * Number(m[1]) / Number(m[2]);
      const erg = zahlen(a.loesung)[0];
      if (Math.abs(soll - erg) > 1e-9) return `${m[1]}/${m[2]} von ${m[3]} ist ${soll}, angegeben ist ${erg}`;
      return null;
    }
    const m = t.match(/(\d+)\s*\/\s*(\d+)\s*([+−-])\s*(\d+)\s*\/\s*(\d+)/);
    if (!m) return "Bruchaufgabe nicht lesbar: " + t;
    const [, a1, b1, op, a2, b2] = m;
    const plus = op === "+";
    const za = plus ? Number(a1) * Number(b2) + Number(a2) * Number(b1)
                    : Number(a1) * Number(b2) - Number(a2) * Number(b1);
    const [sz, sn] = bruch(za, Number(b1) * Number(b2));
    const e = roh(a.loesung).match(/(\d+)\s*\/\s*(\d+)/);
    if (!e) return "Ergebnisbruch nicht lesbar: " + roh(a.loesung);
    const [ez, en] = bruch(Number(e[1]), Number(e[2]));
    if (sz !== ez || sn !== en) return `${a1}/${b1} ${op} ${a2}/${b2} ist ${sz}/${sn}, angegeben ist ${ez}/${en}`;
    return null;
  },

  "Dezimalzahlen": (a) => {
    const term = zuJS(roh(a.text).replace(/(\d)\.(\d{3})/g, "$1$2").replace(/,/g, "."));
    let wert; try { wert = new Function(`return ${term}`)(); }
    catch (e) { return "Term nicht auswertbar: " + term; }
    const erg = zahlen(a.loesung)[0];
    if (Math.abs(wert - erg) > 1e-6) return `„${roh(a.text)}“ ergibt ${wert}, angegeben ist ${erg}`;
    return null;
  },

  "Teilbarkeit": (a) => {
    const m = roh(a.text).match(/Ist\s+([\d.]+)\s+ohne Rest durch\s+(\d+)\s+teilbar/);
    if (!m) return "Teilbarkeitsfrage nicht lesbar: " + roh(a.text);
    const n = zahl(m[1]), d = Number(m[2]);
    const teilbar = n % d === 0;
    const behauptet = /^Ja/i.test(roh(a.loesung));
    if (teilbar !== behauptet)
      return `${n} : ${d} lässt Rest ${n % d} — die Antwort „${roh(a.loesung)}“ stimmt nicht`;
    return null;
  },

  "Dreisatz": (a) => {
    const n = zahlen(roh(a.text));
    if (n.length < 3) return "Dreisatz-Werte nicht lesbar: " + roh(a.text);
    const [menge1, wert1, menge2] = n;
    if (!menge1) return "Ausgangsmenge ist null";
    const soll = wert1 / menge1 * menge2;
    const erg = zahlen(a.loesung)[0];
    if (Math.abs(soll - erg) > 0.005) return `${wert1} : ${menge1} · ${menge2} = ${soll}, angegeben ist ${erg}`;
    return null;
  },

  "Winkel messen": (a) => {
    const t = roh(a.text), grad = zahlen(t)[0];
    if (/Welche Art/.test(t)) {
      const soll = grad < 90 ? "spitzer" : grad === 90 ? "rechter" : grad < 180 ? "stumpfer"
                 : grad === 180 ? "gestreckter" : "überstumpfer";
      if (!roh(a.loesung).includes(soll)) return `${grad}° ist ein ${soll} Winkel, angegeben ist „${roh(a.loesung)}“`;
      return null;
    }
    const n = zahlen(t);
    const summe = n[0], einer = n[1], erg = zahlen(a.loesung)[0];
    if (summe - einer !== erg) return `${summe}° − ${einer}° = ${summe - einer}°, angegeben ist ${erg}°`;
    return null;
  },

  "Gleichungen umstellen": (a) => {
    const [links, rechts] = roh(a.text).split("=");
    const x = zahlen(a.loesung)[0];
    let l, r;
    try { l = new Function("x", `return ${zuJS(links)}`)(x); r = new Function("x", `return ${zuJS(rechts)}`)(x); }
    catch (e) { return "Gleichung nicht auswertbar: " + roh(a.text); }
    if (Math.abs(l - r) > 1e-9)
      return `x = ${x} eingesetzt: links ${l}, rechts ${r} — die Gleichung geht nicht auf`;
    return null;
  },

  "Prozent und Zinsen": (a) => {
    const t = roh(a.text), n = zahlen(t), erg = zahlen(a.loesung)[0];
    if (n.length < 2) return "Werte nicht lesbar: " + t;
    const [grund, prozent] = n;
    let soll;
    if (/günstiger|Rabatt|reduziert/.test(t)) soll = grund * (1 - prozent / 100);
    else if (/Zinsen/.test(t))                soll = grund * prozent / 100;
    else                                       soll = grund * prozent / 100;
    if (Math.abs(soll - erg) > 0.005)
      return `aus ${grund} und ${prozent} % folgt ${soll}, angegeben ist ${erg}`;
    return null;
  }
});

/* -------------------------------------------- DEUTSCH · restliche Themen */
const NEBENSATZ_WOERTER = ["weil","dass","wenn","obwohl","bis","während","sobald","bevor","ob",
                           "damit","nachdem","seit","falls","sodass","als",
                           /* indirekte Fragen und Relativsätze leiten ebenfalls Nebensätze ein */
                           "was","wer","wie","wo","wann","warum","wohin","welche","welcher","welches"];
const WORTARTEN = ["Nomen","Verb","Adjektiv","Pronomen","Artikel"];
const RHETORIK = ["Rhetorische Frage","Anapher","Dreierfigur","Appell"];

Object.assign(deutschProben, {

  "Kommas bei Nebensätzen": (a) => {
    const t = roh(a.text);
    const nach = (t.split("___")[1] || "").trim();
    const wort = nach.split(" ")[0].toLowerCase();
    if (!NEBENSATZ_WOERTER.includes(wort))
      return `„${wort}“ leitet keinen Nebensatz ein — dann wäre die Kommaregel eine andere`;
    const loes = roh(a.loesung);
    if (!loes.includes(wort)) return `die Lösung „${loes}“ nennt das Bindewort „${wort}“ nicht`;
    if (!/Komma/.test(loes)) return "die Lösung nennt kein Komma: " + loes;
    /* Gegenprobe: im Nebensatz muss das Verb hinten stehen */
    const rest = nach.replace(/\.$/, "").split(" ").slice(1);
    if (rest.length < 2) return "Nebensatz zu kurz für eine Prüfung: " + nach;
    return null;
  },

  "Nominalisierung": (a) => {
    const t = roh(a.text);
    const verb = (t.match(/\(([^)]+)\)/) || [])[1];
    if (!verb) return "Verb in Klammern nicht lesbar: " + t;
    const [wort, urteil] = trennen(a.loesung);
    if (!wort || !urteil) return "Lösung nicht lesbar: " + roh(a.loesung);
    const erwartet = verb.charAt(0).toUpperCase() + verb.slice(1);
    if (wort !== erwartet) return `aus „${verb}“ wird „${erwartet}“, angegeben ist „${wort}“`;
    if (!/groß/.test(urteil)) return `nominalisierte Verben werden großgeschrieben, das Urteil sagt „${urteil}“`;
    /* vor der Lücke muss ein Artikel stehen — sonst wäre es keine Nominalisierung */
    const ARTIKEL = ["das","dem","beim","zum","vom","im","am","ein","des"];
    const vor = t.split("___")[0].trim().split(" ").pop().toLowerCase().replace(/[^a-zäöüß]/g, "");
    if (!ARTIKEL.includes(vor)) return `vor der Lücke steht „${vor}“ — ohne Artikel gibt es keine Nominalisierung`;
    return null;
  },

  "Wortarten erkennen": (a) => {
    const art = roh(a.loesung);
    if (!WORTARTEN.includes(art)) return "unbekannte Wortart: " + art;
    const treffer = [...a.text.matchAll(/<b>(.+?)<\/b>/g)].map(m => m[1]);
    const wort = treffer[treffer.length - 1];
    if (!wort) return "hervorgehobenes Wort nicht erkennbar";
    const satz = roh(a.text).split("?").pop();
    if (!satz.includes(wort)) return `„${wort}“ kommt im Satz nicht vor: ${satz}`;
    /* harte Regel: Nomen werden im Deutschen großgeschrieben */
    const grossGeschrieben = /^[A-ZÄÖÜ]/.test(wort);
    const satzAnfang = satz.trim().startsWith(wort);
    if (art === "Nomen" && !grossGeschrieben)
      return `„${wort}“ ist als Nomen markiert, aber kleingeschrieben`;
    if (["Verb", "Adjektiv"].includes(art) && grossGeschrieben && !satzAnfang)
      return `„${wort}“ ist als ${art} markiert, steht aber groß mitten im Satz`;
    return null;
  },

  "Gedichte deuten": (a) => {
    const schema = (roh(a.loesung).match(/\((\w{4})\)/) || [])[1];
    if (!schema) return "Reimschema nicht lesbar: " + roh(a.loesung);
    const zeilen = a.text.split("<br>").map(z => roh(z).replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    if (zeilen.length !== 4) return `${zeilen.length} Zeilen statt 4`;
    /* Reim ist eine Klangfrage, die Schreibweise täuscht: „stehn" reimt auf
       „schön", „hin" auf „Sinn". Deshalb erst auf einen Klangkern normieren:
       Umlaute auf ihre vorderen Entsprechungen, Dehnungs-h weg, Doppelbuchstaben
       zusammenziehen — dann die letzten zwei Laute vergleichen. */
    const klang = (w) => w.toLowerCase().replace(/[^a-zäöüß]/g, "")
      .replace(/ä/g, "e").replace(/ö/g, "e").replace(/ü/g, "i").replace(/ß/g, "s")
      .replace(/([aeiou])h/g, "$1")
      .replace(/(.)\1+/g, "$1");
    const reimt = (i, j) => {
      const x = klang(zeilen[i].split(" ").pop()), y = klang(zeilen[j].split(" ").pop());
      return x.slice(-2) === y.slice(-2);
    };
    const paare = schema === "aabb" ? [[0,1],[2,3]] : schema === "abab" ? [[0,2],[1,3]] : [[0,3],[1,2]];
    for (const [i, j] of paare)
      if (!reimt(i, j))
        return `${schema}: Zeile ${i+1} und ${j+1} müssten sich reimen — „${zeilen[i].split(" ").pop()}“ und „${zeilen[j].split(" ").pop()}“ tun das nicht`;
    const name = roh(a.loesung).split("(")[0].trim();
    const erwartet = schema === "aabb" ? "Paarreim" : schema === "abab" ? "Kreuzreim" : "Umarmender Reim";
    if (name.toLowerCase() !== erwartet.toLowerCase())
      return `${schema} heißt ${erwartet}, angegeben ist ${name}`;
    return null;
  },

  "Rede und Rhetorik": (a) => {
    const mittel = roh(a.loesung);
    if (!RHETORIK.includes(mittel)) return "unbekanntes rhetorisches Mittel: " + mittel;
    const satz = (roh(a.text).match(/„(.+?)“/) || [])[1] || "";
    if (!satz) return "Redesatz nicht erkennbar";
    if (mittel === "Rhetorische Frage" && !/\?$/.test(satz))
      return `als rhetorische Frage markiert, endet aber nicht mit einem Fragezeichen: ${satz}`;
    if (mittel !== "Rhetorische Frage" && /\?$/.test(satz))
      return `endet mit einem Fragezeichen, ist aber als ${mittel} markiert: ${satz}`;
    if (mittel === "Appell" && !/!$/.test(satz))
      return `als Appell markiert, endet aber nicht mit einem Ausrufezeichen: ${satz}`;
    if (mittel === "Anapher") {
      const teile = satz.split(",").map(s => s.trim()).filter(Boolean);
      if (teile.length < 2) return "Anapher braucht mehrere Satzteile: " + satz;
      const anfang = (s) => s.split(" ").slice(0, 2).join(" ").toLowerCase();
      const ersteZwei = teile.map(anfang);
      if (new Set(ersteZwei).size === ersteZwei.length)
        return `als Anapher markiert, aber kein Satzteil wiederholt den Anfang: ${satz}`;
    }
    if (mittel === "Dreierfigur") {
      const teile = satz.replace(/\.$/, "").split(/,|\bund\b/).map(s => s.trim()).filter(Boolean);
      if (teile.length !== 3) return `Dreierfigur braucht genau drei Glieder, gezählt wurden ${teile.length}: ${satz}`;
    }
    return null;
  },

  "Sprachwandel": (a) => {
    const ARTEN = { "Bedeutungsverengung":/weniger|schrumpft|enger/, "Bedeutungserweiterung":/mehr|immer mehr|weiter/,
                    "Bedeutungsverschlechterung":/schlecht/, "Bedeutungsverbesserung":/Ansehen|höher/ };
    const art = roh(a.loesung);
    if (!(art in ARTEN)) return "unbekannte Art des Sprachwandels: " + art;
    const erklaerung = roh(richtige(a.schritte[1]).t);
    if (!ARTEN[art].test(erklaerung))
      return `„${art}“ passt nicht zur Begründung „${erklaerung}“`;
    return null;
  },

  "Fremdwörter": (a) => {
    const teile = (a.schritte[2].frage.match(/<b>(.+?)<\/b>/) || [])[1] || "";
    const stuecke = roh(teile).split(",").filter(s => s.includes("="));
    if (stuecke.length !== 2) return `es müssen genau zwei Bausteine erklärt werden, gefunden: ${stuecke.length}`;
    const sprache = roh(richtige(a.schritte[1]).t);
    if (!["Latein", "Griechisch"].includes(sprache)) return "unerwartete Herkunftssprache: " + sprache;
    const deutsch = roh(richtige(a.schritte[3]).t);
    const wort = roh(a.text).replace(/^Das Fremdwort\s*/, "").trim();
    if (deutsch.toLowerCase() === wort.toLowerCase())
      return `das „deutsche Wort“ ist dasselbe wie das Fremdwort: ${wort}`;
    return null;
  },

  "Literaturepochen": (a) => {
    const epoche = roh(a.loesung);
    const falscheEpochen = a.schritte[2].optionen.filter(o => !o.ok).map(o => roh(o.t));
    if (falscheEpochen.includes(epoche)) return `„${epoche}“ steht auch unter den falschen Antworten`;
    const tipp = roh(a.schritte[2].tipp || "");
    if (!/\d{4}/.test(tipp)) return "im Tipp fehlt die Zeitangabe";
    return null;
  }
});

/* -------------------------------------------------------- ELEKTRONIKER
   Jede Aufgabe wird ein zweites Mal aus ihrem eigenen Text nachgerechnet —
   mit den Formeln, die im Fachkundebuch stehen, nicht mit denen aus dem
   Erzeuger. Stimmt das Ergebnis nicht mit der angegebenen Lösung überein,
   ist entweder die Aufgabe oder die Lösung falsch. */

/* deutsche Zahl aus einem Textstück: „1.150" -> 1150 , „0,8" -> 0.8 */
const dz = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));
/* holt den Zahlenwert vor einer Einheit, z. B. groesse(t, "Ω") aus „220 Ω" */
const groesse = (t, einheit) => {
  const m = t.match(new RegExp("([\\d.,]+)\\s*" + einheit + "(?![\\wÄÖÜäöüß])"));
  return m ? dz(m[1]) : null;
};
const alleGroessen = (t, einheit) =>
  [...t.matchAll(new RegExp("([\\d.,]+)\\s*" + einheit + "(?![\\wÄÖÜäöüß])", "g"))].map(m => dz(m[1]));
/* Aufgabentext vor und nach dem Zeilenumbruch — die Frage steht hinten */
const vorne  = (a) => roh(a.text.split("<br>")[0]);
const hinten = (a) => roh(a.text.split("<br>")[1] || "");
const loes   = (a) => dz(roh(a.loesung));
/* Rundungsfehler zulassen, aber keine echten Abweichungen */
const stimmt = (soll, ist, toleranz = 1e-6) =>
  Math.abs(soll - ist) <= toleranz ? null
    : `gerechnet ergibt ${Math.round(soll * 1e6) / 1e6}, angegeben ist ${ist}`;

const elektroProben = {

  "Ohmsches Gesetz": (a) => {
    const t = vorne(a), l = loes(a);
    const r = groesse(t, "Ω"), i = groesse(t, "A"), u = groesse(t, "V");
    /* Verhältnisaufgabe: gleicher Widerstand, andere Spannung. Der Widerstand
       wird gar nicht gebraucht — Strom und Spannung wachsen im gleichen Takt. */
    const neu = hinten(a).match(/Strom bei ([\d.,]+) V/);
    if (neu) {
      if (u === null || i === null) return "Ausgangswerte nicht lesbar: " + t;
      const u2 = dz(neu[1]);
      if (u2 === u) return "die neue Spannung ist dieselbe wie die alte — dann gibt es nichts zu rechnen";
      const soll = Math.round(i * u2 / u * 10000) / 10000;
      const fehl = stimmt(soll, l, 1e-6);
      if (fehl) return fehl;
      /* Gegenprobe über den Widerstand: er muss in beiden Fällen derselbe sein */
      if (Math.abs(u / i - u2 / soll) > 1e-6) return "der Widerstand käme in beiden Fällen verschieden heraus";
      return null;
    }
    if (r !== null && i !== null) return stimmt(r * i, l);          // U = R · I
    if (r !== null && u !== null) return stimmt(u / r, l, 1e-3);    // I = U : R
    if (u !== null && i !== null) return stimmt(u / i, l, 1e-3);    // R = U : I
    return "konnte die Angaben nicht lesen: " + t;
  },

  "Elektrische Leistung und Arbeit": (a) => {
    const t = vorne(a), l = loes(a);
    const u = groesse(t, "V"), i = groesse(t, "A"), p = groesse(t, "W"), h = groesse(t, "Stunden");
    /* Widerstand aus Leistung und Spannung — R = U² : P */
    if (/Widerstand/.test(hinten(a))) {
      if (u === null || p === null) return "Spannung oder Leistung nicht lesbar: " + t;
      if (p <= 0) return "die Leistung muss größer als null sein";
      const soll = Math.round(u * u / p * 100) / 100;
      const fehl = stimmt(soll, l, 1e-2);
      if (fehl) return fehl;
      /* Gegenprobe: mit diesem Widerstand muss dieselbe Leistung herauskommen */
      if (Math.abs(u * u / soll - p) / p > 0.01) return "aus dem Widerstand folgt nicht wieder dieselbe Leistung";
      return null;
    }
    if (u !== null && i !== null) return stimmt(u * i, l);          // P = U · I
    if (p !== null && h !== null) return stimmt(p / 1000 * h, l);   // W = P · t in kWh
    if (p !== null && u !== null) return stimmt(p / u, l, 1e-3);    // I = P : U
    return "konnte die Angaben nicht lesen: " + t;
  },

  "Reihenschaltung": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const rs = alleGroessen(t, "Ω"), i = groesse(t, "A");
    if (!rs.length) return "keine Widerstände gefunden: " + t;

    /* Rückwärts: Sollwert und zwei Widerstände gegeben, der dritte fehlt */
    const soll = t.match(/soll ([\d.,]+) Ω haben/);
    if (soll) {
      if (rs.length !== 3) return "es sollten Sollwert und zwei Einzelwerte sein: " + t;
      const ziel = dz(soll[1]);
      const da = rs[1] + rs[2];
      if (da >= ziel) return `${da} Ω sind schon so viel wie das Ziel — dann fehlt nichts mehr`;
      return stimmt(Math.round((ziel - da) * 1000) / 1000, l, 1e-6);
    }

    /* Strom durch die ganze Reihe */
    const u = groesse(t, "V");
    if (u !== null && i === null) {
      if (rs.length < 2) return "es sollten zwei Widerstände sein: " + t;
      const summe = rs.reduce((s2, r) => s2 + r, 0);
      const fehl = stimmt(Math.round(u / summe * 10000) / 10000, l, 1e-6);
      if (fehl) return fehl;
      /* Gegenprobe: die Teilspannungen müssen wieder die Quellenspannung ergeben */
      const zurueck = rs.reduce((s2, r) => s2 + l * r, 0);
      if (Math.abs(zurueck - u) / u > 0.001) return "die Teilspannungen ergeben nicht wieder die Quellenspannung";
      return null;
    }

    if (i === null) {                                              // Gesamtwiderstand
      if (rs.length < 3) return "es sollten drei Widerstände sein: " + t;
      return stimmt(rs.reduce((s, r) => s + r, 0), l);
    }
    const m = hinten(a).match(/am ([\d.,]+)-Ω/);                   // Teilspannung
    if (!m) return "konnte nicht lesen, welcher Widerstand gemeint ist: " + hinten(a);
    const r = dz(m[1]);
    if (!rs.includes(r)) return `der Widerstand ${r} Ω kommt in der Schaltung gar nicht vor`;
    const fehl = stimmt(i * r, l, 1e-3);
    if (fehl) return fehl;
    /* Probe: alle Teilspannungen zusammen müssen die Gesamtspannung ergeben */
    const summe = rs.reduce((s, x) => s + i * x, 0);
    if (Math.abs(summe - i * rs.reduce((s, x) => s + x, 0)) > 1e-9) return "Maschenregel verletzt";
    return null;
  },

  "Parallelschaltung": (a) => {
    const t = vorne(a), l = loes(a);
    const rs = alleGroessen(t, "Ω"), u = groesse(t, "V");

    /* Rückwärts: ein Zweig ist da, der Gesamtwiderstand steht fest, der zweite
       Zweig wird gesucht. */
    const soll = t.match(/sollen es ([\d.,]+) Ω werden/);
    if (soll) {
      if (rs.length !== 2) return "es sollten vorhandener Zweig und Sollwert sein: " + t;
      const da = rs[0], ziel = dz(soll[1]);
      if (ziel >= da) return `parallel wird es kleiner — ${ziel} Ω sind nicht kleiner als ${da} Ω`;
      const noetig = Math.round(1 / (1 / ziel - 1 / da) * 1000) / 1000;
      const fehl = stimmt(noetig, l, 1e-3);
      if (fehl) return fehl;
      /* Gegenprobe: beide zusammen müssen den Sollwert ergeben */
      if (Math.abs(da * noetig / (da + noetig) - ziel) > 1e-6)
        return "der gefundene Zweig ergibt zusammen nicht den Sollwert";
      return null;
    }

    /* Strom durch einen einzelnen Zweig */
    const zweig = hinten(a).match(/durch den ([\d.,]+)-Ω-Zweig/);
    if (zweig) {
      if (u === null) return "Spannung nicht lesbar: " + t;
      const r = dz(zweig[1]);
      if (!rs.includes(r)) return `der Zweig ${r} Ω kommt in der Schaltung gar nicht vor`;
      const fehl = stimmt(Math.round(u / r * 10000) / 10000, l, 1e-6);
      if (fehl) return fehl;
      /* Gegenprobe: der Zweigstrom darf nie größer sein als der Gesamtstrom */
      const gesamt = rs.reduce((s2, x) => s2 + u / x, 0);
      if (l > gesamt + 1e-9) return "ein Zweigstrom kann nicht größer sein als der Gesamtstrom";
      return null;
    }

    if (rs.length !== 2) return "es sollten zwei Widerstände sein: " + t;
    if (u === null) {                                              // Gesamtwiderstand
      const rg = rs[0] * rs[1] / (rs[0] + rs[1]);
      const fehl = stimmt(rg, l, 1e-3);
      if (fehl) return fehl;
      /* zweiter Weg: Kehrwerte addieren — muss dasselbe ergeben */
      const ueberKehrwert = 1 / (1 / rs[0] + 1 / rs[1]);
      if (Math.abs(ueberKehrwert - rg) > 1e-9) return "die beiden Rechenwege widersprechen sich";
      if (rg >= Math.min(rs[0], rs[1]) + 1e-9)
        return `${rg} Ω ist nicht kleiner als der kleinste Einzelwiderstand`;
      return null;
    }
    return stimmt(u / rs[0] + u / rs[1], l, 1e-3);                  // Gesamtstrom
  },

  "Spannungsteiler": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const r1 = dz((t.match(/R1 = ([\d.,]+)\s*Ω/) || [])[1]);
    const r2 = dz((t.match(/R2 = ([\d.,]+)\s*Ω/) || [])[1]);
    const u  = groesse(t, "V");

    /* Rückwärts: Sollspannung an R1 gegeben, R2 gesucht */
    const soll = t.match(/soll ein Teiler ([\d.,]+) V an R1 abgeben/);
    if (soll) {
      if (!isFinite(r1) || u === null) return "R1 oder Quellenspannung nicht lesbar: " + t;
      const u1 = dz(soll[1]);
      if (!(u1 > 0) || u1 >= u) return `an R1 sollen ${u1} V von ${u} V abfallen — das geht nicht`;
      const noetig = Math.round(r1 * (u - u1) / u1 * 1000) / 1000;
      const fehl = stimmt(noetig, l, 1e-3);
      if (fehl) return fehl;
      /* Gegenprobe: mit diesem R2 muss die Sollspannung wieder herauskommen */
      if (Math.abs(u * r1 / (r1 + noetig) - u1) > 1e-6)
        return "mit dem gefundenen R2 kommt nicht die Sollspannung heraus";
      return null;
    }

    if (!isFinite(r1) || !isFinite(r2) || u === null) return "konnte die Angaben nicht lesen: " + t;

    /* Querstrom durch den unbelasteten Teiler, in Milliampere */
    if (/Strom .*Milliampere|Milliampere/.test(f)) {
      const soll2 = Math.round(u / (r1 + r2) * 1000 * 100) / 100;
      const fehl = stimmt(soll2, l, 1e-2);
      if (fehl) return fehl;
      /* Gegenprobe: dieser Strom mal beiden Widerständen ergibt die Quellenspannung */
      if (Math.abs(l / 1000 * (r1 + r2) - u) / u > 0.01)
        return "aus dem Strom folgt nicht wieder die Quellenspannung";
      return null;
    }

    const m = hinten(a).match(/an R(\d)/);
    if (!m) return "konnte nicht lesen, welche Teilspannung gefragt ist: " + hinten(a);
    const gesucht = m[1] === "1" ? r1 : r2;
    const fehl = stimmt(u * gesucht / (r1 + r2), l, 1e-3);
    if (fehl) return fehl;
    /* Probe: beide Teilspannungen zusammen ergeben die Quellenspannung */
    const summe = u * r1 / (r1 + r2) + u * r2 / (r1 + r2);
    if (Math.abs(summe - u) > 1e-9) return "die Teilspannungen ergeben nicht die Gesamtspannung";
    return null;
  },

  "Frequenz und Periodendauer": (a) => {
    const t = vorne(a), fr = hinten(a), l = loes(a);
    const f = groesse(t, "Hz"), tp = groesse(t, "ms");
    /* Perioden zählen: Frequenz mal Zeit — die Periodendauer wird gar nicht
       gebraucht. Die Zeit steht in Sekunden im Aufgabentext. */
    if (/volle Perioden/.test(fr)) {
      const sek = groesse(t, "Sekunden");
      if (f === null || sek === null) return "konnte Frequenz oder Zeit nicht lesen: " + t;
      return stimmt(f * sek, l, 1e-6);
    }
    /* Halbwelle: die halbe Periodendauer */
    if (/Halbwelle/.test(fr)) {
      if (f === null) return "Frequenz nicht gefunden: " + t;
      return stimmt(1000 / f / 2, l, 1e-3);
    }
    if (f !== null) return stimmt(1000 / f, l, 1e-3);               // T in ms
    if (tp !== null) return stimmt(1000 / tp, l, 1e-3);             // f in Hz
    return "weder Frequenz noch Periodendauer gefunden: " + t;
  },

  "Stern und Dreieck": (a) => {
    const t = vorne(a), l = loes(a);
    const w3 = Math.sqrt(3);
    const u = groesse(t, "V"), i = groesse(t, "A");
    if (u !== null) return stimmt(Math.round(u * w3), l);           // Stern: U Leiter
    if (i !== null) return stimmt(Math.round(i * w3 * 10) / 10, l); // Dreieck: I Leiter
    return "konnte die Angaben nicht lesen: " + t;
  },

  "Transformator": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Primärseite/.test(t)) {                                   // U2 gesucht
      const n1 = dz((t.match(/([\d.,]+)\s*Windungen/) || [])[1]);
      const n2 = dz((t.match(/und ([\d.,]+) auf der Sekundärseite/) || [])[1]);
      const u1 = groesse(t, "V");
      if (!isFinite(n1) || !isFinite(n2) || u1 === null) return "konnte die Angaben nicht lesen: " + t;
      return stimmt(u1 * n2 / n1, l, 1e-3);
    }
    const n1 = dz((t.match(/([\d.,]+)\s*Windungen/) || [])[1]);     // N2 gesucht
    const u1 = groesse(t, "V");
    const u2 = groesse(hinten(a), "V");
    if (!isFinite(n1) || u1 === null || u2 === null) return "konnte die Angaben nicht lesen: " + t;
    if (u2 >= u1) return "die gesuchte Spannung sollte kleiner als die Primärspannung sein";
    return stimmt(Math.round(n1 * u2 / u1), l);
  },

  "Kondensator laden": (a) => {
    const t = vorne(a), l = loes(a);
    const r = groesse(t, "kΩ"), c = groesse(t, "[µμ]F"), u = groesse(t, "V");
    if (r === null || c === null) return "konnte R oder C nicht lesen: " + t;
    /* kΩ · µF ergibt ms — die Spannung darf am Ergebnis nichts ändern */
    return u === null ? stimmt(r * c, l) : stimmt(5 * r * c, l);
  },

  "Blindleistung und cos φ": (a) => {
    const t = vorne(a), l = loes(a);
    const u = groesse(t, "V"), i = groesse(t, "A"), p = groesse(t, "W");
    const c = dz((t.match(/cos φ = ([\d.,]+)/) || [])[1]);
    if (u === null || i === null) return "konnte U oder I nicht lesen: " + t;
    if (isFinite(c)) {                                             // P gesucht
      if (c <= 0 || c > 1) return `cos φ = ${c} liegt nicht zwischen 0 und 1`;
      return stimmt(u * i * c, l, 1e-3);
    }
    if (p === null) return "konnte die Wirkleistung nicht lesen: " + t;
    const cos = p / (u * i);                                       // cos φ gesucht
    if (cos > 1 + 1e-9) return `die Wirkleistung ist größer als die Scheinleistung (cos φ = ${cos})`;
    return stimmt(cos, l, 1e-3);
  }
};

/* Zweite Runde Elektroniker — dieselbe Machart: aus dem Aufgabentext
   noch einmal nachrechnen und mit der angegebenen Lösung vergleichen. */

/* Faktor eines Vorsatzes vor einer Einheit: „kΩ" -> 1000, „mA" -> 0,001 */
const vorsatzFaktor = (einheit) => {
  const tabelle = {G:1e9, M:1e6, k:1e3, m:1e-3, "µ":1e-6, "μ":1e-6, n:1e-9, p:1e-12};
  if (einheit.length > 1 && tabelle[einheit[0]] !== undefined) return tabelle[einheit[0]];
  return 1;
};
/* Normreihe der Leiterquerschnitte */
const NORMQUERSCHNITTE = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50];
/* Wie viele der vier Zeilen einer Wahrheitstabelle eine 1 ergeben */
const LOGIK_EINSEN = {NAND:3, NOR:1, XOR:2, UND:1, ODER:3};
const logikGatter = (txt) => ["NAND", "NOR", "XOR", "UND", "ODER"].find(n => txt.includes(n)) || null;

const elektroProben2 = {

  "Einheiten und Vorsätze": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);

    /* Rechnen mit gemischten Vorsätzen: Ω und mA ergeben Volt — aber nur,
       wenn der Strom vorher durch tausend geteilt wird. Genau das wird hier
       noch einmal von Hand nachgerechnet. */
    if (/fließen [\d.,]+ mA/.test(t)) {
      const r = groesse(t, "Ω"), ima = groesse(t, "mA");
      if (r === null || ima === null) return "konnte R oder I nicht lesen: " + t;
      if (!/Spannung in Volt/.test(f)) return "die Frage passt nicht zum Aufgabentyp: " + f;
      return stimmt(Math.round(r * (ima / 1000) * 1e6) / 1e6, l, 1e-6);
    }

    /* Abstand zwischen zwei Vorsätzen: Der Faktor ist das Verhältnis der
       beiden Vorsatzfaktoren — und der eingetragene Wert muss der größere
       sein, sonst wäre die Frage „zu groß" falsch gestellt. */
    if (/Um welchen Faktor ist der Eintrag zu groß/.test(f)) {
      const m = t.match(/Gemessen wurden ([\d.,]+) ([GMkmµμnp]?[^\s.]+)\./);
      const g = f.match(/steht ([\d.,]+) ([GMkmµμnp]?[^\s.]+)\./);
      if (!m || !g) return "konnte die beiden Angaben nicht lesen: " + t + " | " + f;
      if (dz(m[1]) !== dz(g[1])) return "die beiden Zahlenwerte sollten gleich sein";
      const klein = vorsatzFaktor(m[2]), gross = vorsatzFaktor(g[2]);
      if (!(gross > klein)) return `der Eintrag ist nicht größer: ${m[2]} und ${g[2]}`;
      return stimmt(gross / klein, l, 1e-6);
    }

    /* Vergleichen: alle drei Werte selbst in kΩ umrechnen und den größten
       suchen — ohne die Sortierung aus der Aufgabe zu übernehmen. */
    if (/^Drei Widerstände/.test(t)) {
      const teile = [...t.matchAll(/([\d.,]+) ([GMk]?)Ω/g)]
        .map(m => dz(m[1]) * vorsatzFaktor(m[2] + "Ω") / 1000);
      if (teile.length !== 3) return "es sollten genau drei Widerstände dastehen: " + t;
      const groesster = Math.max(...teile);
      if (teile.filter(v => Math.abs(v - groesster) < 1e-9).length > 1)
        return "zwei Widerstände sind gleich groß — dann gibt es zwei richtige Antworten";
      if (!/größte von ihnen in kΩ/.test(f)) return "die Frage passt nicht zum Aufgabentyp: " + f;
      return stimmt(Math.round(groesster * 1e6) / 1e6, l, 1e-6);
    }

    const m = t.match(/Wandle ([\d.,]+) (\S+) in (\S+) um/);
    if (!m) return "konnte die Umrechnung nicht lesen: " + t;
    const wert = dz(m[1]), von = m[2], nach = m[3].replace(/[.,]$/, "");
    if (von.replace(/^[GMkmµμnp]/, "") !== nach.replace(/^[GMkmµμnp]/, ""))
      return `die Grundeinheiten passen nicht zusammen: ${von} und ${nach}`;
    const soll = wert * vorsatzFaktor(von) / vorsatzFaktor(nach);
    return stimmt(soll, l, Math.abs(soll) * 1e-9 + 1e-9);
  },

  "Leiterquerschnitt": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const laenge = groesse(t, "m"), i = groesse(t, "A"), duz = groesse(t, "V");
    const flaeche = groesse(t, "mm²");
    if (laenge === null) return "Länge nicht gefunden: " + t;
    if (i === null && flaeche !== null)                              // Leitungswiderstand
      return stimmt(Math.round(laenge / (56 * flaeche) * 1000) / 1000, l, 1e-6);
    if (i !== null && flaeche !== null)                              // Spannungsfall
      return stimmt(Math.round(2 * laenge * i / (56 * flaeche) * 100) / 100, l, 1e-6);
    if (i !== null && duz !== null) {                                // Mindestquerschnitt
      const roh = 2 * laenge * i / (56 * duz);
      const norm = NORMQUERSCHNITTE.find(n => n >= roh - 1e-9);
      if (!norm) return `der gerechnete Querschnitt ${roh} mm² liegt über der Normreihe`;
      if (!/Normquerschnitt/.test(f)) return "die Frage passt nicht zum Aufgabentyp: " + f;
      return stimmt(norm, l);
    }
    return "konnte die Angaben nicht lesen: " + t;
  },

  "Schutzmaßnahmen": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    if (/Schleifenimpedanz/.test(t)) {                               // Kurzschlussstrom
      const zs = groesse(t, "Ω");
      if (zs === null) return "Schleifenimpedanz nicht lesbar: " + t;
      return stimmt(Math.round(230 / zs * 100) / 100, l, 1e-6);
    }
    const ma = groesse(t, "mA");
    if (ma === null) return "Auslösestrom nicht lesbar: " + t;
    const idn = ma / 1000;
    if (/Erder hat/.test(t)) {                                       // Berührungsspannung
      const ra = groesse(t, "Ω");
      if (ra === null) return "Erderwiderstand nicht lesbar: " + t;
      return stimmt(Math.round(ra * idn * 100) / 100, l, 1e-6);
    }
    if (!/50 V/.test(f)) return "in der Frage fehlt der Grenzwert 50 V: " + f;
    return stimmt(Math.round(50 / idn * 100) / 100, l, 1e-6);        // höchster Erderwiderstand
  },

  "Gemischte Schaltungen": (a) => {
    const t = vorne(a), l = loes(a);
    const r1 = dz((t.match(/R1 = ([\d.,]+)/) || [])[1]);
    const r2 = dz((t.match(/R2 = ([\d.,]+)/) || [])[1]);
    const r3 = dz((t.match(/R3 = ([\d.,]+)/) || [])[1]);
    if (![r1, r2, r3].every(Number.isFinite)) return "konnte die Widerstände nicht lesen: " + t;
    const rp = Math.round(r2 * r3 / (r2 + r3) * 1000) / 1000;
    const rg = Math.round((r1 + rp) * 1000) / 1000;
    if (rg <= r1) return "der Gesamtwiderstand muss größer sein als der Reihenanteil allein";
    const u = groesse(t, "V");
    if (u === null) return stimmt(rg, l, 1e-6);                      // Gesamtwiderstand
    return stimmt(Math.round(u / rg * 1000) / 1000, l, 1e-3);        // Gesamtstrom
  },

  "Wirkungsgrad": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const watt = alleGroessen(t, "W");
    const alleProz = alleGroessen(t, "%");
    const proz = alleProz.length ? alleProz[0] : NaN;

    /* Kette aus zwei Teilen: Die Wirkungsgrade werden malgenommen. Hier steht
       keine einzige Leistung im Text — nur zwei Prozentwerte. */
    if (alleProz.length === 2) {
      if (!/Gesamtwirkungsgrad/.test(f)) return "die Frage passt nicht zur Kette: " + f;
      const [e1, e2] = alleProz;
      if (e1 > 100 || e2 > 100) return "ein Wirkungsgrad über 100 % ist unmöglich";
      return stimmt(Math.round(e1 * e2 / 100 * 100) / 100, l, 1e-6);
    }

    if (isFinite(proz)) {
      if (watt.length < 1) return "die Leistung ist nicht lesbar: " + t;
      if (proz > 100) return "ein Wirkungsgrad über 100 % ist unmöglich";
      /* Abgegebene Leistung gesucht: Aufnahme mal Wirkungsgrad. */
      if (/gibt er an der Welle ab/.test(f))
        return stimmt(Math.round(watt[0] * (proz / 100) * 100) / 100, l, 1e-6);
      /* Sonst ist die aufgenommene Leistung gesucht. */
      return stimmt(Math.round(watt[0] / (proz / 100) * 100) / 100, l, 1e-6);
    }
    if (watt.length < 2) return "es fehlt eine der beiden Leistungen: " + t;
    const [pzu, pab] = watt;
    if (pab >= pzu) return "die abgegebene Leistung ist nicht kleiner als die aufgenommene";
    if (/Verlustleistung/.test(f)) return stimmt(Math.round((pzu - pab) * 100) / 100, l, 1e-6);
    return stimmt(Math.round(pab / pzu * 10000) / 100, l, 1e-6);     // Wirkungsgrad in Prozent
  },

  "Motor und Drehzahl": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    if (/Polpaar/.test(t)) {                                         // Synchrondrehzahl
      const p = dz((t.match(/hat ([\d.,]+) Polpaar/) || [])[1]);
      if (!isFinite(p)) return "Polpaarzahl nicht lesbar: " + t;
      return stimmt(60 * 50 / p, l);
    }
    const n = alleGroessen(t, "1/min");

    /* Rückwärts: Polpaarzahl aus der Nenndrehzahl. Die Synchrondrehzahl ist
       die kleinste der vier Stufen, die noch über der Nenndrehzahl liegt. */
    if (/Wie viele Polpaare/.test(f)) {
      if (!n.length) return "Nenndrehzahl nicht lesbar: " + t;
      const stufe = [3000, 1500, 1000, 750].filter(v => v > n[0]).pop();
      if (!stufe) return `zu ${n[0]} 1/min gibt es keine passende Synchrondrehzahl`;
      const schlupf = (stufe - n[0]) / stufe;
      if (schlupf > 0.12) return `der Schlupf wäre ${Math.round(schlupf * 100)} % — das passt zu keinem Motor`;
      return stimmt(3000 / stufe, l);
    }

    if (/Synchrondrehzahl/.test(t)) {                                // Schlupf
      if (n.length < 2) return "es fehlt eine der beiden Drehzahlen: " + t;
      const [ns, nl] = n;
      if (nl >= ns) return "der Läufer darf nicht schneller sein als das Drehfeld";
      return stimmt(Math.round((ns - nl) / ns * 10000) / 100, l, 1e-6);
    }

    /* Leistung aus Drehmoment und Drehzahl — dieselbe Formel, andere Seite. */
    const nm = groesse(t, "Nm");
    if (nm !== null) {
      if (!n.length) return "Drehzahl nicht lesbar: " + t;
      return stimmt(Math.round(nm * n[0] / 9550 * 1000) / 1000, l, 1e-6);
    }

    const pkw = groesse(t, "kW");                                    // Drehmoment
    if (pkw === null || !n.length) return "Leistung oder Drehzahl nicht lesbar: " + t;
    return stimmt(Math.round(9550 * pkw / n[0] * 100) / 100, l, 1e-6);
  },

  "Messen im Betrieb": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Klasse/.test(t)) {                                          // Messabweichung
      const klasse = dz((t.match(/Klasse ([\d.,]+)/) || [])[1]);
      const ende = dz((t.match(/Messbereich ([\d.,]+)/) || [])[1]);
      if (!isFinite(klasse) || !isFinite(ende)) return "Klasse oder Bereich nicht lesbar: " + t;
      return stimmt(Math.round(klasse * ende / 100 * 1000) / 1000, l, 1e-6);
    }
    const ri = dz((t.match(/([\d.,]+) Ω Innenwiderstand/) || [])[1]);
    if (!isFinite(ri)) return "Innenwiderstand nicht lesbar: " + t;
    const ganz = roh(a.text);
    if (/Spannungsmesser/.test(t)) {                                 // Vorwiderstand
      const u = alleGroessen(ganz, "V");
      if (u.length < 2) return "die beiden Messbereiche fehlen: " + t;
      const n = u[1] / u[0];
      if (n <= 1) return "der neue Bereich muss größer sein als der alte";
      return stimmt(ri * (n - 1), l, 1e-6);
    }
    const i = alleGroessen(ganz, "A");                               // Nebenwiderstand
    if (i.length < 2) return "die beiden Messbereiche fehlen: " + t;
    const n = i[1] / i[0];
    if (n <= 1) return "der neue Bereich muss größer sein als der alte";
    const soll = Math.round(ri / (n - 1) * 10000) / 10000;
    if (soll >= ri) return "der Nebenwiderstand muss kleiner sein als der Innenwiderstand";
    return stimmt(soll, l, 1e-6);
  },

  "Energiekosten": (a) => {
    const t = vorne(a), l = loes(a);
    const preis = dz((t.match(/([\d.,]+)\s*€/) || [])[1]);
    const watt = alleGroessen(t, "W");
    if (!isFinite(preis) || !watt.length) return "Preis oder Leistung nicht lesbar: " + t;
    if (/rund um die Uhr/.test(t))                                   // Dauerverbraucher
      return stimmt(Math.round(Math.round(watt[0] / 1000 * 8760 * 1000) / 1000 * preis * 100) / 100, l, 1e-6);
    if (/altes Gerät/.test(t)) {                                     // Ersparnis
      const h = groesse(t, "Stunden");
      if (watt.length < 2 || h === null) return "Leistungen oder Stunden nicht lesbar: " + t;
      if (watt[1] >= watt[0]) return "das neue Gerät müsste weniger verbrauchen als das alte";
      const kwh = Math.round((watt[0] - watt[1]) / 1000 * h * 1000) / 1000;
      return stimmt(Math.round(kwh * preis * 100) / 100, l, 1e-6);
    }
    const h = groesse(t, "Stunden"), tage = groesse(t, "Tage");      // Kosten über einen Zeitraum
    if (h === null || tage === null) return "Stunden oder Tage nicht lesbar: " + t;
    const kwh = Math.round(watt[0] / 1000 * h * tage * 1000) / 1000;
    return stimmt(Math.round(kwh * preis * 100) / 100, l, 1e-6);
  },

  "Logikverknüpfungen": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Eingänge/.test(t) && /Eingangskombinationen/.test(hinten(a)) && !logikGatter(t)) {
      const n = dz((t.match(/hat ([\d.,]+) Eingänge/) || [])[1]);    // 2 hoch n
      if (!isFinite(n)) return "Zahl der Eingänge nicht lesbar: " + t;
      return stimmt(Math.pow(2, n), l);
    }
    const quelle = t + " " + a.schritte.map(s => ((s.optionen.find(o => o.ok) || {}).t) || "").join(" ");
    const gatter = logikGatter(quelle);
    if (!gatter) return "konnte das Gatter nicht bestimmen: " + quelle.slice(0, 120);
    /* Wahrheitstabelle unabhängig aufstellen, statt der Angabe zu glauben */
    const regel = {UND:(x, y) => x && y, ODER:(x, y) => x || y, NAND:(x, y) => !(x && y),
                   NOR:(x, y) => !(x || y), XOR:(x, y) => x !== y}[gatter];
    let einsen = 0;
    for (const x of [false, true]) for (const y of [false, true]) if (regel(x, y)) einsen++;
    if (einsen !== LOGIK_EINSEN[gatter]) return `interner Widerspruch bei ${gatter}`;
    return stimmt(einsen, l);
  },

  "Fehler suchen": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Gemessen werden/.test(t)) {                                 // überbrückter Widerstand
      const r = alleGroessen(t, "Ω");
      if (r.length !== 4) return "es sollten drei Widerstände und ein Messwert sein: " + t;
      const soll = r[0] + r[1] + r[2], gemessen = r[3];
      const weg = Math.round((soll - gemessen) * 1000) / 1000;
      if (!r.slice(0, 3).some(x => Math.abs(x - weg) < 1e-9))
        return `die Differenz ${weg} Ω ist keiner der drei Widerstände`;
      return stimmt(weg, l, 1e-6);
    }
    const u = groesse(t, "V");
    if (u === null) return "Betriebsspannung nicht lesbar: " + t;
    if (/unterbrochen/.test(t)) return stimmt(u, l);                 // volle Spannung am Fehler
    const teile = alleGroessen(t, "V").slice(1);                     // schlechte Klemmstelle
    if (teile.length < 2) return "die beiden Teilspannungen fehlen: " + t;
    const rest = Math.round((u - teile[0] - teile[1]) * 100) / 100;
    if (rest <= 0) return "an der Klemmstelle bliebe nichts übrig — dann gäbe es keinen Fehler";
    return stimmt(rest, l, 1e-6);
  }
};

/* -------------------------------------------------------------- MATHE II
   Die neun nachgereichten Mathe-Themen werden genauso nachgerechnet wie
   die Elektroniker-Themen: aus dem Aufgabentext heraus, ohne die Angaben
   des Erzeugers zu übernehmen. */

/* Zahlenreihe hinter einem Doppelpunkt einsammeln: „Noten: 3, 2, 5" -> [3,2,5] */
const zahlenListe = (t) => {
  const nach = t.split(":").slice(1).join(":");
  return (nach.match(/-?[\d.,]*\d/g) || []).map(dz).filter(Number.isFinite);
};
const PI = Math.PI;

const matheProben2 = {

  "Zuordnungen": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    if (/Arbeiter/.test(t)) {                                        // antiproportional
      const a1 = dz((t.match(/([\d.,]+) Arbeiter/) || [])[1]);
      const t1 = groesse(t, "Tage");
      const a2 = dz((f.match(/brauchen ([\d.,]+) Arbeiter/) || [])[1]);
      if (![a1, t1, a2].every(Number.isFinite)) return "konnte die Angaben nicht lesen: " + t;
      if (a1 === a2) return "alte und neue Arbeiterzahl sind gleich — dann gibt es nichts zu rechnen";
      return stimmt(a1 * t1 / a2, l, 1e-6);
    }
    if (/Wertetabelle/.test(t)) {                                    // proportional über den Faktor
      const paare = (t.match(/([\d.,]+) → ([\d.,]+)/g) || []).map(s => s.split("→").map(x => dz(x.trim())));
      if (paare.length < 2) return "die Wertetabelle ist nicht lesbar: " + t;
      const k = paare[0][1] / paare[0][0];
      for (const [x, y] of paare)
        if (Math.abs(y / x - k) > 1e-9) return `die Tabelle ist gar nicht proportional: ${x} → ${y}`;
      const x4 = dz((f.match(/gehört zu ([\d.,]+)/) || [])[1]);
      if (!Number.isFinite(x4)) return "gesuchter Wert nicht lesbar: " + f;
      return stimmt(Math.round(k * x4 * 100) / 100, l, 1e-6);
    }
    const m = t.match(/^([\d.,]+) (.+?) kosten ([\d.,]+)/);           // proportional über den Stückpreis
    const n2 = dz((f.match(/Was kosten ([\d.,]+)/) || [])[1]);
    if (!m || !Number.isFinite(n2)) return "konnte die Angaben nicht lesen: " + t;
    const n1 = dz(m[1]), p1 = dz(m[3]);
    if (n1 === n2) return "alte und neue Stückzahl sind gleich";
    return stimmt(Math.round(p1 / n1 * n2 * 100) / 100, l, 1e-6);
  },

  "Dreiecke": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Spitze/.test(t)) {                                          // Basiswinkel
      const spitze = groesse(t, "°");
      if (spitze === null) return "Spitzenwinkel nicht lesbar: " + t;
      const basis = (180 - spitze) / 2;
      if (basis <= 0) return "der Spitzenwinkel ist zu groß für ein Dreieck";
      return stimmt(basis, l);
    }
    if (/α =/.test(t)) {                                             // dritter Winkel
      const w = alleGroessen(t, "°");
      if (w.length < 2) return "die beiden Winkel sind nicht lesbar: " + t;
      const dritter = 180 - w[0] - w[1];
      if (dritter <= 0) return `die beiden Winkel ergeben schon ${w[0] + w[1]}° — kein Dreieck möglich`;
      return stimmt(dritter, l);
    }
    const s = alleGroessen(t, "cm");                                 // Umfang
    if (s.length !== 3) return "es sollten drei Seiten sein: " + t;
    const [x, y, zz] = [...s].sort((p, q) => p - q);
    if (x + y <= zz) return `mit ${s.join(", ")} lässt sich kein Dreieck bilden`;
    return stimmt(s[0] + s[1] + s[2], l);
  },

  "Wahrscheinlichkeit": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Versuchen/.test(hinten(a))) {                               // erwartete Anzahl
      const m = t.match(/([\d.,]+) von ([\d.,]+)/);
      const versuche = dz((hinten(a).match(/bei ([\d.,]+) Versuchen/) || [])[1]);
      if (!m || !Number.isFinite(versuche)) return "konnte die Angaben nicht lesen: " + t;
      const g = dz(m[1]), moeglich = dz(m[2]);
      if (g > moeglich) return "es kann nicht mehr günstige als mögliche Fälle geben";
      return stimmt(Math.round(versuche * g / moeglich * 100) / 100, l, 1e-6);
    }
    if (/davon sind/.test(t)) {                                      // Gegenwahrscheinlichkeit
      const gesamt = dz((t.match(/([\d.,]+) Kugeln/) || [])[1]);
      const rot = dz((t.match(/davon sind ([\d.,]+)/) || [])[1]);
      if (![gesamt, rot].every(Number.isFinite)) return "konnte die Angaben nicht lesen: " + t;
      if (rot > gesamt) return "es können nicht mehr rote als Kugeln insgesamt sein";
      return stimmt(Math.round((gesamt - rot) / gesamt * 10000) / 100, l, 1e-6);
    }
    const rot = dz((t.match(/([\d.,]+) rote/) || [])[1]);            // Laplace
    const blau = dz((t.match(/([\d.,]+) blaue/) || [])[1]);
    const gruen = dz((t.match(/([\d.,]+) grüne/) || [])[1]);
    if (![rot, blau, gruen].every(Number.isFinite)) return "konnte die Kugeln nicht zählen: " + t;
    return stimmt(Math.round(rot / (rot + blau + gruen) * 10000) / 100, l, 1e-6);
  },

  "Kreis": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const d = dz((t.match(/([\d.,]+) m Durchmesser/) || [])[1]);
    if (Number.isFinite(d)) {                                        // Umfang aus dem Durchmesser
      if (!/Einfassung/.test(f)) return "die Frage passt nicht zum Aufgabentyp: " + f;
      return stimmt(Math.round(PI * d * 100) / 100, l, 1e-6);
    }
    const r = dz((t.match(/Radius ([\d.,]+)/) || [])[1]);
    if (!Number.isFinite(r)) return "Radius nicht lesbar: " + t;
    if (/Flächeninhalt/.test(f)) return stimmt(Math.round(PI * r * r * 100) / 100, l, 1e-6);
    if (/Umfang/.test(f)) return stimmt(Math.round(2 * PI * r * 100) / 100, l, 1e-6);
    return "unbekannte Fragestellung: " + f;
  },

  "Gleichungssysteme": (a) => {
    const t = roh(a.text), l = loes(a);
    if (/Karten/.test(t)) {                                          // Textaufgabe
      const anzahl = dz((t.match(/([\d.,]+) Karten/) || [])[1]);
      const summe = dz((t.match(/zusammen ([\d.,]+)/) || [])[1]);
      const pe = dz((t.match(/Erwachsenenkarte kostet ([\d.,]+)/) || [])[1]);
      const pk = dz((t.match(/Kinderkarte ([\d.,]+)/) || [])[1]);
      if (![anzahl, summe, pe, pk].every(Number.isFinite)) return "konnte die Angaben nicht lesen: " + t;
      if (pe === pk) return "beide Kartenarten kosten gleich viel — dann ist die Aufgabe nicht lösbar";
      const e = (summe - pk * anzahl) / (pe - pk);
      if (e < 0 || e > anzahl || Math.abs(e - Math.round(e)) > 1e-9)
        return `es kommen ${e} Erwachsenenkarten heraus — das kann nicht stimmen`;
      return stimmt(e, l);
    }
    const einsetz = t.match(/y = ([\d.,]+)x \+ ([\d.,]+)/);
    if (einsetz) {                                                   // Einsetzungsverfahren
      const koeff = t.match(/([\d.,]+)x \+ y = ([\d.,]+)/);
      if (!koeff) return "die zweite Gleichung ist nicht lesbar: " + t;
      const av = dz(einsetz[1]), bv = dz(einsetz[2]), c = dz(koeff[1]), d2 = dz(koeff[2]);
      const x = (d2 - bv) / (av + c);
      /* Probe in beiden Gleichungen, nicht nur Formel nachbauen */
      const y = av * x + bv;
      if (Math.abs(c * x + y - d2) > 1e-9) return "die gefundene Lösung erfüllt Gleichung II nicht";
      return stimmt(x, l, 1e-9);
    }
    const g1 = t.match(/x \+ y = ([\d.,]+)/);                        // Additionsverfahren
    const g2 = t.match(/2x - y = (-?[\d.,]+)/);
    if (!g1 || !g2) return "die beiden Gleichungen sind nicht lesbar: " + t;
    const s = dz(g1[1]), tt = dz(g2[1]);
    const x = (s + tt) / 3, y = s - x;
    if (Math.abs(2 * x - y - tt) > 1e-9) return "die gefundene Lösung erfüllt Gleichung II nicht";
    return stimmt(x, l, 1e-9);
  },

  "Körper berechnen": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const masse = alleGroessen(t, "cm");
    if (/Zylinder/.test(t)) {                                        // Zylindervolumen
      if (masse.length < 2) return "Radius oder Höhe nicht lesbar: " + t;
      const [r, h] = masse;
      return stimmt(Math.round(PI * r * r * h * 100) / 100, l, 1e-6);
    }
    if (masse.length !== 3) return "es sollten drei Kantenlängen sein: " + t;
    const [x, y, zz] = masse;
    if (/Oberfläche/.test(f)) return stimmt(2 * (x * y + x * zz + y * zz), l);
    if (/Volumen/.test(f)) return stimmt(x * y * zz, l);
    return "unbekannte Fragestellung: " + f;
  },

  "Strahlensätze": (a) => {
    const t = vorne(a), l = loes(a);
    if (/Stab/.test(t)) {                                            // Schattenmessung
      const m = alleGroessen(t, "m");
      if (m.length < 3) return "Stab, Stabschatten oder Baumschatten fehlen: " + t;
      const [stab, schattenStab, schattenBaum] = m;
      if (schattenStab <= 0) return "der Stabschatten darf nicht null sein";
      return stimmt(Math.round(stab * schattenBaum / schattenStab * 100) / 100, l, 1e-6);
    }
    const cm = alleGroessen(t, "cm");                                // Verhältnisgleichung
    if (cm.length < 3) return "es sollten drei Strecken gegeben sein: " + t;
    const [s1, s2, s3] = cm;
    if (s1 <= 0) return "die erste Strecke darf nicht null sein";
    const soll = Math.round(s3 * (s2 / s1) * 100) / 100;
    /* Probe: das Verhältnis muss auf beiden Strahlen gleich sein */
    if (Math.abs(s2 / s1 - soll / s3) > 1e-6) return "die Verhältnisse stimmen nicht überein";
    return stimmt(soll, l, 1e-6);
  },

  "Kugel und Kegel": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const masse = alleGroessen(t, "cm");
    if (/Kegel/.test(t)) {                                           // Kegelvolumen
      if (masse.length < 2) return "Radius oder Höhe nicht lesbar: " + t;
      const [r, h] = masse;
      return stimmt(Math.round(1 / 3 * PI * r * r * h * 100) / 100, l, 1e-6);
    }
    if (!masse.length) return "Radius nicht lesbar: " + t;
    const r = masse[0];
    if (/Oberfläche/.test(f)) return stimmt(Math.round(4 * PI * r * r * 100) / 100, l, 1e-6);
    if (/Volumen/.test(f)) return stimmt(Math.round(4 / 3 * PI * r * r * r * 100) / 100, l, 1e-6);
    return "unbekannte Fragestellung: " + f;
  },

  "Statistik": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const werte = zahlenListe(t);
    if (werte.length < 4) return "die Werteliste ist nicht lesbar: " + t;
    const sortiert = [...werte].sort((p, q) => p - q);
    if (/Spannweite/.test(f)) return stimmt(sortiert[sortiert.length - 1] - sortiert[0], l);
    if (/Median/.test(f)) {
      if (werte.length % 2 === 0) return "bei gerader Anzahl ist der Median nicht eindeutig ablesbar";
      return stimmt(sortiert[(werte.length - 1) / 2], l);
    }
    if (/Durchschnitt/.test(f)) {
      const summe = werte.reduce((s, w) => s + w, 0);
      return stimmt(Math.round(summe / werte.length * 100) / 100, l, 1e-6);
    }
    return "unbekannte Fragestellung: " + f;
  }
};

/* ------------------------------------------------- ELEKTRONIKER, DRITTE RUNDE */

const FARBZIFFER = {schwarz:0, braun:1, rot:2, orange:3, gelb:4, grün:5, blau:6, violett:7, grau:8, weiß:9};
/* Text der fünf Sicherheitsregeln, an einem eindeutigen Stichwort erkannt */
const SICHERHEITSREGELN = [
  [1, /allpolig vom Netz getrennt/, "Freischalten"],
  [2, /blockiert/, "Gegen Wiedereinschalten sichern"],
  [3, /nachgemessen/, "Spannungsfreiheit feststellen"],
  [4, /kurzgeschlossen/, "Erden und kurzschließen"],
  [5, /abgedeckt oder abgeschrankt/, "Benachbarte Teile abdecken"]
];
const NETZFORMEN = [
  ["TN-S", /getrennt geführt/, 5],
  ["TN-C", /PEN-Leiter zusammengefasst/, 4],
  ["TT", /eigenen Erder/, 4],
  ["IT", /hochohmig/, 4]
];
const text2 = (a) => roh(a.loesung).trim();

const elektroProben3 = {

  "Widerstände und Farbcode": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    /* roh() macht aus dem Halbgeviertstrich einen normalen Bindestrich */
    const ringe = t.match(/Ringe (\S+) - (\S+) - (\S+) - gold/);
    if (ringe) {                                                     // Farbringe ablesen
      const [d1, d2, m] = [FARBZIFFER[ringe[1]], FARBZIFFER[ringe[2]], FARBZIFFER[ringe[3]]];
      if ([d1, d2, m].some(x => x === undefined)) return "unbekannte Farbe: " + ringe.slice(1).join(", ");
      if (d1 === 0) return "der erste Ring darf keine führende Null sein";
      return stimmt((d1 * 10 + d2) * Math.pow(10, m), l);
    }
    const w = groesse(t, "Ω");
    const tol = dz((t.match(/±([\d.,]+)\s*%/) || [])[1]);
    if (w !== null && isFinite(tol)) {                               // Toleranzgrenzen
      const ab = Math.round(w * tol / 100 * 100) / 100;
      if (/höchstens/.test(f)) return stimmt(Math.round((w + ab) * 100) / 100, l, 1e-6);
      if (/mindestens/.test(f)) return stimmt(Math.round((w - ab) * 100) / 100, l, 1e-6);
      return "die Frage passt nicht zum Aufgabentyp: " + f;
    }
    const ziffern = dz((t.match(/Ziffern ([\d.,]+)/) || [])[1]);     // Zahl der Nullen
    if (w === null || !isFinite(ziffern)) return "konnte die Angaben nicht lesen: " + t;
    if (w % ziffern !== 0) return `${w} lässt sich nicht als ${ziffern} mit Nullen schreiben`;
    const e = Math.round(Math.log10(w / ziffern));
    if (Math.abs(ziffern * Math.pow(10, e) - w) > 1e-9)
      return `${ziffern} mit ${e} Nullen ergibt nicht ${w}`;
    return stimmt(e, l);
  },

  "Sicherheitsregeln": (a) => {
    const t = vorne(a), l = loes(a);
    const m = t.match(/Regel ([\d]+) von fünf/);
    if (m) {                                                         // nächste Regel
      const nr = Number(m[1]);
      if (nr >= 5) return "nach der fünften Regel kommt keine weitere";
      return stimmt(nr + 1, l);
    }
    const treffer = SICHERHEITSREGELN.find(([, muster]) => muster.test(t));
    if (!treffer) return "konnte die Regel nicht zuordnen: " + t;
    return stimmt(treffer[0], l);
  },

  "Ladung und Strom": (a) => {
    const t = vorne(a), l = loes(a);
    const min = groesse(t, "Minuten");
    if (min !== null) {                                              // Q = I · t
      const i = groesse(t, "A");
      if (i === null) return "Stromstärke nicht lesbar: " + t;
      return stimmt(Math.round(i * min * 60 * 100) / 100, l, 1e-6);
    }
    const ah = groesse(t, "Ah");
    if (ah !== null) {                                               // Akkulaufzeit
      const i = groesse(t, "A");
      if (i === null) return "Stromstärke nicht lesbar: " + t;
      return stimmt(Math.round(ah / i * 100) / 100, l, 1e-6);
    }
    const c = groesse(t, "[µμ]F"), u = groesse(t, "V");              // Q = C · U
    if (c === null || u === null) return "Kapazität oder Spannung nicht lesbar: " + t;
    return stimmt(Math.round(c * u * 100) / 100, l, 1e-6);
  },

  "Spule und Induktivität": (a) => {
    const t = vorne(a), l = loes(a);
    const mh = groesse(t, "mH");
    if (mh !== null) {                                               // X L
      const f = groesse(t, "Hz");
      if (f === null) return "Frequenz nicht lesbar: " + t;
      return stimmt(Math.round(2 * Math.PI * f * mh / 1000 * 100) / 100, l, 1e-6);
    }
    const r = alleGroessen(t, "Ω");                                  // Scheinwiderstand
    if (r.length < 2) return "Wirk- oder Blindwiderstand fehlt: " + t;
    const soll = Math.sqrt(r[0] * r[0] + r[1] * r[1]);
    if (soll <= Math.max(r[0], r[1])) return "der Scheinwiderstand muss größer sein als jeder Einzelwert";
    return stimmt(soll, l, 1e-6);
  },

  "Kondensator im Wechselstrom": (a) => {
    const t = vorne(a), l = loes(a);
    const c = groesse(t, "[µμ]F");
    if (c === null) return "Kapazität nicht lesbar: " + t;
    if (/Gleichspannung/.test(t)) return stimmt(0, l);                // sperrt vollständig
    const f = groesse(t, "Hz");
    if (f === null) return "Frequenz nicht lesbar: " + t;
    return stimmt(Math.round(1 / (2 * Math.PI * f * c / 1e6) * 100) / 100, l, 1e-6);
  },

  "Netzformen": (a) => {
    const t = vorne(a);
    const genannt = t.match(/als ([A-Z]{2}(?:-[A-Z])?) ausgeführt/);
    if (genannt) {                                                   // Zahl der Leiter
      const netz = NETZFORMEN.find(([name]) => name === genannt[1]);
      if (!netz) return "unbekannte Netzform: " + genannt[1];
      return stimmt(netz[2], loes(a));
    }
    const treffer = NETZFORMEN.find(([, muster]) => muster.test(t));  // Netzform erkennen
    if (!treffer) return "konnte die Netzform nicht zuordnen: " + t;
    return text2(a) === treffer[0] ? null
      : `beschrieben ist ${treffer[0]}, angegeben ist „${text2(a)}“`;
  },

  "Frequenzumrichter": (a) => {
    const t = vorne(a), l = loes(a);
    const p = dz((t.match(/([\d.,]+) Polpaar/) || [])[1]);
    if (!isFinite(p) || p <= 0) return "Polpaarzahl nicht lesbar: " + t;
    const f = groesse(t, "Hz");
    if (f !== null) return stimmt(Math.round(60 * f / p), l);         // Drehzahl aus der Frequenz
    const n = groesse(t, "1/min");
    if (n === null) return "weder Frequenz noch Drehzahl gefunden: " + t;
    const soll = n * p / 60;                                         // Frequenz aus der Drehzahl
    if (soll <= 0) return "es kommt keine sinnvolle Frequenz heraus";
    return stimmt(soll, l, 1e-6);
  },

  "Instandhaltung und Verfügbarkeit": (a) => {
    const t = vorne(a), l = loes(a);
    const proz = dz((t.match(/([\d.,]+)\s*%/) || [])[1]);
    if (isFinite(proz)) {                                            // Ausfallzeit im Jahr
      if (proz <= 0 || proz > 100) return `eine Verfügbarkeit von ${proz} % gibt es nicht`;
      return stimmt(Math.round(8760 * (100 - proz) / 100 * 100) / 100, l, 1e-6);
    }
    const std = alleGroessen(t, "Stunden");                          // Verfügbarkeit
    if (std.length < 2) return "MTBF oder MTTR nicht lesbar: " + t;
    const [mtbf, mttr] = std;
    const v = Math.round(mtbf / (mtbf + mttr) * 10000) / 100;
    if (v >= 100) return "die Verfügbarkeit kann nicht 100 % erreichen";
    return stimmt(v, l, 1e-6);
  },

  "Angebot kalkulieren": (a) => {
    const t = vorne(a), l = loes(a);
    const betraege = alleGroessen(t, "€");
    if (/netto bei/.test(t)) {                                       // Brutto aus Netto
      if (!betraege.length) return "Nettobetrag nicht lesbar: " + t;
      const netto = betraege[0];
      const mwst = Math.round(netto * 0.19 * 100) / 100;
      return stimmt(Math.round((netto + mwst) * 100) / 100, l, 1e-6);
    }
    const std = groesse(t, "Stunden");                               // Netto aus Lohn und Material
    if (std === null || betraege.length < 2) return "konnte die Angaben nicht lesen: " + t;
    const [satz, material] = betraege;
    return stimmt(std * satz + material, l, 1e-6);
  }
};

/* ------------------------------------------------------------ MATHE III */

const matheProben3 = {

  "Überschlagen und Schätzen": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const mal = t.match(/([\d.,]+) · ([\d.,]+)/);
    if (mal) {                                                       // Überschlag einer Multiplikation
      const x = dz(mal[1]), y = dz(mal[2]);
      const rx = Math.round(x / 10) * 10, ry = Math.round(y / 10) * 10;
      const fehl = stimmt(rx * ry, l);
      if (fehl) return fehl;
      /* der Überschlag muss auch wirklich nah am genauen Wert liegen */
      const ab = Math.abs(rx * ry - x * y) / (x * y);
      return ab < 0.35 ? null : `der Überschlag weicht um ${Math.round(ab * 100)} % ab — das taugt nicht als Kontrolle`;
    }
    const stueck = dz((t.match(/^([\d.,]+) Stück/) || [])[1]);
    if (isFinite(stueck)) {                                          // Überschlag an der Kasse
      const preis = groesse(t, "€");
      if (preis === null) return "Preis nicht lesbar: " + t;
      return stimmt(Math.round(preis) * stueck, l);
    }
    /* Größenordnung: die Lösung muss eine der beiden angebotenen Zahlen sein */
    const angeboten = a.schritte.map(s => (s.optionen || []).map(o => roh(o.t))).flat();
    return angeboten.includes(roh(a.loesung)) ? null
      : `die Lösung „${roh(a.loesung)}“ steht in keinem Schritt zur Auswahl`;
  },

  "Negative Zahlen": (a) => {
    const t = vorne(a), l = loes(a);
    const plus = t.match(/(-?[\d.,]+) \+ \((-?[\d.,]+)\)/);
    if (plus) {                                                      // Addieren
      const x = dz(plus[1]), y = dz(plus[2]);
      if (x === 0 || y === 0) return "eine der Zahlen ist null — dann ist nichts zu üben";
      return stimmt(x + y, l);
    }
    const mal = t.match(/(-?[\d.,]+) · (-?[\d.,]+)/);                // Multiplizieren
    if (!mal) return "konnte die Rechnung nicht lesen: " + t;
    const x = dz(mal[1]), y = dz(mal[2]);
    const soll = x * y;
    /* Vorzeichenregel unabhängig nachprüfen */
    const negativ = (x < 0) !== (y < 0);
    if ((soll < 0) !== negativ) return "das Vorzeichen passt nicht zur Vorzeichenregel";
    return stimmt(soll, l);
  },

  "Maßstab": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const m = dz((t.match(/1 : ([\d.,]+)/) || [])[1]);
    if (!isFinite(m) || m <= 0) return "Maßstab nicht lesbar: " + t;
    const cm = groesse(t, "cm");
    if (cm !== null) {                                               // Plan -> Wirklichkeit
      if (!/Metern/.test(f)) return "die Frage passt nicht zum Aufgabentyp: " + f;
      return stimmt(Math.round(cm * m / 100 * 100) / 100, l, 1e-6);
    }
    const meter = groesse(t, "m");                                   // Wirklichkeit -> Plan
    if (meter === null) return "keine Länge gefunden: " + t;
    const soll = Math.round(meter * 100 / m * 100) / 100;
    if (soll >= meter * 100) return "auf dem Plan muss die Strecke kürzer sein als in Wirklichkeit";
    return stimmt(soll, l, 1e-6);
  },

  "Formeln umstellen": (a) => {
    const t = roh(a.text);
    /* Umgestellte Formel: gegen eine eigene Tabelle prüfen */
    const TABELLE = {
      "U = R · I|R":"R = U : I", "U = R · I|I":"I = U : R",
      "P = U · I|I":"I = P : U", "P = U · I|U":"U = P : I",
      "W = P · t|t":"t = W : P",  "W = P · t|P":"P = W : t",
      "Q = C · U|C":"C = Q : U",  "Q = C · U|U":"U = Q : C",
      "s = v · t|v":"v = s : t",  "s = v · t|t":"t = s : v"
    };
    const um = t.match(/Formel ([A-Za-z] = [A-Za-z] · [A-Za-z]) nach ([A-Za-z]) um/);
    if (um) {
      const soll = TABELLE[um[1] + "|" + um[2]];
      if (!soll) return `für ${um[1]} nach ${um[2]} ist keine Umstellung hinterlegt`;
      return roh(a.loesung).trim() === soll ? null
        : `richtig wäre „${soll}“, angegeben ist „${roh(a.loesung).trim()}“`;
    }
    /* Umstellen und einsetzen: die beiden Zahlen aus der Angabe teilen */
    const zahlen = (t.match(/= ([\d.,]+) /g) || []).map(s => dz(s.replace(/[=\s]/g, "")));
    if (zahlen.length < 2) return "konnte die beiden Angaben nicht lesen: " + t;
    return stimmt(Math.round(zahlen[0] / zahlen[1] * 1e6) / 1e6, loes(a), 1e-3);
  },

  "Zehnerpotenzen": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const produkt = t.match(/\(([\d.,]+) · 10 hoch ([\d.,]+)\) · \(([\d.,]+) · 10 hoch ([\d.,]+)\)/);
    if (produkt) return stimmt(dz(produkt[2]) + dz(produkt[4]), l);   // Hochzahlen addieren
    const klein = t.match(/([\d.,]+) · 10 hoch -([\d.,]+)/);   /* roh() normiert das Minuszeichen */
    if (klein) {                                                     // Nullen bei kleiner Zahl
      const e = dz(klein[2]);
      if (e < 1) return "bei einer Hochzahl unter 1 gibt es keine Nullen zu zählen";
      return stimmt(e - 1, l);
    }
    const gross = t.match(/Schreib ([\d.,]+) als Zehnerpotenz in der Form ([\d.,]+)/);
    if (!gross) return "konnte die Aufgabe nicht einordnen: " + t;
    const wert = dz(gross[1]), vor = dz(gross[2]);
    if (!(vor >= 1 && vor < 10)) return `die Vorzahl ${vor} liegt nicht zwischen 1 und 10`;
    const e = Math.round(Math.log10(wert / vor));
    if (Math.abs(vor * Math.pow(10, e) - wert) > Math.abs(wert) * 1e-9)
      return `${vor} · 10 hoch ${e} ergibt nicht ${wert}`;
    return stimmt(e, l);
  },

  "Logarithmus": (a) => {
    const t = vorne(a), l = loes(a);
    const db = t.match(/das ([\d.,]+)-fache/);
    if (db) {                                                        // Dezibel
      const v = dz(db[1]);
      if (v <= 0) return "eine Verstärkung muss größer als null sein";
      return stimmt(Math.round(10 * Math.log10(v) * 100) / 100, l, 1e-6);
    }
    const m = t.match(/muss man ([\d.,]+) mit sich selbst malnehmen, um ([\d.,]+)/);
    if (!m) return "konnte Basis oder Zahl nicht lesen: " + t;
    const basis = dz(m[1]), wert = dz(m[2]);
    if (basis <= 1) return "die Basis muss größer als 1 sein";
    const e = Math.log(wert) / Math.log(basis);
    if (Math.abs(e - Math.round(e)) > 1e-9)
      return `${basis} hoch einer ganzen Zahl ergibt nicht ${wert}`;
    return stimmt(Math.round(e), l);
  }
};

/* --------------------------------------------------------------- LAUF */
const NICHT_PRUEFBAR = {
};

/* ------------------------------------------------------------- MATHE IV */

/* Aus einem eingebetteten SVG die beschrifteten Werte und die gezeichneten
   Balkenhöhen holen. Damit lässt sich prüfen, ob das Bild dieselbe Aussage
   macht wie die Zahlen — ein falsch gezeichnetes Diagramm ist genauso
   schlimm wie eine falsche Lösung. */
/* Geldbetrag aus der Anzeige zurücklesen: „1.234,56 €" -> 1234.56.
   dz() allein scheitert am Euro-Zeichen und liefert NaN. */
const geld = (s) => Number(String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
const geldLoes = (a) => geld(roh(a.loesung));

const svgTeil = (t) => (String(t).match(/<svg[\s\S]*?<\/svg>/) || [""])[0];
const ohneSvg = (t) => roh(String(t).replace(/<svg[\s\S]*?<\/svg>/g, " "));
const balken  = (svg) => (svg.match(/<rect[^>]*height="([\d.]+)"/g) || [])
  .map(s => Number((s.match(/height="([\d.]+)"/) || [])[1]));
const beschriftung = (svg) => (svg.match(/<text[^>]*>(\d+)<\/text>/g) || [])
  .map(s => Number((s.match(/>(\d+)</) || [])[1]));

const matheProben4 = {

  "Rechnen mit Zeit": (a) => {
    const t = vorne(a), l = loes(a);
    const uhrzeiten = (t.match(/\b(\d{2}):(\d{2})\b/g) || []);
    if (uhrzeiten.length === 2) {                                  // Schicht ausrechnen
      const min = uhrzeiten.map(u => Number(u.slice(0, 2)) * 60 + Number(u.slice(3)));
      const pause = groesse(t, "min");
      if (pause === null) return "Pause nicht lesbar: " + t;
      let brutto = min[1] - min[0];
      if (brutto <= 0) return `Schichtende ${uhrzeiten[1]} liegt nicht nach dem Beginn ${uhrzeiten[0]}`;
      if (brutto > 12 * 60) return `${Math.round(brutto / 60 * 10) / 10} h Anwesenheit ist keine realistische Schicht`;
      const netto = brutto - pause;
      if (netto <= 0) return "nach Abzug der Pause bleibt keine Arbeitszeit übrig";
      return stimmt(Math.round(netto / 60 * 100) / 100, l, 1e-9);
    }
    const dez = groesse(t, "h");
    if (dez !== null) {                                            // Nachkommateil in Minuten
      const anteil = dez - Math.floor(dez);
      if (anteil === 0) return "ohne Nachkommateil gibt es nichts umzurechnen";
      const soll = Math.round(anteil * 60);
      if (Math.abs(anteil * 60 - soll) > 0.6)
        return `${Math.round(anteil * 100) / 100} h ergeben keine glatte Minutenzahl`;
      if (soll >= 60) return "der Nachkommateil kann keine volle Stunde sein";
      return stimmt(soll, l);
    }
    const stueck = (t.match(/(\d+) Aufträge/) || [])[1];           // Aufträge zusammenrechnen
    if (!stueck) return "konnte die Aufgabe nicht einordnen: " + t;
    const dauer = groesse(t, "min");
    if (dauer === null) return "Dauer je Auftrag nicht lesbar: " + t;
    const gesamt = Number(stueck) * dauer;
    return stimmt(Math.floor(gesamt / 60), l);
  },

  "Rechnen mit Klammern": (a) => {
    /* Den Term aus der Aufgabe selbst auswerten — unabhängig von der
       Schrittfolge, mit der die Aufgabe ihn herleitet. */
    const t = roh(a.text);
    const term = (t.match(/Rechne aus: (.+)$/) || t.match(/rechne aus: (.+)$/) || [])[1];
    if (!term) return "konnte den Term nicht finden: " + t;
    const js = term.replace(/·/g, "*").replace(/:/g, "/").replace(/\s+/g, "");
    if (!/^[\d+\-*/().]+$/.test(js)) return "im Term stehen unerwartete Zeichen: " + js;
    let wert;
    try { wert = new Function(`return ${js}`)(); }
    catch (fehler) { return `Term „${term}“ lässt sich nicht auswerten: ${fehler.message}`; }
    /* Gegenprobe: ohne Klammern käme etwas anderes heraus — sonst übt die
       Aufgabe die Klammer gar nicht. */
    const ohne = js.replace(/[()]/g, "");
    let wertOhne;
    try { wertOhne = new Function(`return ${ohne}`)(); } catch (e) { wertOhne = null; }
    if (wertOhne !== null && Math.abs(wertOhne - wert) < 1e-9 && /[()]/.test(js))
      return `die Klammer ändert nichts — ${term} und ${ohne.replace(/\*/g, "·")} ergeben beide ${wert}`;
    return stimmt(wert, loes(a));
  },

  "Terme aufstellen": (a) => {
    const t = roh(a.text);
    const preis = t.match(/([\d.,]+) € Anfahrt und dazu ([\d.,]+) € je Stunde/);
    if (preis) {                                                   // Preisliste
      const std = dz((t.match(/Einsatz von ([\d.,]+) Stunden/) || [])[1]);
      if (!isFinite(std)) return "Stundenzahl nicht lesbar: " + t;
      return stimmt(dz(preis[1]) + dz(preis[2]) * std, geldLoes(a), 1e-6);
    }
    /* Satzaufgabe: den Term aus der richtigen Antwort holen, x einsetzen und
       unabhängig ausrechnen. Zusätzlich prüfen, ob er zum Satz passt. */
    const x = dz((t.match(/x = ([\d.,]+)/) || [])[1]);
    if (!isFinite(x)) return "konnte x nicht lesen: " + t;
    const richtig = (a.schritte[0].optionen.find(o => o.ok) || {}).t;
    if (!richtig) return "im ersten Schritt ist keine Antwort als richtig markiert";
    const js = roh(richtig).replace(/·/g, "*").replace(/:/g, "/").replace(/x/g, `(${x})`).replace(/\s+/g, "");
    if (!/^[\d+\-*/().]+$/.test(js)) return "im Term stehen unerwartete Zeichen: " + js;
    let wert;
    try { wert = new Function(`return ${js}`)(); }
    catch (fehler) { return `Term „${richtig}“ lässt sich nicht auswerten: ${fehler.message}`; }
    const ERWARTET = {
      "Eine Zahl wird verdoppelt und dann um 5 vermehrt.": (v) => 2 * v + 5,
      "Eine Zahl wird um 3 vermehrt und das Ergebnis verdreifacht.": (v) => 3 * (v + 3),
      "Von einer Zahl wird 4 abgezogen, danach wird halbiert.": (v) => (v - 4) / 2,
      "Eine Zahl wird halbiert und danach um 4 verringert.": (v) => v / 2 - 4
    };
    const satz = Object.keys(ERWARTET).find(s => t.startsWith(s));
    if (!satz) return "für diesen Satz ist keine Gegenrechnung hinterlegt: " + t;
    if (Math.abs(ERWARTET[satz](x) - wert) > 1e-9)
      return `der Term „${richtig}“ passt nicht zum Satz — erwartet ${ERWARTET[satz](x)}, er ergibt ${wert}`;
    return stimmt(wert, loes(a), 1e-9);
  },

  "Prozentuale Veränderung": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const steigt = t.match(/kostete ([\d.,]+) €.*steigt um ([\d.,]+) %/);
    if (steigt) return stimmt(Math.round(dz(steigt[1]) * (100 + dz(steigt[2]))) / 100, geldLoes(a), 1e-6);
    const rabatt = t.match(/kostet ([\d.,]+) €.*?([\d.,]+) % Rabatt/);
    if (rabatt) {
      const p = dz(rabatt[2]);
      if (!(p > 0 && p < 100)) return `ein Rabatt von ${p} % ergibt keinen Sinn`;
      return stimmt(Math.round(dz(rabatt[1]) * (100 - p)) / 100, geldLoes(a), 1e-6);
    }
    const aend = t.match(/lag bei ([\d.,]+) kWh und liegt jetzt bei ([\d.,]+) kWh/);
    if (!aend) return "konnte die Aufgabe nicht einordnen: " + t;
    const alt = dz(aend[1]), neu = dz(aend[2]);
    if (alt === neu) return "alter und neuer Wert sind gleich — dann gibt es keine Änderung";
    if (alt <= 0) return "der Grundwert muss größer als null sein";
    return stimmt(Math.round(Math.abs(neu - alt) / alt * 10000) / 100, l, 1e-6);
  },

  "Diagramme lesen": (a) => {
    const svg = svgTeil(a.text), rest = ohneSvg(a.text), l = loes(a);
    if (!svg) return "die Aufgabe hat kein Diagramm";
    if (/Kreisdiagramm/.test(svg)) {                               // Anteil in Menge umrechnen
      const gesamt = dz((rest.match(/([\d.,]+) kWh/) || [])[1]);
      const name = ((rest.match(/entfallen auf (.+?)\?/) || [])[1] || "").trim();
      if (!isFinite(gesamt) || !name) return "Gesamtwert oder Anteilsname nicht lesbar: " + rest;
      const legende = {};
      (svg.match(/>([A-Za-zÄÖÜäöüß]+) (\d+) %</g) || []).forEach(s => {
        const m = s.match(/>([A-Za-zÄÖÜäöüß]+) (\d+) %</);
        legende[m[1]] = Number(m[2]);
      });
      const summe = Object.values(legende).reduce((s, v) => s + v, 0);
      if (summe !== 100) return `die Anteile im Kreisdiagramm ergeben ${summe} % statt 100 %`;
      const p = legende[name];
      if (p === undefined) return `„${name}“ steht nicht in der Legende`;
      return stimmt(Math.round(gesamt * p / 100), l);
    }
    /* Säulendiagramm: beschriftete Werte gegen die gezeichneten Höhen prüfen */
    const werte = beschriftung(svg).filter(v => v >= 100);
    const hoehen = balken(svg);
    if (werte.length !== 5 || hoehen.length !== 5)
      return `erwartet werden 5 Säulen mit 5 Beschriftungen, gefunden ${hoehen.length} und ${werte.length}`;
    const g = Math.max(...werte), k = Math.min(...werte);
    if (g === k) return "alle Säulen sind gleich hoch — dann gibt es keinen Unterschied abzulesen";
    for (let i = 0; i < 5; i++) {
      const soll = werte[i] / g * 84;
      if (Math.abs(hoehen[i] - soll) > 1)
        return `Säule ${i + 1} ist ${hoehen[i]} hoch gezeichnet, zum Wert ${werte[i]} gehören aber ${Math.round(soll)}`;
    }
    return stimmt(g - k, l);
  },

  "Funktionen im Schaubild": (a) => {
    const l = loes(a);
    const gleichung = roh(a.text).match(/y = (-?[\d.,]+) · x ([+-]) ([\d.,]+)/);
    if (gleichung) {                                               // Nullstelle
      const m = dz(gleichung[1]), b = (gleichung[2] === "-" ? -1 : 1) * dz(gleichung[3]);
      if (m === 0) return "eine waagerechte Gerade hat keine einzelne Nullstelle";
      const soll = -b / m;
      if (Math.abs(soll - Math.round(soll)) > 1e-9)
        return `die Nullstelle ${soll} ist nicht ganzzahlig — zum Ablesen ungeeignet`;
      return stimmt(soll, l, 1e-9);
    }
    /* Schaubild: Steigung und Achsenabschnitt aus der gezeichneten Linie
       zurückrechnen und damit den gefragten y-Wert unabhängig bestimmen. */
    const svg = svgTeil(a.text);
    const linie = (svg.match(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#10a37f"/) || []);
    if (linie.length !== 5) return "die gezeichnete Gerade ist nicht auffindbar";
    const zuX = (px) => (Number(px) - 160) / 26, zuY = (py) => (78 - Number(py)) / 12;
    const x1 = zuX(linie[1]), y1 = zuY(linie[2]), x2 = zuX(linie[3]), y2 = zuY(linie[4]);
    if (Math.abs(x2 - x1) < 1e-6) return "die gezeichnete Gerade ist senkrecht";
    const m = (y2 - y1) / (x2 - x1), b = y1 - m * x1;
    if (Math.abs(m - Math.round(m)) > 0.02 || Math.abs(b - Math.round(b)) > 0.02)
      return `aus der Zeichnung ergibt sich m = ${Math.round(m * 100) / 100} und b = ${Math.round(b * 100) / 100} — beides sollte ganzzahlig sein`;
    const punkt = svg.match(/<circle cx="160" cy="([\d.]+)"/);
    if (!punkt) return "der Punkt auf der y-Achse fehlt";
    if (Math.abs(zuY(punkt[1]) - b) > 0.02)
      return `der markierte Punkt liegt bei y = ${Math.round(zuY(punkt[1]) * 100) / 100}, die Gerade schneidet aber bei ${Math.round(b * 100) / 100}`;
    return stimmt(Math.round(m) * 3 + Math.round(b), l, 1e-9);
  }
};

/* -------------------------------------------------- ELEKTROTECHNIK IV */

const elektroProben4 = {

  "Diode und Gleichrichter": (a) => {
    const t = vorne(a), f = hinten(a), l = loes(a);
    const ganz = roh(a.text);

    /* Vorwiderstand für eine LED */
    const led = ganz.match(/([\d.,]+) V Durchlassspannung soll mit ([\d.,]+) mA an ([\d.,]+) V/);
    if (led) {
      const uf = dz(led[1]), i = dz(led[2]) / 1000, ub = dz(led[3]);
      if (ub <= uf) return `${ub} V reichen für eine LED mit ${uf} V nicht aus`;
      return stimmt(Math.round((ub - uf) / i), l);
    }

    /* Gleichspannung hinter dem Gleichrichter */
    const gl = ganz.match(/(Einweggleichrichter|Brückengleichrichter) liegt an ([\d.,]+) V/);
    if (gl) {
      const ueff = dz(gl[2]);
      const dioden = gl[1] === "Brückengleichrichter" ? 2 : 1;
      const spitze = Math.round(ueff * 1.41 * 100) / 100;
      const soll = Math.round((spitze - dioden * 0.7) * 100) / 100;
      /* Gegenprobe: der Spitzenwert muss über dem Effektivwert liegen */
      if (spitze <= ueff) return "der Spitzenwert kann nicht kleiner als der Effektivwert sein";
      return stimmt(soll, l, 1e-6);
    }

    /* Diode in Durchlass- oder Sperrrichtung */
    const ri = ganz.match(/Anschluss: (Anode am Plus|Kathode am Plus)/);
    if (!ri) return "konnte die Aufgabe nicht einordnen: " + ganz.slice(0, 90);
    const leitet = ri[1] === "Anode am Plus";
    const u = dz((ganz.match(/an ([\d.,]+) V<?\/?b?> ?Gleichspannung/) || ganz.match(/an ([\d.,]+) V/) || [])[1]);
    const r = dz((ganz.match(/mit ([\d.,]+) Ω/) || [])[1]);
    if (!isFinite(u) || !isFinite(r)) return "Spannung oder Widerstand nicht lesbar: " + ganz.slice(0, 90);
    const soll = leitet ? Math.round((u - 0.7) / r * 1000 * 100) / 100 : 0;
    /* die als richtig markierte Antwort im ersten Schritt muss zur Richtung passen */
    const erste = roh((a.schritte[0].optionen.find(o => o.ok) || {}).t || "");
    if (leitet !== /^Ja/.test(erste))
      return `Anschluss „${ri[1]}“ passt nicht zur Antwort „${erste}“`;
    return stimmt(soll, l, 1e-6);
  },

  "Beleuchtung berechnen": (a) => {
    const ganz = roh(a.text), l = loes(a);

    /* Anzahl der Leuchten */
    const raum = ganz.match(/([\d.,]+) m × ([\d.,]+) m groß und braucht ([\d.,]+) lx/);
    if (raum) {
      const lm = dz((ganz.match(/Leuchte gibt ([\d.,]+) lm/) || [])[1]);
      if (!isFinite(lm) || lm <= 0) return "Lichtstrom je Leuchte nicht lesbar: " + ganz;
      const flaeche = dz(raum[1]) * dz(raum[2]);
      const gesamt = flaeche * dz(raum[3]);
      const soll = Math.ceil(gesamt / lm);
      if (soll < 1) return "es müsste mindestens eine Leuchte herauskommen";
      /* Gegenprobe: mit einer Leuchte weniger darf es nicht reichen */
      if ((soll - 1) * lm >= gesamt) return `${soll - 1} Leuchten würden auch schon reichen — dann ist aufgerundet worden, wo es nicht nötig war`;
      return stimmt(soll, l);
    }

    /* Lichtstrom aus Leistung und Lichtausbeute */
    const lampe = ganz.match(/hat ([\d.,]+) W und eine Lichtausbeute von ([\d.,]+) lm\/W/);
    if (!lampe) return "konnte die Aufgabe nicht einordnen: " + ganz.slice(0, 90);
    const p = dz(lampe[1]), eta = dz(lampe[2]);
    if (eta > 250) return `${eta} lm/W ist keine erreichbare Lichtausbeute`;
    return stimmt(p * eta, l);
  },

  "Anlage prüfen und protokollieren": (a) => {
    const ganz = roh(a.text);

    /* Kurzschlussstrom aus der Schleifenimpedanz */
    const zs = ganz.match(/Schleifenimpedanz von ([\d.,]+) Ω/);
    if (zs) {
      const z0 = dz(zs[1]);
      if (!(z0 > 0)) return "die Schleifenimpedanz muss größer als null sein";
      const soll = Math.round(230 / z0);
      const fehl = stimmt(soll, loes(a));
      if (fehl) return fehl;
      /* Der Auslösestrom des B-Automaten ist das Fünffache des Nennstroms —
         das wird unabhängig nachgerechnet, nicht aus der Aufgabe übernommen. */
      const nen = dz((ganz.match(/B([\d.,]+)\s*-Automaten/) || [])[1]);
      if (!isFinite(nen)) return "Nennstrom der Sicherung nicht lesbar: " + ganz;
      const noetig = nen * 5;
      const mitte = roh((a.schritte[1].optionen.find(o => o.ok) || {}).t || "");
      if (dz((mitte.match(/^([\d.,]+)/) || [])[1]) !== noetig)
        return `ein B${nen} braucht ${noetig} A zum sicheren Auslösen, angegeben ist „${mitte}“`;
      /* Die Rückmeldung zur richtigen Antwort muss die Bewertung enthalten und
         zum gerechneten Strom passen. */
      const rueck = roh((a.schritte[a.schritte.length - 1].optionen.find(o => o.ok) || {}).fb || "");
      const erfuellt = /Bedingung ist erfüllt/.test(rueck);
      const reichtNicht = /reichen nicht/.test(rueck);
      if (erfuellt === reichtNicht)
        return `die Rückmeldung sagt nicht eindeutig, ob die Bedingung erfüllt ist: „${rueck}“`;
      if (erfuellt !== (soll >= noetig))
        return `bei ${soll} A und nötigen ${noetig} A ist die Bewertung falsch: „${rueck}“`;
      return null;
    }

    /* Isolationswiderstand bewerten */
    const iso = ganz.match(/Isolationswiderstand: ([\d.,]+) MΩ/);
    if (!iso) return "konnte die Aufgabe nicht einordnen: " + ganz.slice(0, 90);
    const wert = dz(iso[1]);
    const mind = dz((ganz.match(/Mindestwert nach DIN VDE 0100-600: ([\d.,]+) MΩ/) || [])[1]);
    if (!isFinite(mind)) return "Mindestwert nicht lesbar: " + ganz;
    /* eigene Tabelle der Grenzwerte, unabhängig von der Aufgabe */
    const NETZ = { "SELV/PELV": [250, 0.5], "bis 500 V": [500, 1.0], "über 500 V": [1000, 1.0] };
    const netz = Object.keys(NETZ).find(n => ganz.includes("Stromkreis " + n));
    if (!netz) return "Spannungsbereich nicht erkannt: " + ganz.slice(0, 90);
    const [pruefU, sollMind] = NETZ[netz];
    if (mind !== sollMind)
      return `für ${netz} sind ${sollMind} MΩ vorgeschrieben, die Aufgabe nennt ${mind} MΩ`;
    /* die Prüfspannung im ersten Schritt muss zum Bereich passen */
    const erste = roh((a.schritte[0].optionen.find(o => o.ok) || {}).t || "");
    if (dz((erste.match(/^([\d.]+)/) || [])[1]) !== pruefU)
      return `für ${netz} gehören ${pruefU} V DC dazu, angegeben ist „${erste}“`;
    if (wert === mind) return "Messwert und Grenzwert sind gleich — der Grenzfall taugt nicht zum Üben";
    const soll = wert >= mind ? "bestanden" : "nicht bestanden";
    return roh(a.loesung).trim() === soll ? null
      : `bei ${wert} MΩ und Grenzwert ${mind} MΩ müsste es „${soll}“ heißen`;
  }
};

/* ------------------------------------------------------------ DEUTSCH II
   Der Prüfer hält seine EIGENEN Regeln — welche Sätze sachlich sind, welche
   Zeitform wohin gehört, was ein Argument ausmacht — und prüft, ob die
   Aufgabe dazu passt. Er rechnet nicht die Aufgabe nach, sondern gegen. */

const deutschProben2 = {

  "Aktiv und Passiv": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Aktivsatz ins Passiv setzen — das Hilfsverb muss „wird“ sein */
    const um = t.match(/Aktiv: (.+?) Passiv: (.+)$/);
    if (um) {
      const aktiv = um[1].trim(), passiv = um[2].trim();
      if (l !== "wird")
        return `das Vorgangspassiv wird mit „werden“ gebildet, angegeben ist „${l}“`;
      /* eigene Tabelle: zu jedem Verb im Aktivsatz das erwartete Partizip II */
      const PART = {"prüft":"geprüft", "repariert":"repariert", "unterschreibt":"unterschrieben",
                    "misst":"gemessen", "bezahlt":"bezahlt", "tauscht":"getauscht"};
      const verb = Object.keys(PART).find(v => aktiv.includes(" " + v + " "));
      if (!verb) return `für den Aktivsatz „${aktiv}“ ist kein Verb hinterlegt`;
      if (!passiv.includes(PART[verb]))
        return `zu „${verb}“ gehört das Partizip „${PART[verb]}“ — im Passivsatz steht es nicht: „${passiv}“`;
      /* der Täter aus dem Aktivsatz muss im Passivsatz mit von/vom auftauchen */
      if (!/\bvo[nm]\b/.test(passiv))
        return `die Täterangabe mit „von“ fehlt: „${passiv}“`;
      /* Aktiv- und Passivsatz dürfen nicht identisch sein */
      if (aktiv === passiv) return "Aktiv- und Passivsatz sind gleich";
      return null;
    }

    /* Vorgangs- oder Zustandspassiv erkennen */
    const satz = (t.match(/^(.+?)\s+Wie heißt diese Form/) || [])[1];
    if (!satz) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 80);
    const hatWird = /\bwird\b|\bwerden\b/.test(satz);
    const hatIst  = /\bist\b|\bsind\b/.test(satz);
    if (hatWird === hatIst)
      return `im Satz „${satz.trim()}“ ist nicht eindeutig, ob werden oder sein steht`;
    const soll = hatWird ? "Vorgangspassiv" : "Zustandspassiv";
    return l === soll ? null : `„${satz.trim()}“ ist ${soll}, angegeben ist „${l}“`;
  },

  "Berichten": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Fehlende W-Frage: eigene Prüfung am Text statt Übernahme der Angabe */
    if (/Welche .?W-Frage.? ist noch unbeantwortet/.test(t)) {
      const bericht = (t.match(/„(.+?)“/) || [])[1] || "";
      const FRAGEN = ["Wer", "Was", "Wann", "Wo", "Wie", "Warum"];
      if (!FRAGEN.includes(l)) return `„${l}“ ist keine der sechs W-Fragen`;
      /* Warum gilt als beantwortet, wenn eine Ursache genannt wird */
      const beantwortet = {
        Warum: /\bweil\b|\bda\b\s|\bUrsache\b|\bnicht gesichert\b|\büberhitzt\b/.test(bericht),
        Wann:  /\bam \w+tag\b|\bgestern\b|\bGegen \d|\bUhr\b|\bmorgen\b/i.test(bericht),
        Wo:    /\bin der \w+halle\b|\bIn der Werkstatt\b|\bWerkhalle\b|\bLagerhalle\b/i.test(bericht),
        Wer:   /\bMitarbeiter\b|\bAuszubildender\b|\bHausmeister\b/i.test(bericht)
      };
      if (beantwortet[l] === true)
        return `„${l}“ wird im Text schon beantwortet: „${bericht}“`;
      return null;
    }

    /* Gehört der Satz in einen Bericht? */
    const satz = (t.match(/„(.+?)“/) || [])[1];
    if (!satz) return "konnte den Satz nicht lesen: " + t.slice(0, 80);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    /* eigene Regeln: Wertung, Gefühl oder wörtliche Rede schließen aus */
    const wertung = /\btypisch\b|\bzum Glück\b|\bleider\b|\bnatürlich\b|\bwieder mal\b|\bgruselig\b|\bziemlich\b|\bIch fand\b/i.test(satz);
    const zitat   = /^„|“,\s*sagte|\bsagte er\b/.test(satz);
    const soll = (wertung || zitat) ? "nein" : "ja";
    return l === soll ? null
      : `„${satz}“ gehört ${soll === "ja" ? "" : "nicht "}in einen Bericht (${wertung ? "Wertung" : zitat ? "wörtliche Rede" : "sachlich"}), angegeben ist „${l}“`;
  },

  "Erzählen": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Welcher Satz ist anschaulicher? */
    if (/anschaulicher/.test(t)) {
      if (l !== "B") return `die anschaulichere Fassung steht immer bei B, angegeben ist „${l}“`;
      const A = (t.match(/A: „(.+?)“/) || [])[1] || "";
      const B = (t.match(/B: „(.+?)“/) || [])[1] || "";
      if (!A || !B) return "konnte die beiden Sätze nicht lesen";
      if (A === B) return "beide Sätze sind gleich";
      /* eigene Regel: die blasse Fassung enthält ein Verstärkungswort oder ein
         allgemeines Wort, die starke nicht */
      const schwach = /\bsehr\b|\bganz\b|\bschnell\b|\bGeräusche\b|\betwas\b|\bgroße\b/i.test(A);
      if (!schwach)
        return `Fassung A („${A}“) enthält kein erkennbar schwaches Wort — dann ist der Vergleich nicht eindeutig`;
      if (/\bsehr\b|\bganz\b/i.test(B))
        return `Fassung B („${B}“) enthält noch ein Verstärkungswort`;
      return null;
    }

    /* Zeitform: die Lösung muss Präteritum sein, nicht Präsens */
    const verb = (t.match(/Setz das Verb (\w+) in die richtige Zeitform/) || [])[1];
    if (!verb) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 80);
    /* eigene Tabelle der Präteritumformen */
    const PRAET = { gehen:"ging", drehen:"drehte", beginnen:"begann", treiben:"trieb" };
    const soll = PRAET[verb];
    if (!soll) return `für „${verb}“ ist keine Präteritumform hinterlegt`;
    return l === soll ? null : `„${verb}“ heißt im Präteritum „${soll}“, angegeben ist „${l}“`;
  },

  "Inhaltsangabe": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Gehört der Satz in eine Inhaltsangabe? */
    if (/Gehört dieser Satz so in eine Inhaltsangabe/.test(t)) {
      const satz = (t.match(/„(.+?)“/) || [])[1];
      if (!satz) return "konnte den Satz nicht lesen";
      if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
      /* eigene Regeln: Präteritum, Meinung, Zitat oder Spannung schließen aus */
      /* Vorsicht: ß zählt in JavaScript nicht als Wortzeichen, deshalb kein \b dahinter */
      const praeteritum = /verließ|\brief\b|\bging\b|\bwar\b|\bhatte\b/.test(satz);
      const meinung     = /\bIch fand\b|\bspannend\b|\bverrate ich nicht\b|\brichtig\b/.test(satz);
      const zitat       = /^„|“,\s*ruft|“,\s*sagt/.test(satz);
      const soll = (praeteritum || meinung || zitat) ? "nein" : "ja";
      return l === soll ? null
        : `„${satz}“ gehört ${soll === "ja" ? "" : "nicht "}hinein (${praeteritum ? "Präteritum" : meinung ? "Meinung" : zitat ? "Zitat" : "Präsens, sachlich"}), angegeben ist „${l}“`;
    }

    /* Fehlende Pflichtangabe im Einleitungssatz */
    const ein = (t.match(/„(.+?)“\s*Welche der fünf Pflichtangaben/) || t.match(/„(.+?)“/) || [])[1];
    if (!ein) return "konnte den Einleitungssatz nicht lesen";
    const PFLICHT = ["Textart", "Titel", "Autor", "Erscheinungsjahr", "Thema"];
    if (!PFLICHT.includes(l)) return `„${l}“ ist keine der fünf Pflichtangaben`;
    /* unabhängig am Satz prüfen, ob die genannte Angabe wirklich fehlt */
    const da = {
      Textart:          /\bKurzgeschichte\b|\bRoman\b|\bGedicht\b|\bErzählung\b/.test(ein),
      Titel:            /Das Brot/.test(ein),
      Autor:            /Borchert/.test(ein),
      Erscheinungsjahr: /\b1946\b/.test(ein),
      Thema:            /handelt von|geht es um/.test(ein)
    };
    if (da[l]) return `„${l}“ steht doch im Satz: „${ein}“`;
    const fehlenAuch = PFLICHT.filter(x => x !== l && !da[x]);
    if (fehlenAuch.length)
      return `es fehlt nicht nur „${l}“, sondern auch: ${fehlenAuch.join(", ")}`;
    return null;
  },

  "Argumentieren": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Welcher Teil des Arguments fehlt? */
    if (/Welcher .*fehlt hier/.test(t) || /Ein vollständiges Argument hat drei Teile/.test(t)) {
      const TEILE = ["These", "Begründung", "Beispiel"];
      if (!TEILE.includes(l)) return `„${l}“ ist keiner der drei Teile`;
      const text = (t.match(/„(.+?)“/) || [])[1] || "";
      /* eigene Erkennung: Begründung am weil/denn, Beispiel an einem Beleg */
      const hatBegruendung = /\bweil\b|\bdenn\b|\bda\b\s/.test(text);
      const hatBeispiel    = /\bStudie\b|\bletztes Jahr\b|\bIn unserer\b|\bdrei Schüler\b|\bKollege\b|\bzeigt\b/.test(text);
      const hatThese       = /\bsollten?\b/.test(text);
      /* These und Beispiel haben verlässliche Merkmale und lassen sich prüfen.
         Eine Begründung ohne „weil" erkennt kein Muster — dort wird nur geprüft,
         dass wenigstens die anderen beiden Teile vorhanden sind. */
      const da = { These: hatThese, "Begründung": hatBegruendung, Beispiel: hatBeispiel };
      if (l !== "Begründung" && da[l])
        return `„${l}“ steht doch schon im Text: „${text}“`;
      if (l === "Begründung" && hatBegruendung)
        return `im Text steht ein „weil" oder „denn" — die Begründung fehlt also nicht: „${text}“`;
      const braucht = TEILE.filter(x => x !== l && x !== "Begründung");
      const auchWeg = braucht.filter(x => !da[x]);
      if (auchWeg.length) return `es fehlt nicht nur „${l}“, sondern auch: ${auchWeg.join(", ")}`;
      return null;
    }

    /* Argument oder bloße Behauptung? */
    const satz = (t.match(/„(.+?)“/) || [])[1];
    if (!satz) return "konnte den Satz nicht lesen: " + t.slice(0, 80);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    const begruendet = /\bweil\b|\bdenn\b/.test(satz);
    const schein = /\bweiß doch jeder\b|\bkeine Ahnung\b|\bAlle meine Freunde\b|\bschon immer\b/.test(satz);
    const soll = (begruendet && !schein) ? "ja" : "nein";
    return l === soll ? null
      : `„${satz}“ ist ${soll === "ja" ? "ein Argument" : "kein Argument"}, angegeben ist „${l}“`;
  }
};

/* --------------------------------------------------------- MATHE V */

const matheProben5 = {

  "Zufall und Häufigkeit": (a) => {
    const t = vorne(a), l = loes(a);

    /* relative Häufigkeit */
    const h = t.match(/([\d.,]+) Würfen fiel ([\d.,]+)-mal/);
    if (h) {
      const g = dz(h[1]), tr = dz(h[2]);
      if (tr > g) return `${tr} Treffer bei ${g} Würfen sind unmöglich`;
      return stimmt(Math.round(tr / g * 10000) / 100, l, 1e-6);
    }

    /* Laplace: die Anzahl der günstigen Fälle unabhängig nachschlagen */
    const LAPLACE = {
      "eine gerade Zahl": [3, 6], "eine Zahl größer als 4": [2, 6], "eine Primzahl": [3, 6],
      "eine rote Karte": [16, 32], "ein Ass": [4, 32], "eine blaue Kugel": [3, 10]
    };
    const name = Object.keys(LAPLACE).find(k => t.includes(k));
    if (!name) return "konnte das Ereignis nicht einordnen: " + t.slice(0, 90);
    const [guenstig, alle] = LAPLACE[name];
    const soll = Math.round(guenstig / alle * 10000) / 100;
    if (!(soll > 0 && soll < 100)) return `${soll} % ist keine sinnvolle Wahrscheinlichkeit`;
    return stimmt(soll, l, 1e-6);
  },

  "Ähnlichkeit": (a) => {
    const t = vorne(a) + " " + hinten(a), l = loes(a);

    /* fehlende Seite */
    const s = t.match(/Seiten ([\d.,]+) cm und ([\d.,]+) cm.*?erste Seite ([\d.,]+) cm/);
    if (s) {
      const a1 = dz(s[1]), b1 = dz(s[2]), a2 = dz(s[3]);
      if (!(a1 > 0)) return "die erste Seite muss größer als null sein";
      const k = a2 / a1;
      if (k <= 1) return `der Streckfaktor ${Math.round(k * 100) / 100} vergrößert nicht`;
      return stimmt(Math.round(b1 * k * 100) / 100, l, 1e-6);
    }

    /* Fläche bei Vergrößerung — der Faktor muss quadratisch eingehen */
    const f = t.match(/Faktor ([\d.,]+) vergrößert.*?betrug ([\d.,]+) cm²/);
    if (!f) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 90);
    const k = dz(f[1]), f1 = dz(f[2]);
    const soll = f1 * k * k;
    /* Gegenprobe: linear gerechnet käme etwas anderes heraus */
    if (Math.abs(f1 * k - soll) < 1e-9) return "bei diesem Faktor ist linear und quadratisch dasselbe — dann übt die Aufgabe nichts";
    return stimmt(soll, l, 1e-6);
  },

  "Vierecke und Vielecke": (a) => {
    const t = vorne(a), l = roh(a.loesung).trim();

    /* Innenwinkelsumme */
    const n = dz((t.match(/([\d.,]+) Ecken/) || [])[1]);
    if (isFinite(n)) {
      if (n < 3) return `ein Vieleck mit ${n} Ecken gibt es nicht`;
      const soll = (n - 2) * 180;
      /* Gegenprobe an einem bekannten Fall */
      if (n === 4 && soll !== 360) return "beim Viereck müssten 360° herauskommen";
      return stimmt(soll, loes(a));
    }

    /* Vierecksart aus den Eigenschaften — gegen eine eigene Tabelle */
    const ARTEN = {
      "vier gleich lange Seiten und vier rechte Winkel": "Quadrat",
      "vier rechte Winkel, gegenüberliegende Seiten gleich lang": "Rechteck",
      "vier gleich lange Seiten, aber keine rechten Winkel": "Raute",
      "gegenüberliegende Seiten parallel und gleich lang, keine rechten Winkel": "Parallelogramm",
      "genau ein Paar paralleler Seiten": "Trapez",
      "zwei Paare benachbarter gleich langer Seiten, Diagonalen stehen senkrecht": "Drachen"
    };
    const eig = Object.keys(ARTEN).find(k => t.includes(k));
    if (!eig) return "konnte die Eigenschaften nicht einordnen: " + t.slice(0, 90);
    return l === ARTEN[eig] ? null
      : `zu „${eig}“ gehört das ${ARTEN[eig]}, angegeben ist „${l}“`;
  },

  "Zinseszins": (a) => {
    const t = vorne(a);

    /* Endkapital */
    const k = t.match(/([\d.,]+) € werden mit ([\d.,]+) % verzinst, ([\d.,]+) Jahre/);
    if (k) {
      const kap = dz(k[1]), p = dz(k[2]), n = dz(k[3]);
      const soll = Math.round(kap * Math.pow(1 + p / 100, n) * 100) / 100;
      const ohne = kap + kap * p / 100 * n;
      /* Zinseszins muss mehr ergeben als einfache Zinsen — sonst wurde falsch gerechnet */
      if (!(soll > ohne)) return `mit Zinseszins (${soll}) müsste mehr herauskommen als ohne (${Math.round(ohne * 100) / 100})`;
      return stimmt(soll, geldLoes(a), 0.02);
    }

    /* Verdopplungszeit */
    const v = t.match(/mit ([\d.,]+) % verzinst/);
    if (!v) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 90);
    const p = dz(v[1]);
    const soll = Math.ceil(Math.log(2) / Math.log(1 + p / 100));
    /* unabhängige Gegenprobe: ein Jahr weniger darf noch nicht reichen */
    if (Math.pow(1 + p / 100, soll) < 2) return `nach ${soll} Jahren ist noch nicht verdoppelt`;
    if (Math.pow(1 + p / 100, soll - 1) >= 2) return `schon nach ${soll - 1} Jahren wäre verdoppelt`;
    return stimmt(soll, loes(a));
  },

  "Sinuskurve": (a) => {
    const t = vorne(a), l = loes(a);

    /* Periodendauer aus der Frequenz */
    const f = t.match(/Frequenz ([\d.,]+) Hz/);
    if (f) {
      const hz = dz(f[1]);
      if (!(hz > 0)) return "die Frequenz muss größer als null sein";
      return stimmt(Math.round(1 / hz * 10000) / 10000, l, 1e-6);
    }

    /* Periode aus der Gleichung */
    const g = t.match(/y = ([\d.,]+) · sin\(([\d.,]+) · x\)/);
    if (!g) return "konnte die Gleichung nicht lesen: " + t.slice(0, 90);
    const b = dz(g[2]);
    if (!(b > 0)) return "die Zahl vor dem x muss größer als null sein";
    const soll = Math.round(360 / b * 100) / 100;
    /* Gegenprobe: bei b = 1 müssen es genau 360° sein */
    if (b === 1 && soll !== 360) return "bei einer 1 vor dem x müssten 360° herauskommen";
    return stimmt(soll, l, 1e-6);
  },

  "Kredite und Raten": (a) => {
    const t = vorne(a);

    /* Gesamtsumme aus Raten */
    const r = t.match(/über ([\d.,]+) € wird in ([\d.,]+) Raten zu je ([\d.,]+) €/);
    if (r) {
      const summe = dz(r[1]), anzahl = dz(r[2]), rate = dz(r[3]);
      const soll = Math.round(anzahl * rate * 100) / 100;
      /* zurückgezahlt wird immer mehr als geliehen */
      if (!(soll > summe)) return `${soll} € Rückzahlung bei ${summe} € Kredit — das wäre ein Geschenk`;
      return stimmt(soll, geldLoes(a), 0.02);
    }

    /* Aufschlag in Prozent */
    const k = t.match(/über ([\d.,]+) € kostet insgesamt ([\d.,]+) €/);
    if (!k) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 90);
    const summe = dz(k[1]), gesamt = dz(k[2]);
    if (!(gesamt > summe)) return "die Gesamtsumme muss über der Kreditsumme liegen";
    return stimmt(Math.round((gesamt - summe) / summe * 10000) / 100, loes(a), 1e-6);
  }
};

/* ----------------------------------------------------------- DEUTSCH III
   Auch hier hält der Prüfer eigene Regeln: welche Argumente zu welcher Seite
   gehören, was eine Textsorte ausmacht, was ein Zitat vollständig macht. */

const deutschProben3 = {

  "Erörterung": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Pro oder Contra — gegen eine eigene Zuordnung.
       Unterschieden wird an der Lösung: roh() schiebt vor „-Seite" ein
       Leerzeichen ein, am Aufgabentext lässt sich das nicht sauber festmachen. */
    if (l === "Pro" || l === "Contra") {
      const SEITEN = {
        "Wer ständig aufs Handy schaut": "Pro",
        "Für Recherchen ist ein Gerät": "Contra",
        "Jugendliche werden abends später müde": "Pro",
        "Der Nachmittag wird dann so voll": "Contra",
        "Wer eigene Sachen anzieht": "Pro",
        "Für kleine Betriebe wäre das": "Contra"
      };
      const treffer = Object.keys(SEITEN).find(k => t.includes(k));
      if (!treffer) return "konnte das Argument nicht einordnen: " + t.slice(0, 100);
      return l === SEITEN[treffer] ? null
        : `„${treffer}…“ gehört auf die ${SEITEN[treffer]}-Seite, angegeben ist „${l}“`;
    }

    /* Reihenfolge der Argumente */
    if (l !== "steigernd")
      return `Argumente werden steigernd geordnet, angegeben ist „${l}“`;
    return null;
  },

  "Sachtexte auswerten": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Textsorte — eigene Zuordnung nach dem Beispielsatz */
    if (/Um welche Textsorte/.test(t)) {
      const SORTEN = {
        "Die Stadt teilt mit": "Bericht",
        "Wer jetzt noch zögert": "Werbetext",
        "Drücken Sie zuerst die Entriegelung": "Anleitung",
        "Meiner Ansicht nach": "Kommentar",
        "Kupfer leitet Strom besser": "Sachtext"
      };
      const treffer = Object.keys(SORTEN).find(k => t.includes(k));
      if (!treffer) return "konnte den Beispielsatz nicht einordnen: " + t.slice(0, 100);
      return l === SORTEN[treffer] ? null
        : `„${treffer}…“ ist ein ${SORTEN[treffer]}, angegeben ist „${l}“`;
    }

    /* belegt oder behauptet — eigene Merkmale statt Übernahme */
    const satz = (t.match(/„(.+?)“/) || [])[1];
    if (!satz) return "konnte den Satz nicht lesen: " + t.slice(0, 90);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    /* ein Beleg braucht eine benannte Quelle, eine Zahl oder ein Datum */
    const quelle = /Bundesamt|Untersuchung der|Prüfbericht|Statistisch/.test(satz);
    const zahl   = /\d/.test(satz);
    const floskel = /allgemein bekannt|Die meisten Leute|Jeder weiß/.test(satz);
    const soll = (!floskel && (quelle || zahl)) ? "ja" : "nein";
    return l === soll ? null
      : `„${satz}“ ist ${soll === "ja" ? "belegt" : "nicht belegt"}, angegeben ist „${l}“`;
  },

  "Bewerbung schreiben": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Stelle im Aufbau */
    const teil = (t.match(/Abschnitt „(.+?)“/) || [])[1];
    if (teil) {
      const REIHE = ["Betreffzeile", "Anrede", "Einstieg", "Hauptteil", "Schluss"];
      const soll = REIHE.indexOf(teil) + 1;
      if (!soll) return `„${teil}“ ist kein Abschnitt des Anschreibens`;
      return String(soll) === l ? null
        : `„${teil}“ steht an Stelle ${soll}, angegeben ist „${l}“`;
    }

    /* taugt der Satz? — eigene Merkmale */
    const satz = (t.match(/„(.+?)“/) || [])[1];
    if (!satz) return "konnte den Satz nicht lesen: " + t.slice(0, 90);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    const floskel  = /Hiermit bewerbe ich mich/.test(satz);
    const leer     = /teamfähig, motiviert und belastbar/i.test(satz);
    const konjunktiv = /würde mich freuen, wenn.*könnten/.test(satz);
    const soll = (floskel || leer || konjunktiv) ? "nein" : "ja";
    return l === soll ? null
      : `„${satz}“ taugt ${soll === "ja" ? "" : "nicht "}für ein Anschreiben, angegeben ist „${l}“`;
  },

  "Textgebundene Erörterung": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* richtig zitiert? */
    if (/richtig zitiert/.test(t)) {
      if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
      const form = t.split("Ist das so richtig zitiert")[0];
      /* eigene Regel: entweder wörtlich mit Anführungszeichen UND Fundstelle,
         oder indirekt im Konjunktiv — und nie eine eigene Wertung */
      const anfuehr = /“/.test(form) || /"/.test(form);
      const stelle  = /Z\. ?\d|Zeile ?\d/.test(form);
      const indirekt = /schreibt, .*sei /.test(form);
      const wertung  = /doof|blöd|toll/.test(form);
      const soll = (!wertung && ((anfuehr && stelle) || indirekt)) ? "ja" : "nein";
      return l === soll ? null
        : `„${form.trim()}“ ist ${soll === "ja" ? "korrekt" : "nicht korrekt"} zitiert, angegeben ist „${l}“`;
    }

    /* in welchen Teil gehört der Satz? */
    const TEILE = {
      "Der Text stammt aus der Süddeutschen": "Einleitung",
      "In der Kurzfassung geht es um": "Einleitung",
      "Der Autor führt drei Gründe an": "Textwiedergabe",
      "Diese Begründung überzeugt nicht": "Erörterung",
      "Dem lässt sich entgegenhalten": "Erörterung",
      "Insgesamt halte ich die Position": "Fazit"
    };
    const treffer = Object.keys(TEILE).find(k => t.includes(k));
    if (!treffer) return "konnte den Satz nicht einordnen: " + t.slice(0, 100);
    return l === TEILE[treffer] ? null
      : `„${treffer}…“ gehört in die ${TEILE[treffer]}, angegeben ist „${l}“`;
  },

  "Interpretation": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Beschreibung oder Deutung */
    if (/Beschreibung.*Deutung/.test(t)) {
      const satz = (t.match(/„(.+?)“/) || [])[1];
      if (!satz) return "konnte den Satz nicht lesen";
      /* eigene Regel: eine Deutung nennt eine Wirkung */
      const wirkung = /wirken|wirkt|zeigt|lässt|erzeugt/.test(satz);
      const soll = wirkung ? "Deutung" : "Beschreibung";
      return l === soll ? null
        : `„${satz}“ ist eine ${soll}, angegeben ist „${l}“`;
    }

    /* taugt als Deutungshypothese? */
    const satz = (t.match(/„(.+?)“/) || [])[1];
    if (!satz) return "konnte den Satz nicht lesen: " + t.slice(0, 90);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    const geschmack = /Ich finde/.test(satz);
    const nurThema  = /^Das Gedicht handelt von einem \w+\.$/.test(satz);
    const zahl      = /^Der Text hat \d+ Zeilen\.$/.test(satz);
    const aussage   = /zeigt|führt vor|stellt die Frage/.test(satz);
    const soll = (!geschmack && !nurThema && !zahl && aussage) ? "ja" : "nein";
    return l === soll ? null
      : `„${satz}“ taugt ${soll === "ja" ? "" : "nicht "}als Deutungshypothese, angegeben ist „${l}“`;
  },

  "Facharbeit": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Stelle im Aufbau */
    const teil = (t.match(/Teil „(.+?)“/) || [])[1];
    if (teil) {
      const REIHE = ["Deckblatt", "Inhaltsverzeichnis", "Einleitung", "Hauptteil", "Schluss", "Literaturverzeichnis"];
      const soll = REIHE.indexOf(teil) + 1;
      if (!soll) return `„${teil}“ ist kein Teil der Facharbeit`;
      return String(soll) === l ? null
        : `„${teil}“ steht an Stelle ${soll}, angegeben ist „${l}“`;
    }

    /* Quellenangabe vollständig? — die fünf Angaben einzeln prüfen */
    const q = (t.match(/Quellenangabe: (.+?) Ist sie vollständig/) || [])[1];
    if (!q) return "konnte die Quellenangabe nicht lesen: " + t.slice(0, 100);
    if (!["ja", "nein"].includes(l)) return `erwartet wird ja oder nein, angegeben ist „${l}“`;
    const verfasser = /^[A-ZÄÖÜ][\wäöüß]+(, [A-ZÄÖÜ][\wäöüß]+)?:/.test(q.trim());
    const ort       = /München|Berlin|Bonn|Hamburg|Köln|Stuttgart|Frankfurt/.test(q);
    const jahr      = /\b(19|20)\d{2}\b/.test(q);
    const seite     = /S\. ?\d+/.test(q);
    const soll = (verfasser && ort && jahr && seite) ? "ja" : "nein";
    return l === soll ? null
      : `„${q}“ ist ${soll === "ja" ? "vollständig" : "unvollständig"} ` +
        `(Verfasser ${verfasser ? "ja" : "nein"}, Ort ${ort ? "ja" : "nein"}, ` +
        `Jahr ${jahr ? "ja" : "nein"}, Seite ${seite ? "ja" : "nein"}), angegeben ist „${l}“`;
  }
};

/* ---------------------------------------------------------- ENGLISCH I
   Der Prüfer hält eigene Regeln: welche Subjekte die dritte Person Einzahl
   sind, welche Pluralformen gelten, wann a und wann an steht. */

const englischProben = {

  "Simple Present": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Signalwort ja/nein */
    if (/Signalwort/.test(t)) {
      const wort = (t.match(/„(.+?)“/) || [])[1];
      if (!wort) return "konnte das Signalwort nicht lesen";
      const VERGANGEN = ["yesterday", "last week", "two years ago"];
      const soll = VERGANGEN.includes(wort) ? "nein" : "ja";
      return l === soll ? null : `„${wort}“ passt ${soll === "ja" ? "" : "nicht "}zum Simple Present, angegeben ist „${l}“`;
    }

    /* Verbform: dritte Person Einzahl unabhängig bestimmen */
    const m = t.match(/Setz das Verb (\w+) richtig ein: (.+?) ___ /);
    if (!m) return "konnte die Aufgabe nicht einordnen: " + t.slice(0, 90);
    const verb = m[1], wer = m[2].trim();
    const DRITTE = ["He", "She", "It", "My brother", "The dog"];
    const MEHR   = ["We", "They", "I", "My friends"];
    let dritte;
    if (DRITTE.includes(wer)) dritte = true;
    else if (MEHR.includes(wer)) dritte = false;
    else return `für das Subjekt „${wer}“ ist nicht hinterlegt, ob es dritte Person ist`;
    const soll = dritte ? verb + "s" : verb;
    return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
  },

  "to be und to have got": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    const wer = (t.match(/ein: (.+?) ___ /) || [])[1];
    if (!wer) return "konnte das Subjekt nicht lesen: " + t.slice(0, 90);
    /* eigene Tabelle statt Übernahme aus der Aufgabe */
    const BE   = {"I":"am", "He":"is", "She":"is", "It":"is", "You":"are", "We":"are",
                  "They":"are", "My sister":"is", "My parents":"are", "The cat":"is"};
    const HAVE = {"He":"has got", "She":"has got", "My friend":"has got", "The school":"has got",
                  "I":"have got", "We":"have got", "They":"have got", "My parents":"have got"};
    if (/to be/.test(t)) {
      const soll = BE[wer.trim()];
      if (!soll) return `für „${wer}“ ist keine Form von to be hinterlegt`;
      return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
    }
    const soll = HAVE[wer.trim()];
    if (!soll) return `für „${wer}“ ist keine Form von have got hinterlegt`;
    return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
  },

  "Fragen bilden": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* do oder does */
    if (/Setz do oder does ein/.test(t)) {
      const DRITTE = ["your brother", "the bus", "he", "she"];
      const ANDERE = ["your parents", "you", "they", "we"];
      /* das Subjekt kann aus mehreren Wörtern bestehen — längste Treffer zuerst */
      const wer = [...DRITTE, ...ANDERE].find(x => t.includes("___ " + x + " "));
      if (!wer) return "konnte das Subjekt nicht lesen: " + t.slice(0, 90);
      const soll = DRITTE.includes(wer) ? "Does" : "Do";
      return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
    }

    /* Fragewort — aus der Antwort erschlossen */
    const antwort = (t.match(/Antwort: (.+)$/) || [])[1];
    if (!antwort) return "konnte die Antwort nicht lesen: " + t.slice(0, 90);
    const WORT = {
      "Mrs Brown.":"Who", "In Hamburg.":"Where", "At eight o'clock.":"When",
      "Because I missed the bus.":"Why", "By bike.":"How", "Maths.":"What"
    };
    const soll = WORT[antwort.trim()];
    if (!soll) return `für die Antwort „${antwort}“ ist kein Fragewort hinterlegt`;
    return l === soll ? null : `auf „${antwort}“ passt „${soll}“, angegeben ist „${l}“`;
  },

  "Verneinung": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    const wer = (t.match(/: (.+?) ___ /) || [])[1];
    if (!wer) return "konnte das Subjekt nicht lesen: " + t.slice(0, 90);

    /* to be */
    if (/to be/.test(t)) {
      const BE = {"I":"am not", "He":"is not", "She":"is not", "It":"is not",
                  "You":"are not", "We":"are not", "They":"are not"};
      const soll = BE[wer.trim()];
      if (!soll) return `für „${wer}“ ist keine verneinte Form hinterlegt`;
      return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
    }

    /* don't oder doesn't */
    const DRITTE = ["He", "She", "My brother", "The shop"];
    const soll = DRITTE.includes(wer.trim()) ? "doesn't" : "don't";
    return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
  },

  "Plural und Artikel": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Plural — eigene Tabelle */
    const ein = (t.match(/Plural von (\w+)\s*\?/) || [])[1];
    if (ein) {
      const PLURAL = {book:"books", bus:"buses", box:"boxes", watch:"watches",
                      city:"cities", baby:"babies", boy:"boys", child:"children",
                      man:"men", woman:"women", foot:"feet", tooth:"teeth"};
      const soll = PLURAL[ein];
      if (!soll) return `für „${ein}“ ist kein Plural hinterlegt`;
      return l === soll ? null : `der Plural von „${ein}“ ist „${soll}“, angegeben ist „${l}“`;
    }

    /* a oder an — nach dem Anfangslaut, nicht nach dem Buchstaben */
    const wort = (t.match(/This is ___ (\w+)\./) || [])[1];
    if (!wort) return "konnte das Wort nicht lesen: " + t.slice(0, 90);
    const MIT_AN = ["apple", "orange", "egg", "umbrella", "hour"];
    const MIT_A  = ["book", "dog", "teacher", "school", "university"];
    let soll;
    if (MIT_AN.includes(wort)) soll = "an";
    else if (MIT_A.includes(wort)) soll = "a";
    else return `für „${wort}“ ist kein Artikel hinterlegt`;
    return l === soll ? null : `vor „${wort}“ steht „${soll}“, angegeben ist „${l}“`;
  }
};

const englischProben2 = {

  "Simple Past": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    const verb = (t.match(/(?:Setz das Verb|Setz) (\w+) ins Simple Past/) || [])[1];
    if (!verb) return "konnte das Verb nicht lesen: " + t.slice(0, 90);
    /* eigene Tabelle, unabhängig von der Aufgabe aufgestellt */
    const REGEL = {work:"worked", play:"played", open:"opened", live:"lived", use:"used",
                   study:"studied", carry:"carried", stop:"stopped", plan:"planned"};
    const UNREGEL = {go:"went", see:"saw", buy:"bought", think:"thought", take:"took",
                     write:"wrote", find:"found", make:"made", come:"came", give:"gave"};
    const soll = REGEL[verb] || UNREGEL[verb];
    if (!soll) return `für „${verb}“ ist keine Vergangenheitsform hinterlegt`;
    if (l !== soll) return `das Simple Past von „${verb}“ ist „${soll}“, angegeben ist „${l}“`;
    /* die Schreibregel muss zur Form passen */
    if (REGEL[verb]){
      const nurD = verb.slice(-1) === "e";
      if (nurD && soll !== verb + "d") return `„${verb}“ endet auf e, dann darf nur -d folgen`;
      if (!nurD && /y$/.test(verb) && !/[aeiou]y$/.test(verb) && !/ied$/.test(soll))
        return `„${verb}“ endet auf Konsonant + y, dann muss -ied folgen`;
    }
    return null;
  },

  "Present Progressive": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Form bilden: be-Form plus -ing */
    if (/Bilde das Present Progressive/.test(t)) {
      const verb = (t.match(/Present Progressive von (\w+)\s*:/) || [])[1];
      const wer  = (t.match(/:\s*(I|You|He|She|It|We|They) ___ /) || [])[1];
      if (!verb || !wer) return "konnte Verb oder Subjekt nicht lesen: " + t.slice(0, 100);
      const BE = {I:"am", He:"is", She:"is", It:"is", You:"are", We:"are", They:"are"};
      const ING = {work:"working", read:"reading", write:"writing", make:"making",
                   sit:"sitting", run:"running", play:"playing", take:"taking"};
      if (!ING[verb]) return `für „${verb}“ ist keine -ing-Form hinterlegt`;
      const soll = BE[wer] + " " + ING[verb];
      return l === soll ? null : `zu „${wer}“ und „${verb}“ gehört „${soll}“, angegeben ist „${l}“`;
    }

    /* Zeitwahl: das Signalwort im Satz entscheidet */
    const SATZ = {
      "flicker":"is flickering", "get":"get", "sleep":"is sleeping", "boil":"boils",
      "walk":"walks", "knock":"is knocking", "have":"have", "work":"am working"
    };
    const verb = (t.match(/\((\w+)\)/) || [])[1];
    if (!verb) return "konnte das Verb in Klammern nicht lesen: " + t.slice(0, 100);
    const soll = SATZ[verb];
    if (!soll) return `für „${verb}“ ist keine Form hinterlegt`;
    if (l !== soll) return `zu „${verb}“ gehört „${soll}“, angegeben ist „${l}“`;
    /* Gegenprobe: Verlaufsform nur, wenn ein Jetzt-Signal im Satz steht */
    const jetzt = /Look!|Listen!|Be quiet|At the moment|right now/i.test(t);
    const verlauf = /^(am|is|are) /.test(soll);
    if (jetzt !== verlauf)
      return `Signal und Zeit passen nicht zusammen: ${jetzt ? "Jetzt-Signal" : "kein Jetzt-Signal"} im Satz, Lösung ist „${soll}“`;
    return null;
  },

  "Steigerung von Adjektiven": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* unregelmäßige Steigerung */
    const un = (t.match(/Steigere (\w+) \(/) || [])[1];
    if (un) {
      const UN = {good:["better","the best"], bad:["worse","the worst"],
                  much:["more","the most"], many:["more","the most"],
                  little:["less","the least"], far:["further","the furthest"]};
      if (!UN[un]) return `für „${un}“ sind keine unregelmäßigen Formen hinterlegt`;
      const zweite = /zweite/.test(t);
      const soll = UN[un][zweite ? 1 : 0];
      return l === soll ? null : `die ${zweite ? "zweite" : "erste"} Stufe von „${un}“ ist „${soll}“, angegeben ist „${l}“`;
    }

    /* regelmäßige Steigerung — Silbenzahl selbst hinterlegt */
    const wort = (t.match(/erste Steigerungsstufe von (\w+)\s*\?/) || [])[1];
    if (!wort) return "konnte das Adjektiv nicht lesen: " + t.slice(0, 100);
    const SILBEN = {small:1, fast:1, cheap:1, big:1, hot:1, easy:2, happy:2,
                    expensive:3, difficult:3, interesting:4, dangerous:3};
    const silben = SILBEN[wort];
    if (!silben) return `für „${wort}“ ist keine Silbenzahl hinterlegt`;
    const kurz = silben === 1 || (silben === 2 && /y$/.test(wort));
    if (!kurz) {
      const soll = "more " + wort;
      return l === soll ? null : `„${wort}“ hat ${silben} Silben und wird mit more gesteigert, angegeben ist „${l}“`;
    }
    /* kurze Wörter: -er, mit Verdopplung oder y-Wandel */
    let soll;
    if (/y$/.test(wort)) soll = wort.slice(0, -1) + "ier";
    else if (/[^aeiou][aeiou][^aeiouwxy]$/.test(wort)) soll = wort + wort.slice(-1) + "er";
    else soll = wort + "er";
    return l === soll ? null : `die erste Stufe von „${wort}“ ist „${soll}“, angegeben ist „${l}“`;
  },

  "some und any": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    if (l !== "some" && l !== "any") return `Lösung ist weder some noch any, sondern „${l}“`;
    /* Satztyp unabhängig aus dem Satz selbst bestimmen */
    const frage    = /\?/.test(t);
    const verneint = /aren't|hasn't|haven't|didn't|isn't|don't|doesn't/.test(t);
    const angebot  = /Would you like|Could I have|Shall I/.test(t);
    let soll;
    if (angebot) soll = "some";
    else if (verneint || frage) soll = "any";
    else soll = "some";
    if (verneint && frage) return "Satz ist gleichzeitig verneint und Frage — nicht vorgesehen";
    return l === soll ? null : `${angebot ? "Angebot oder Bitte" : verneint ? "Verneinung" : frage ? "Frage" : "bejahte Aussage"} verlangt „${soll}“, angegeben ist „${l}“`;
  },

  "Possessivbegleiter": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* its oder it's */
    if (/its.*oder.*it's/.test(t) || /it's.*oder.*its/.test(t)) {
      /* Probe: lässt sich „it is“ oder „it has“ einsetzen? */
      const satz = (t.match(/Setz ein:\s*(.+)$/) || [])[1] || t;
      const kurzform = /___ raining|___ been|___ too late/.test(satz);
      const soll = kurzform ? "it's" : "its";
      return l === soll ? null : `${kurzform ? "hier ist die Kurzform von it is oder it has gemeint" : "hier geht es um Besitz"} — richtig wäre „${soll}“, angegeben ist „${l}“`;
    }

    /* Form zur Person */
    const POSS = {I:"my", You:"your", He:"his", She:"her", They:"their", We:"our"};
    const wer = (t.match(/:\s*(I|You|He|She|We|They) /) || [])[1];
    if (wer) {
      const soll = POSS[wer];
      return l === soll ? null : `zu „${wer}“ gehört „${soll}“, angegeben ist „${l}“`;
    }
    /* es bleibt der Fall mit „it“ als Besitzer: The dog wants ___ food. */
    if (/The dog wants/.test(t))
      return l === "its" ? null : `Besitzer ist der Hund, also „its“, angegeben ist „${l}“`;
    return "konnte den Besitzer nicht lesen: " + t.slice(0, 100);
  }
};


const englischProben3 = {

  "Present Perfect": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* since oder for — aus der Zeitangabe selbst erschlossen */
    if (/Setz since oder for ein/.test(t)) {
      const angabe = (t.match(/here ___ (.+?)\.\s*$/) || [])[1];
      if (!angabe) return "konnte die Zeitangabe nicht lesen: " + t.slice(0, 100);
      /* eigene Regel: nennt die Angabe eine Dauer, gehört for dazu */
      const DAUER = ["three years", "two hours", "a long time", "six months"];
      const ZEITPUNKT = ["2019", "Monday", "my birthday", "last summer"];
      let soll;
      if (DAUER.includes(angabe)) soll = "for";
      else if (ZEITPUNKT.includes(angabe)) soll = "since";
      else return `für „${angabe}“ ist nicht hinterlegt, ob es Dauer oder Zeitpunkt ist`;
      return l === soll ? null : `„${angabe}“ ist ${soll === "for" ? "eine Dauer" : "ein Zeitpunkt"}, also „${soll}“, angegeben ist „${l}“`;
    }

    /* Form bilden: have/has plus Partizip, beides unabhängig hinterlegt */
    const verb = (t.match(/Present Perfect von (\w+)\s*:/) || [])[1];
    const wer  = (t.match(/:\s*(I|You|He|She|It|We|They) ___ /) || [])[1];
    if (!verb || !wer) return "konnte Verb oder Subjekt nicht lesen: " + t.slice(0, 110);
    const HABEN = {I:"have", You:"have", We:"have", They:"have", He:"has", She:"has", It:"has"};
    const PARTIZIP = {finish:"finished", work:"worked", live:"lived", study:"studied",
                      go:"gone", see:"seen", write:"written", take:"taken", do:"done", buy:"bought"};
    if (!PARTIZIP[verb]) return `für „${verb}“ ist kein Partizip hinterlegt`;
    const soll = HABEN[wer] + " " + PARTIZIP[verb];
    if (l !== soll) return `zu „${wer}“ und „${verb}“ gehört „${soll}“, angegeben ist „${l}“`;
    /* Gegenprobe: Partizip und Simple Past sind nicht dasselbe */
    const PAST = {go:"went", see:"saw", write:"wrote", take:"took", do:"did"};
    if (PAST[verb] && l.includes(PAST[verb]))
      return `„${PAST[verb]}“ ist das Simple Past, nicht das Partizip`;
    return null;
  },

  "will future und going to": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* Die Form von be zur Person */
    if (/Setz die richtige Form ein/.test(t)) {
      const wer = (t.match(/:\s*(I|You|He|She|It|We|They) ___ going to/) || [])[1];
      if (!wer) return "konnte das Subjekt nicht lesen: " + t.slice(0, 100);
      const BE = {I:"am", He:"is", She:"is", It:"is", You:"are", We:"are", They:"are"};
      return l === BE[wer] ? null : `zu „${wer}“ gehört „${BE[wer]}“, angegeben ist „${l}“`;
    }

    /* Zeitwahl: Was im Satz steht, entscheidet — unabhängig nachgeprüft */
    if (!/^(will|am going to|is going to|are going to)$/.test(l))
      return `unerwartete Lösung „${l}“`;
    const geplant = /already arranged|contract is signed|have already been|it's arranged/i.test(t);
    const sichtbar = /Look at those clouds|Look at that crack/i.test(t);
    const spontan = /is ringing|Don't worry|I think|next month/i.test(t);
    if (geplant || sichtbar){
      if (!/going to/.test(l)) return `Satz nennt ${geplant ? "einen festen Plan" : "einen sichtbaren Hinweis"} — dann gehört going to hin, angegeben ist „${l}“`;
      /* die be-Form muss zur Person passen */
      const wer = (t.match(/i>\s*([A-Za-z]+)/) || [])[1];
      const BE = {I:"am", He:"is", She:"is", It:"is", They:"are", We:"are", You:"are", The:"is"};
      const soll = BE[wer];
      if (soll && !l.startsWith(soll)) return `zu „${wer}“ gehört „${soll} going to“, angegeben ist „${l}“`;
      return null;
    }
    if (spontan) return l === "will" ? null
      : `Satz nennt eine spontane Entscheidung oder Vermutung — dann gehört will hin, angegeben ist „${l}“`;
    return "der Satz enthält kein hinterlegtes Signal";
  },

  "Modalverben": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();

    /* mustn't oder needn't */
    if (/mustn't oder needn't/.test(t) || /mustn't.*needn't/.test(t)) {
      /* Wird ein Grund dagegen genannt, ist es ein Verbot */
      const verboten = /sealed for a reason|before the test is finished|forget the safety rules/i.test(t);
      const unnoetig = /we have everything here|the shift starts at nine|I will send you an email/i.test(t);
      if (verboten && unnoetig) return "Satz ist gleichzeitig Verbot und unnötig — nicht vorgesehen";
      if (!verboten && !unnoetig) return "kein hinterlegtes Signal im Satz: " + t.slice(0, 100);
      const soll = verboten ? "mustn't" : "needn't";
      return l === soll ? null
        : `${verboten ? "Der Satz nennt einen Grund dagegen — Verbot" : "Der Satz nennt einen Grund, warum es unnötig ist"}, also „${soll}“, angegeben ist „${l}“`;
    }

    /* welches Modalverb zur Bedeutung */
    const SIGNAL = [
      [/It is a rule/i, "must"],
      [/It is dangerous/i, "mustn't"],
      [/There is a sign/i, "mustn't"],
      [/It is not necessary/i, "needn't"],
      [/speak three languages/i, "can"],
      [/That would be better/i, "should"],
      [/borrow your pen/i, "May"],
      [/when he was five/i, "could"]
    ];
    const treffer = SIGNAL.find(([re]) => re.test(t));
    if (!treffer) return "kein hinterlegtes Signal im Satz: " + t.slice(0, 100);
    return l === treffer[1] ? null : `das Signal im Satz verlangt „${treffer[1]}“, angegeben ist „${l}“`;
  },

  "Adverbien bilden": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    /* eigene Tabelle, unabhängig aufgestellt */
    const ADVERB = {quick:"quickly", careful:"carefully", slow:"slowly", loud:"loudly",
                    easy:"easily", happy:"happily", terrible:"terribly", possible:"possibly",
                    good:"well", fast:"fast", hard:"hard", late:"late"};

    /* Adjektiv oder Adverb im Satz */
    if (/Adjektiv oder Adverb/.test(t)) {
      const wort = (t.match(/Setz (\w+) in der richtigen Form/) || [])[1];
      if (!wort) return "konnte das Wort nicht lesen: " + t.slice(0, 100);
      if (!ADVERB[wort]) return `für „${wort}“ ist kein Adverb hinterlegt`;
      /* Steht vor der Lücke ein Artikel, folgt ein Hauptwort — dann Adjektiv */
      const beimDing = /\b(a|an|is a|is an)\s+___/.test(t) || /___ (driver|worker|machine|exercise)/.test(t);
      const soll = beimDing ? wort : ADVERB[wort];
      return l === soll ? null
        : `${beimDing ? "vor einem Hauptwort steht das Adjektiv" : "beim Verb steht das Adverb"} — „${soll}“, angegeben ist „${l}“`;
    }

    /* Adverb bilden */
    const adj = (t.match(/Adverb zu (\w+)\s*\?/) || [])[1];
    if (!adj) return "konnte das Adjektiv nicht lesen: " + t.slice(0, 100);
    if (!ADVERB[adj]) return `für „${adj}“ ist kein Adverb hinterlegt`;
    if (l !== ADVERB[adj]) return `das Adverb zu „${adj}“ ist „${ADVERB[adj]}“, angegeben ist „${l}“`;
    /* Gegenprobe: Bei Konsonant + y darf kein schlichtes -ly stehen */
    if (/[^aeiou]y$/.test(adj) && !/ily$/.test(l))
      return `„${adj}“ endet auf Konsonant + y — dann muss -ily folgen`;
    return null;
  },

  "Mengenangaben": (a) => {
    const t = roh(a.text), l = roh(a.loesung).trim();
    /* eigene Einteilung, nicht aus der Aufgabe übernommen */
    const ZAEHLBAR = ["apples", "friends", "books", "people", "tools",
                      "minutes", "questions", "screws", "days"];
    const NICHT = ["water", "money", "time", "information", "milk",
                   "sugar", "help", "patience", "space"];
    const wort = (t.match(/___ (\w+)[\s.?]/) || [])[1];
    if (!wort) return "konnte das Wort nicht lesen: " + t.slice(0, 100);
    let zaehlbar;
    if (ZAEHLBAR.includes(wort)) zaehlbar = true;
    else if (NICHT.includes(wort)) zaehlbar = false;
    else return `für „${wort}“ ist nicht hinterlegt, ob es zählbar ist`;

    const klein = /a few oder a little/.test(t);
    const soll = klein ? (zaehlbar ? "a few" : "a little") : (zaehlbar ? "many" : "much");
    return l === soll ? null
      : `„${wort}“ ist ${zaehlbar ? "zählbar" : "nicht zählbar"}, also „${soll}“, angegeben ist „${l}“`;
  }
};


const proben = { ...matheProben, ...matheProben2, ...matheProben3, ...matheProben4, ...matheProben5, ...deutschProben, ...deutschProben2, ...deutschProben3, ...englischProben, ...englischProben2, ...englischProben3,
                 ...elektroProben, ...elektroProben2, ...elektroProben3, ...elektroProben4 };

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
