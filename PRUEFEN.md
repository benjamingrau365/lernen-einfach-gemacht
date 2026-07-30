# Die Aufgaben prüfen

Die Übungen in `index.html` gehen an Kinder. Ein falsch markiertes Beispiel
lernen sie falsch. Deshalb gibt es drei Prüfer, die vor jeder Änderung laufen
sollten:

```bash
npm run pruefen
```

Das ruft nacheinander alle drei auf. Sie brauchen nur Node, keine Installation.

---

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

Themen, für die es keine prüfbare Regel gibt, **nennt das Skript beim Namen**
und sagt dazu, warum es sie nicht prüfen kann. Es tut also nicht so, als wäre
alles abgedeckt.

## 3. `pruefe-quellen.js` — ist die Faktenbehauptung belegt?

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
4. `npm run pruefen` — muss dreimal sauber durchlaufen.
