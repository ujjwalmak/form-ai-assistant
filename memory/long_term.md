---
name: long-term-architecture
description: Extension architecture, provider/API setup, agent flow, storage keys, prompt structure — current as of 2026-05-15
metadata:
  type: project
---

# Long-Term Memory — FormAssist

## Architektur (Stand 2026-05-15)

### Extension-Typ

Chrome Extension, Manifest V3. Single content-script (`content.js`), läuft auf `<all_urls>` bei `document_idle`.

### Shadow DOM Isolation

Der gesamte UI-Code wird in ein `attachShadow({ mode: 'open' })` injiziert, das an einem `position:fixed; inset:0` Host-Element hängt. Verhindert CSS-Konflikte mit jeder Host-Seite.

### Kontext-Extraktion (Label-Hierarchie)

1. `aria-label`
2. `aria-labelledby` (mehrere IDs, joined)
3. `<label for="id">`
4. Wrapping `<label>` (clone ohne inputs)
5. `title` attribute
6. `placeholder`
7. `name`/`id` (humanized: camelCase → spaces, `-_` → spaces)

### Formularerkennung

- Standard-DOM + Shadow DOM (Web Components, Custom Elements)
- Nav-Filter: Felder in `nav`, `header`, `footer`, `[role=search]`, `[role=navigation]` werden ignoriert
- Datepicker-Support: Flatpickr (`_flatpickr`), Pikaday (`_pikaday`), jQuery UI / Bootstrap DateTimePicker

### Profil-System

**PROFILE_FIELDS — 15 Standard-Profilfelder:**

- Persönliche Daten: firstName, lastName, email, phone, birthdate, birthplace, nationality
- Adresse: street, zip, city, country
- Bank/Finanz: iban, bic
- Business: company, jobTitle

**Mehrere Profile** — Array in `faProfiles`, aktives Profil via `faActiveProfileId`. Migration: erstes Start legt "Hauptprofil" aus Legacy-`faProfile` an.

**Storage (`chrome.storage.local`):**

- `faProfiles` — Array `[{id, name, profile, extras}]`
- `faActiveProfileId` — ID des aktiven Profils
- `faHistory` — Array der letzten 30 Agent-Sitzungen
- `faPosition` — Sidebar-Position
- `faDarkMode` — Boolean Dark Mode

**Storage (`chrome.storage.sync`):**

- `faProvider` — `'groq'` oder `'openrouter'`
- `faGroqApiKey` — Groq API-Key
- `faOpenRouterApiKey` — OpenRouter API-Key
- `faModel` — gewähltes Modell
- `faAssistantMode` — `'context'` (Standard) oder `'classic'`

**Storage (`chrome.storage.session`):**

- `faAgentResume` — Agent-State für Weiterführung nach Seitennavigation (inkl. guided, autoNavigate, sessionAnswers)

### API & Provider

Beide Provider sind OpenAI-kompatibel (messages array, choices[0].message.content).

| Provider | Endpunkt | Standard-Modell |
| --- | --- | --- |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `openrouter/auto` |

**Automatischer Fallback:** Groq 429 oder 5xx → OpenRouter mit `meta-llama/llama-3.3-70b-instruct:free`. Modell-IDs ohne `/` (Groq-spezifisch) werden automatisch ersetzt. Toast im Sidebar.

**Message-Typen background.js:**

- Non-Streaming: `{ type: 'llm-fetch', provider, key, body }` → `{ ok, data, usedFallback }`
- Streaming: Port `llm-stream`, Nachrichten `{ type: 'chunk'|'done'|'error'|'fallback' }`

**Timeouts:** Non-Streaming 25s, Streaming 40s. Retries: max. 2 für retryable Status (408, 429, 500–504).

- Agent (Batch / Classic): max_tokens 2048, strukturierte Feldliste, Streaming
- Agent (Field-by-Field): max_tokens 80 pro Feld, Non-Streaming
- Chat: max_tokens 400, System-Prompt mit Formularkontext, History letzte 6 Nachrichten

## Agent Mode (Haupt-Feature)

### Modi

| Modus | Wert | Verhalten |
| --- | --- | --- |
| Automatisch | `context` | Feld-für-Feld KI, sofort ausfüllen, nur bei wirklich unbekannten Feldern fragen |
| Mit Vorschau | `classic` | Batch-Prompt → editierbare Vorschau → User bestätigt |

### Ablauf — Automatisch (Standard)

1. `startAgent()` → `applyDeterministicProfileFill()` (starke Profil-Matches direkt, kein API-Call)
2. `runFieldByFieldAgent()`:
   - Alle noch leeren/fehlerhaften Felder der Seite sammeln
   - Für jedes Feld: `extras` + `sessionAnswers` auf exakten Label-Match prüfen → direkt füllen
   - Falls kein Match: einzelner `groqRequest` (Non-Streaming, max_tokens 80) mit Kontext-Block + Feldinfo
   - KI antwortet mit Wert → sofort `fillField()` + in Bubble anzeigen
   - KI antwortet mit `?` → als `ask`-Aktion mit `selector` in Queue
