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
- August ist neugierig und liebt Karotte, Molly ist gemütlich und liebt Gurke
- Ruhige Nickerchen, Schlafen im Haus, echte Trinkflasche und ein benutzbarer Weidenball
- Pflegealbum mit elf einmaligen Erinnerungsstickern und einer Blumen-Girlande
- Ball an drei Plätze stellen, Tiere herbeirufen und verständliche Stimmungsanzeigen

## Lokal starten

Das Spiel besteht aus statischem HTML, CSS und JavaScript. `index.html` im Browser öffnen oder diesen Ordner mit einem lokalen Webserver bereitstellen. Kein Build und keine Installation erforderlich.

Die Bilddateien liegen unter `assets/`. Bedürfnisse, Album und Einrichtung werden
ausschließlich im lokalen Browserspeicher auf diesem Gerät gespeichert.

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

## Gemütliche Begleiter

Über 📖 öffnet sich **Mein Gehege**: Persönlichkeit, Stimmung, Sättigung,
Wasserversorgung, Freude und Energie. Die Grundbedürfnisse bleiben sanft begrenzt;
es gibt keinen Tod, keine Strafen, keine täglichen Pflichten und keinen Verfall
während der Abwesenheit. Energie beeinflusst Nickerchen, Vorlieben geben beim
vollständigen Auffressen einen kleinen Freudebonus. Alle Futtersorten und Spiele
bleiben von Anfang an frei zugänglich.

Der Weidenball und die Trinkflasche im Gehege sind antippbar. Die Tiere gehen hin
und beschäftigen sich damit; wiederholte Eingaben erzeugen keine parallelen
Aktionen für dasselbe Tier. Dösen, Spielen und Trinken lassen sich durch andere
Aktionen abbrechen und werden mit dem gesamten Spiel pausiert. Zufällige
Alltagsaktionen beachten laufende Fütterungen, Bewegungsaufträge und Minispiele.
Das Haus, die Tierbilder und die bestehenden Sprite-Animationen bleiben erhalten.

`companions.js` ergänzt die vorhandene Architektur um unabhängige Aktivitäten,
Persönlichkeiten, Album, UI und versioniertes Speichern. Nur bekannte, begrenzte
Werte werden geladen; Bewegungen, Timer und offene Menüs werden nicht gespeichert.
Beschädigte Daten führen zu sicheren Standardwerten, gesperrter Speicher verhindert
das Spielen nicht. Die App zeigt dann einen Hinweis im Album. Löschen der
Browserdaten entfernt den Spielstand. Es gibt keine Cloud-Synchronisierung.

Eine vollständig heruntergeladene neue Version wird im 📖 mit **Neue Version
laden** angeboten. Erst nach Antippen wird gespeichert, pausiert und neu geladen.
Alternativ alle Spiel-Tabs schließen und wieder öffnen. Ein noch alter Stand ohne
diesen Knopf muss zunächst online geöffnet werden, um das Update herunterzuladen.

## Eine kleine lebendige Welt

`world.js` ergänzt Vorräte und soziale Aktivitäten im bestehenden Spieltakt:

- Durst führt zur Trinköffnung. Die Tiere trinken nacheinander; ihre Versorgung
  steigt Schluck für Schluck, während der sichtbare Flascheninhalt sinkt. 💧 füllt
  nur die Flasche auf, nicht mehr auf magische Weise die Bedürfnisse.
- Hunger führt zu einer sichtbaren Portion aus der Heuraufe. Vorrat wird für
  angefangene Portionen reserviert und pro Biss verbraucht. Ein Abbruch gibt den
  unbenutzten Teil wieder frei. Im 📖 lässt sich Heu nachfüllen.
- Müde Tiere gehen in das bestehende Haus, schlafen mit Traumzeichen am eigenen
  Lieblingsfenster, gewinnen Energie, schauen heraus und verlassen das Haus.
  Das freie Dösen und der bisherige Hausbesuch bleiben zusätzlich verfügbar.
- Tiere begrüßen sich, folgen einander bei gemeinsamen Erkundungen, flitzen
  gelegentlich und untersuchen versetztes Spielzeug. Ein Eingriff des Spielers
  löst die gemeinsame Aktion sauber auf, ohne den Partner zu blockieren.
