# Präsentation — Reflexion (02.07.2026, gehalten)

Reflexions-Folien im **Aurora-Glass-Design** der FormAssist-Webseite — in zwei Formaten:

| Datei | Format | Zweck |
| --- | --- | --- |
| [`FormAssist_Reflexion.pptx`](FormAssist_Reflexion.pptx) | PowerPoint (12 Folien, 16:9) | **Hauptformat für die Abgabe/Präsentation** — inkl. Sprechertext in den Notizen |
| [`reflexion.html`](reflexion.html) | HTML (eine Datei, offline) | Browser-Fallback |

## PowerPoint (empfohlen)

- **Referentenansicht nutzen:** Jede Folie hat vollständigen **Sprechertext in den Notizen**
  (mit Zeitbudget und Sprecher-Zuordnung Maximilian/Ujjwal, ~15 Min gesamt).
- **Fonts:** Das Deck nutzt *Inter* und *Space Grotesk*. Auf diesem Rechner sind sie installiert
  (`~/Library/Fonts`). Für einen anderen Rechner: die TTFs aus [`fonts/`](fonts/) per Doppelklick
  installieren — oder das Deck vorab als PDF exportieren.
- Design-Elemente (Aurora-Hintergrund mit echtem Glas-Effekt, Logo) sind als Bilder gebacken —
  das Deck sieht überall gleich aus.

### Deck neu bauen (optional)

Quellskripte in [`deck-src/`](deck-src/) (Python, benötigt `python-pptx`, `Pillow`, `numpy`):

```bash
python3 deck-src/generate_assets.py   # rendert Hintergründe + Logo nach deck-src/assets/
python3 deck-src/build_deck.py        # baut ../FormAssist_Reflexion.pptx
```

## HTML-Fallback

1. [`reflexion.html`](reflexion.html) im Browser öffnen (Doppelklick), **`F`** für Vollbild.
2. Blättern: **→ / ← · Leertaste · PageUp/PageDown · Home/End** oder die Punkte rechts.
3. Direkt zu einer Folie springen: `reflexion.html#4`.

## Inhalt

Titel · Eckdaten · die **8 Reflexionsfragen** · Ehrliche Bilanz (Stolz / Grenzen / Ausblick) · Danke.
Inhalt gespiegelt aus [`../docs/reference/reflexion.md`](../docs/reference/reflexion.md); Hervorhebungen (Gradient-Rahmen)
markieren Kernaussagen und die War Stories (Provider-Odyssee, Push-Protection).

Hinweis: Das Deck ist ein historischer Stand der Reflexionspräsentation vom 02.07.2026.
Die späteren v2.1-Demo-Features vom 05.07.2026 sind in der Projekt- und Webdoku
dokumentiert, aber nicht rückwirkend in diese gehaltene Präsentation eingearbeitet.
