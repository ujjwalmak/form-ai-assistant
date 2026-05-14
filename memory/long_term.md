---
name: long-term-architecture
description: Extension architecture, provider/API setup, agent flow, storage keys, prompt structure — current as of 2026-05-14
metadata:
  type: project
---

# Long-Term Memory — FormAssist

## Architektur (Stand 2026-05-14)

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
- `faAssistantMode` — `'hybrid'`, `'classic'`, `'context'`

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

- Agent: max_tokens 1200, strukturierte Feldliste statt HTML, Streaming
- Chat: max_tokens 400, System-Prompt mit Formularkontext, History letzte 6 Nachrichten

## Agent Mode (Haupt-Feature)

### Ablauf (Standard / Hybrid)

1. `startAgent()` → `runAgentStep()` → `buildAgentPrompt()` → Groq (Streaming)
2. Je nach Modus:
   - **Hybrid/Klassisch**: `showAgentPreview(actions)` zeigt editierbare Vorschau, User bestätigt
   - **Automatisch**: direkt `executeAgentActions(actions)`
3. Nach Ausführung: Auto-Korrektur-Runde wenn Validierungsfehler vorhanden
4. Bei Navigation: State in `faAgentResume` gespeichert, `resumeAgentIfPending()` bei Seitenload

### Ablauf (Guided Mode)

1. Gleicher Start, dann `runGuidedStep(actions)`
2. Konfidenz ≥ 0.6 → direkt ausfüllen (`executeGuidedFillActions`)
3. Konfidenz < 0.6 → synthetische `ask`-Aktion mit KI-Vorschlag als Chip
4. `showNextGuidedQuestion()` → User antwortet → `handleGuidedAnswer()` → Agent läuft weiter
5. Nutzerantworten in `agentState.sessionAnswers` — werden auf allen Folgeseiten an Prompt angehängt
6. Auto-Navigate: Weiter/Submit automatisch klicken wenn keine offenen Fragen

### Agent-Prompt Inhalt

```text
PROFIL: <alle gesetzten Profilfelder>
EXTRAS: <gelernte Zusatzfelder>
[Berechnetes Alter: N]

NUTZER-ANTWORTEN (direkt verwenden): <sessionAnswers>
BEREITS AUSGEFÜLLT (vorherige Seiten): <filledFields der letzten Seiten>

SEITE: <title> | <hostname>

FELDER:
[name="x"] text ✱ "Label" [Wert="aktuell"] ❌"Fehlermeldung"
[name="y"] select "Label" (Opt1 | Opt2 | ...)

FORMAT + REGELN
```

### Action-Typen

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

- `AGENT_AUTO_SELECT_CONFIDENCE = 0.82` — unter diesem Wert kein Auto-Select in Vorschau
- `GUIDED_MIN_CONFIDENCE = 0.6` — unter diesem Wert: ask statt fill in Guided Mode

### Agent-State

```javascript
agentState = { active, guided, autoNavigate, sessionAnswers, filledFields, startUrl, lastFailures }
guidedAskState = { active, queue, navAction }
```

### Auto-Retry bei Parse-Fehler

`runAgentStep(retry=false/true)` — bei leerem Parse-Ergebnis einmaliger Retry mit explizitem "nur JSON" Hinweis.

### Auto-Korrektur

Nach `executeAgentActions`: 700ms warten, Felder auf Fehler scannen, bei Treffern automatisch `runAgentStep()` erneut (max. 1 Runde via `agentState.correctionRound`).

## Submit-Review & Fehlerhilfe

- Vor finalem Absenden wird das Formular abgefangen und per KI auf fehlende/auffällige Angaben geprüft
- KI-Antwort startet mit `Status: OK`, `Status: Warnung` oder `Status: Fehlt`
- User kann danach erneut prüfen oder bewusst "Trotzdem absenden"
- Bei Feld-Validierungsfehlern wird proaktiv kontextbezogene Hilfe eingeblendet

## UI & Styling

**Header:** Logo + Seitentitel als Subtitle + Icon-Buttons (History, Profil, Dark Mode, Schließen)

**Action Panel:** Primär-Button "Formular ausfüllen" + "Erklären"-Chip + aufklappbare Feldliste

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
