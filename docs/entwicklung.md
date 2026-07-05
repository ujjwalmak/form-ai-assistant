# Entwicklung & Qualität

## Lokal starten

Die Extension braucht **keinen Build**:

1. `chrome://extensions` → Entwicklermodus aktivieren.
2. **„Entpackte Erweiterung laden"** → Projektordner (enthält `manifest.json`).
3. In den Optionen Provider + API-Key setzen.

## Tests

Die testbare Logik ist mit **Vitest** (jsdom) abgedeckt:

```bash
npm install        # einmalig
npm test           # alle Tests
npm run coverage   # Tests + Abdeckungsbericht
```

- **118 Tests** in `tests/unit/` für `fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`,
  `background` — Branch-Coverage 78,93 % (~79 %) der Logik-Module.
- Abgedeckt sind u. a. Live-Validatoren (IBAN/BIC/E-Mail/PLZ/Telefon/Geburtsdatum),
  Fehl-Match-Schutz, Shadow-DOM-Labels, Tabellen-Labels, Select-Priorität,
  Mehrfachauswahl, Dezimalkomma, `maxlength` und Provider-/Fallback-Helfer.
- **CI:** `.github/workflows/test.yml` führt die Suite bei jedem Push/PR aus (Regression).
- Bewusst nicht unit-getestet: Netzwerk-I/O, DOM-Orchestrierung in `content.js`, CSS —
  Kandidaten für E2E (siehe [Testing Plan](reference/testing-plan.md)).

## Dokumentations-Agent (`doc-agent/`)

Ein **autonomer DocumentationAgent** hält die Projektdoku synchron mit dem Code
(Kurs-Einheit 9, Orchestrierung). Ablauf nach Vorlesungsvorlage: **`git diff → LLM → Markdown`**,
bereitgestellt als Flask-Microservice via JSON-RPC (`localhost:8010/jsonrpc`).

```bash
# Autonomer Einzellauf (dokumentiert den letzten Commit):
python doc-agent/agent.py --once

# Als Microservice:
python doc-agent/agent.py
```

- **Autonom:** schreibt den erzeugten Eintrag selbst an `logs/actions.md`.
- **Orchestriert:** ein `post-commit`-Git-Hook ruft den laufenden Service nach jedem Commit.
- **Self-Exclude:** der Agent dokumentiert seine eigenen Dateien (`doc-agent/`,
  `logs/actions.md`) bewusst nicht (keine Selbstreferenz).
- Provider wie die Extension: Groq primär, OpenRouter Fallback; Key aus `doc-agent/.env`
  (gitignored).

## Konventionen

- **Vanilla JS, kein Build-Step** für den Extension-Code; keine Frameworks einführen.
- **Doku-Sprache: Deutsch** (Ausnahmen: [Testing Plan](reference/testing-plan.md) und [Product Vision](reference/product-vision.md)).
- Storage-Keys und Klassennamen werden nicht ohne Grund umbenannt (bestehende Code-Pfade,
  gespeicherte Profile, Migrationen).
- Quelle der Wahrheit ist der Code + `memory/`; Aussagen werden am Code verifiziert.