3. Nach allen Feldern: offene Fragen nacheinander stellen (`showGuidedQuestion`)
4. Nach allen Antworten: Navigation/Submit via `handleGuidedNavigation()`
5. Bei Seitennavigation: State in `faAgentResume`, `resumeAgentIfPending()` → `runFieldByFieldAgent()`

### Ablauf — Mit Vorschau (Classic)

1. `startAgent()` → `applyDeterministicProfileFill()`
2. `runAgentStep()` → `buildAgentPrompt()` → Groq (Streaming, max_tokens 2048)
3. `showAgentPreview(actions)` — editierbare Vorschau, User bestätigt
4. `executeAgentActions(actions)` — ausführen
5. Auto-Korrektur-Runde bei Validierungsfehlern (max. 1 Runde)

### Field-by-Field Kontext-Block

```text
NUTZERPROFIL:
<alle gesetzten Profilfelder>

EXTRAS (gelernte Felder):
<key: "value" Paare>

NUTZER-ANTWORTEN (immer verwenden, nicht erneut fragen):
<sessionAnswers>

BEREITS AUSGEFÜLLT (vorherige Seiten):
<filledFields der letzten Seiten>

Alter: N

FORMULARFELD: "Label" (type) [Pflichtfeld]
Optionen: Opt1 | Opt2 | ...
Hinweis: ...

Antworte NUR mit dem Wert …
```

### Batch-Prompt (Classic Mode)

```text
NUTZERPROFIL + EXTRAS + NUTZER-ANTWORTEN + BEREITS AUSGEFÜLLT

SEITE: <title> | <hostname>

FELDER:
[name="x"] text ✱ "Label" [Wert="aktuell"] ❌"Fehlermeldung"
[name="y"] select "Label" (Opt1 | Opt2 | ...)

FORMAT + AUSFÜLL-STRATEGIE + PFLICHTREGELN
```

### Action-Typen (Classic/Batch)

```json
{"action":"fill"|"select"|"check"|"click"|"submit"|"ask"|"done",
 "selector":"[name=\"x\"]",
 "value":"...",
 "label":"...",
 "source":"profile"|"inferred"|"suggestion",
 "confidence":0.0-1.0,
 "isNavigation":true,
 "options":["Opt1","Opt2"]}
```

### Konstanten

- `AGENT_AUTO_SELECT_CONFIDENCE = 0.82` — unter diesem Wert kein Auto-Select in Classic-Vorschau

### Agent-State

```javascript
agentState = { active, guided, autoNavigate, sessionAnswers, filledFields, startUrl, lastFailures }
guidedAskState = { active, queue, navAction }
// queue-Einträge im field-by-field Modus haben: { action:'ask', label, question, options, selector }
```

### Ask-Flow (Field-by-Field)

- `showGuidedQuestion(ask)` zeigt Frage mit optionalen Chips
- `handleGuidedAnswer(text)` → füllt Feld direkt via `ask.selector` → `showNextGuidedQuestion()`
- `showNextGuidedQuestion()`: Queue leer → `handleGuidedNavigation(navAction)` oder "Fertig"-Meldung

### Auto-Retry (Classic)

`runAgentStep(retry=false/true)` — bei leerem Parse-Ergebnis einmaliger Retry mit explizitem "nur JSON"-Hinweis.

## Submit-Review & Fehlerhilfe

- Vor finalem Absenden wird das Formular abgefangen und per KI auf fehlende/auffällige Angaben geprüft
- KI-Antwort startet mit `Status: OK`, `Status: Warnung` oder `Status: Fehlt`
- User kann danach erneut prüfen oder bewusst "Trotzdem absenden"
- Bei Feld-Validierungsfehlern wird proaktiv kontextbezogene Hilfe eingeblendet

## UI & Styling

**Header:** Logo + Seitentitel als Subtitle + Icon-Buttons (History, Profil, Dark Mode, Schließen)

**Action Panel:** Primär-Button "Formular ausfüllen" + "Erklären"-Chip + aufklappbare Feldliste + Modus-Auswahl + Auto-Weiter-Toggle + Trust-Row. Wird automatisch ausgeblendet, wenn Profil- oder Verlauf-Panel geöffnet ist.

**Profil-Panel / Verlauf-Panel:** Ersetzen beim Öffnen den Action-Panel und die Chat-Area vollständig. Schließen stellt den vorherigen Zustand wieder her.

**Color System:** Light/Dark via CSS Custom Properties, `:host(.dark)` Toggle

**Drag/Resize:**

- `isDocked = true`: rechts gedockt, transform-Animation
- `isDocked = false`: frei positioniert, `no-animate`-Klasse

**Toast:** `#fa-toast` — erscheint kurz (2.4s) für Systembenachrichtigungen (z. B. Provider-Fallback)

## Bekannte Browser-Limitierungen

- Chrome Native PDF Viewer: Content Scripts nicht injizierbar
- Cross-Origin iFrames: explizit übersprungen (`window !== window.top`)

## Sicherheit

API-Keys in `chrome.storage.sync` — niemals committed. Für KI-Funktionen werden relevante Formular- und Profildaten an den gewählten Provider übertragen. Für Produktion: Backend-Proxy plus expliziten Consent-Flow vorsehen.
