# Short-Term Memory — FormAssist

_Last updated: 2026-05-07_

## Aktueller Stand (07.05.2026)

FormAssist ist eine Chrome-Extension (Manifest V3), die auf jeder Seite mit Formularfeldern eine KI-Sidebar einblendet.  
**Agent Auto-Fill heute implementiert:** Live Sequential Fill, faExtras-Speicher, Extras im Profil-Panel.

| Datei | Funktion | Status |
|---|---|---|
| `content.js` | Haupt-Logik: Profile-Matching, erweiterte Feldterkennung, AI-Calls, Drag/Resize/Minimize | ✅ Heute überarbeitet |
| `manifest.json` | MV3 mit Icons (16/32/48/128px), content-script, Groq API | ✅ Icons aktualisiert |
| `api-key.txt` | Groq API-Key (gsk_…) — gitignored, lokal-only | ✓ |

**Aktive Architektur:** Alles in `content.js` (Shadow DOM, Single File).  
Alle verwaisten Multifile-Dateien wurden entfernt.

## Implementierte Features (heute erweitert)

**Profile & Storage:**
- `PROFILE_FIELDS` — strukturiertes Mapping von 16 Standardfeldern (Vorname, Email, IBAN, etc.)
- `FAKE_DATA` — Testdaten für schnelles Testen
- Chrome Storage (chrome.storage.local) für Profile, Position, Dark Mode
- Auto-Fill: Profile-Felder werden erkannt und können schnell gefüllt werden

**Feldterkennung (neu):**
- `matchProfile()` — intelligentes Matching von Formularelementen gegen PROFILE_FIELDS
- Autocomplete-Attribute werden erkannt und Priorität gegeben
- Suchworte/Keywords für Feldtyp-Erkennung (z.B. 'plz', 'postleitzahl' → zip)
- `fillField()` — überarbeitete, robuste Feldwert-Einfügung mit Event-Dispatch
- Bessere SELECT-Option-Matching, Checkbox/Radio-Handling

**UI & Styling:**
- Shadow DOM Sidebar (vollständige CSS-Isolation)
- **Dark Mode** — gespeichert in storage, Farbvariablen in CSS (light/dark)
- Google Fonts (Roboto) geladen im Shadow Root
- Modern Color Palette (Google Design Colors)
- Extension-Icons (16, 32, 48, 128px) — jetzt im manifest definiert

**Formular-Kontext:**
- Reiche Kontext-Extraktion: Labels, aria-*, Hints, Fehler, Optionen, autocomplete, min/max
- Open Graph Metadaten (og:title, og:description)
- Feldgruppenbildung nach Sektionen
- System-Prompt mit Nutzerprofil-Integration
- Aktives-Feld-Tracking mit Hint + Fehlermeldung + aktuellem Wert

**API & KI:**
- Groq API (llama-3.1-8b-instant), max_tokens 400
- Konversations-History (letzte 10 Nachrichten)
- API-Key aus `api-key.txt` (via `chrome.runtime.getURL`)

**Bedienung:**
- Clickbare Feldliste im Chat
- **Geführter Modus** — KI fragt nacheinander nur leere Felder ab (mit Fortschritt "5/12"), User antwortet kurz, KI trägt ein
- Quick-Action Buttons: "Formular erklären" (Überblick), "Geführter Modus" (Step-by-Step)
- Dark Mode Toggle im Header
- Profil-Editor (16 Standardfelder, lokal persistiert)
- Clickbare Feldliste
- Drag (Header), Resize (linke/untere Kante + SW-Ecke)
- Minimize-Button
- MutationObserver für SPA-Formulare
- Ctrl+Shift+F Keyboard-Shortcut

## Neu implementiert (07.05.2026)

**Agent Auto-Fill — Live Sequential Mode:**

- `agentFill()` — iteriert alle Felder einzeln, eine KI-Anfrage pro unbekanntem Feld
- Live-Status-Bubble im Chat: Spinner → ✓/? mit Wert + Badge (`[Profil]` grün / `[KI]` gelb)
- Matching-Priorität: Profile → Extras (lokal, kein API) → KI → Nutzer fragen

**faExtras-Speicher:**

- `faExtras` in chrome.storage.local — Key-Value für alle Felder außerhalb PROFILE_FIELDS
- `matchExtras()` — fuzzy matching (includes) damit "Webseite (optional)" auf "Webseite" matched
- Beim Beantworten unbekannter Felder: automatisch in faProfile oder faExtras gespeichert

**Profil-Panel erweitert:**

- `renderExtrasInProfile()` — faExtras-Einträge unterhalb der Standardfelder
- Jeder Extras-Eintrag editierbar + einzeln löschbar (× Button)
- Speichern-Button sichert Profile + Extras in einem Schritt

## Offene Probleme / Bekannte Schwächen

- Inline-Resize nach Minimize-Restore kann in bestimmten Zustandskombinationen (docked + minimized) zu falscher Höhe führen (Minor)
- Extension lädt nicht in Chrome's nativen PDF-Viewer (Browser-Limitation, nicht behebbar)
- API-Key liegt clientseitig in Extension — kein Produktionssetup (bekannt, für Prototyp OK)

## Nächste sinnvolle Schritte

1. ✅ Profile-System & Auto-Fill
2. ✅ Dark Mode
3. ✅ Icons in manifest
4. ✅ Keyboard-Shortcut Ctrl+Shift+F
5. ✅ Profil-Editor UI
6. ✅ Quick-Action Buttons
7. ✅ Agent Auto-Fill (Live Sequential, faExtras, Badge-System)
8. Testing: Agent auf realen Formularen validieren (Matching-Qualität, Edge Cases)
9. Feature: Profil-Backup/Cloud-Sync (optional, größere Arbeit)
