# Play Store — Plan für nächstes Jahr

Ziel: „Endlich kapiert" liegt im Google Play Store. **Nur Play Store, kein
Apple.** Das ist eine gute Entscheidung — sie spart dir 99 $ im Jahr, einen
Mac und die strengste Prüfung im Geschäft.

---

## Der Weg: TWA statt Neubau

Google hat einen **offiziellen Weg**, eine Web-App in den Store zu bringen:
eine **Trusted Web Activity (TWA)**. Dabei wird deine Seite nicht nachgebaut,
sondern in eine Android-Hülle gelegt, die sie im echten Chrome-Motor
darstellt — ohne Browserleiste, nicht von einer nativen App zu unterscheiden.

Das heißt konkret:

* **Kein zweiter Code.** `index.html` bleibt die einzige Quelle. Was du
  deployst, ist sofort in der App — ohne Store-Update.
* **Kostenlos** (außer den 25 $ Kontogebühr).
* **Kein Mac nötig**, alles geht unter Windows oder Linux.

Verpackt wird mit **Bubblewrap** (von Google) oder **PWABuilder** (von
Microsoft, mit Oberfläche). Für dich reicht PWABuilder — Adresse eingeben,
Paket herunterladen.

> Wichtig: Bei **Apple** würde derselbe Weg an Richtlinie 4.2 scheitern
> („repackaged website"). Google ist da ausdrücklich anderer Meinung und
> unterstützt TWA offiziell. Genau deshalb ist „nur Play Store" der richtige
> Zuschnitt.

---

## Was vorher stimmen muss

| Voraussetzung | Stand |
|---|---|
| `manifest.webmanifest` mit Name, Icons, `display: standalone` | ✅ vorhanden |
| Service Worker, App läuft offline | ✅ vorhanden |
| HTTPS | ✅ über Vercel |
| **Lighthouse-Leistungswert über 80** | prüfen |
| **Digital Asset Links** — beweist, dass Seite und App von dir sind | fehlt noch |
| **Icon 512×512 als PNG** | aktuell nur SVG |

### Digital Asset Links

PWABuilder erzeugt dir eine Datei `assetlinks.json`. Die muss unter
`https://endlichkapiert.com/.well-known/assetlinks.json` erreichbar sein.
Bei Vercel: Ordner `public/.well-known/` anlegen und die Datei hineinlegen.

Ohne diese Datei zeigt die App oben eine Browserleiste — dann sieht man sofort,
dass es eine Webseite ist.

### Icon als PNG

Android will ein PNG. Aus `icon.svg` in 512×512 exportieren und im Manifest
zusätzlich eintragen. Ein SVG allein reicht Google nicht.

---

## Die Hürde, die niemand auf dem Zettel hat

Seit November 2023 gilt: **Neue private Entwicklerkonten müssen vor der
Veröffentlichung einen geschlossenen Test mit mindestens 12 Testern über
14 zusammenhängende Tage durchführen.** Erst danach darfst du Produktionszugang
beantragen.

Das heißt für deine Planung:

* Du brauchst **12 echte Menschen mit Google-Konto**, die die App zwei Wochen
  lang installiert haben. Freunde, Familie, Mitschüler, Lehrer.
* Diese zwei Wochen kommen **oben auf** alles andere drauf. Wer im Mai
  veröffentlichen will, muss Ende April mit dem Test anfangen.
* Sammle die 12 Leute früh — das ist erfahrungsgemäß der Teil, der hakt.

Eine Alternative wäre ein **Organisationskonto** (auf eine Firma
angemeldet, mit Nachweis). Das ist von der Testpflicht ausgenommen, verlangt
aber eine eingetragene Organisation.

---

## Reihenfolge

1. **Jetzt:** Erinnerungen scharf schalten (`ERINNERUNGEN.md`). Sie sind der
   eigentliche Grund für eine App — und funktionieren schon als PWA.
2. **Dann:** Nutzer sammeln und schauen, ob sie wiederkommen. Eine App ohne
   Nutzer im Store bringt nichts.
3. **Etwa 2 Monate vorher:** Entwicklerkonto anlegen (25 $), PNG-Icon,
   Asset Links, Lighthouse prüfen.
4. **6 Wochen vorher:** 12 Tester zusammentrommeln, geschlossenen Test starten.
5. **Nach 14 Tagen:** Produktionszugang beantragen, Store-Eintrag ausfüllen
   (Beschreibung, Screenshots, Datenschutzerklärung, Altersfreigabe).
6. **Veröffentlichen.**

### Für den Store-Eintrag brauchst du

* Kurzbeschreibung (80 Zeichen) und ausführliche Beschreibung
* Mindestens 2 Screenshots pro Geräteklasse — die hast du praktisch schon
* Ein Grafikbanner 1024×500
* Link zur **Datenschutzerklärung** — vorhanden unter `/datenschutz`
* **Altersfreigabe**-Fragebogen. Deine App ist für Kinder: dann gelten die
  Regeln für Familien-Apps (keine Werbung an Kinder, klare Datenauskunft).
  Ehrlich ausfüllen — falsche Angaben führen zur Sperre.

---

## Was sich für dich ändert

**Zum Guten:** Auffindbarkeit. Menschen suchen im Play Store nach
„Mathe üben" — auf deine Webseite kommen sie nur über einen Link.

**Zum Schlechten:** Ab dann gibt es zwei Wege, dich zu erreichen, und du musst
beide im Blick behalten. Die App selbst aktualisiert sich zwar mit deiner
Webseite mit (das ist der Vorteil von TWA), aber Bewertungen, Abstürze und
Store-Richtlinien wollen gepflegt werden.

**Nicht vergessen:** Die PWA bleibt bestehen. Der Store ist ein zusätzlicher
Weg, kein Ersatz.
