# Erinnerungen einrichten

Der Wiederholungsplan ist das Herz der App — aber er wirkt nur, wenn die Leute
zum richtigen Zeitpunkt zurückkommen. Diese Anleitung schaltet die tägliche
Mitteilung frei: *„3 Themen sind heute dran."*

**Der Code ist schon fertig.** Was fehlt, sind fünf Einstellungen, die nur du
machen kannst, weil sie Schlüssel und Zugänge betreffen.

> Solange kein Schlüssel eingetragen ist, bleibt der Bereich in den
> Einstellungen unsichtbar. Es geht also nichts kaputt, wenn du erst später
> dazu kommst.

---

## Schritt 1 — Tabelle für die Geräte anlegen

Supabase → **SQL Editor** → das hier einfügen und ausführen:

```sql
create table if not exists public.push_abos (
  endpunkt     text primary key,
  p256dh       text not null,
  auth         text not null,
  benutzer_id  uuid references auth.users(id) on delete cascade,
  angelegt_am  timestamptz not null default now()
);

alter table public.push_abos enable row level security;

-- Jeder darf sein eigenes Gerät eintragen und wieder abmelden.
create policy "geraet eintragen"  on public.push_abos
  for insert to anon, authenticated with check (true);
create policy "geraet aktualisieren" on public.push_abos
  for update to anon, authenticated using (true) with check (true);
create policy "geraet abmelden"   on public.push_abos
  for delete to anon, authenticated using (true);

create index if not exists push_abos_benutzer on public.push_abos (benutzer_id);
```

## Schritt 2 — Schlüsselpaar erzeugen

Mitteilungen werden signiert, damit niemand in deinem Namen senden kann. Das
Paar heißt **VAPID**. Auf deinem Rechner:

```bash
npx web-push generate-vapid-keys
```

Heraus kommen zwei Zeilen — **Public Key** und **Private Key**. Der private
gehört nirgendwo hin außer zu Supabase.

## Schritt 3 — Öffentlichen Schlüssel in die App

In `index.html` diese eine Zeile ausfüllen:

```js
const PUSH_KEY = "";          /* VAPID-Public-Key hier eintragen */
```

also zum Beispiel:

```js
const PUSH_KEY = "BOEyC9...der lange öffentliche Schlüssel...";
```

Ab jetzt taucht in den Einstellungen der Punkt **„Erinnerungen"** auf.

## Schritt 4 — Funktion hochladen

Der fertige Code liegt in `supabase/functions/erinnerungen/index.ts`.

```bash
npx supabase login
npx supabase link --project-ref DEIN-PROJEKT-KUERZEL
npx supabase secrets set VAPID_PUBLIC_KEY="…" VAPID_PRIVATE_KEY="…" VAPID_MAILTO="mailto:hilfe@endlichkapiert.com"
npx supabase functions deploy erinnerungen
```

Das Projekt-Kürzel steht in deiner Supabase-Adresse: `https://KÜRZEL.supabase.co`.

## Schritt 5 — einmal am Tag aufrufen

Supabase → **SQL Editor**:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- jeden Tag um 16:00 UTC (= 17 Uhr Winterzeit, 18 Uhr Sommerzeit)
select cron.schedule('erinnerungen-taeglich', '0 16 * * *', $$
  select net.http_post(
    url     := 'https://KÜRZEL.supabase.co/functions/v1/erinnerungen',
    headers := '{"Authorization": "Bearer DEIN-SERVICE-ROLE-KEY", "Content-Type": "application/json"}'::jsonb
  );
$$);
```

Den Service-Role-Key findest du unter **Project Settings → API**. Er ist geheim
— er darf nur hier stehen, niemals im Browser-Code.

**Zur Uhrzeit:** Nachmittags ist besser als morgens. Vormittags sind die
Schüler in der Schule und die Mitteilung ist weggewischt, bevor jemand
Gelegenheit zum Üben hat.

---

## Ausprobieren

1. Seite auf dem Handy öffnen, **zum Home-Bildschirm hinzufügen**
2. Einstellungen → **Täglich erinnern** → Nachfrage erlauben
3. Prüfen, ob das Gerät angekommen ist:
   ```sql
   select endpunkt, benutzer_id, angelegt_am from public.push_abos;
   ```
4. Von Hand auslösen, ohne auf den nächsten Tag zu warten:
   ```bash
   curl -X POST https://KÜRZEL.supabase.co/functions/v1/erinnerungen \
        -H "Authorization: Bearer DEIN-SERVICE-ROLE-KEY"
   ```
   Antwort: `{"verschickt":1,"entfernt":0,"nutzer":1}`

Kommt `{"verschickt":0,"hinweis":"niemand hat heute etwas offen"}`, dann
funktioniert alles — es ist nur gerade nichts fällig. Übe ein Thema, setze das
Fälligkeitsdatum testweise zurück und probiere es erneut:

```sql
update public.fortschritt set naechste_wiederholung = now() - interval '1 day'
where user_id = 'DEINE-USER-ID';
```

---

## Was du wissen solltest

**Auf dem iPhone** funktionieren Mitteilungen **nur**, wenn die App vorher auf
den Home-Bildschirm gelegt wurde. Im normalen Safari-Tab geht es nicht — das
ist eine Vorgabe von Apple, kein Fehler. Die App erkennt das und sagt es
freundlich, statt einen Fehler zu zeigen.

**Auf Android** geht es auch ohne Installation, direkt im Chrome.

**Nur wer etwas offen hat, bekommt eine Nachricht.** Das ist bewusst so. Eine
tägliche Mitteilung „du hast nichts zu tun" wäre der schnellste Weg, dass die
Leute sie abschalten.

**Tote Geräte räumt die Funktion selbst weg.** Wenn jemand die App löscht,
antwortet der Push-Dienst mit 404 oder 410 — der Eintrag wird dann gelöscht.

**Datenschutz:** In `push_abos` steht kein Name und keine E-Mail, nur die
Geräteadresse des Push-Dienstes und die Nutzer-ID. Wer die Erinnerung
ausschaltet, dessen Eintrag wird sofort gelöscht. Der Datenschutzerklärung
solltest du trotzdem einen Satz dazu hinzufügen.
