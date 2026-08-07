# Die Aufgaben prüfen

Die Übungen in `index.html` gehen an Kinder. Ein falsch markiertes Beispiel
lernen sie falsch. Deshalb gibt es fünf Prüfer, die vor jeder Änderung laufen
sollten:

```bash
npm run pruefen
```

Das ruft sie nacheinander auf. Sie brauchen nur Node, keine Installation.

---

## 0. `pruefe-seite.js` — hängt die Seite zusammen?

Die anderen schauen auf die Inhalte, dieser auf das Gerüst — ganz ohne
Browser und Zusatzpakete:

* **Adressen:** Jede verlinkte Adresse muss die App beim Neuladen auch wieder
  erkennen. Sonst landet man auf der Startseite statt beim Thema.
* **Knöpfe:** Jede Funktion, die ein `onclick` aufruft, muss es auch geben.
* **Doppelte Themen:** Steht ein Themenname zweimal in `AUFGABEN`, überschreibt
  der zweite den ersten *stillschweigend*. Genau danach wird gesucht.
* **Tippfehler:** Jedes Thema in `AUFGABEN` muss im Klassenplan (`KATALOG`)
  stehen — sonst ist die Aufgabe für niemanden erreichbar.
* **Symbole, Dateien, JSON:** Wird ein Symbol benutzt, das es nicht gibt? Fehlt
  `icon.svg`, `manifest.webmanifest` oder `sw.js`? Ist die Vercel-Umschreibung
  noch da (ohne sie liefern Direktlinks wie `/mathe/8` einen 404)?
* **Grundgerüst:** Titel, Viewport, `lang="de"`, Theme-Farbe, `#screen`.

Am Ende steht ein Hinweis, welche geplanten Themen noch keine Aufgaben haben.

## 1. `pruefe-aufbau.js` — ist die Aufgabe überhaupt lösbar?

Zieht **jede** Aufgabe 3000-mal (die Zahlen werden ja jedes Mal neu gewürfelt)
und prüft bei jedem einzelnen Schritt:

* Gibt es **genau eine** richtige Antwort? Keine wäre unlösbar, zwei unfair.
* Stehen zwei Antwortmöglichkeiten **wortgleich** da?
* Fehlt irgendwo die Rückmeldung, der Aufgabentext oder die Lösung?
* Stürzt der Erzeuger ab?
* Hat jedes Thema mit Aufgaben auch eine vollständige Erklärung?

Warum 3000-mal: Ein Fehler zeigt sich oft nur bei einer bestimmten
Zufallskombination. So wurde zum Beispiel gefunden, dass bei den quadratischen
Gleichungen `p = 0` herauskommen konnte — dann hieß die richtige Antwort „0“
und eine falsche auch, und am Ende blieb nur noch **eine** Antwortmöglichkeit
übrig. Beim Handtesten fällt so etwas nie auf.

## 2. `pruefe-inhalt.js` — stimmt die Antwort auch sachlich?

Der Aufbau-Prüfer zählt nur. Dieser hier **rechnet unabhängig gegen**.

**Mathe** — die Lösung wird ein zweites Mal auf einem anderen Weg bestimmt:

* Terme und binomische Formeln: Aufgabe **und** Lösung werden für
  x = −3,5 · −1 · 0 · 1 · 2 · 4,5 · 7 ausgerechnet. Weichen sie an einer Stelle
  ab, ist die Umformung falsch. (Stimmen zwei Terme an mehr Stellen überein,
  als ihr Grad hoch ist, sind sie beweisbar gleich.)
* Quadratische Gleichungen: die behaupteten Lösungen werden **eingesetzt** —
  es muss 0 herauskommen.
* Pythagoras: a² + b² = c² wird nachgerechnet, und die Hypotenuse muss die
  längste Seite sein.
* Trigonometrie: gegen `Math.sin()` geprüft.
* Exponentielles Wachstum: Endwert neu berechnet; bei Abnahme *muss* der Wert
  kleiner werden.

**Deutsch** — der Prüfer hält seine **eigenen** Regeln und schaut, ob die
Aufgabe dazu passt:

* Konjunktiv: er bildet die Form selbst (Grundform ohne `-en`, plus `-e`) und
  vergleicht. Außerdem muss sie sich von der normalen Form unterscheiden,
  sonst ist die Aufgabe sinnlos.
* Satzreihe/Satzgefüge: eigene Bindewortliste **und** Gegenprobe über die
  Verbstellung — zwei unabhängige Wege müssen zum selben Ergebnis kommen.
* Stilmittel: „Vergleich“ ⟺ das Wort „wie“ steht im Satz. Alliteration ⟺
  mindestens drei gleiche Anfangslaute.
