# Erinnerungen einrichten

Damit die App einmal am Tag melden darf: *„3 Themen sind heute dran."*

**Der Code ist fertig.** Was fehlt, sind fünf Einstellungen, die nur du machen
kannst, weil sie geheime Schlüssel betreffen. Alles geht **im Browser** — du
brauchst kein Terminal und musst nichts installieren.

Rechne mit etwa **30 Minuten**.

> Solange kein Schlüssel eingetragen ist, bleibt der Punkt „Erinnerungen" in
> den Einstellungen unsichtbar. Es geht also nichts kaputt, wenn du mittendrin
> aufhörst und später weitermachst.

---

## Schritt 1 — Tabelle anlegen (2 Minuten)

Supabase öffnen → linke Leiste **SQL Editor** → **New query** → das hier
hineinkopieren → **Run**:

```sql
create table if not exists public.push_abos (
  endpunkt     text primary key,
  p256dh       text not null,
  auth         text not null,
  benutzer_id  uuid references auth.users(id) on delete cascade,
  angelegt_am  timestamptz not null default now()
);

alter table public.push_abos enable row level security;

create policy "geraet eintragen"     on public.push_abos
  for insert to anon, authenticated with check (true);
create policy "geraet aktualisieren" on public.push_abos
  for update to anon, authenticated using (true) with check (true);
create policy "geraet abmelden"      on public.push_abos
  for delete to anon, authenticated using (true);

create index if not exists push_abos_benutzer on public.push_abos (benutzer_id);
```

Unten muss **Success. No rows returned** stehen. Fertig.

---

## Schritt 2 — Schlüssel erzeugen (5 Minuten)

Mitteilungen werden unterschrieben, damit niemand in deinem Namen senden kann.
Dafür brauchst du ein Schlüsselpaar.

1. Supabase → linke Leiste **Edge Functions** → **Deploy a new function** →
   **Via Editor**
2. Name: `vapid-schluessel`
3. Den gesamten Inhalt von
   `supabase/functions/vapid-schluessel/index.ts` (aus diesem Projekt)
   in das Feld kopieren — den vorhandenen Beispielcode vorher löschen
4. **Deploy function**
5. Oben rechts auf die Funktion klicken → es gibt einen Test-Knopf
   (**Test** / **Invoke**) → einmal ausführen

In der Antwort stehen zwei Dinge:

```json
{
  "VAPID_KEYS": { "publicKey": { … }, "privateKey": { … } },
  "PUSH_KEY": "BEl62iUYgUivxIkv69yViEuiB…"
}
```

**Beides in einen Texteditor kopieren und offen lassen** — du brauchst gleich
beides.

> ⚠️ Der `privateKey` ist geheim. Nicht in GitHub, nicht in die index.html,
> nicht per Mail verschicken. Er gehört nur in Schritt 4.

---

## Schritt 3 — den öffentlichen Teil in die App (2 Minuten)

In `index.html` gibt es diese eine Zeile (Strg+F nach `PUSH_KEY` suchen):

```js
const PUSH_KEY = "";          /* VAPID-Public-Key hier eintragen */
```

Dort den Wert von **`PUSH_KEY`** aus Schritt 2 einsetzen:

```js
const PUSH_KEY = "BEl62iUYgUivxIkv69yViEuiB…";
```

Speichern, committen, pushen. Sobald Vercel deployt hat, taucht in den
Einstellungen der Punkt **„Erinnerungen"** auf.

---

## Schritt 4 — die Sende-Funktion (10 Minuten)

Zuerst das Geheimnis hinterlegen:

1. Supabase → **Edge Functions** → **Secrets** (oder Project Settings →
   Edge Functions → Secrets)
2. Neues Secret:
   * Name: `VAPID_KEYS`
   * Wert: der **komplette** `VAPID_KEYS`-Block aus Schritt 2, also
     `{"publicKey":{…},"privateKey":{…}}` — mit den geschweiften Klammern
3. Noch eins:
   * Name: `VAPID_MAILTO`
   * Wert: `mailto:hilfe@endlichkapiert.com`

Dann die Funktion selbst:

4. **Edge Functions** → **Deploy a new function** → **Via Editor**
5. Name: **`erinnerungen`** (genau so geschrieben)
6. Inhalt von `supabase/functions/erinnerungen/index.ts` hineinkopieren
7. **Deploy function**

---

## Schritt 5 — einmal am Tag aufrufen (5 Minuten)