- Langsam entstehen höchstens sechs kleine Köttel-Häufchen. Antippen entfernt
  einzelne; **Frische Einstreu** reinigt zusammen. Reinigung hebt die Freude,
  ohne Strafsystem oder fortlaufende Pflicht. Drei Farbvarianten und zwei
  Tunnelplätze gestalten das vorhandene Gehege, nicht eine neue Karte.
- Ein Spieltag beginnt bei der lokalen Tageszeit und dauert etwa zwölf aktive
  Spielminuten. Sanfte Lichtstimmung und Ruhe-Wahrscheinlichkeiten ändern sich;
  die Zeit steht während Pause/Abwesenheit still. Kein biologisch exaktes Modell.
- Über ⚽ → 🐹 können weitere Jungtiere ohne Sticker- oder Ein-Tier-Sperre
  adoptiert werden. Je sechs Freunde teilen sich eine umblätterbare Wiesenseite;
  alle bleiben gespeichert. Ihre Versorgung gehört zur Familie; keine Fortpflanzung.

Der Spieltunnel steht am Gehegerand. Antippen schickt die gewählten Tiere zur
Öffnung und startet **Tunnelpfade**. Bei beiden ausgewählten Tieren laufen beide
zusammen durch die Räume. Selbstständiges Erkunden öffnet kein Minispiel.
`tunnel-game.js` erzeugt verbundene 5×5-Labyrinthe mit garantiert erreichbarem
Picknickziel. Zwei passende Schlüssel öffnen die Türen A und B. Drei Zutaten
liegen bevorzugt in Sackgassen und Seitengängen. Erst mit beiden Schlüsseln und
allen Zutaten ist das Picknick am Ziel vollständig. Ein optionaler Tipp markiert
genau einen hilfreichen Nachbarraum, ohne die Tiere automatisch zu bewegen.
Offene Nachbarräume antippen, zurückgehen oder neu spielen – ohne
Zeitdruck. Der vorhandene Hüpfparcours hat jetzt deutlich niedrigere Sprünge.

Spielstand-Schema 3 übernimmt Schema-1-/2-Spielstände einschließlich Fips.
Gespeichert werden Vorräte, Schmutz, Spielzeit, Einrichtung und die Familie;
nie aktive Aktionen oder Callback-Funktionen. Gerätespeicher kann weiterhin
gesperrt sein, ohne das Spiel zu verhindern. Sämtliche Sounds werden lokal
synthetisiert und sind standardmäßig aus; keine Audio-Downloads oder SDKs.

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


### Labyrinth-Update
Die Trinkflasche steht ganz rechts. Beide Tiere erreichen die Öffnung von links,
trinken nacheinander und zeigen ruhige Nickbewegungen; kleine Blasen steigen auf.
Der Tunnel bleibt auch beim Umstellen an einem Randplatz. Jeder neue Start und
jede Wiederholung erhält einen anderen Lösungsweg. Nach zwölf erfolglosen
Zufallsversuchen sorgt ein begrenzter Ersatzgenerator für einen anderen Weg.

Direkter aktualisierter Start: `index.html?v=playball-family-v6`. HTML, CSS und Skripte
verwenden dieselbe Versionskennung, damit ältere Offline-Worker beim Öffnen
dieses Links keine veralteten Skripte dazumischen. Spielstände werden erhalten.

### Spielball und wachsende Familie
Der ⚽ unten rechts und der Weidenball öffnen dasselbe Bildermenü: Spiele,
Futter, Kuscheln, Zuhause, Familie und Extras. Große Bildbuttons haben ergänzende
Kurztexte und Screenreader-Namen. Alle Buchaktionen sind hier erreichbar;
die vier bisherigen Pflegeknöpfe wurden für mehr Platz in das Menü integriert.

Neu: Gemüse-Memory mit drei Paaren, Gemüse-Fangen mit wechselnden Suchbildern
und das Wiesen-Orchester mit vorgemachten, nachspielbaren Bildfolgen. Fehler
kosten keine Leben. Alle Abläufe verwenden die vorhandene pausierbare Spieluhr.

Babys wachsen nach acht aktiven Spielminuten oder durch den Bildbutton mit
kleinem und großem Tier. Erwachsene Familienfreunde erkunden eigenständiger,
Jungtiere folgen und imitieren. Polonaise und gelegentliche Quatschmomente
ergänzen das Gehege. Es gibt kein künstliches Adoptionslimit; die Kapazität des
Gerätespeichers bleibt die praktische Grenze. Nur sechs zusätzliche Tiere
werden gleichzeitig animiert, auch bei einer großen gespeicherten Familie.
