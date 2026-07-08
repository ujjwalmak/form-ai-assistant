# Präsentationen — Aurora-Glass-Decks

Folien im **Aurora-Glass-Design** der FormAssist-Webseite. Zwei Foliensätze:

| Deck | Datei | Anlass |
| --- | --- | --- |
| **Abschluss: reine Tool-Demo** | [`FormAssist_Abschluss.pptx`](FormAssist_Abschluss.pptx) · [PDF-Fallback](FormAssist_Abschluss.pdf) | **09.07.2026, 14:00** — 10 Min Live-Demo des Prototyps in 7 Kapiteln |
| Reflexion | `FormAssist_Reflexion.pptx` (bei Bedarf aus `deck-src/` neu bauen) · [`reflexion.html`](reflexion.html) | 02.07.2026 — die 8 Reflexionsfragen |

## Abschluss-Deck (09.07.) — reine Tool-Demo

**Aufbau:** Titel → Fahrplan → **7 Demo-Kapitel mit echten Prototyp-Screenshots** → Danke + Links.
Die Kapitel: Erkennen · Erklären · Profil · ⚡ Agent · Multi-Page · Chat · Submit-Review.

- **Die Folien sind Drehbuch UND Plan B:** Ab Folie 3 läuft alles live im Browser; die
  Screenshot-Folien tragen die Demo notfalls komplett alleine (falls live etwas klemmt).
- **Referentenansicht nutzen:** Jede Folie hat Sprechertext in den Notizen — inkl.
  **Klick-Route pro Kapitel** (was live gezeigt wird), Sprecher-Zuordnung (Ujjwal fährt,
  Maximilian moderiert) und Zeitbudget (~10 Min gesamt).
- **Vorbereitung vor 14:00** (steht auch in den Notizen von Folie 2/3): Extension geladen,
  Groq-Key gültig + OpenRouter-Backup, `test-site` läuft (`npm run dev`), Profil gefüllt,
  Screenshare auf Chrome, PDF-Fallback offen.
- **Links sind eingebaut** (Anforderung aus der Kurs-Mail): Repo + Projektwebseite als
  klickbare Pills auf der Schlussfolie.
  - Repo: <https://github.com/ujjwalmak/form-ai-assistant>
  - Webseite: <https://ujjwalmak.github.io/form-ai-assistant/>
- **Orga (aus der Kurs-Mail):** Präsentation bis **So 12.07.** auf Moodle hochladen ·
  Prototyp-Link im Zoom-Chat teilen · falls Repo privat: `duenne` auf GitHub einladen.
- **Fonts:** *Inter* und *Space Grotesk* (auf diesem Rechner installiert). Fremder Rechner:
  TTFs aus [`fonts/`](fonts/) installieren **oder** den PDF-Fallback verwenden.

### Zu den Screenshots (Transparenz)

Die Demo-Folien zeigen die **echte Extension** auf der eigenen `test-site`, automatisiert
aufgenommen (Playwright + geladene Extension, Skripte in [`deck-src/capture/`](deck-src/capture/)).
Die **KI-Antworten wurden für die Aufnahme deterministisch gemockt** (Netzwerk-Interception,
gleiche Antwortformate wie Groq) — damit die Screenshots reproduzierbar sind. Live in der
Demo antwortet die echte Groq-API. Hinweis steht auch in den Notizen von Kapitel 1.

## Decks neu bauen (optional)

Quellskripte in [`deck-src/`](deck-src/) (Python, benötigt `python-pptx`, `Pillow`, `numpy`):

```bash
python3 deck-src/generate_assets.py    # rendert Hintergründe + Logo nach deck-src/assets/
python3 deck-src/build_final_deck.py   # baut ../FormAssist_Abschluss.pptx  (09.07., Tool-Demo)
python3 deck-src/build_deck.py         # baut ../FormAssist_Reflexion.pptx  (02.07.)
```

Screenshots neu aufnehmen (optional): `test-site` starten, dann die Skripte in
`deck-src/capture/` mit Node + Playwright ausführen und die PNGs mit abgerundeten
Ecken/Glow nach `deck-src/assets/demo/` rahmen (siehe Kommentarkopf der Skripte).

## HTML-Fallback (Reflexion)

1. [`reflexion.html`](reflexion.html) im Browser öffnen (Doppelklick), **`F`** für Vollbild.
2. Blättern: **→ / ← · Leertaste · PageUp/PageDown · Home/End** oder die Punkte rechts.
3. Direkt zu einer Folie springen: `reflexion.html#4`.
