/* Bildet nach, wie Vercel eine Adresse auflöst, und prüft jede Adresse, die
   irgendwo verlinkt ist oder in der sitemap steht.

   Reihenfolge bei Vercel: erst die Datei auf der Platte, dann die Umschreibung
   aus vercel.json. Genau das ist hier nachgebaut. Der Fehler von vorhin —
   cleanUrls hat die Umschreibung auf index.html zerschossen, sodass /start
   ein 404 war — wäre damit vor dem Ausliefern aufgefallen. */
const fs = require("fs");
const pfad = require("path");

const ORDNER = __dirname;
const conf = JSON.parse(fs.readFileSync(ORDNER + "/vercel.json", "utf8"));
const probleme = [];

/* cleanUrls und trailingSlash ändern das Auflösen — und haben es zerschossen */
if (conf.cleanUrls) probleme.push("vercel.json setzt cleanUrls — das bricht die Umschreibung auf /index.html");

const regeln = (conf.rewrites || []).map(r => {
  /* Vercel nimmt path-to-regexp; für unsere eine Regel reicht der Kern */
  const kern = r.source.replace(/^\//, "").replace(/^\((.*)\)$/, "$1");
  return {re: new RegExp("^/" + kern + "$"), ziel: r.destination};
});

function aufloesen(adr){
  const ohneFrage = adr.split(/[?#]/)[0];
  const datei = pfad.join(ORDNER, decodeURIComponent(ohneFrage));
  /* 1. Datei auf der Platte */
  if (fs.existsSync(datei) && fs.statSync(datei).isFile()) return {art:"datei", ziel: ohneFrage};
  /* 2. Umschreibung */
  for (const r of regeln){
    if (r.re.test(ohneFrage)){
      const zieldatei = pfad.join(ORDNER, r.ziel);
      if (!fs.existsSync(zieldatei)) return {art:"fehler", grund:"Umschreibung zeigt auf " + r.ziel + ", das es nicht gibt"};
      return {art:"app", ziel: r.ziel};
    }
  }
  return {art:"404"};
}

/* ---- Die Adressen, die es geben muss ---- */
const h = fs.readFileSync(ORDNER + "/index.html", "utf8");
const adressen = new Set(["/"]);
for (const m of h.matchAll(/navLink\(\s*[`"']([^`"'$]*)/g)) if (m[1].startsWith("/")) adressen.add(m[1]);
for (const m of h.matchAll(/href="(\/[^"${]*)"/g)) adressen.add(m[1]);
/* App-Adressen, die es beim Neuladen geben muss */
["/start", "/faecher", "/vokabeln", "/vokabeln/eigene", "/pruefung", "/plan",
 "/mathe", "/mathe/6", "/deutsch/8", "/englisch/5", "/elektroniker/2",
 "/anmelden", "/registrieren", "/einstellungen", "/hilfe", "/faq"].forEach(a => adressen.add(a));
/* Alles aus der sitemap */
const sm = fs.readFileSync(ORDNER + "/sitemap.xml", "utf8");
for (const m of sm.matchAll(/<loc>https:\/\/endlichkapiert\.com([^<]*)<\/loc>/g)) adressen.add(m[1] || "/");

const zaehler = {datei:0, app:0};
for (const a of adressen){
  if (!a.startsWith("/")) continue;
  const r = aufloesen(a);
  if (r.art === "404") probleme.push(`404: „${a}“ — keine Datei und keine Umschreibung`);
  else if (r.art === "fehler") probleme.push(`${a}: ${r.grund}`);
  else zaehler[r.art]++;
}

/* Die festen Seiten müssen als Datei ankommen, nicht in der App landen */
["/erklaerungen.html", "/erklaerung/brueche.html", "/erklaerung/ohmsches-gesetz.html",
 "/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/sw.js", "/icon.svg"].forEach(a => {
  const r = aufloesen(a);
  if (r.art !== "datei") probleme.push(`„${a}“ kommt nicht als Datei an, sondern als ${r.art}`);
});
/* App-Adressen müssen in der App landen, nicht 404 */
["/start", "/pruefung", "/vokabeln/eigene", "/mathe/6"].forEach(a => {
  const r = aufloesen(a);
  if (r.art !== "app") probleme.push(`„${a}“ landet nicht in der App, sondern als ${r.art}`);
});

console.log(probleme.length
  ? probleme.map(p => "· " + p).join("\n")
  : `Ausliefern: keine Beanstandungen — ${zaehler.datei} Adressen als Datei, ${zaehler.app} über die App.`);
process.exit(probleme.length ? 1 : 0);