Zurück in den **SQL Editor**. Vorher zwei Dinge heraussuchen:

* **Projekt-Kürzel** — steht in deiner Supabase-Adresse:
  `https://KÜRZEL.supabase.co`
* **Service-Role-Key** — Project Settings → **API** → `service_role`.
  Der ist geheim und darf nirgendwo im Browser-Code stehen.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- jeden Tag um 16:00 UTC (17 Uhr Winterzeit, 18 Uhr Sommerzeit)
select cron.schedule('erinnerungen-taeglich', '0 16 * * *', $$
  select net.http_post(
    url     := 'https://KÜRZEL.supabase.co/functions/v1/erinnerungen',
    headers := '{"Authorization": "Bearer DEIN-SERVICE-ROLE-KEY", "Content-Type": "application/json"}'::jsonb
  );
$$);
```

**Zur Uhrzeit:** Nachmittags ist besser als morgens. Vormittags sitzen deine
Nutzer in der Schule und wischen die Mitteilung weg, bevor sie überhaupt üben
könnten.

---

## Schritt 6 — aufräumen

Die Funktion **`vapid-schluessel`** aus Schritt 2 jetzt löschen:
Edge Functions → die Funktion anklicken → **Delete function**.

Sie wird nicht mehr gebraucht.

---

## Ausprobieren

1. Seite auf dem Handy öffnen → **zum Home-Bildschirm hinzufügen**
2. App starten → Einstellungen → **Täglich erinnern** → Nachfrage erlauben
3. Prüfen, ob das Gerät angekommen ist — SQL Editor:
   ```sql
   select endpunkt, benutzer_id, angelegt_am from public.push_abos;
   ```
   Da muss jetzt eine Zeile stehen.
4. Nicht auf morgen warten, sondern von Hand auslösen: Edge Functions →
   `erinnerungen` → **Test / Invoke**.

Die Antwort sagt dir, was passiert ist:

| Antwort | Bedeutung |
|---|---|
| `{"verschickt":1,…}` | Alles läuft, die Mitteilung ist unterwegs |
| `{"verschickt":0,"hinweis":"niemand hat heute etwas offen"}` | Funktioniert — es ist nur gerade nichts fällig |
| `nicht erlaubt` (401) | Der Aufruf kam ohne den Service-Role-Key |

Beim mittleren Fall: ein Thema üben und das Fälligkeitsdatum zurücksetzen,
dann noch mal testen.

```sql
update public.fortschritt
set naechste_wiederholung = now() - interval '1 day'
where user_id = 'DEINE-USER-ID';
```

---

## Was du wissen solltest

**Auf dem iPhone** gehen Mitteilungen **nur**, wenn die App vorher auf den
Home-Bildschirm gelegt wurde. Im normalen Safari-Tab nicht — das ist eine
Vorgabe von Apple, kein Fehler. Die App erkennt das und erklärt es freundlich.

**Auf Android** geht es auch ohne Installation, direkt im Chrome.

**Nur wer etwas offen hat, bekommt eine Nachricht.** Das ist bewusst so. Eine
tägliche Meldung „du hast nichts zu tun" wäre der schnellste Weg, dass die
Leute Erinnerungen abschalten — und dann ist der Kanal für immer zu.

**Tote Geräte räumt die Funktion selbst weg.** Löscht jemand die App, meldet
der Push-Dienst das zurück und der Eintrag verschwindet.

**Datenschutz:** In `push_abos` steht kein Name und keine E-Mail — nur die
Geräteadresse des Push-Dienstes und die Nutzer-ID. Wer die Erinnerung
ausschaltet, dessen Eintrag wird sofort gelöscht. Ergänze trotzdem einen Satz
dazu in deiner Datenschutzerklärung.

---

## Wenn du steckenbleibst

Sag mir, **bei welchem Schritt** und **was genau dasteht** — dann schaue ich
mir das an. Die häufigsten Stolpersteine:

* **`VAPID_KEYS` falsch eingefügt** — es muss der ganze Block mit
  `{"publicKey":…,"privateKey":…}` sein, nicht nur ein Teil davon.
* **Funktion heißt anders** — sie muss exakt `erinnerungen` heißen, sonst
  zeigt der Cron-Aufruf ins Leere.
* **Kein Gerät in `push_abos`** — dann hat Schritt 3 nicht geklappt oder der
  Browser hat die Nachfrage blockiert. Auf dem iPhone: App wirklich vom
  Home-Bildschirm aus gestartet?