* Satzglieder: der gefragte Teil muss wörtlich im Satz vorkommen, und die
  Frage muss zum Fall passen (Dativobjekt ⟺ „Wem?“).

Inzwischen werden **alle 40 Themen** inhaltlich nachgerechnet — auch die
Klassen 5 bis 7: Runden und Stellenwerte, Punkt-vor-Strich, Einheiten, Umfang
und Fläche, Symmetrieachsen, Bruch- und Dezimalrechnung, Teilbarkeit,
Dreisatz, Winkelarten, Gleichungen und Prozentrechnung. Bei Deutsch kamen
Nebensatz-Kommas, Nominalisierung, Wortarten, Reimschemata und rhetorische
Mittel dazu.

Der Reimvergleich rechnet dabei mit dem **Klang**, nicht mit der Schreibweise:
„stehn“ reimt auf „schön“, „hin“ auf „Sinn“. Dafür werden Umlaute, Dehnungs-h
und Doppelbuchstaben vorher vereinheitlicht.

## 3. `pruefe-formeln.js` — ist die Formel richtig umgestellt?

Die Formelsammlung unter `/formeln` gibt jede Formel nach allen Größen
umgestellt aus. Eine falsch umgestellte Formel ist dort schlimmer als gar
keine: Sie wird geglaubt, und der Fehler fällt erst in der Prüfung auf.

Von Hand ist das nicht zu kontrollieren — es sind über 300 Gleichungen.
Deshalb steht keine Formel als Text in der App, sondern als Rechenausdruck.
Daraus wird beides gemacht: das gesetzte Bild mit echtem Bruchstrich und der
Zahlenwert. Der Prüfer nutzt genau denselben Rechenkern wie die App, aus der
`index.html` herausgeschnitten — eine zweite Fassung hier würde irgendwann
abweichen, und dann prüfte der Prüfer sich selbst.

Je Formel 200-mal:

* Zufallszahlen für alle Größen einsetzen, die Grundformel ausrechnen
* jede Umstellung gegenrechnen: Kommt links dasselbe heraus wie rechts?
* Identitäten wie die binomischen Formeln: beide Seiten vergleichen

Dazu kommt die Buchführung: Jedes Formelzeichen im Ausdruck muss in der
Größenliste stehen und umgekehrt, jede Größe braucht ein Wort dazu, kein Name
darf doppelt vorkommen, und das Beispiel muss aufgehen.

## 4. `pruefe-quellen.js` — ist die Faktenbehauptung belegt?

Manche Aufgaben behaupten Dinge, die man nicht herleiten kann: dass
„Marschall“ früher Pferdeknecht hieß, dass „bios“ Leben bedeutet, dass
Eichendorff zur Romantik gehört. Solche Fakten brauchen einen Beleg.

Alle stehen deshalb in **`quellen.json`** — jeder mit Quelle, Link und
Prüfdatum. Verwendet werden vor allem das
[DWDS](https://www.dwds.de/) (Berlin-Brandenburgische Akademie der
Wissenschaften), universitäres Lehrmaterial und Wikipedia.

Das Skript vergleicht jede Aufgabe damit:

* weicht eine Aufgabe vom Beleg ab → **Fehler**
* behauptet eine Aufgabe etwas, das gar nicht im Verzeichnis steht →
  **Fehler („unbelegt“)**

Damit kann niemand ein Wissens-Thema erweitern, ohne die Quelle
dazuzuschreiben. Wer ein neues Wort ergänzt, trägt es in `quellen.json` ein —
sonst schlägt die Prüfung fehl.

---

## Wenn du ein Thema ergänzt

1. Aufgabe in `index.html` schreiben (Muster: die bestehenden Themen).
2. Erklärung in `ERKLAERUNGEN` ergänzen — der Aufbau-Prüfer besteht darauf.
3. Wenn es um Fakten geht: Eintrag in `quellen.json` mit Quelle.
4. `npm run pruefen` — muss vollständig sauber durchlaufen.

## Warum die Prüfer selbst getestet sind

Ein Prüfer, der nie anschlägt, ist wertlos. Jede Prüfung wurde deshalb
gegengetestet, indem absichtlich ein Fehler eingebaut und geschaut wurde, ob er
gefunden wird — ein verfälschter Fakt, ein falsch benanntes Stilmittel, eine
erfundene Adresse, ein doppelt vergebener Themenname. Alle wurden gefunden.

Beim Formelprüfer waren es fünf: das ohmsche Gesetz falsch umgestellt
(R = U · I statt U / I), im Spannungsteiler der Widerstand vertauscht, beim
Pythagoras ein Plus statt eines Minus, die 9550 der Drehmomentformel zu 9950
verrutscht und eine Größe aus der Liste gestrichen. Jeder einzelne wurde
gemeldet.
