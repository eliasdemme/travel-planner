# Setup (ca. 10 Minuten)

## 1. Google Sheet + Apps Script (in eliasdemme@gmail.com)
1. In Google Drive ein **leeres Google Sheet** anlegen, z. B. „Trip India Sri Lanka“.
2. Menü **Erweiterungen → Apps Script** öffnen. Den Inhalt von `apps-script/Code.gs` komplett hineinkopieren und den vorhandenen Code ersetzen.
3. Speichern (💾). Dann links **Projekteinstellungen (Zahnrad) → Script-Eigenschaften → Eigenschaft hinzufügen**: Name `PIN`, Wert euer PIN. Der PIN steht so nicht im Code.
4. Oben die Funktion **setup** auswählen und **Ausführen** klicken.
   - Google fragt nach Berechtigungen: **Zugriff erlauben**.
   - Falls die Warnung „Google hat diese App nicht überprüft“ erscheint: **Erweitert → Zu … wechseln**. Das ist normal, weil es euer eigenes Script ist.
   - Danach hat das Sheet die Tabs Days, Items, Places und Settings, inklusive Dropdowns.
5. Rechts oben **Bereitstellen → Neue Bereitstellung → Zahnrad → Web-App** wählen:
   - Ausführen als: **Ich**
   - Zugriff: **Jeder** (nötig, damit die App ohne Google-Login lesen kann; der PIN schützt die Daten)
   - **Bereitstellen** klicken und die **Web-App-URL** kopieren. Sie endet auf `/exec`.
6. Das Sheet mit Sunny teilen (Bearbeiter). Damit Claude Updates direkt ins Sheet schreiben kann, zusätzlich mit dem Google-Konto teilen, das in Claude verbunden ist.

> **Login & Sperre:** Den PIN braucht jedes Gerät nur einmal. Danach bekommt es einen langen Geräteschlüssel (Script-Eigenschaft `TOKEN`) und nutzt nur noch diesen. Nach 5 falschen PINs pausiert die PIN-Eingabe 2 Minuten (`LOCK_SECONDS` in Code.gs), bereits eingeloggte Geräte laden aber weiter. Handy verloren? Eigenschaft `TOKEN` löschen, dann müssen alle Geräte den PIN neu eingeben. PIN-Eingabe sofort wieder freigeben: im Editor `resetLock` ausführen.

> Wenn du später den Script-Code änderst: **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version: Neue Version**. Die URL bleibt dabei gleich.

## 2. App mit dem Sheet verbinden
Die URL in `config.js` bei `API_URL: ''` einfügen, committen und pushen. Oder gib Claude einfach die URL.

## 3. Auf dem iPhone installieren (beide)
1. In **Safari** `https://eliasdemme.github.io/travel-planner/` öffnen.
2. Teilen-Symbol → **Zum Home-Bildschirm**.
3. Die App vom Homescreen starten und einmal den PIN eingeben. Danach ist das Gerät dauerhaft eingeloggt, auch offline.
4. Vor dem Abflug einmal mit Netz öffnen. Danach funktioniert sie auch offline mit dem zuletzt geladenen Stand.

Tipp: Ladet in der **Google-Maps-App** die Regionen offline herunter (Profil → Offlinekarten). Die Route-Buttons öffnen Google Maps.

## Updates per KI
Sag Claude zum Beispiel: „Update the travel sheet per SCHEMA.md: Hotel in Kandy gebucht, Ref XY12, 95 EUR, Sunny hat bezahlt.“
