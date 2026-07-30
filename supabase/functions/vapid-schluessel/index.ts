/* ==========================================================================
   SCHLÜSSEL-GENERATOR — nur einmal gebraucht, danach LÖSCHEN

   Erzeugt das Schlüsselpaar, mit dem die Erinnerungen unterschrieben werden.
   Du legst diese Funktion im Supabase-Dashboard an, rufst sie einmal auf,
   kopierst die zwei Werte aus der Antwort — und löschst sie wieder.

   Warum löschen: Solange sie existiert, könnte jemand, der die Adresse kennt,
   neue Schlüssel erzeugen. Schaden richtet das zwar keinen an (deine echten
   Schlüssel liegen woanders), aber Aufräumen ist besser.
   ========================================================================== */
import * as webpush from "jsr:@negrel/webpush@0.5";

Deno.serve(async () => {
  const paar = await webpush.generateVapidKeys({ extractable: true });

  return new Response(JSON.stringify({
    /* --> kommt als Supabase-Secret VAPID_KEYS (der ganze JSON-Block) */
    VAPID_KEYS: await webpush.exportVapidKeys(paar),
    /* --> kommt in index.html als PUSH_KEY */
    PUSH_KEY: await webpush.exportApplicationServerKey(paar),
    hinweis: "VAPID_KEYS als Secret speichern, PUSH_KEY in index.html eintragen. Danach diese Funktion löschen.",
  }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
});
