# August & Molly 🐹

Ein Meerschweinchen-Spiel für Kinder – mit August und Molly, Füttern, Wasser, Häuschenbesuchen, natürlichen Animationen und Minispielen.

## Spielen

[August & Molly ohne Anmeldung spielen](https://domistone.github.io/August-und-Molly-/)

## Funktionen

- Große Bildknöpfe: Spielen ohne Lesen
- Gemüse und Heu füttern, Wasser auffüllen und streicheln
- Herumlaufen, Schnuppern, Ohrenkratzen und aus dem Hausfenster schauen
- Hüpfspiel, Tanzspiel mit Popowackeln und Gemüse-Suche
- Sterne sammeln ohne Zeitdruck; Pausen- und Tonknopf

## Lokal starten

Das Spiel besteht aus statischem HTML, CSS und JavaScript. `index.html` im Browser öffnen oder diesen Ordner mit einem lokalen Webserver bereitstellen. Kein Build und keine Installation erforderlich.

Die Bilddateien liegen unter `assets/`. Der Spielstand wird nicht dauerhaft gespeichert.

## Füttern

Karotte, Gurke, Paprika, Salat und Heu werden als eigene Objekte im Gehege
abgelegt. Jedes ausgewählte Tier bekommt seinen eigenen Platz und seine eigene
Portion. Nach dem Hinlaufen folgen sechs bis acht ruhige Bisse. Der Bissrand
wandert durch das Futter; die Größe des ganzen Objekts bleibt unverändert.
Bei Heu verschwinden einzelne Halme. Hunger und Freude ändern sich erst nach
dem letzten Biss. Weitere Futtertipps während einer laufenden Portion werden
für dieses Tier ignoriert. Bewegung und Pflege können eine Portion abbrechen.

`feeding.js` verwaltet die Abläufe; `food-view.js` zeichnet das Futter und seine
Bissstufen. Bewegung, Fressen, Effekte und Bedürfnisse verwenden gemeinsam die
pausierbare Spielzeit aus `movement.js`, ohne separate Futter-Timer.

## Offline und Datenschutz

Keine Werbung, Analytics, Konten oder Drittanbieter-SDKs. Kamera, Mikrofon und
Standort werden nicht verwendet. Alle Spielressourcen liegen in diesem
Repository. Nach einem vollständigen ersten Besuch über HTTPS speichert der
Service Worker die Spieldateien lokal, sofern der Browser dies erlaubt. Danach
kann das Spiel auch ohne Verbindung neu geladen werden. Ein erster Besuch
benötigt Internet; gelöschte Browserdaten entfernen auch den Offline-Cache.
Ein heruntergeladener Ordner funktioniert über `index.html` ohne Server.

## Tests

Nur zur Entwicklung werden Node.js und Playwright benötigt; im Spiel selbst
werden keine npm-Pakete geladen.

```sh
npm ci
npx playwright install --with-deps chromium
npm test
npm run test:browser
```

Die GitHub-Aktion `Game regression and browser tests` führt beide Tests auf
Branches und Pull Requests aus. Browserbilder und das Ergebnisprotokoll liegen
im jeweiligen Lauf unter `browser-test-results`. Getestete Bildschirmgrößen:
1024×600, 600×1024, 800×480 und 360×640. Dies ersetzt keinen Test auf einem
physischen Fire-Tablet.
