# Action Log — FormAssist

---

## [2026-04-23] Session Checkpoint

**Ziel:**
FormAssist von einem hardcodierten Single-Page-HTML-Prototypen zu einer vollwertigen Chrome Extension weiterentwickeln, die auf beliebigen Seiten mit Formularen funktioniert.

**Aktionen:**
1. `form-ai-assistant.html` analysiert — Anthropic-API-basierter Formular-Assistent für Wohnsitzummeldung
2. README.md und requirements.txt erstellt, initialer Git-Commit und Push zu github.com/ujjwalmak/form-ai-assistant
3. API-Backend migriert: Anthropic Claude → Gemini 2.0 Flash → Groq llama-3.1-8b-instant (Credit-Limit-Problem)
4. API-Key hardcodiert auf User-Wunsch
5. Vergleich zweier Codelinien: lokale Version (Claude, Shadow DOM, reiche Kontext-Extraktion) vs. GitHub-Version (Kollege, Drag/Resize/Minimize/Feldliste)
6. Merge der besten Teile beider Versionen in `content.js` (Shadow DOM + Drag + Resize + Minimize + Feldliste + Konversations-History)
7. GitHub Push Protection blockierte hardcodierten Key → Key in `api-key.txt` ausgelagert, `.gitignore` erstellt
8. Minimize-Bug behoben (inline-style-Überschreibung)
9. Resize verbessert: 3 Handles (W, S, SW) statt einem unsichtbaren Streifen
10. Memory/Logs-Checkpoint durchgeführt (diese Session)

**Ergebnis:**
- Chrome Extension (MV3) produktionsbereit für lokalen Einsatz
- Läuft auf allen Seiten mit Formularfeldern
- KI versteht Formular-Kontext semantisch (nicht nur HTML-Scanner)
- Drag, Resize (3 Richtungen), Minimize, Feldliste, Konversations-History funktionieren
- Kein hardcodierter Key im Repository

**Learnings:**
- GitHub Push Protection scannt alle Commits — Keys müssen vor dem ersten Commit externalisiert werden
- CSS-Klassen können inline styles nicht überschreiben — Zustandsänderungen bei Drag-basierten Komponenten müssen konsistent über inline styles oder ausschließlich über CSS gesteuert werden
- Shadow DOM erfordert eigene Font-Loading-Strategie (`<link>` im Shadow Root, nicht @import)
- `chrome.runtime.getURL` funktioniert nur wenn die Datei in `web_accessible_resources` gelistet ist

**Nächste Schritte:**
1. Verwaiste Dateien (state.js, ui.js, api.js, bootstrap.js, content.css) entfernen
2. README auf aktuelle Architektur aktualisieren
3. Feature: Auto-Fill (AI-Vorschlag per Klick ins Feld einfügen)
4. Feature: Proaktive Fehlererkennung
5. Feature: localStorage-Gedächtnis für persönliche Daten
6. Feature: Keyboard-Shortcut (Ctrl+Shift+F)
