# Reparatur und Prüfumfang

Ausgangsstand: `68a48948d431ceaaa746f2ac0671582c0152f5fa`.

## Bestätigte Ursachen

- `game.js` rief `.forEach` auf dem einzelnen Ergebnis von `querySelector`
  auf. Der Browser meldete `TypeError: $(...).forEach is not a function`.
  Der Abbruch verhinderte die nachfolgenden Ereignisbindungen für Pflege,
  Wasser, Pause und Sound. Der letzte Commit mit dem Titel „Fix food button
  event binding“ hatte denselben Dateibaum wie sein Vorgänger und behob ihn nicht.
- Futterportionen und `setInterval`-Timer gehörten zu keiner abbrechbaren
  Tieraktion. Ein neues Bewegungsziel konnte den Ankunfts-Callback ersetzen und
  Futter zurücklassen. Hunger und Freude wurden bereits beim Fressbeginn erhöht.
- Pause und Effekte benutzten verschiedene Uhren; verzögerte Suchspiel-Effekte
  konnten in einen neuen Ablauf hineinwirken.
- Zwei Escape-Handler konnten nach dem Fortsetzen gleichzeitig das Minispiel
  beenden. Tiere konnten nach Tanzanimationen im laufenden Minispiel loslaufen.
- Am Rand konnten gemeinsame Bewegungsziele auf denselben Grenzwert geklemmt
  werden. Gemeinsame Ziele werden jetzt vor dem Versetzen begrenzt.
- Die Sichtprüfung der neuen Fütterung fand einen Versatz bei Mollys Spiegelung:
  Der Transformationsursprung muss für das Spiegeln in der Bildmitte bleiben.
  Ein zusätzlicher Browsertest misst nun den Abstand von Maul und Bisskante.

## Reproduzierbare Prüfungen

`npm test`: deterministische Zustandsprüfung für alle 15 Futter-/Tierkombinationen,
Mehrfachtippen, keine doppelten Portionen, unabhängige Tieraktionen, Pause,
Abbruch, vollständiges Aufräumen, Hauszustände und alle drei Minispiele.

`npm run test:browser`: echter Chromium-Browser mit DOM-Ereignissen und
kontrollierter Browserzeit. Prüft Auswahl, Antippen, Haus/Beide Fenster,
Kratzen, Streicheln, Hüpfen, Wasser, Sound, Menüs, die 15 Fütterungskombinationen,
Bissfortschritt bei konstanter Objektgröße, Pause, Abbruch, schnelle Eingaben,
Such-/Hüpf-/Tanzspiel, Wiederholung, Escape, Bildschirmgrößen und Offline-Reload.
JavaScript-, Promise-, Konsolen- und HTTP-Fehler sowie Fremdanfragen führen zum
Fehlschlag. Screenshots werden als GitHub-Actions-Artefakt gespeichert.

## Grenzen

Die Tablet-Prüfungen emulieren Bildschirmgrößen und Touch-Fähigkeit in Chromium.
Ein physisches Android-/Fire-Gerät steht in dieser Umgebung nicht zur Verfügung.
Die vorhandenen Tierbilder werden weiterverwendet: sanfte Knabberbewegungen
bewegen das Bild, sie sind kein neues anatomisch animiertes Kiefermodell.
Offline-Verfügbarkeit setzt einen erfolgreichen ersten Cache-Aufbau voraus.

## Gemütliche Begleiter (Weiterentwicklung)

Die vorhandene Architektur und alle Tier-/Hintergrundassets bleiben erhalten.
Die Analyse zeigte fehlende dauerhafte Spielstände, sehr ähnliche zyklische
Idle-Aktionen und unbeschriftete Bedürfnisse. Ergänzt wurden eigene Vorlieben,
sanfte Energie, Nickerchen, Trink- und Ballaktionen, ein lesbares Statusmenü,
ein einmaliges Stickeralbum und optionale Girlandendekoration. Keine weiteren
bestrafenden Bedürfnisse oder künstlichen Futter-Freischaltungen.

Zusätzlich behoben: natürliche Aktionen durften zuvor einen noch laufenden
Ankunfts-Callback ersetzen. Jetzt haben explizite Bewegungsaufträge Vorrang.
Begleiter-Aktivitäten besitzen wie Fütterungen genau einen abbrechbaren Ablauf
pro Tier. Größe/Orientierung der bestehenden Fotos bleibt erhalten.

Erweiterte Tests:

- Alle bisherigen Regressionen einschließlich 15 Futter-/Tierkombinationen.
- Dösen/Energie, Pause, Ball/Trinken, Wiederholung und Abbruch durch andere Aktionen.
- Vorlieben, individuelle Profile, einmalige Sticker und dekorative Belohnung.
- Herbeirufen, Ball umstellen, Album in allen vier Bildschirmgrößen.
- Speichern/Laden, ungültige Werte, beschädigtes JSON und nicht verfügbarer Speicher.
- Offline-Neustart ohne wiederbelebte Aktivitäten oder Abwesenheits-Strafe.

Nickerchen nutzt die vorhandenen Tierfotos mit ruhiger Körperbewegung und
Schlafzeichen; es gibt keine neu gezeichneten geschlossenen Augen oder getrennten
Kiefer. Kein physisches Fire-Tablet verfügbar: responsive Prüfung in Chromium.
