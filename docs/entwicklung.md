---
title: Engineering
---

<div class="fa-page-hero" markdown>
<span class="fa-kicker">Engineering & Qualität</span>

# Qualität, die man messen kann

<p class="fa-lede" markdown>
Kein Build-Step, aber ein voller Qualitäts-Stack: **Vitest**-Suite mit CI bei jedem Push,
ehrlich dokumentierte Testgrenzen — und ein Doku-Agent, der die Projektdoku nach jedem
Commit selbst fortschreibt.
</p>
</div>

<div class="fa-stats" markdown>
<div class="fa-stat"><b>133</b><span>Unit-Tests</span></div>
<div class="fa-stat"><b>~77 %</b><span>Branch-Coverage</span></div>
<div class="fa-stat"><b>jeder Push</b><span>CI-Lauf</span></div>
<div class="fa-stat"><b>0</b><span>Build-Steps</span></div>
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Setup</span>

## Lokal starten
</div>

Die Extension braucht **keinen Build**:

<div class="fa-steps">
  <div class="fa-step">
    <strong>Entwicklermodus</strong>
    <p><code>chrome://extensions</code> öffnen und den Entwicklermodus aktivieren.</p>
  </div>
  <div class="fa-step">
    <strong>Erweiterung laden</strong>
    <p><b>„Entpackte Erweiterung laden"</b> → Projektordner (enthält
    <code>manifest.json</code>) auswählen.</p>
  </div>
  <div class="fa-step">
    <strong>Konfigurieren</strong>
    <p>In den Optionen Provider + API-Key setzen — fertig.</p>
  </div>
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Qualität</span>

## Tests & CI
</div>

Die testbare Logik ist mit **Vitest** (jsdom) abgedeckt:

```bash
npm install        # einmalig
npm test           # alle Tests
npm run coverage   # Tests + Abdeckungsbericht
```

<ul class="fa-checks">
<li><b>133 Tests</b> in <code>tests/unit/</code> für <code>fa-utils</code>,
<code>fa-profile</code>, <code>fa-scanner</code>, <code>fa-fill</code>,
<code>background</code> — Branch-Coverage ~77 % der Logik-Module.</li>
<li>Abgedeckt sind u. a. Live-Validatoren (IBAN/BIC/E-Mail/PLZ/Telefon/Geburtsdatum),
Fehl-Match-Schutz, Shadow-DOM-Labels, Tabellen-Labels, Select-Priorität, Mehrfachauswahl,
Dezimalkomma, <code>maxlength</code>, ARIA-Comboboxen (React-Select-/MUI-Muster),
contenteditable-Rich-Text und Provider-/Fallback-Helfer.</li>
<li><b>CI:</b> <code>.github/workflows/test.yml</code> führt die Suite bei jedem Push/PR
aus (Regression).</li>
</ul>

!!! note "Bewusst nicht unit-getestet"
    Netzwerk-I/O, DOM-Orchestrierung in `content.js` und CSS — Kandidaten für E2E,
    siehe [Testing Plan](reference/testing-plan.md).

<div class="fa-section-head" markdown>
<span class="fa-kicker">Automation</span>

## Der Dokumentations-Agent (`doc-agent/`)
</div>

<div class="fa-panel" markdown>
Ein **autonomer DocumentationAgent** hält die Projektdoku synchron mit dem Code
(Kurs-Einheit 9, Orchestrierung). Ablauf nach Vorlesungsvorlage: **`git diff → LLM →
Markdown`**, bereitgestellt als Flask-Microservice via JSON-RPC (`localhost:8010/jsonrpc`).
</div>

```bash
# Autonomer Einzellauf (dokumentiert den letzten Commit):
python doc-agent/agent.py --once

# Als Microservice:
python doc-agent/agent.py
```

<ul class="fa-checks">
<li><b>Autonom:</b> schreibt den erzeugten Eintrag selbst an <code>logs/actions.md</code>.</li>
<li><b>Orchestriert:</b> ein <code>post-commit</code>-Git-Hook ruft den laufenden Service
nach jedem Commit.</li>
<li><b>Self-Exclude:</b> der Agent dokumentiert seine eigenen Dateien
(<code>doc-agent/</code>, <code>logs/actions.md</code>) bewusst nicht (keine Selbstreferenz).</li>
<li>Provider wie die Extension: Groq primär, OpenRouter Fallback; Key aus
<code>doc-agent/.env</code> (gitignored).</li>
</ul>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Spielregeln</span>

## Konventionen
</div>

- **Vanilla JS, kein Build-Step** für den Extension-Code; keine Frameworks einführen.
- **Doku-Sprache: Deutsch** (Ausnahmen: [Testing Plan](reference/testing-plan.md) und [Product Vision](reference/product-vision.md)).
- Storage-Keys und Klassennamen werden nicht ohne Grund umbenannt (bestehende Code-Pfade,
  gespeicherte Profile, Migrationen).
- Quelle der Wahrheit ist der Code + `memory/`; Aussagen werden am Code verifiziert.
