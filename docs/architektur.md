# Technische Architektur

FormAssist ist eine **Manifest-V3-Extension in Vanilla JavaScript — ohne Build-Step**.
Sie ist direkt als „entpackte Erweiterung" ladbar (kein Bundler, keine Transpilation,
keine Laufzeit-Dependencies).

## Überblick

```mermaid
flowchart LR
    subgraph Seite["Host-Seite (Shadow DOM)"]
      CS["Content-Script-Module<br/>fa-utils → fa-profile → fa-scanner<br/>→ fa-fill → fa-styles → fa-supabase → content"]
    end
    SW["background.js<br/>(Service Worker)"]
    Groq["Groq API"]
    OR["OpenRouter API"]
    SB["Supabase<br/>(optional)"]

    CS -- "LLM-Anfrage" --> SW
    SW -- "primär" --> Groq
    SW -- "Fallback 429/5xx" --> OR
    CS -- "optionaler Sync" --> SB
```

## Modul-Aufbau

Das Content-Script ist in Module aufgeteilt, die das Manifest in **fester Reihenfolge** lädt
(globaler Scope, kein Modulsystem — die Reihenfolge ist verbindlich):

`fa-utils` → `fa-profile` → `fa-scanner` → `fa-fill` → `fa-styles` → `fa-supabase` → `content`

| Datei | Zweck |
|---|---|
| `content.js` | Orchestrierung: Shadow-DOM-UI, Chat, Agent, Guided/Field-by-Field, Profil-Panel, Dokument-Scan, Live-Validierung, Submit-Review |
| `fa-utils.js` | Hilfsfunktionen: Datums-Parsing, Selektoren, Kendo-Erkennung, deterministische Validatoren |
| `fa-profile.js` | `PROFILE_FIELDS` (15 Standardfelder) + `FAKE_DATA` |
| `fa-scanner.js` | Feldanalyse: Label/Hinweis/Fehler, `matchProfile`, `buildSystemPrompt`, rekursiver Shadow-DOM-Scan |
| `fa-fill.js` | `fillField` für alle Feldtypen inkl. Datepicker-Libraries, Temporal-Normalisierung, priorisiertem Select-Matching |
| `fa-styles.js` | Aurora-Glass-Stylesheet (`FA_CSS`), in den Shadow Root injiziert |
| `fa-supabase.js` | Optionaler Profil-/History-Sync via Supabase |
| `background.js` | LLM-Transport (Groq + OpenRouter), Retry, Timeout, Streaming, Fallback |

## Leitprinzipien

- **Shadow-DOM-Isolation:** Die gesamte UI läuft in `attachShadow({ mode: 'open' })` —
  kein CSS-/DOM-Leck auf die Host-Seite.
- **Netzwerk nur über den Service Worker:** Content-Scripts machen keine direkten `fetch`-Calls
  an LLM-Provider (CSP-/CORS-sicher); alles läuft über `background.js`.
- **Kein automatisches Absenden:** harte Guardrail im Action-Parser.
- **Deterministisch vor KI:** Mathematische/formatbasierte Prüfungen (z. B. IBAN mod-97)
  laufen lokal; die KI bekommt diese Ergebnisse erst im Submit-Review als Kontext.

## Provider & Fallback

| | Groq | OpenRouter |
|---|---|---|
| Rolle | primär | Backup |
| Standard-Modell | `llama-3.3-70b-versatile` | `openrouter/auto` |
| Fallback-Modell | — | `meta-llama/llama-3.3-70b-instruct:free` |
| Vision-Modell | `meta-llama/llama-4-scout-17b-16e-instruct` | `meta-llama/llama-4-scout` |

Antwortet Groq mit **429** (Rate Limit) oder **5xx** und ein OpenRouter-Key ist hinterlegt,
wiederholt `background.js` die Anfrage automatisch über OpenRouter (`MAX_RETRIES = 2`,
retrybare Status `408/409/425/429/500/502/503/504`). Der Nutzer sieht einen kurzen Toast.
Vision-Requests können ein eigenes `fallbackModel` setzen, damit der Fallback nicht auf
ein text-only Modell wechselt.

## Robustheit der Formularerkennung

- Offene und verschachtelte Shadow Roots werden rekursiv gescannt.
- Label-, Hinweis-, Fehler- und Radio-Lookups nutzen den jeweiligen DOM-Root
  (`getRootNode()`), dadurch funktionieren sie auch in Web Components und same-origin iFrames.
- Legacy-Tabellenlayouts werden unterstützt: die linke Tabellenzelle dient als
  Label-Fallback.
- Profil-Matching arbeitet am Wortanfang statt mit beliebigen Substrings. Dadurch werden
  Fehlmatches wie „Hotelname" → Telefon oder „Sportart" → Stadt vermieden.
- `fillField()` priorisiert exakte Select-Treffer vor Teiltreffern, unterstützt
  Mehrfachauswahl, deutsches Dezimalkomma und `maxlength`.

## Datenhaltung

- **Lokal (`chrome.storage.local`):** Profile (`faProfiles`), aktives Profil, History,
  Chat-Gedächtnis, Sidebar-Position, Dark-Mode.
- **Synchronisiert (`chrome.storage.sync`):** Provider, API-Keys, Modell, Assistent-Modus,
  optionale Supabase-Zugangsdaten.
- **Optional (Supabase):** geräteübergreifender Sync von Profilen und History
  (`fa-supabase.js`, `supabase_tables.sql`), Geräte-Trennung per `crypto.randomUUID()`.
